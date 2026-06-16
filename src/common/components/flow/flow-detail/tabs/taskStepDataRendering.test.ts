import { getTemplateStepMessage } from './taskStepDataRendering'

describe('getTemplateStepMessage', () => {
  it('returns step.message like Flow Studio preview', () => {
    expect(
      getTemplateStepMessage({
        type: 'AI_AGENT',
        title: 'Validate',
        message: 'Check all required documents for the application.'
      })
    ).toBe('Check all required documents for the application.')
  })

  it('falls back to decision human instructions', () => {
    expect(
      getTemplateStepMessage({
        type: 'DECISION',
        title: 'Review',
        aiConfig: {
          executor: 'EVERYAI',
          humanInstructions: 'Review the case and choose the next branch.',
          escalation: { mode: 'USER', assignment: { assignmentMode: 'CLAIM' } }
        }
      })
    ).toBe('Review the case and choose the next branch.')
  })
})
