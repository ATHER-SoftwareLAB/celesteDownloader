import { useEffect, useState } from 'react'
import type { PlaylistEntry, PlaylistMetadata } from '../../../shared/ipc-types'
import { formatDuration } from '../utils/formatDuration'
import { PlaylistSelection, selectEntries, selectionError } from '../utils/playlistSelection'

interface PlaylistModalProps {
  playlist: PlaylistMetadata
  /** How each video will be saved, e.g. "Video 1080p" or "Audio". */
  formatLabel: string
  onCancel: () => void
  onConfirm: (entries: PlaylistEntry[]) => void
}

type SelectionKind = PlaylistSelection['kind']

const DEFAULT_COUNT = 10

function totalDuration(entries: PlaylistEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0)
}

function PlaylistModal({ playlist, formatLabel, onCancel, onConfirm }: PlaylistModalProps): JSX.Element {
  const { entries } = playlist
  const [kind, setKind] = useState<SelectionKind>('all')
  const [firstCount, setFirstCount] = useState(String(DEFAULT_COUNT))
  const [lastCount, setLastCount] = useState(String(DEFAULT_COUNT))
  const [rangeFrom, setRangeFrom] = useState('1')
  const [rangeTo, setRangeTo] = useState(String(Math.min(DEFAULT_COUNT, entries.length)))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const selection: PlaylistSelection =
    kind === 'first'
      ? { kind, count: Number(firstCount) }
      : kind === 'last'
        ? { kind, count: Number(lastCount) }
        : kind === 'range'
          ? { kind, from: Number(rangeFrom), to: Number(rangeTo) }
          : { kind: 'all' }

  const error =
    entries.length === 0
      ? 'Esta lista no tiene videos que se puedan descargar'
      : selectionError(selection, entries.length)
  const selected = error ? [] : selectEntries(entries, selection)

  const option = (value: SelectionKind, label: string): JSX.Element => (
    <input
      type="radio"
      name="playlist-selection"
      value={value}
      checked={kind === value}
      onChange={() => setKind(value)}
      aria-label={label}
    />
  )

  const numberInput = (
    value: string,
    onChange: (value: string) => void,
    selects: SelectionKind,
    label: string
  ): JSX.Element => (
    <input
      type="number"
      min={1}
      className="playlist-modal__number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setKind(selects)}
      aria-label={label}
    />
  )

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="playlist-modal-title">
        <h2 id="playlist-modal-title" className="modal__title">
          {playlist.is_channel ? 'Descargar canal' : 'Descargar playlist'}
        </h2>

        <div className="playlist-modal__summary">
          <p className="playlist-modal__name">{playlist.title}</p>
          {playlist.uploader && <p>De {playlist.uploader}</p>}
          <p>
            Videos: {entries.length} · Duración total: {formatDuration(totalDuration(entries))}
          </p>
          {playlist.is_channel && (
            <p className="playlist-modal__note">
              Se listan los {entries.length} videos más recientes del canal, del más nuevo al más
              antiguo.
            </p>
          )}
          {playlist.unavailable_count > 0 && (
            <p className="playlist-modal__note">
              Se omitieron {playlist.unavailable_count} videos privados o eliminados.
            </p>
          )}
        </div>

        <fieldset className="playlist-modal__options">
          <legend>¿Qué videos quieres descargar?</legend>
          <label>
            {option('all', 'Todos')} Todos
          </label>
          <label>
            {option('first', 'Primeros')} Primeros{' '}
            {numberInput(firstCount, setFirstCount, 'first', 'Cantidad de primeros videos')}
          </label>
          <label>
            {option('last', 'Últimos')} Últimos{' '}
            {numberInput(lastCount, setLastCount, 'last', 'Cantidad de últimos videos')}
          </label>
          <label>
            {option('range', 'Rango')} Del{' '}
            {numberInput(rangeFrom, setRangeFrom, 'range', 'Inicio del rango')} al{' '}
            {numberInput(rangeTo, setRangeTo, 'range', 'Fin del rango')}
          </label>
        </fieldset>

        {error ? (
          <p className="playlist-modal__error">{error}</p>
        ) : (
          <p className="playlist-modal__note">
            Se agregarán {selected.length} videos a la cola como {formatLabel} (
            {formatDuration(totalDuration(selected))}).
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="modal__btn" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--primary"
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
            autoFocus
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlaylistModal
