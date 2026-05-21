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
})
