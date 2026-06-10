import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'
import { fncredRefFor, parseFncredRef } from '@/common/utils/fncredRef'
import type { FlowTemplate } from '@/common/data/flow/types/flowTemplate'
import type { StartNodeConfig, StudioNode } from '../types/studioTypes'
import { START_ID } from './graphStoreUtils'

export const WEBHOOK_SECRET_FIELD = 'WEBHOOK_SECRET'
export const WEBHOOK_CREDENTIAL_NAMESPACE = 'global'

export function buildFlowCredentialDisplayName(flowName: string): string {
  return `${flowName.trim()} Flow Credentials`.slice(0, 120)
}

export function findWebhookStartNode(nodes: StudioNode[]): StudioNode | null {
  const start =
    nodes.find(n => n.type === 'start' && n.config?.nodeType === 'start') ??
    nodes.find(n => n.id === START_ID) ??
    nodes.find(n => n.type === 'start')
  if (!start?.config || start.config.nodeType !== 'start') return null
  if (start.config.triggerType !== 'WEBHOOK') return null
  return start
}

export function getWebhookSecretRefFromStudioNodes(nodes: StudioNode[]): string | null {
  const ref = findWebhookStartNode(nodes)?.config?.webhookConfig?.secretRef?.trim()
  return ref || null
}

/** Apply webhookId/secretRef from CFE save response onto the studio start node. */
export function mergeWebhookConfigFromSavedTemplate(nodes: StudioNode[], saved: FlowTemplate): StudioNode[] {
  const triggers = Array.isArray(saved.start?.triggers) ? saved.start.triggers : []
  const webhookTrigger = triggers.find(
    t => String(t?.type || '').toUpperCase() === 'WEBHOOK' && (t.active === undefined || t.active === true)
  )
  if (!webhookTrigger) return nodes

  const config = webhookTrigger.config && typeof webhookTrigger.config === 'object' ? webhookTrigger.config : {}
  const webhookId = String((config as { webhookId?: string }).webhookId || '').trim()
  const secretRef = String((config as { secretRef?: string }).secretRef || '').trim()
  if (!webhookId && !secretRef) return nodes

  const start = findWebhookStartNode(nodes)
  if (!start) return nodes

  return nodes.map(n => {
    if (n.id !== start.id) return n
    const startCfg = n.config as StartNodeConfig
    if (startCfg.nodeType !== 'start' || startCfg.triggerType !== 'WEBHOOK') return n
    return {
      ...n,
      config: {
        ...startCfg,
        webhookConfig: {
          ...startCfg.webhookConfig,
          ...(webhookId ? { webhookId } : {}),
          ...(secretRef ? { secretRef } : {})
        }
      }
    }
  })
}

export type WebhookCredentialSyncResult = { synced: true } | { synced: false; error: string }

export type ApplyPendingWebhookSecretResult = {
  nodes: StudioNode[]
  applied: boolean
  error?: string
}

/**
 * On flow save: persist studio pendingWebhookSecret to FS and set secretRef on the start node.
 * Never throws — save must succeed even when FS fails.
 */
export async function applyPendingWebhookSecretToNodes(
  accessToken: string,
  nodes: StudioNode[],
  flowName: string
): Promise<ApplyPendingWebhookSecretResult> {
  try {
    const start = findWebhookStartNode(nodes)
    if (!start?.config || start.config.nodeType !== 'start') {
      return { nodes, applied: false }
    }

    const cfg = start.config as StartNodeConfig
    const wc = cfg.webhookConfig ?? {}
    const pending = wc.pendingWebhookSecret?.trim()
    if (!pending) return { nodes, applied: false }

    const flowNameTrimmed = flowName.trim()
    if (!flowNameTrimmed) {
      return { nodes, applied: false, error: 'empty flow name' }
    }

    const client = new FunctionsServiceClient(accessToken)
    const existingRef = wc.secretRef?.trim() || ''
    let secretRef = existingRef
    const parsed = parseFncredRef(existingRef)

    if (parsed) {
      await client.replaceCredentialFields(
        parsed.credentialId,
        { [WEBHOOK_SECRET_FIELD]: pending },
        { profile: 'live', merge: true }
      )
      await client.replaceCredentialFields(
        parsed.credentialId,
        { [WEBHOOK_SECRET_FIELD]: pending },
        { profile: 'preview', merge: true }
      )
    } else {
      const { id } = await client.createCredential({
        displayName: buildFlowCredentialDisplayName(flowNameTrimmed),
        namespace: WEBHOOK_CREDENTIAL_NAMESPACE,
        live: { [WEBHOOK_SECRET_FIELD]: pending },
        preview: { [WEBHOOK_SECRET_FIELD]: pending }
      })
      secretRef = fncredRefFor(id, WEBHOOK_SECRET_FIELD)
    }

    const updatedNodes = nodes.map(n => {
      if (n.id !== start.id || n.config?.nodeType !== 'start') return n
      const startCfg = n.config as StartNodeConfig
      return {
        ...n,
        config: {
          ...startCfg,
          webhookConfig: {
            ...startCfg.webhookConfig,
            secretRef,
            pendingWebhookSecret: undefined
          }
        }
      }
    })

    return { nodes: updatedNodes, applied: true }
  } catch (e: unknown) {
    return {
      nodes,
      applied: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

/**
 * Keep FS credential displayName in sync when a WEBHOOK flow is saved under a new title.
 * Never throws — callers (e.g. save flow) must not fail when FS is down or unauthorized.
 */
export async function syncWebhookCredentialDisplayName(
  accessToken: string,
  nodes: StudioNode[],
  flowName: string
): Promise<WebhookCredentialSyncResult> {
  try {
    const trimmed = flowName.trim()
    if (!trimmed) return { synced: false, error: 'empty flow name' }

    const secretRef = getWebhookSecretRefFromStudioNodes(nodes)
    if (!secretRef) return { synced: false, error: 'no webhook secretRef' }

    const parsed = parseFncredRef(secretRef)
    if (!parsed) return { synced: false, error: 'invalid secretRef' }

    const client = new FunctionsServiceClient(accessToken)
    await client.updateCredentialDisplayName(parsed.credentialId, {
      displayName: buildFlowCredentialDisplayName(trimmed)
    })
    return { synced: true }
  } catch (e: unknown) {
    return {
      synced: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

/** Placeholder width when a secret exists in FS but is hidden in the UI (not a secret value). */
export const SAVED_WEBHOOK_SECRET_MASK_LENGTH = 32

/** Mask for display row (not an input). */
export function maskWebhookSecretDisplay(length: number): string {
  const n = Math.min(Math.max(length, 8), 64)
  return '•'.repeat(n)
}

export function savedWebhookSecretMaskDisplay(): string {
  return maskWebhookSecretDisplay(SAVED_WEBHOOK_SECRET_MASK_LENGTH)
}
