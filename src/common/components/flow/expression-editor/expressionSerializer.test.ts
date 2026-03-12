import { expressionToEditorJSON } from './expressionSerializer'

describe('expressionSerializer', () => {
  it('uses current trigger labels for legacy trigger expressions', () => {
    const result = expressionToEditorJSON('Approve {{$workflow.input.su}}', [
      {
        id: 'trigger-su',
        label: 'Trigger — Title',
        expression: '$workflow.input.inputValues.su',
        source: 'trigger'
      }
    ]) as any

    expect(result.content?.[0]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'mention',
          attrs: expect.objectContaining({
            expression: '$workflow.input.su',
            label: 'Trigger — Title'
          })
        })
      ])
    )
  })

  it('uses current step output labels for legacy result expressions', () => {
    const result = expressionToEditorJSON('VIP {{$steps.step_0.result}}', [
      {
        id: 'step-step_0-result',
        label: 'VIP Check - result',
        expression: '$steps.step_0.resultData.result',
        source: 'steps'
      }
    ]) as any

    expect(result.content?.[0]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'mention',
          attrs: expect.objectContaining({
            expression: '$steps.step_0.result',
            label: 'VIP Check - result'
          })
        })
      ])
    )
  })
})
