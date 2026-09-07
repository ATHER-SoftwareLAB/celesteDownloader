interface QueueSectionProps {
  paused: boolean
  pendingCount: number
  currentProgress: number | null
  onTogglePause: () => void
}

function QueueSection({
  paused,
  pendingCount,
  currentProgress,
  onTogglePause
}: QueueSectionProps): JSX.Element | null {
  if (pendingCount === 0 && currentProgress === null) return null

  return (
    <div className="queue-section">
      <span className="queue-section__status">
        {currentProgress !== null && `Procesando: ${currentProgress}% · `}
        En cola: {pendingCount}
      </span>
      <button type="button" className="queue-section__btn" onClick={onTogglePause}>
        {paused ? 'Reanudar' : 'Pausar'}
      </button>
    </div>
  )
}

export default QueueSection
