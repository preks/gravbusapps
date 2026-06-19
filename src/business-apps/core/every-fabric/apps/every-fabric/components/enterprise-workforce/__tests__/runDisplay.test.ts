/** @jest-environment jsdom */
import type { WorkforceRun } from '../workforceTypes'
import {
  formatLastRunLabel,
  formatTimestamp,
  readTotalTokens,
  runCredits,
  runDurationLabel,
  runStatusVisual,
  shortenInput,
  statusVisualForRun
} from '../runDisplay'

function buildRun(overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-1',
    workforce_trigger_id: null,
    status: 'completed',
    input: 'do thing',
    output: 'done',
    cost_summary: { total_tokens: 1500 },
    pending_human_question: null,
    workspace_id: 'ws',
    user_id: 'alice',
    started_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:00:30Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:30Z',
    ...overrides
  }
}

describe('runStatusVisual', () => {
  it('returns a known visual for each status', () => {
    expect(runStatusVisual('completed').label).toBe('Completed')
    expect(runStatusVisual('running').label).toBe('Running')
    expect(runStatusVisual('failed').label).toBe('Failed')
    expect(runStatusVisual('budget_paused').label).toBe('Budget paused')
    expect(runStatusVisual('filtered').label).toBe('Filtered')
  })
})

describe('statusVisualForRun', () => {
  it('mirrors runStatusVisual when no flow approval is pending', () => {
    expect(statusVisualForRun({ status: 'completed' }).label).toBe('Completed')
    expect(statusVisualForRun({ status: 'running' }).label).toBe('Running')
    expect(statusVisualForRun({ status: 'completed', pending_flow_approval: false }).label).toBe('Completed')
  })

  it('overrides a completed run paused on a flow approval to "Awaiting approval"', () => {
    const visual = statusVisualForRun({ status: 'completed', pending_flow_approval: true })
    expect(visual.label).toBe('Awaiting approval')
    // Reuses the amber waiting_for_human styling so the lane reads as actionable.
    expect(visual.pillClass).toBe(runStatusVisual('waiting_for_human').pillClass)
  })
})

describe('readTotalTokens / runCredits', () => {
  it('reads snake_case total_tokens', () => {
    expect(readTotalTokens(buildRun({ cost_summary: { total_tokens: 2500 } }))).toBe(2500)
  })

  it('reads camelCase totalTokens fallback', () => {
    expect(readTotalTokens(buildRun({ cost_summary: { totalTokens: 4000 } }))).toBe(4000)
  })

  it('reads tokens_used from CostGuard cost_summary', () => {
    expect(
      readTotalTokens(
        buildRun({
          cost_summary: {
            tokens_used: 3200,
            prompt_tokens: 2000,
            completion_tokens: 1200
          }
        })
      )
    ).toBe(3200)
  })

  it('derives total from prompt + completion when no aggregate field is set', () => {
    expect(
      readTotalTokens(
        buildRun({
          cost_summary: { prompt_tokens: 800, completion_tokens: 700 }
        })
      )
    ).toBe(1500)
  })

  it('returns 0 when cost_summary is missing', () => {
    expect(readTotalTokens(buildRun({ cost_summary: null }))).toBe(0)
  })

  it('credits round up via tokensToCredits', () => {
    expect(runCredits(buildRun({ cost_summary: { total_tokens: 1500 } }))).toBe(2)
  })
})

describe('runDurationLabel', () => {
  it('formats seconds-only durations', () => {
    const run = buildRun({
      started_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:00:12Z'
    })
    expect(runDurationLabel(run)).toBe('12s')
  })

  it('formats minutes + seconds', () => {
    const run = buildRun({
      started_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T00:02:05Z'
    })
    expect(runDurationLabel(run)).toBe('2m 5s')
  })

  it('formats hours + minutes', () => {
    const run = buildRun({
      started_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-01-01T01:30:00Z'
    })
    expect(runDurationLabel(run)).toBe('1h 30m')
  })

  it('returns "<1s" for sub-second durations', () => {
    const run = buildRun({
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:00:00.500Z'
    })
    expect(runDurationLabel(run)).toBe('<1s')
  })

  it('uses provided "now" when run is still in progress', () => {
    const run = buildRun({
      status: 'running',
      started_at: '2026-01-01T00:00:00Z',
      completed_at: null
    })
    expect(runDurationLabel(run, '2026-01-01T00:00:10Z')).toBe('10s')
  })

  it('treats naive (offset-less) backend timestamps as UTC', () => {
    // Both timestamps lack a trailing "Z"; they must be read as UTC so the
    // duration is not skewed by the viewer's local offset.
    const run = buildRun({
      started_at: '2026-01-01T00:00:00',
      completed_at: '2026-01-01T00:45:00'
    })
    expect(runDurationLabel(run)).toBe('45m')
  })

  it('does not inflate duration when start is naive and now is UTC-aware', () => {
    const run = buildRun({
      status: 'running',
      started_at: '2026-01-01T00:00:00',
      completed_at: null
    })
    expect(runDurationLabel(run, '2026-01-01T00:45:00Z')).toBe('45m')
  })
})

describe('shortenInput', () => {
  it('returns short inputs unchanged', () => {
    expect(shortenInput('hello world')).toBe('hello world')
  })

  it('truncates long inputs with ellipsis', () => {
    const long = 'x'.repeat(200)
    const result = shortenInput(long, 50)
    expect(result).toHaveLength(50)
    expect(result.endsWith('…')).toBe(true)
  })

  it('handles empty input safely', () => {
    expect(shortenInput('')).toBe('')
  })
})

describe('formatTimestamp', () => {
  it('returns dash for missing timestamps', () => {
    expect(formatTimestamp(null)).toBe('—')
    expect(formatTimestamp(undefined)).toBe('—')
  })

  it('returns the raw value for unparseable strings', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date')
  })

  it('formats UTC ISO timestamps as dd.mm.yyyy, HH:mm:ss in UTC+2', () => {
    expect(formatTimestamp('2026-06-01T12:56:42Z')).toBe('01.06.2026, 14:56:42')
    expect(formatTimestamp('2026-01-01T00:00:00Z')).toBe('01.01.2026, 02:00:00')
  })

  it('treats naive ISO strings without offset as UTC before shifting', () => {
    expect(formatTimestamp('2026-06-01T12:56:42')).toBe('01.06.2026, 14:56:42')
  })
})

describe('formatLastRunLabel', () => {
  const nowMs = Date.parse('2026-06-01T14:00:00.000Z')

  it('returns a no-run fallback for missing timestamps', () => {
    expect(formatLastRunLabel(null)).toBe('No runs yet')
    expect(formatLastRunLabel(undefined)).toBe('No runs yet')
  })

  it('shows minutes and hours ago for recent runs', () => {
    expect(formatLastRunLabel('2026-06-01T13:30:00Z', nowMs)).toBe('30m ago')
    expect(formatLastRunLabel('2026-06-01T12:00:00Z', nowMs)).toBe('2h ago')
  })

  it('treats naive ISO strings without offset as UTC before comparing', () => {
    expect(formatLastRunLabel('2026-06-01T12:00:00', nowMs)).toBe('2h ago')
  })

  it('uses UTC+2 calendar days for yesterday and older fallbacks', () => {
    expect(formatLastRunLabel('2026-05-31T12:00:00Z', nowMs)).toBe('Yesterday')
    expect(formatLastRunLabel('2026-05-25T12:00:00Z', nowMs)).toBe('25.05.2026')
  })
})
