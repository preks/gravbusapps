import { getDecisionStepDisplayLabel } from './decisionLabels'

describe('decisionLabels', () => {
  it('prefers prompt names over generic AI labels', () => {
    expect(
      getDecisionStepDisplayLabel({
        decisionTitle: 'AI',
        decisionMode: 'AI',
        stepReference: 'step_3',
        promptName: 'Warranty Reason Expert'
      })
    ).toBe('Warranty Reason Expert')
  })

  it('falls back to policy titles before generic mode labels', () => {
    expect(
      getDecisionStepDisplayLabel({
        decisionTitle: 'Decision',
        decisionMode: 'AI',
        stepReference: 'step_4',
        policyDocumentTitle: 'Warranty Policy'
      })
    ).toBe('Warranty Policy')
  })
})
