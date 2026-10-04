import { describe, expect, it } from 'vitest'
import { selectEntries, selectionError } from './playlistSelection'

const items = ['v1', 'v2', 'v3', 'v4', 'v5']

describe('selectEntries', () => {
  it('picks everything', () => {
    expect(selectEntries(items, { kind: 'all' })).toEqual(items)
  })

  it('picks the first N', () => {
    expect(selectEntries(items, { kind: 'first', count: 2 })).toEqual(['v1', 'v2'])
  })

  it('picks the last N', () => {
    expect(selectEntries(items, { kind: 'last', count: 2 })).toEqual(['v4', 'v5'])
  })

  it('picks an inclusive 1-based range', () => {
    expect(selectEntries(items, { kind: 'range', from: 2, to: 4 })).toEqual(['v2', 'v3', 'v4'])
  })

  it('clamps counts and ranges beyond the list', () => {
    expect(selectEntries(items, { kind: 'first', count: 50 })).toEqual(items)
    expect(selectEntries(items, { kind: 'last', count: 50 })).toEqual(items)
    expect(selectEntries(items, { kind: 'range', from: 4, to: 50 })).toEqual(['v4', 'v5'])
  })
})

describe('selectionError', () => {
  it('accepts valid selections', () => {
    expect(selectionError({ kind: 'all' }, 5)).toBeNull()
    expect(selectionError({ kind: 'first', count: 3 }, 5)).toBeNull()
    expect(selectionError({ kind: 'range', from: 5, to: 9 }, 5)).toBeNull()
  })

  it('rejects zero, negative or fractional counts', () => {
    expect(selectionError({ kind: 'first', count: 0 }, 5)).not.toBeNull()
    expect(selectionError({ kind: 'last', count: -1 }, 5)).not.toBeNull()
    expect(selectionError({ kind: 'first', count: 1.5 }, 5)).not.toBeNull()
    expect(selectionError({ kind: 'first', count: NaN }, 5)).not.toBeNull()
  })

  it('rejects an inverted range', () => {
    expect(selectionError({ kind: 'range', from: 4, to: 2 }, 5)).toMatch(/menor o igual/)
  })

  it('rejects a range that starts after the end of the list', () => {
    expect(selectionError({ kind: 'range', from: 6, to: 8 }, 5)).toBe('La lista solo tiene 5 videos')
  })
})
