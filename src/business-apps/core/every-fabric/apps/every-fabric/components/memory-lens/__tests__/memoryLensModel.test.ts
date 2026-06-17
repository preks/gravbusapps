import { computeStats, cleanMemoryBody, formatMemoryTitle, type MemoryLensEntry } from '../memoryLensModel'

const entry = (overrides: Partial<MemoryLensEntry>): MemoryLensEntry => ({
  key: 'k',
  value: 'v',
  namespace: 'preferences',
  tags: [],
  entities: [],
  ...overrides
})

const fixture = (): MemoryLensEntry[] => [
  entry({ key: 'p1', namespace: 'preferences', tags: ['style'], salience: 2 }),
  entry({ key: 'd1', namespace: 'domain', tags: ['budget', 'q1'], entities: ['Acme'], salience: 8 }),
  entry({ key: 'd2', namespace: 'domain', tags: ['budget'], entities: ['Acme', 'Finance'], salience: 9 }),
  entry({ key: 's1', namespace: 'skills', tags: ['budget'], salience: 5 }),
  entry({
    key: 'e1',
    namespace: 'episodes',
    tags: ['hiring'],
    entities: ['Finance'],
    occurredAt: '2026-06-10T12:00:00.000Z'
  })
]

describe('computeStats', () => {
  const stats = computeStats(fixture())

  it('counts total and per-namespace entries', () => {
    expect(stats.total).toBe(5)
    const byNs = Object.fromEntries(stats.perNamespace.map(n => [n.namespace, n.count]))
    expect(byNs.preferences).toBe(1)
    expect(byNs.domain).toBe(2)
    expect(byNs.skills).toBe(1)
    expect(byNs.episodes).toBe(1)
  })

  it('ranks top tags by frequency', () => {
    expect(stats.topTags[0]).toEqual({ label: 'budget', count: 3 })
  })

  it('ranks top entities by frequency', () => {
    const acme = stats.topEntities.find(e => e.label === 'Acme')
    const finance = stats.topEntities.find(e => e.label === 'Finance')
    expect(acme?.count).toBe(2)
    expect(finance?.count).toBe(2)
  })

  it('buckets salience and counts high-salience entries (>=7)', () => {
    const byBucket = Object.fromEntries(stats.salienceBuckets.map(b => [b.id, b.count]))
    // p1=2 (routine), e1 default 1 (routine) -> 2; s1=5 (notable); d1=8 (important); d2=9 (critical)
    expect(byBucket.routine).toBe(2)
    expect(byBucket.notable).toBe(1)
    expect(byBucket.important).toBe(1)
    expect(byBucket.critical).toBe(1)
    expect(stats.highSalienceCount).toBe(2)
  })

  it('reports the most recent timestamp', () => {
    expect(stats.lastUpdated).toBe('2026-06-10T12:00:00.000Z')
  })

  it('handles an empty entry set', () => {
    const empty = computeStats([])
    expect(empty.total).toBe(0)
    expect(empty.topTags).toEqual([])
    expect(empty.highSalienceCount).toBe(0)
    expect(empty.lastUpdated).toBeUndefined()
  })
})

describe('cleanMemoryBody', () => {
  it('strips markdown headings, bullets and emphasis markers', () => {
    expect(cleanMemoryBody('### Summary\n- **Important** point')).toBe('Summary Important point')
  })
})

describe('formatMemoryTitle', () => {
  it('prettifies a dashed key when no title is present', () => {
    expect(formatMemoryTitle(entry({ key: 'org-headcount-dashboard' }))).toBe('Org headcount dashboard')
  })

  it('prefers an explicit title', () => {
    expect(formatMemoryTitle(entry({ key: 'k', title: 'My title' }))).toBe('My title')
  })
})
