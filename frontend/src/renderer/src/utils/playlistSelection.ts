export type PlaylistSelection =
  | { kind: 'all' }
  | { kind: 'first'; count: number }
  | { kind: 'last'; count: number }
  /** 1-based, inclusive on both ends. */
  | { kind: 'range'; from: number; to: number }

/** Why the selection can't be used with a list of `total` items, or null if it can. */
export function selectionError(selection: PlaylistSelection, total: number): string | null {
  const isPositiveInt = (n: number): boolean => Number.isInteger(n) && n >= 1

  switch (selection.kind) {
    case 'all':
      return null
    case 'first':
    case 'last':
      return isPositiveInt(selection.count) ? null : 'Indica una cantidad de videos mayor a 0'
    case 'range':
      if (!isPositiveInt(selection.from) || !isPositiveInt(selection.to)) {
        return 'Indica un rango con números mayores a 0'
      }
      if (selection.from > selection.to) return 'El inicio del rango debe ser menor o igual al final'
      if (selection.from > total) return `La lista solo tiene ${total} videos`
      return null
  }
}

/** The items the selection picks, in list order. Counts beyond the list are clamped. */
export function selectEntries<T>(entries: T[], selection: PlaylistSelection): T[] {
  switch (selection.kind) {
    case 'all':
      return entries
    case 'first':
      return entries.slice(0, selection.count)
    case 'last':
      return entries.slice(-selection.count)
    case 'range':
      return entries.slice(selection.from - 1, selection.to)
  }
}
