import { renderHook } from '@testing-library/react'
import { useExpressionSuggestions } from './useExpressionSuggestions'

describe('useExpressionSuggestions', () => {
  it('exposes real workflow-level suggestions for initiator and workflow metadata', () => {
    const { result } = renderHook(() => useExpressionSuggestions())

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expression: '$workflow.initiator',
          label: 'Initiator ID',
          source: 'workflow'
        }),
        expect.objectContaining({
          expression: '$workflow.initiator.name',
          label: 'Initiator Name',
          source: 'workflow'
        }),
        expect.objectContaining({
          expression: '$workflow.id',
          label: 'Flow ID',
          source: 'workflow'
        }),
        expect.objectContaining({
          expression: '$workflow.status',
          label: 'Workflow Status',
          source: 'workflow'
        })
      ])
    )
  })

  it('exposes step output schema paths as resultData expressions', () => {
    const { result } = renderHook(() =>
      useExpressionSuggestions({
        steps: [
          {
            reference: 'step_0',
            label: 'Function Step',
            outputs: [
              { path: 'result.id', dataType: 'string' },
              { path: 'metadata.score', dataType: 'number' }
            ]
          }
        ]
      })
    )

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expression: '$steps.step_0.resultData.result.id',
          label: 'Function Step - id',
          source: 'steps',
          dataType: 'string'
        }),
        expect.objectContaining({
          expression: '$steps.step_0.resultData.metadata.score',
          label: 'Function Step - score',
          source: 'steps',
          dataType: 'number'
        })
      ])
    )
  })

  it('exposes task comments as step-level expressions', () => {
    const { result } = renderHook(() =>
      useExpressionSuggestions({
        steps: [
          {
            reference: 'step_1',
            label: 'Review Request'
          }
        ]
      })
    )

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expression: '$steps.step_1.comment',
          label: 'Review Request - Comment',
          source: 'steps',
          dataType: 'string'
        })
      ])
    )
  })

  it('resolves embedded expressions inside suggestion labels', () => {
    const { result } = renderHook(() =>
      useExpressionSuggestions({
        triggerFields: [
          {
            id: 'title',
            label: 'Trigger - Title',
            path: 'title',
            kind: 'inputValues',
            dataType: 'string'
          }
        ],
        steps: [
          {
            reference: 'step_1',
            label: 'Approve or Decline: {{$workflow.input.inputValues.title}}'
          }
        ]
      })
    )

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expression: '$steps.step_1.comment',
          label: 'Approve or Decline: Trigger - Title - Comment',
          source: 'steps',
          dataType: 'string'
        })
      ])
    )
  })
})
