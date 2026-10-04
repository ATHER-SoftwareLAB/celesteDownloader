import type { VideoMetadata } from '../../../shared/ipc-types'
import { formatDuration } from '../utils/formatDuration'

interface PreviewPanelProps {
  metadata: VideoMetadata | null
}

function formatUploadDate(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`
}

function PreviewPanel({ metadata }: PreviewPanelProps): JSX.Element {
  return (
    <div className="preview-panel">
      <div className="preview-panel__thumb">
        {metadata ? (
          <img src={metadata.thumbnail} alt={metadata.title} />
        ) : (
          <span>
            Preview...
            <br />
            Esperando link
          </span>
        )}
      </div>
      <div className="preview-panel__info">
        <div
          className={`preview-panel__title-box${metadata ? ' preview-panel__title-box--filled' : ''}`}
        >
          {metadata ? metadata.title : 'Nombre del video'}
        </div>
        <div className="preview-panel__meta-box">
          <p>Subido por {metadata?.uploader ?? ''}</p>
          <p>Duración {metadata ? formatDuration(metadata.duration) : ''}</p>
          <p>Fecha {metadata ? formatUploadDate(metadata.upload_date) : ''}</p>
        </div>
      </div>
    </div>
  )
}

export default PreviewPanel
