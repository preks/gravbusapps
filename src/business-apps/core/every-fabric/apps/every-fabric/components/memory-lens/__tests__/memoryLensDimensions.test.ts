import type { MemoryLensEntry } from '../memoryLensModel'
import { buildMonthGrid, countByDay, dayKey, facetIndex, groupByDay, monthRangeIso } from '../memoryLensDimensions'

const entry = (overrides: Partial<MemoryLensEntry>): MemoryLensEntry => ({
  key: 'k',
  value: 'v',
  namespace: 'episodes',
  tags: [],
  entities: [],
  ...overrides
})

describe('groupByDay', () => {
  it('buckets entries by local day, newest first, and isolates undated', () => {
    const entries = [
      entry({ key: 'a', occurredAt: '2026-06-10T09:00:00' }),
      entry({ key: 'b', occurredAt: '2026-06-10T18:00:00' }),
      entry({ key: 'c', occurredAt: '2026-06-12T08:00:00' }),
      entry({ key: 'd' })
    ]
    const { dated, undated } = groupByDay(entries)
    expect(dated).toHaveLength(2)
    expect(dated[0].key).toBe('2026-06-12')
    expect(dated[1].key).toBe('2026-06-10')
    expect(dated[1].entries.map(e => e.key)).toEqual(['b', 'a'])
    expect(undated.map(e => e.key)).toEqual(['d'])
  })
})

describe('countByDay', () => {
  it('counts entries per day key', () => {
    const counts = countByDay([
      entry({ occurredAt: '2026-06-10T09:00:00' }),
      entry({ occurredAt: '2026-06-10T10:00:00' }),
      entry({ occurredAt: '2026-06-11T10:00:00' }),
      entry({})
    ])
    expect(counts.get('2026-06-10')).toBe(2)
    expect(counts.get('2026-06-11')).toBe(1)
    expect(counts.size).toBe(2)
  })
})

describe('buildMonthGrid', () => {
  const grid = buildMonthGrid(2026, 5, countByDay([entry({ occurredAt: '2026-06-15T12:00:00' })]))

  it('returns a 6x7 Monday-first grid', () => {
    expect(grid).toHaveLength(6)
    grid.forEach(week => expect(week).toHaveLength(7))
    expect(grid[0][0].date.getDay()).toBe(1) // Monday
  })

  it('flags in-month days and attaches counts', () => {
    const target = grid.flat().find(cell => cell.key === '2026-06-15')
    expect(target?.inMonth).toBe(true)
    expect(target?.count).toBe(1)
  })
})

describe('monthRangeIso', () => {
  it('spans the whole local month', () => {
    const { dateFrom, dateTo } = monthRangeIso(2026, 5)
    expect(new Date(dateFrom).getDate()).toBe(1)
    expect(dayKey(new Date(dateTo))).toBe('2026-06-30')
  })
})

describe('facetIndex', () => {
  const entries = [
    entry({ key: 'a', tags: ['budget', 'q1'], entities: ['Acme'] }),
    entry({ key: 'b', tags: ['budget'], entities: ['Acme', 'Finance'] }),
    entry({ key: 'c', tags: ['budget', 'budget'], entities: [] })
  ]

  it('ranks topics by frequency and de-dupes within an entry', () => {
    const { items, byValue } = facetIndex(entries, 'topic')
    expect(items[0]).toEqual({ label: 'budget', count: 3 })
    expect(byValue.get('budget')?.map(e => e.key)).toEqual(['a', 'b', 'c'])
  })

  it('indexes entities', () => {
    const { items } = facetIndex(entries, 'entity')
    const acme = items.find(i => i.label === 'Acme')
    expect(acme?.count).toBe(2)
  })
})
