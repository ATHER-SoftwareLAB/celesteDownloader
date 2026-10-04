import { describe, expect, it } from 'vitest'
import { progressLabel, ProgressState } from './progressLabel'

const base: ProgressState = {
  downloading: true,
  status: 'downloading',
  progress: 35,
  retry: 0,
  maxRetries: 3
}

describe('progressLabel', () => {
  it('shows the percentage while downloading', () => {
    expect(progressLabel(base)).toBe('Descargando... 35%')
  })

  it('shows the retry count while retrying', () => {
    expect(progressLabel({ ...base, retry: 1 })).toBe('Reintento 1 de 3... 35%')
  })

  it('shows queued tasks as waiting', () => {
    expect(progressLabel({ ...base, status: 'pending', progress: 0 })).toBe('En cola...')
  })

  it('shows post-processing once the download reaches 100%', () => {
    expect(progressLabel({ ...base, status: 'processing', progress: 100 })).toBe('Procesando...')
  })

  it('shows how many videos of a playlist are done', () => {
    expect(progressLabel({ ...base, batch: { done: 3, total: 10 } })).toBe('Playlist: 3 de 10')
    expect(progressLabel({ ...base, downloading: false, batch: { done: 10, total: 10 } })).toBe(
      'Playlist: 10 de 10'
    )
  })

  it('shows only the percentage when idle', () => {
    expect(progressLabel({ ...base, downloading: false, progress: 100 })).toBe('100%')
  })
})
