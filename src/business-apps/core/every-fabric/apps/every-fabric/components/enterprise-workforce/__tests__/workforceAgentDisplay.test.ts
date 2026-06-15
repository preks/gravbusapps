import { formatRelative } from '../workforceAgentDisplay'

describe('formatRelative', () => {
  const nowMs = Date.parse('2026-06-12T19:05:00.000Z')

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(nowMs)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('treats naive backend ISO timestamps as UTC (not browser local)', () => {
    expect(formatRelative('2026-06-12T19:00:00')).toBe('5m ago')
    expect(formatRelative('2026-06-12T19:00:00.000000')).toBe('5m ago')
  })

  it('matches explicit UTC timestamps', () => {
    expect(formatRelative('2026-06-12T19:00:00Z')).toBe('5m ago')
  })

  it('returns a no-run fallback for missing timestamps', () => {
    expect(formatRelative(null)).toBe('No runs yet')
  })
})
