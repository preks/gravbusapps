import { extractPromptParameters, hasPromptParameterMetadata } from './promptParameterUtils'

describe('promptParameterUtils', () => {
  it('does not treat shallow prompt list items as hydrated parameter metadata', () => {
    expect(
      hasPromptParameterMetadata({
        _id: 'prompt-1',
        name: 'Warranty Expert',
        version: 4,
        user_content: { template: 'Context: {context}' } as any
      })
    ).toBe(false)
  })

  it('treats explicit parameter arrays as hydrated metadata even when empty', () => {
    expect(
      hasPromptParameterMetadata({
        _id: 'prompt-1',
        name: 'Warranty Expert',
        version: 4,
        system_content: { template: 'System', parameters: [] },
        user_content: { template: 'User', parameters: [] }
      } as any)
    ).toBe(true)
  })

  it('extracts normalized prompt parameters from hydrated prompt metadata', () => {
    expect(
      extractPromptParameters({
        _id: 'prompt-1',
        name: 'Warranty Expert',
        version: 4,
        system_content: { template: 'System', parameters: ['tenantName', ' tenantName ', 'locale'] },
        user_content: { template: 'User', parameters: ['context', '', 'serial'] }
      } as any)
    ).toEqual({
      system: ['tenantName', 'locale'],
      user: ['context', 'serial']
    })
  })
})
