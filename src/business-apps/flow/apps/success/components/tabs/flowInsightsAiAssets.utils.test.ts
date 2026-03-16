import { collectFlowInsightsAiAssets } from './flowInsightsAiAssets.utils'

describe('collectFlowInsightsAiAssets', () => {
  it('adds function assets from reliability hotspots when template data does not expose them', () => {
    const assets = collectFlowInsightsAiAssets(
      {
        id: 'flow_example',
        type: 'TEMPLATE',
        name: 'Example Flow',
        version: 1,
        steps: []
      },
      'n/a',
      [
        {
          taskType: 'FUNCTION',
          stepReference: 'step_0',
          stepTitle: 'Is VIP?'
        }
      ]
    )

    expect(assets.functions).toEqual([
      expect.objectContaining({
        label: 'Is VIP?',
        usages: ['Is VIP?']
      })
    ])
  })

  it('does not duplicate a function already represented by the template definition', () => {
    const assets = collectFlowInsightsAiAssets(
      {
        id: 'flow_example',
        type: 'TEMPLATE',
        name: 'Example Flow',
        version: 1,
        steps: [
          {
            id: 'step_0',
            reference: 'step_0',
            type: 'FUNCTION',
            title: 'Is VIP?'
          }
        ]
      } as any,
      'n/a',
      [
        {
          taskType: 'FUNCTION',
          stepReference: 'step_0',
          stepTitle: 'Is VIP?'
        }
      ]
    )

    expect(assets.functions).toHaveLength(1)
    expect(assets.functions[0]).toEqual(
      expect.objectContaining({
        label: 'Is VIP?',
        usages: ['Is VIP?']
      })
    )
  })
})
