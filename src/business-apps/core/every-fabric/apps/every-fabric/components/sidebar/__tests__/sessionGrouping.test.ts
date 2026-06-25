import type { ActiveSessionSnapshot } from '../../../types/activeSession'
import type { FabricSessionSummary } from '../../../types/fabric'
import {
  filterActiveByQuery,
  filterRecentsByQuery,
  groupRecentsByDay,
  isActiveStatus,
  splitSessions
} from '../sessionGrouping'

const NOW = new Date('2026-04-21T12:00:00Z').getTime()

function makeActive(overrides: Partial<ActiveSessionSnapshot>): ActiveSessionSnapshot {
  return {
    session_id: overrides.session_id ?? 'active-1',
    input: 'Summarise the latest deal',
    status: 'running',
    skill: null,
    current_activity: { step: 'thinking', label: 'Reading documents' },
    todos_summary: { done: 0, total: 0 },
    trace_count: 0,
    next_event_seq: 0,
    started_at: null,
    updated_at: new Date(NOW).toISOString(),
    created_at: new Date(NOW).toISOString(),
    ...overrides
  }
}

function makeRecent(overrides: Partial<FabricSessionSummary>): FabricSessionSummary {
  return {
    session_id: overrides.session_id ?? 'recent-1',
    input: 'Old chat',
    status: 'completed',
    created_at: new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  } as FabricSessionSummary
}

describe('isActiveStatus', () => {
  it('classifies running / pending / waiting_for_human as active', () => {
    expect(isActiveStatus('running')).toBe(true)
    expect(isActiveStatus('pending')).toBe(true)
    expect(isActiveStatus('waiting_for_human')).toBe(true)
  })

  it('treats completed / failed / cancelled as inactive', () => {
    expect(isActiveStatus('completed')).toBe(false)
    expect(isActiveStatus('failed')).toBe(false)
    expect(isActiveStatus('cancelled')).toBe(false)
    expect(isActiveStatus(undefined)).toBe(false)
    expect(isActiveStatus(null)).toBe(false)
  })
})

describe('splitSessions', () => {
  it('deduplicates history entries that already exist in the live set', () => {
    const shared = makeRecent({ session_id: 'dup', status: 'running' })
    const otherRecent = makeRecent({ session_id: 'recent-only' })
    const live = makeActive({ session_id: 'dup' })

    const { active, recents } = splitSessions([shared, otherRecent], [live])

    expect(active).toHaveLength(1)
    expect(active[0].session_id).toBe('dup')
    expect(recents.map(r => r.session_id)).toEqual(['recent-only'])
  })

  it('filters out history rows whose status is still active even if no live snapshot yet', () => {
    const stillRunning = makeRecent({ session_id: 'running-1', status: 'running' })
    const done = makeRecent({ session_id: 'done-1', status: 'completed' })

    const { active, recents } = splitSessions([stillRunning, done], [])

    expect(active.map(s => s.session_id)).toEqual(['running-1'])
    expect(active[0].current_activity.label).toBe('Working...')
    expect(recents.map(r => r.session_id)).toEqual(['done-1'])
  })

  it('uses the live snapshot instead of the local active history fallback when available', () => {
    const stillRunning = makeRecent({ session_id: 'running-1', status: 'running' })
    const live = makeActive({
      session_id: 'running-1',
      current_activity: { step: 'thinking', label: 'Reading live stream' }
    })

    const { active, recents } = splitSessions([stillRunning], [live])

    expect(active).toHaveLength(1)
    expect(active[0].current_activity.label).toBe('Reading live stream')
    expect(recents).toEqual([])
  })
})

describe('groupRecentsByDay', () => {
  const fixedNow = new Date('2026-04-21T12:00:00Z')

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(fixedNow)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('buckets by Today / Yesterday / Earlier', () => {
    // Timestamps are chosen well inside each bucket so the test stays stable
    // regardless of the host system's timezone (buckets are computed in local time).
    const now = fixedNow.getTime()
    const hour = 60 * 60 * 1000
    const sessions = [
      makeRecent({ session_id: 'today-1', updated_at: new Date(now - 2 * hour).toISOString() }),
      makeRecent({ session_id: 'yesterday-1', updated_at: new Date(now - 30 * hour).toISOString() }),
      makeRecent({ session_id: 'earlier-1', updated_at: new Date(now - 7 * 24 * hour).toISOString() })
    ]

    const groups = groupRecentsByDay(sessions)
    expect(groups.map(g => g.label)).toEqual(['Today', 'Yesterday', 'Earlier'])
    expect(groups[0].sessions[0].session_id).toBe('today-1')
    expect(groups[1].sessions[0].session_id).toBe('yesterday-1')
    expect(groups[2].sessions[0].session_id).toBe('earlier-1')
  })

  it('skips empty buckets', () => {
    const tenDaysAgo = new Date(fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const groups = groupRecentsByDay([makeRecent({ session_id: 'earlier-1', updated_at: tenDaysAgo })])
    expect(groups.map(g => g.label)).toEqual(['Earlier'])
  })
})

describe('filterActiveByQuery / filterRecentsByQuery', () => {
  it('matches active sessions by input, activity label and skill name (case-insensitive)', () => {
    const sessions = [
      makeActive({
        session_id: 'a1',
        input: 'Draft the Q4 report',
        current_activity: { step: 'thinking', label: 'Reading documents' }
      }),
      makeActive({
        session_id: 'a2',
        input: 'Prepare deck',
        current_activity: { step: 'tool_call', label: 'Calling HubSpot' },
        skill: { id: 's1', name: 'CRM Insights' }
      })
    ]

    expect(filterActiveByQuery(sessions, 'report').map(s => s.session_id)).toEqual(['a1'])
    expect(filterActiveByQuery(sessions, 'hubspot').map(s => s.session_id)).toEqual(['a2'])
    expect(filterActiveByQuery(sessions, 'crm').map(s => s.session_id)).toEqual(['a2'])
    expect(filterActiveByQuery(sessions, '').map(s => s.session_id)).toEqual(['a1', 'a2'])
  })

  it('matches recents by input only (case-insensitive)', () => {
    const sessions = [
      makeRecent({ session_id: 'r1', input: 'Old Report' }),
      makeRecent({ session_id: 'r2', input: 'Different Thing' })
    ]

    expect(filterRecentsByQuery(sessions, 'REPORT').map(s => s.session_id)).toEqual(['r1'])
    expect(filterRecentsByQuery(sessions, '').map(s => s.session_id)).toEqual(['r1', 'r2'])
  })
})
