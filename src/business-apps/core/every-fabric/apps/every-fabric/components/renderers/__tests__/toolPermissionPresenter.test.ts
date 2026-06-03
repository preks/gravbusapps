import type { ToolPermissionActionRequest, ToolPermissionReviewConfig } from '../../../types/enterpriseAgent'
import { formatPermissionDisplayValue, presentToolPermissionAction } from '../toolPermissionPresenter'

const editableReview: ToolPermissionReviewConfig[] = [
  {
    action_name: 'create_crm_entity',
    allowed_decisions: ['approve', 'edit', 'reject']
  }
]

describe('toolPermissionPresenter', () => {
  it('presents CRM lead creation as business fields', () => {
    const action: ToolPermissionActionRequest = {
      name: 'newwork_call_business_tool',
      args: {
        tool_name: 'create_crm_entity',
        arguments: {
          entity_type: 'lead',
          fields: {
            firstName: 'AI Demo',
            lastName: 'Buyer',
            email: 'ai.demo.buyer@example.com',
            companyName: 'Synthetic Test GmbH'
          }
        }
      }
    }

    const presented = presentToolPermissionAction(action, editableReview)

    expect(presented.title).toBe('Create Lead')
    expect(presented.summary).toContain('AI Demo Buyer')
    expect(presented.visibleFields.map(field => field.label)).toEqual([
      'First Name',
      'Last Name',
      'Email',
      'Company Name'
    ])
    expect(presented.technicalFields.map(field => field.id)).toEqual(['entity_type'])
    expect(presented.canEdit).toBe(true)
  })

  it('rebuilds edited wrapper args for LangGraph edit decisions', () => {
    const action: ToolPermissionActionRequest = {
      name: 'newwork_call_business_tool',
      args: {
        tool_name: 'create_crm_entity',
        fields: {
          entity_type: 'lead',
          fields: {
            firstName: 'AI Demo',
            companyName: 'Synthetic Test GmbH'
          }
        }
      }
    }

    const presented = presentToolPermissionAction(action, editableReview)
    const rebuilt = presented.rebuildAction({ 'fields.companyName': 'Updated GmbH' })

    expect(rebuilt.args).toEqual({
      tool_name: 'create_crm_entity',
      arguments: {
        entity_type: 'lead',
        fields: {
          firstName: 'AI Demo',
          companyName: 'Updated GmbH'
        }
      }
    })
  })

  it('supports execute wrapper args and camelCase review config names', () => {
    const action: ToolPermissionActionRequest = {
      name: 'newwork_execute_business_tool',
      args: {
        tool_name: 'create_crm_entity',
        arguments: {
          entity_type: 'lead',
          fields: {
            firstName: 'AI Demo',
            companyName: 'Synthetic Test GmbH'
          }
        }
      }
    }

    const presented = presentToolPermissionAction(action, [
      {
        action_name: '',
        actionName: 'create_crm_entity',
        allowed_decisions: ['approve', 'edit', 'reject']
      }
    ])
    const rebuilt = presented.rebuildAction({ 'fields.companyName': 'Updated GmbH' })

    expect(presented.canEdit).toBe(true)
    expect(rebuilt.args).toEqual({
      tool_name: 'create_crm_entity',
      arguments: {
        entity_type: 'lead',
        fields: {
          firstName: 'AI Demo',
          companyName: 'Updated GmbH'
        }
      }
    })
  })

  it('formats scalar arrays as newline-separated display values', () => {
    expect(formatPermissionDisplayValue(['BPMN', 'CRM'])).toBe('BPMN\nCRM')
  })

  it('flattens nested flow payloads, hides empty/system fields, and labels catalogs', () => {
    const action: ToolPermissionActionRequest = {
      name: 'flowbot.createAsset',
      args: {
        reason: 'Registering a new Dell XPS 15 laptop as an IT equipment asset.',
        meta: {},
        asset: {
          id: null,
          businessKey: null,
          recordState: null,
          assetCategoryRef: 'AssetCategory:v1:LAPTOP',
          assetBrandRef: 'AssetBrand:v1:DELL',
          model: 'XPS 15',
          serialNumber: null,
          assetStatus: 'AVAILABLE_ASSET',
          notes: null
        }
      },
      input_schema: {
        type: 'object',
        required: ['reason', 'asset'],
        properties: {
          reason: { type: 'string' },
          meta: { type: 'object' },
          asset: {
            type: 'object',
            required: ['assetStatus'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              businessKey: { type: 'string' },
              recordState: { type: 'string' },
              assetCategoryRef: { type: 'string', oneOf: [] },
              assetBrandRef: { type: 'string' },
              model: { type: 'string' },
              serialNumber: { type: 'string' },
              assetStatus: { type: 'string' },
              notes: { type: 'string' }
            }
          }
        }
      },
      field_options: {
        'asset.assetCategoryRef': [
          { label: 'Laptop', value: 'AssetCategory:v1:LAPTOP' },
          { label: 'Monitor', value: 'AssetCategory:v1:MONITOR' }
        ],
        'asset.assetBrandRef': [{ label: 'Dell', value: 'AssetBrand:v1:DELL' }]
      }
    }

    const presented = presentToolPermissionAction(action)

    // Only the provided + required fields are primary; nulls/system/meta collapse.
    expect(presented.visibleFields.map(field => field.id)).toEqual([
      'reason',
      'asset.assetCategoryRef',
      'asset.assetBrandRef',
      'asset.model',
      'asset.assetStatus'
    ])
    expect(presented.technicalFields.map(field => field.id)).toEqual(
      expect.arrayContaining([
        'meta',
        'asset.id',
        'asset.businessKey',
        'asset.recordState',
        'asset.serialNumber',
        'asset.notes'
      ])
    )

    const category = presented.visibleFields.find(field => field.id === 'asset.assetCategoryRef')
    expect(category?.label).toBe('Asset Category')
    expect(category?.displayValue).toBe('Laptop')
    expect(category?.options).toHaveLength(2)

    expect(presented.visibleFields.find(field => field.id === 'reason')?.required).toBe(true)
    expect(presented.visibleFields.find(field => field.id === 'asset.assetStatus')?.required).toBe(true)
    expect(presented.visibleFields.find(field => field.id === 'asset.model')?.required).toBe(false)
  })

  it('marks schema-required vs agent-prefilled fields distinctly (required vs suggested)', () => {
    const action: ToolPermissionActionRequest = {
      name: 'flowbot.createAsset',
      args: {
        reason: 'Registering a Dell XPS 15.',
        asset: {
          assetCategoryRef: 'AssetCategory:v1:LAPTOP',
          model: 'XPS 15',
          serialNumber: 'SN-12345',
          assetStatus: 'AVAILABLE_ASSET'
        }
      },
      input_schema: {
        type: 'object',
        required: ['reason', 'asset'],
        properties: {
          reason: { type: 'string' },
          asset: {
            type: 'object',
            // Backend only truly requires assetStatus inside the asset object.
            required: ['assetStatus'],
            properties: {
              assetCategoryRef: { type: 'string' },
              model: { type: 'string' },
              serialNumber: { type: 'string' },
              assetStatus: { type: 'string' }
            }
          }
        }
      }
    }

    const presented = presentToolPermissionAction(action)
    const byId = (id: string) => presented.visibleFields.find(field => field.id === id)

    // Schema-required: red * (required), never "suggested".
    expect(byId('reason')).toMatchObject({ required: true, suggested: false })
    expect(byId('asset.assetStatus')).toMatchObject({ required: true, suggested: false })

    // Agent pre-filled but NOT schema-required: suggested, not required.
    // serialNumber is the key case — creating an asset succeeds without it, so
    // it must never show a red *, only the "Suggested" treatment.
    expect(byId('asset.serialNumber')).toMatchObject({ required: false, suggested: true })
    expect(byId('asset.model')).toMatchObject({ required: false, suggested: true })
    expect(byId('asset.assetCategoryRef')).toMatchObject({ required: false, suggested: true })
  })
})
