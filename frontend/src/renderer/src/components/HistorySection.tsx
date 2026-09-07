import FolderIcon from './FolderIcon'

export interface HistoryEntry {
  title: string
  format: string
  path: string
}

interface HistorySectionProps {
  items: HistoryEntry[]
}

function HistorySection({ items }: HistorySectionProps): JSX.Element {
  return (
    <div className="history">
      <h3>Últimos elementos descargados</h3>
      <div className="history__list">
        {items.map((item, i) => (
          <div className="history__item" key={`${item.title}-${i}`}>
            <div className="history__thumb">Miniatura {i + 1}</div>
            <div className="history__info">
              <p className="history__title">
                {item.title}
                <span className="history__format">Formato: {item.format}</span>
              </p>
              <p className="history__path">Ruta de descarga: {item.path}</p>
            </div>
            <FolderIcon />
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistorySection
