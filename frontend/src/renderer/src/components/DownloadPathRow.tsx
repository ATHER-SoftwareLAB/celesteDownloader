import FolderIcon from './FolderIcon'

interface DownloadPathRowProps {
  path: string
  onChoosePath: () => void
}

function DownloadPathRow({ path, onChoosePath }: DownloadPathRowProps): JSX.Element {
  return (
    <div className="path-row">
      <span>Ruta de descarga: {path}</span>
      <button
        type="button"
        className="icon-btn"
        onClick={onChoosePath}
        aria-label="Elegir carpeta de descarga"
      >
        <FolderIcon />
      </button>
    </div>
  )
}

export default DownloadPathRow
