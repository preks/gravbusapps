import {
  getStepKindSwitchConfirmLevel,
  isFunctionConnectorCrossSwitch,
  isStepKindChangeAllowed
} from './stepKindSwitchImpact'

describe('stepKindSwitchImpact', () => {
  it('blocks function and connector cross-switch', () => {
    expect(isFunctionConnectorCrossSwitch('function', 'connector')).toBe(true)
    expect(isFunctionConnectorCrossSwitch('connector', 'function')).toBe(true)
    expect(isStepKindChangeAllowed('function', 'connector')).toBe(false)
    expect(isStepKindChangeAllowed('connector', 'function')).toBe(false)
    expect(getStepKindSwitchConfirmLevel('function', 'connector')).toBe('none')
  })

  it('allows other automation switches with destructive confirm', () => {
    expect(isStepKindChangeAllowed('function', 'ai-agent')).toBe(true)
    expect(getStepKindSwitchConfirmLevel('function', 'ai-agent')).toBe('destructive')
  })

  it('uses soft confirm for user task switches', () => {
    expect(getStepKindSwitchConfirmLevel('user-task', 'information')).toBe('soft')
  })

  it('uses soft confirm between user decision kinds', () => {
    expect(getStepKindSwitchConfirmLevel('approval', 'decision-user')).toBe('soft')
  })

  it('uses destructive confirm for task to decision', () => {
    expect(getStepKindSwitchConfirmLevel('user-task', 'decision-user')).toBe('destructive')
    expect(getStepKindSwitchConfirmLevel('user-task', 'approval')).toBe('destructive')
  })

  it('returns none for same kind', () => {
    expect(getStepKindSwitchConfirmLevel('function', 'function')).toBe('none')
  })
})
