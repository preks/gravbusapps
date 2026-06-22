import { validateAiTemplateContract, templateRequiresAdvancedMode } from './aiTemplateValidator'

function makeTemplate(step: Record<string, unknown>) {
  return {
    name: 'Custom Data Flow',
    version: 1,
    steps: [step]
  }
}

describe('aiTemplateValidator - CUSTOM_DATA_MUTATION', () => {
  it('accepts a valid entity write step', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_save',
        title: 'Save Lead',
        type: 'CUSTOM_DATA_MUTATION',
        customDataConfig: {
          target: 'ENTITY',
          operation: 'create',
          namespace: 'crm',
          entityName: 'lead',
          values: { name: '{{$steps.step_0.output.formData.name}}' }
        }
      })
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts a Flow Data append step without entityName', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_append',
        title: 'Append Flow Data',
        type: 'CUSTOM_DATA_MUTATION',
        customDataConfig: {
          target: 'FLOW_DATA',
          operation: 'append',
          values: { total: '{{$steps.step_1.output.resultData.total}}' }
        }
      })
    )
    expect(result.valid).toBe(true)
  })

  it('rejects a step without customDataConfig', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_save',
        title: 'Save Lead',
        type: 'CUSTOM_DATA_MUTATION'
      })
    )
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('customDataConfig must be an object')
  })

  it('rejects an invalid operation', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_save',
        title: 'Save Lead',
        type: 'CUSTOM_DATA_MUTATION',
        customDataConfig: { target: 'ENTITY', operation: 'upsert', entityName: 'lead' }
      })
    )
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('operation must be one of')
  })

  it('requires entityName for the ENTITY target', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_save',
        title: 'Save Lead',
        type: 'CUSTOM_DATA_MUTATION',
        customDataConfig: { target: 'ENTITY', operation: 'create' }
      })
    )
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('entityName is required')
  })

  it('accepts an AI-mode step with namespace + entityName and no operation/values', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_save',
        title: 'Save Lead with AI',
        type: 'CUSTOM_DATA_MUTATION',
        customDataConfig: {
          target: 'ENTITY',
          useAiAgent: true,
          namespace: 'crm',
          entityName: 'lead',
          instructions: 'Create or update the lead from the request.'
        }
      })
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('requires namespace and entityName in AI mode', () => {
    const result = validateAiTemplateContract(
      makeTemplate({
        reference: 'step_save',
        title: 'Save Lead with AI',
        type: 'CUSTOM_DATA_MUTATION',
        customDataConfig: { target: 'ENTITY', useAiAgent: true }
      })
    )
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('namespace is required when useAiAgent is true')
    expect(result.errors.join(' ')).toContain('entityName is required when useAiAgent is true')
  })

  it('treats CUSTOM_DATA_MUTATION as an advanced-mode step', () => {
    expect(
      templateRequiresAdvancedMode(
        makeTemplate({
          reference: 'step_save',
          title: 'Save Lead',
          type: 'CUSTOM_DATA_MUTATION',
          customDataConfig: { target: 'ENTITY', operation: 'create', entityName: 'lead' }
        })
      )
    ).toBe(true)
  })
})
