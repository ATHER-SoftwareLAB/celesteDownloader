interface DownloadRowProps {
  disabled: boolean
  progress: number
  progressLabel: string
  onClick: () => void
}

function DownloadRow({ disabled, progress, progressLabel, onClick }: DownloadRowProps): JSX.Element {
  return (
    <div className="download-row">
      <button className="download-row__btn" onClick={onClick} disabled={disabled}>
        Descargar
      </button>
      <div className="download-row__progress">
        <div className="download-row__progress-fill" style={{ width: `${progress}%` }} />
        <span className="download-row__progress-text">{progressLabel}</span>
      </div>
    </div>
  )
}

export default DownloadRow
