type DownloadMode = 'sencilla' | 'avanzada'

interface ModeControlsProps {
  mode: DownloadMode
  onModeChange: (mode: DownloadMode) => void
  format: string
  onFormatChange: (format: string) => void
  quality: string
  onQualityChange: (quality: string) => void
}

function ModeControls({
  mode,
  onModeChange,
  format,
  onFormatChange,
  quality,
  onQualityChange
}: ModeControlsProps): JSX.Element {
  const toggleMode = (): void => {
    onModeChange(mode === 'sencilla' ? 'avanzada' : 'sencilla')
  }

  return (
    <div className="mode-row">
      <div className="mode-row__group">
        <label>Tipo de descarga</label>
        <div className="toggle-switch">
          <span
            className={`toggle-switch__option${mode === 'sencilla' ? ' toggle-switch__option--active' : ''}`}
          >
            Sencilla
          </span>
          <button
            type="button"
            className={`toggle${mode === 'avanzada' ? ' toggle--on' : ''}`}
            onClick={toggleMode}
            aria-label="Alternar modo de descarga"
          >
            <span className="toggle__knob" />
          </button>
          <span
            className={`toggle-switch__option${mode === 'avanzada' ? ' toggle-switch__option--active' : ''}`}
          >
            Avanzada
          </span>
        </div>
      </div>

      <div className="mode-row__group">
        <label>Formato</label>
        <select value={format} onChange={(e) => onFormatChange(e.target.value)}>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>
      </div>

      {mode === 'avanzada' && (
        <div className="mode-row__group">
          <label>Calidad</label>
          <select value={quality} onChange={(e) => onQualityChange(e.target.value)}>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </select>
        </div>
      )}
    </div>
  )
}

export default ModeControls
export type { DownloadMode }
