import { START_ID } from './graphStoreUtils'
import {
  buildFlowCredentialDisplayName,
  getWebhookSecretRefFromStudioNodes,
  maskWebhookSecretDisplay,
  savedWebhookSecretMaskDisplay,
  SAVED_WEBHOOK_SECRET_MASK_LENGTH,
  syncWebhookCredentialDisplayName
} from './webhookCredentialUtils'

describe('webhookCredentialUtils', () => {
  it('buildFlowCredentialDisplayName formats flow title', () => {
    expect(buildFlowCredentialDisplayName('Expense Approval')).toBe('Expense Approval Flow Credentials')
  })

  it('maskWebhookSecretDisplay uses bullet characters', () => {
    expect(maskWebhookSecretDisplay(12)).toBe('••••••••••••')
  })

  it('savedWebhookSecretMaskDisplay uses fixed placeholder length', () => {
    expect(savedWebhookSecretMaskDisplay()).toBe(maskWebhookSecretDisplay(SAVED_WEBHOOK_SECRET_MASK_LENGTH))
  })

  it('getWebhookSecretRefFromStudioNodes returns ref for WEBHOOK start', () => {
    const nodes = [
      {
        id: START_ID,
        type: 'start' as const,
        label: 'Start',
        config: {
          nodeType: 'start' as const,
          triggerType: 'WEBHOOK' as const,
          form: [],
          webhookConfig: {
            webhookId: 'wh_test',
            secretRef: 'fncred:11111111-1111-4111-8111-111111111111:WEBHOOK_SECRET'
          }
        }
      }
    ]
    expect(getWebhookSecretRefFromStudioNodes(nodes)).toBe('fncred:11111111-1111-4111-8111-111111111111:WEBHOOK_SECRET')
  })

  it('getWebhookSecretRefFromStudioNodes returns null for MANUAL_FORM', () => {
    const nodes = [
      {
        id: START_ID,
        type: 'start' as const,
        label: 'Start',
        config: {
          nodeType: 'start' as const,
          triggerType: 'MANUAL_FORM' as const,
          form: []
        }
      }
    ]
    expect(getWebhookSecretRefFromStudioNodes(nodes)).toBeNull()
  })

  it('syncWebhookCredentialDisplayName never throws (returns error result instead)', async () => {
    await expect(syncWebhookCredentialDisplayName('token', [], 'My Flow')).resolves.toMatchObject({
      synced: false
    })
  })
})
