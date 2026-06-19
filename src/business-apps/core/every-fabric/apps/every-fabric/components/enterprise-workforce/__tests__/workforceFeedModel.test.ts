import { buildFeed, foldThroughput } from '../workforceFeedModel'
import type { WorkforceActiveOverview, WorkforceActiveRun, WorkforceRecentRun } from '../workforceTypes'

function activeRun(overrides: Partial<WorkforceActiveRun> = {}): WorkforceActiveRun {
  return {
    session_id: 's-active',
    agent_id: 'a-1',
    status: 'running',
    input: 'do work',
    current_activity: 'Searching CRM',
    last_seq: 0,
    started_at: '2026-06-01T12:00:00Z',
    ...overrides
  }
}

function recentRun(overrides: Partial<WorkforceRecentRun> = {}): WorkforceRecentRun {
  return {
    session_id: 's-done',
    agent_id: 'a-2',
    status: 'completed',
    credits: 4,
    started_at: '2026-06-01T11:58:00Z',
    completed_at: '2026-06-01T11:59:00Z',
    duration_ms: 60000,
    ...overrides
  }
}

function overview(overrides: Partial<WorkforceActiveOverview> = {}): WorkforceActiveOverview {
  return {
    count: 0,
    status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
    agents_working: [],
    by_agent: {},
    runs: [],
    recent_completed: [],
    ...overrides
  }
}

describe('buildFeed', () => {
  it('returns an empty feed for a null overview', () => {
    expect(buildFeed(null, new Set())).toEqual([])
  })

  it('merges active + finished runs newest-first', () => {
    const feed = buildFeed(
      overview({
        runs: [activeRun({ session_id: 's-active', started_at: '2026-06-01T12:05:00Z' })],
        recent_completed: [recentRun({ session_id: 's-done', completed_at: '2026-06-01T12:01:00Z' })]
      }),
      new Set()
    )
    expect(feed.map(item => item.key)).toEqual(['s-active', 's-done'])
    expect(feed[0].kind).toBe('active')
    expect(feed[1].kind).toBe('finished')
    expect(feed[1].durationMs).toBe(60000)
  })

  it('flags newly-appeared active runs as new', () => {
    const feed = buildFeed(overview({ runs: [activeRun({ session_id: 's-new' })] }), new Set(['s-new']))
    expect(feed[0].isNew).toBe(true)
  })

  it('does not duplicate a run that is both active and finished', () => {
    const feed = buildFeed(
      overview({
        runs: [activeRun({ session_id: 'dup' })],
        recent_completed: [recentRun({ session_id: 'dup' })]
      }),
      new Set()
    )
    expect(feed).toHaveLength(1)
    expect(feed[0].kind).toBe('finished')
  })

  it('surfaces flow-pending runs as finished items flagged pendingFlowApproval', () => {
    const feed = buildFeed(
      overview({
        flow_pending: [
          activeRun({
            session_id: 's-flow',
            status: 'completed',
            pending_flow_approval: true,
            pending_human_question: 'Awaiting approval: Human Approval of Proposed Patch',
            updated_at: '2026-06-01T12:10:00Z'
          })
        ]
      }),
      new Set()
    )
    expect(feed).toHaveLength(1)
    expect(feed[0].key).toBe('s-flow')
    expect(feed[0].kind).toBe('finished')
    expect(feed[0].pendingFlowApproval).toBe(true)
    expect(feed[0].currentActivity).toBe('Awaiting approval: Human Approval of Proposed Patch')
  })

  it('does not duplicate a flow-pending run already present as active', () => {
    const feed = buildFeed(
      overview({
        runs: [activeRun({ session_id: 'dup' })],
        flow_pending: [activeRun({ session_id: 'dup', pending_flow_approval: true })]
      }),
      new Set()
    )
    expect(feed).toHaveLength(1)
    expect(feed[0].kind).toBe('active')
  })
})

describe('foldThroughput', () => {
  it('counts completions in the last hour and buckets them', () => {
    const now = Date.parse('2026-06-01T12:00:00Z')
    const history = new Map<string, number>()
    const recent = [
      recentRun({ session_id: 'r1', completed_at: '2026-06-01T11:59:00Z' }),
      recentRun({ session_id: 'r2', completed_at: '2026-06-01T11:30:00Z' })
    ]
    const result = foldThroughput(history, recent, now)
    expect(result.count).toBe(2)
    expect(result.buckets).toHaveLength(12)
    expect(result.buckets[result.buckets.length - 1]).toBe(1) // r1 is most recent bucket
  })

  it('prunes completions older than an hour', () => {
    const now = Date.parse('2026-06-01T12:00:00Z')
    const history = new Map<string, number>([['old', Parse('2026-06-01T10:00:00Z')]])
    const result = foldThroughput(history, [], now)
    expect(result.count).toBe(0)
  })
})

function Parse(iso: string): number {
  return Date.parse(iso)
}
