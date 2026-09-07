import { useEffect, useState } from 'react'
import Header from './components/Header'
import UrlInput from './components/UrlInput'
import PreviewPanel from './components/PreviewPanel'
import ModeControls, { DownloadMode } from './components/ModeControls'
import DownloadPathRow from './components/DownloadPathRow'
import DownloadRow from './components/DownloadRow'
import HistorySection, { HistoryEntry } from './components/HistorySection'
import Footer from './components/Footer'
import type { VideoMetadata } from '../../shared/ipc-types'
import './App.css'

const MOCK_HISTORY: HistoryEntry[] = [
  { title: 'TITULO DE VIDEO 1', format: 'Video 1080p', path: 'c:/descargas' },
  { title: 'TITULO DE VIDEO 2', format: 'Video 1080p', path: 'c:/videos' },
  { title: 'TITULO DE VIDEO 3', format: 'Video 1080p', path: 'c:/desktop' }
]

function App(): JSX.Element {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [downloadPath, setDownloadPath] = useState('')

  const [mode, setMode] = useState<DownloadMode>('sencilla')
  const [format, setFormat] = useState('video')
  const [quality, setQuality] = useState('1080')

  useEffect(() => {
    window.api.getDownloadPath().then(setDownloadPath)
  }, [])

  const handleGetInfo = async (url: string): Promise<void> => {
    setLoadingInfo(true)
    setError('')
    setMetadata(null)
    setProgress(0)

    const result = await window.api.getInfo(url)
    setLoadingInfo(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    setMetadata(result)
  }

  const pollProgress = (taskId: string): void => {
    const interval = setInterval(async () => {
      const update = await window.api.getProgress(taskId)

      if (!('status' in update)) {
        clearInterval(interval)
        setDownloading(false)
        setError(update.error)
        return
      }

      setProgress(update.progress)

      if (update.status === 'completed') {
        clearInterval(interval)
        setDownloading(false)
      } else if (update.status === 'error') {
        clearInterval(interval)
        setDownloading(false)
        setError(update.error ?? 'La descarga falló')
      }
    }, 500)
  }

  const handleDownload = async (): Promise<void> => {
    if (!metadata) return
    setDownloading(true)
    setError('')
    setProgress(0)

    const result = await window.api.download(
      metadata.url,
      format,
      mode === 'avanzada' ? quality : '1080'
    )

    if ('error' in result || !result.success) {
      setDownloading(false)
      setError('error' in result ? result.error : 'La descarga falló')
      return
    }
    pollProgress(result.task_id)
  }

  const progressLabel = downloading
    ? progress >= 100
      ? 'Procesando...'
      : `Descargando... ${progress}%`
    : `${progress}%`

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

      <DownloadPathRow path={downloadPath} onChoosePath={() => {}} />

      <DownloadRow
        disabled={!metadata || downloading}
        progress={progress}
        progressLabel={progressLabel}
        onClick={handleDownload}
      />

      {error && <p className="app__error">{error}</p>}

      <HistorySection items={MOCK_HISTORY} />

      <Footer />
    </div>
  )
}

export default App
