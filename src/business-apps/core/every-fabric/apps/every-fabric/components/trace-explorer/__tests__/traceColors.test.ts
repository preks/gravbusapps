import { traceColor, LEGEND_KINDS } from '../traceColors'

describe('traceColors', () => {
  it('returns a known color entry for each standard frame kind', () => {
    const knownKinds = [
      'tool',
      'subagent',
      'expert',
      'decision',
      'skill',
      'step',
      'hitl',
      'terminal',
      'capability_missing',
      'artifact'
    ]
    for (const kind of knownKinds) {
      const entry = traceColor(kind)
      expect(entry.bar).toBeTruthy()
      expect(entry.text).toBeTruthy()
      expect(entry.label).toBeTruthy()
    }
  })

  it('returns a fallback for unknown kinds', () => {
    const entry = traceColor('unknown_kind_xyz')
    expect(entry.label).toBe('Other')
    expect(entry.bar).toContain('muted')
  })

  it('LEGEND_KINDS contains only known kinds', () => {
    for (const kind of LEGEND_KINDS) {
      const entry = traceColor(kind)
      expect(entry.label).not.toBe('Other')
    }
  })
})
