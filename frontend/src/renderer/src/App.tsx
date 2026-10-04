import { useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import UrlInput from './components/UrlInput'
import PreviewPanel from './components/PreviewPanel'
import ModeControls, { DownloadMode } from './components/ModeControls'
import DownloadPathRow from './components/DownloadPathRow'
import DownloadRow from './components/DownloadRow'
import QueueSection from './components/QueueSection'
import HistorySection, { HistoryEntry } from './components/HistorySection'
import Footer from './components/Footer'
import PlaylistModal from './components/PlaylistModal'
import AboutPage from './pages/AboutPage'
import HowToPage from './pages/HowToPage'
import type { PlaylistEntry, PlaylistMetadata, VideoMetadata } from '../../shared/ipc-types'
import { createTaskTracker, type ActiveStatus } from './services/downloadTracker'
import { progressLabel } from './utils/progressLabel'
import './App.css'

// Session-only history (no persistence): cleared whenever the app restarts.
const MAX_HISTORY_ENTRIES = 20

type View = 'main' | 'about' | 'howto'

function App(): JSX.Element {
  const [view, setView] = useState<View>('main')
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [playlist, setPlaylist] = useState<PlaylistMetadata | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [taskStatus, setTaskStatus] = useState<ActiveStatus>('downloading')
  const [retry, setRetry] = useState({ count: 0, max: 0 })
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [downloadPath, setDownloadPath] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const [mode, setMode] = useState<DownloadMode>('sencilla')
  const [format, setFormat] = useState('video')
  const [quality, setQuality] = useState('1080')

  const [queuePaused, setQueuePaused] = useState(false)
  const [queuePendingCount, setQueuePendingCount] = useState(0)
  const [queueCurrentProgress, setQueueCurrentProgress] = useState<number | null>(null)

  // What the progress bar follows: a single task id or a playlist batch id.
  const latestTaskRef = useRef<string | null>(null)
  const queueWatcherRef = useRef<number | null>(null)
  const [tracker] = useState(() => createTaskTracker(window.api.getProgressBatch))

  const resolvedQuality = mode === 'avanzada' ? quality : '1080'
  const formatLabel = format === 'audio' ? 'Audio' : `Video ${resolvedQuality}p`

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      if (!('error' in cfg)) setDownloadPath(cfg.download_path)
    })
  }, [])

  const handleChoosePath = async (): Promise<void> => {
    const chosen = await window.api.chooseDownloadPath()
    if (!chosen) return
    const result = await window.api.setConfig({ download_path: chosen })
    if (!('error' in result)) setDownloadPath(result.download_path)
  }

  const handleGetInfo = async (url: string): Promise<void> => {
    setLoadingInfo(true)
    setError('')
    setMetadata(null)
    setPlaylist(null)
    setProgress(0)

    const result = await window.api.getInfo(url)
    setLoadingInfo(false)

    if ('error' in result) {
      setError(result.error)
    } else if (result.type === 'playlist') {
      setPlaylist(result)
    } else {
      setMetadata(result)
    }
  }

  const addToHistory = (entry: HistoryEntry, path?: string): void => {
    const finalEntry = path ? { ...entry, path } : entry
    setHistory((prev) => [finalEntry, ...prev].slice(0, MAX_HISTORY_ENTRIES))
  }

  // Every queued download is followed until it finishes, so each one lands in
  // history (or shows its error) even after newer downloads are queued. The
  // progress bar shows the most recently queued download.
  const pollProgress = (taskId: string, entry: HistoryEntry): void => {
    latestTaskRef.current = taskId
    const isLatest = (): boolean => latestTaskRef.current === taskId

    tracker.track(taskId, {
      onProgress: (update) => {
        if (!isLatest()) return
        setProgress(update.progress)
        setTaskStatus(update.status)
        setRetry({ count: update.retry ?? 0, max: update.max_retries ?? 0 })
      },
      onCompleted: (update) => {
        if (isLatest()) {
          setProgress(update.progress)
          setDownloading(false)
        }
        addToHistory(entry, update.path)
      },
      onError: (message) => {
        if (isLatest()) setDownloading(false)
        setError(message)
      }
    })
  }

  const ensureQueueWatcher = (): void => {
    if (queueWatcherRef.current !== null) return
    queueWatcherRef.current = window.setInterval(async () => {
      const status = await window.api.getQueue()
      if ('error' in status) return

      setQueuePendingCount(status.queue.length)
      setQueuePaused(status.paused)
      setQueueCurrentProgress(status.current ? status.current.progress : null)

      if (!status.current && status.queue.length === 0 && queueWatcherRef.current !== null) {
        clearInterval(queueWatcherRef.current)
        queueWatcherRef.current = null
      }
    }, 700)
  }

  const handleTogglePause = async (): Promise<void> => {
    const result = queuePaused ? await window.api.resumeQueue() : await window.api.pauseQueue()
    if ('error' in result) setError(result.error)
  }

  const handleOpenFolder = (path: string): void => {
    window.api.openInFolder(path)
  }

  const handleDownload = async (): Promise<void> => {
    if (!metadata) return
    setDownloading(true)
    setError('')
    setProgress(0)
    setTaskStatus('pending')
    setRetry({ count: 0, max: 0 })
    setBatch(null)

    const result = await window.api.download(metadata.url, format, resolvedQuality, metadata.title)

    if ('error' in result || !result.success) {
      setDownloading(false)
      setError('error' in result ? result.error : 'La descarga falló')
      return
    }

    const entry: HistoryEntry = {
      title: metadata.title,
      format: formatLabel,
      path: downloadPath,
      thumbnail: metadata.thumbnail
    }
    pollProgress(result.task_id, entry)
    ensureQueueWatcher()
  }

  // Queues each selected video as its own download. The progress bar counts
  // finished videos (completed or failed) of this playlist.
  const handleDownloadPlaylist = async (entries: PlaylistEntry[]): Promise<void> => {
    setPlaylist(null)
    setError('')
    const batchId = `playlist-${Date.now()}`
    latestTaskRef.current = batchId
    const isLatest = (): boolean => latestTaskRef.current === batchId
    const total = entries.length
    setBatch({ done: 0, total })
    setProgress(0)
    setDownloading(true)
    ensureQueueWatcher()

    let done = 0
    const markDone = (): void => {
      done += 1
      if (!isLatest()) return
      setBatch({ done, total })
      setProgress(Math.round((done / total) * 100))
      if (done === total) setDownloading(false)
    }

    for (const video of entries) {
      const result = await window.api.download(video.url, format, resolvedQuality, video.title)
      if ('error' in result || !result.success) {
        setError(`${video.title}: ${'error' in result ? result.error : 'La descarga falló'}`)
        markDone()
        continue
      }
      const entry: HistoryEntry = {
        title: video.title,
        format: formatLabel,
        path: downloadPath,
        thumbnail: video.thumbnail ?? undefined
      }
      tracker.track(result.task_id, {
        onProgress: () => {},
        onCompleted: (update) => {
          addToHistory(entry, update.path)
          markDone()
        },
        onError: (message) => {
          setError(`${video.title}: ${message}`)
          markDone()
        }
      })
    }
  }

  const label = progressLabel({
    downloading,
    status: taskStatus,
    progress,
    retry: retry.count,
    maxRetries: retry.max,
    batch
  })

  if (view === 'about') {
    return (
      <div className="app">
        <Header />
        <AboutPage onBack={() => setView('main')} />
      </div>
    )
  }

  if (view === 'howto') {
    return (
      <div className="app">
        <Header />
        <HowToPage onBack={() => setView('main')} />
      </div>
    )
  }

  return (
    <div className="app">
      <Header />

      <UrlInput onSubmit={handleGetInfo} loading={loadingInfo} />

      <PreviewPanel metadata={metadata} />

      <ModeControls
        mode={mode}
        onModeChange={setMode}
        format={format}
        onFormatChange={setFormat}
        quality={quality}
        onQualityChange={setQuality}
      />

      <DownloadPathRow path={downloadPath} onChoosePath={handleChoosePath} />

      <DownloadRow
        disabled={!metadata}
        progress={progress}
        progressLabel={label}
        onClick={handleDownload}
      />

      <QueueSection
        paused={queuePaused}
        pendingCount={queuePendingCount}
        currentProgress={queueCurrentProgress}
        onTogglePause={handleTogglePause}
      />

      {error && <p className="app__error">{error}</p>}

      <HistorySection items={history} onOpenFolder={handleOpenFolder} />

      <Footer onAboutClick={() => setView('about')} onHowToClick={() => setView('howto')} />

      {playlist && (
        <PlaylistModal
          playlist={playlist}
          formatLabel={formatLabel}
          onCancel={() => setPlaylist(null)}
          onConfirm={handleDownloadPlaylist}
        />
      )}
    </div>
  )
}

export default App
