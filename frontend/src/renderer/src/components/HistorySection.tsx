import FolderIcon from './FolderIcon'

export interface HistoryEntry {
  title: string
  format: string
  path: string
  thumbnail?: string
}

interface HistorySectionProps {
  items: HistoryEntry[]
  onOpenFolder: (path: string) => void
}

function HistorySection({ items, onOpenFolder }: HistorySectionProps): JSX.Element {
  return (
    <div className="history">
      <h3>Últimos elementos descargados</h3>
      <div className="history__list">
        {items.map((item, i) => (
          <div className="history__item" key={`${item.title}-${i}`}>
            <div className="history__thumb">
              {item.thumbnail ? <img src={item.thumbnail} alt={item.title} /> : `Miniatura ${i + 1}`}
            </div>
            <div className="history__info">
              <p className="history__title">
                {item.title}
                <span className="history__format">Formato: {item.format}</span>
              </p>
              <p className="history__path">Ruta de descarga: {item.path}</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onOpenFolder(item.path)}
              aria-label="Abrir ubicación del archivo"
            >
              <FolderIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistorySection
