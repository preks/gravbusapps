import { mapAndSortCatalogEntries, mapCatalogEntry } from './ChangeCommunicationQueries'

describe('mapCatalogEntry', () => {
  it('uses the localized label when a translation exists', () => {
    const result = mapCatalogEntry({
      id: 'a',
      value: 'PRIMARY',
      displayOrder: 1,
      translations: [{ value: 'Primary' }]
    })
    expect(result).toEqual({ id: 'a', value: 'PRIMARY', label: 'Primary', displayOrder: 1 })
  })

  it('falls back to the raw value when no translation is available', () => {
    const result = mapCatalogEntry({ id: 'a', value: 'PRIMARY', displayOrder: 2 })
    expect(result.label).toBe('PRIMARY')
    expect(result.displayOrder).toBe(2)
  })

  it('treats missing/invalid displayOrder as +Infinity so those entries sink to the end', () => {
    const missing = mapCatalogEntry({ id: 'a', value: 'X' })
    expect(missing.displayOrder).toBe(Number.POSITIVE_INFINITY)

    const empty = mapCatalogEntry({ id: 'b', value: 'Y', displayOrder: '' })
    expect(empty.displayOrder).toBe(Number.POSITIVE_INFINITY)

    const bad = mapCatalogEntry({ id: 'c', value: 'Z', displayOrder: 'not-a-number' })
    expect(bad.displayOrder).toBe(Number.POSITIVE_INFINITY)
  })

  it('coerces stringified displayOrder values to numbers so they sort numerically', () => {
    const result = mapCatalogEntry({ id: 'a', value: 'X', displayOrder: '10' })
    expect(result.displayOrder).toBe(10)
  })
})

describe('mapAndSortCatalogEntries (regression for issue 712692fe — Private Communication Type order)', () => {
  it('orders Primary / Secondary / Temporary by catalog displayOrder regardless of server response order', () => {
    // Reproduces the report: Change Private Communication shows Temporary, Secondary, Primary
    // even though the catalog Display Order is 1=Primary, 2=Secondary, 3=Temporary.
    const apiResponse = [
      { id: 'temporary-id', value: 'TEMPORARY', displayOrder: 3, translations: [{ value: 'Temporary' }] },
      { id: 'secondary-id', value: 'SECONDARY', displayOrder: 2, translations: [{ value: 'Secondary' }] },
      { id: 'primary-id', value: 'PRIMARY', displayOrder: 1, translations: [{ value: 'Primary' }] }
    ]

    const sorted = mapAndSortCatalogEntries(apiResponse)

    expect(sorted.map(o => o.label)).toEqual(['Primary', 'Secondary', 'Temporary'])
    expect(sorted.map(o => o.id)).toEqual(['primary-id', 'secondary-id', 'temporary-id'])
  })

  it('returns an empty array for null / undefined input', () => {
    expect(mapAndSortCatalogEntries(undefined)).toEqual([])
    expect(mapAndSortCatalogEntries(null)).toEqual([])
  })

  it('falls back to a stable alphabetical order when displayOrder ties', () => {
    const apiResponse = [
      { id: 'b', value: 'BANANA', displayOrder: 1, translations: [{ value: 'Banana' }] },
      { id: 'a', value: 'APPLE', displayOrder: 1, translations: [{ value: 'Apple' }] }
    ]
    const sorted = mapAndSortCatalogEntries(apiResponse)
    expect(sorted.map(o => o.label)).toEqual(['Apple', 'Banana'])
  })

  it('pushes entries with missing displayOrder to the end (rather than randomly mixing them in)', () => {
    const apiResponse = [
      { id: 'no-order', value: 'NO_ORDER', translations: [{ value: 'No order' }] },
      { id: 'p', value: 'PRIMARY', displayOrder: 1, translations: [{ value: 'Primary' }] },
      { id: 's', value: 'SECONDARY', displayOrder: 2, translations: [{ value: 'Secondary' }] }
    ]
    const sorted = mapAndSortCatalogEntries(apiResponse)
    expect(sorted.map(o => o.label)).toEqual(['Primary', 'Secondary', 'No order'])
  })
})
