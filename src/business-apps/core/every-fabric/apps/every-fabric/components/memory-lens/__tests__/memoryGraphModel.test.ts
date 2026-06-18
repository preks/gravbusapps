import type { MemoryLensEntry } from '../memoryLensModel'
import {
  createGraph,
  entityId,
  mergeEntries,
  matchNodes,
  memoryId,
  neighborIds,
  overviewToHubs,
  topicId
} from '../memoryGraphModel'

const entry = (overrides: Partial<MemoryLensEntry>): MemoryLensEntry => ({
  key: 'k',
  value: 'v',
  namespace: 'episodes',
  tags: [],
  entities: [],
  ...overrides
})

describe('overviewToHubs', () => {
  it('seeds topic and entity hubs with counts', () => {
    const graph = overviewToHubs(createGraph(), {
      topics: [{ label: 'Hiring', count: 12 }],
      entities: [{ label: 'Acme Corp', count: 4 }]
    })
    expect(graph.nodes.get(topicId('Hiring'))).toMatchObject({ kind: 'topic', label: 'Hiring', count: 12 })
    expect(graph.nodes.get(entityId('Acme Corp'))).toMatchObject({ kind: 'entity', label: 'Acme Corp', count: 4 })
    expect(graph.links.size).toBe(0)
  })

  it('updates hub counts without duplicating on re-seed', () => {
    const graph = overviewToHubs(createGraph(), { topics: [{ label: 'Hiring', count: 1 }] })
    overviewToHubs(graph, { topics: [{ label: 'hiring', count: 9 }] })
    expect(graph.nodes.size).toBe(1)
    expect(graph.nodes.get(topicId('Hiring'))?.count).toBe(9)
  })
})

describe('mergeEntries', () => {
  it('adds memory nodes linked to their topic and entity hubs', () => {
    const graph = mergeEntries(createGraph(), [entry({ key: 'm1', tags: ['hiring'], entities: ['Acme'] })])
    const memNode = graph.nodes.get(memoryId({ namespace: 'episodes', key: 'm1' }))
    expect(memNode?.kind).toBe('memory')
    expect(graph.nodes.get(topicId('hiring'))?.degree).toBe(1)
    expect(graph.nodes.get(entityId('Acme'))?.degree).toBe(1)
    expect(graph.links.size).toBe(2)
  })

  it('de-duplicates nodes and links when merging the same entry twice', () => {
    const graph = createGraph()
    mergeEntries(graph, [entry({ key: 'm1', tags: ['hiring'] })])
    mergeEntries(graph, [entry({ key: 'm1', tags: ['hiring'] })])
    expect(graph.nodes.size).toBe(2)
    expect(graph.links.size).toBe(1)
  })

  it('grows the degree of a shared hub as more memories reference it', () => {
    const graph = createGraph()
    mergeEntries(graph, [entry({ key: 'm1', tags: ['hiring'] })])
    mergeEntries(graph, [entry({ key: 'm2', tags: ['hiring'] })])
    expect(graph.nodes.get(topicId('hiring'))?.degree).toBe(2)
    expect(graph.links.size).toBe(2)
  })
})

describe('matchNodes', () => {
  it('matches by label and by memory body, case-insensitively', () => {
    const graph = mergeEntries(createGraph(), [
      entry({ key: 'm1', title: 'Quarterly hiring plan', value: 'plan body', tags: ['hiring'] })
    ])
    expect(matchNodes(graph, 'HIRING').has(topicId('hiring'))).toBe(true)
    expect(matchNodes(graph, 'quarterly').has(memoryId({ namespace: 'episodes', key: 'm1' }))).toBe(true)
    expect(matchNodes(graph, '').size).toBe(0)
  })
})

describe('neighborIds', () => {
  it('returns directly linked node ids in both directions', () => {
    const graph = mergeEntries(createGraph(), [entry({ key: 'm1', tags: ['hiring'], entities: ['Acme'] })])
    const mem = memoryId({ namespace: 'episodes', key: 'm1' })
    expect(neighborIds(graph, mem)).toEqual(new Set([topicId('hiring'), entityId('Acme')]))
    expect(neighborIds(graph, topicId('hiring'))).toEqual(new Set([mem]))
  })
})
