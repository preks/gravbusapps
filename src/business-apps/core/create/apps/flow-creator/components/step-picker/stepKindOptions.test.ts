import { STEP_KIND_GROUP_ORDER, visibleStepKindGroups, visibleStepKindOptions } from './stepKindOptions'

describe('visibleStepKindOptions', () => {
  it('hides advanced-only kinds in simple insert mode', () => {
    const ids = visibleStepKindOptions('simple', 'insert').map(opt => opt.id)
    expect(ids).not.toContain('function')
    expect(ids).not.toContain('connector')
    expect(ids).not.toContain('ai-task-expert')
    expect(ids).not.toContain('decision-logic')
    expect(ids).not.toContain('parallelize')
    expect(ids).toContain('ai-agent')
    expect(ids).toContain('user-task')
    expect(ids).toContain('approval')
  })

  it('lists custom decision before approval', () => {
    const decisionIds = visibleStepKindOptions('advanced', 'insert')
      .filter(opt => opt.group === 'decisions')
      .map(opt => opt.id)
    expect(decisionIds.indexOf('decision-user')).toBeLessThan(decisionIds.indexOf('approval'))
  })

  it('lists decisions directly after user tasks', () => {
    const groups = visibleStepKindGroups('advanced', 'insert').map(group => group.id)
    expect(groups.indexOf('user-tasks')).toBeLessThan(groups.indexOf('decisions'))
    expect(groups.indexOf('decisions')).toBeLessThan(groups.indexOf('ai-tasks'))
    expect(STEP_KIND_GROUP_ORDER.indexOf('decisions')).toBe(1)
  })

  it('shows all kinds in advanced mode', () => {
    const ids = visibleStepKindOptions('advanced', 'insert').map(opt => opt.id)
    expect(ids).toContain('function')
    expect(ids).toContain('parallelize')
  })

  it('keeps the selected advanced kind visible in simple change mode', () => {
    const ids = visibleStepKindOptions('simple', 'change', 'function').map(opt => opt.id)
    expect(ids).toContain('function')
    expect(ids).not.toContain('connector')
  })

  it('hides connector when changing from function and vice versa', () => {
    const fromFunction = visibleStepKindOptions('advanced', 'change', 'function').map(opt => opt.id)
    expect(fromFunction).toContain('function')
    expect(fromFunction).not.toContain('connector')

    const fromConnector = visibleStepKindOptions('advanced', 'change', 'connector').map(opt => opt.id)
    expect(fromConnector).toContain('connector')
    expect(fromConnector).not.toContain('function')
  })
})
