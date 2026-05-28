import { buildAgentActivityTimelineSteps } from '../agentActivityTimeline'
import { FALLBACK_ACTIVITY_STATUS_TEXT } from '../agentActivitySanitize'

describe('buildAgentActivityTimelineSteps', () => {
  it('returns empty when not streaming and no lines', () => {
    expect(buildAgentActivityTimelineSteps([], null, false)).toEqual([])
  })

  it('returns single active step from current status when streaming with no activity', () => {
    const steps = buildAgentActivityTimelineSteps([], 'Preparing workspace…', true)
    expect(steps).toHaveLength(1)
    expect(steps[0].label).toBe('Preparing workspace…')
    expect(steps[0].state).toBe('active')
  })

  it('uses fallback when streaming with no activity or status', () => {
    const steps = buildAgentActivityTimelineSteps([], null, true)
    expect(steps).toHaveLength(1)
    expect(steps[0].label).toBe(FALLBACK_ACTIVITY_STATUS_TEXT)
    expect(steps[0].state).toBe('active')
  })

  it('dedupes current status when it matches the last activity line', () => {
    const steps = buildAgentActivityTimelineSteps(
      ['Looking up information', 'Preparing workspace'],
      'Preparing workspace',
      true
    )
    expect(steps.map(s => s.label)).toEqual(['Looking up information', 'Preparing workspace'])
    expect(steps[1].state).toBe('active')
    expect(steps[0].state).toBe('completed')
  })

  it('appends distinct current status as active step', () => {
    const steps = buildAgentActivityTimelineSteps(
      ['Looking up information'],
      'Preparing workspace and connections',
      true
    )
    expect(steps).toHaveLength(2)
    expect(steps[1].label).toBe('Preparing workspace and connections')
    expect(steps[1].state).toBe('active')
  })

  it('caps at maxSteps', () => {
    const lines = ['a', 'b', 'c', 'd', 'e', 'f']
    const steps = buildAgentActivityTimelineSteps(lines, null, true, 5)
    expect(steps).toHaveLength(5)
    expect(steps.map(s => s.label)).toEqual(['b', 'c', 'd', 'e', 'f'])
  })

  it('marks all completed when streaming ended', () => {
    const steps = buildAgentActivityTimelineSteps(['Step one'], null, false)
    expect(steps).toHaveLength(1)
    expect(steps[0].state).toBe('completed')
  })

  it('sanitizes unsafe status text', () => {
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const steps = buildAgentActivityTimelineSteps([], uuid, true)
    expect(steps[0].label).toBe(FALLBACK_ACTIVITY_STATUS_TEXT)
  })
})
