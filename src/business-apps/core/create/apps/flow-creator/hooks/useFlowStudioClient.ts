/**
 * useFlowStudioClient - API client for Flow Studio save/load.
 * Wires to the real FlowTemplateClient for template persistence.
 */

import { useCallback, useMemo, useState } from 'react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { useFlowStudioStore } from './useFlowStudioStore'
import { studioGraphToTemplate, templateToStudioGraph } from '../utils/templateConverter'
import { templateRequiresAdvancedMode } from '../utils/aiTemplateValidator'
import { validateFlow } from './useFlowValidation'
import type { FlowTemplate } from '@/common/data/flow/types/flowTemplate'
import {
  applyPendingWebhookSecretToNodes,
  mergeWebhookConfigFromSavedTemplate,
  syncWebhookCredentialDisplayName
} from '../utils/webhookCredentialUtils'

interface FlowStudioClient {
  /** Save the current flow to the backend */
  saveFlow: () => Promise<void>
  /** Load a flow template by ID */
  loadFlow: (templateId: string) => Promise<void>
  /** Load an unsaved workflow draft by ID */
  loadDraft: (draftId: string) => Promise<void>
  /** Whether the client is currently saving or loading */
  isLoading: boolean
  /** Last error */
  error: string | null
}

function isTemplateNotFoundError(error: unknown): boolean {
  const statusCode = Number((error as any)?.statusCode ?? (error as any)?.status)
  if (statusCode === 404) return true

  const message = String((error as any)?.message || '')
    .trim()
    .toLowerCase()

  return message.includes('not found') || message.includes('workflow definition not found')
}

export function useFlowStudioClient(accessToken: string): FlowStudioClient {
  const templateClient = useFlowTemplateClient(accessToken)
  const markClean = useFlowStudioStore(s => s.markClean)
  const loadTemplate = useFlowStudioStore(s => s.loadTemplate)
  const setMode = useFlowStudioStore(s => s.setMode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyTemplateToStore = useCallback(
    (template: FlowTemplate, templateId: string | undefined) => {
      const { nodes, edges } = templateToStudioGraph(template)
      loadTemplate(templateId, nodes, edges, {
        name: template.name || 'Untitled Flow',
        description: template.description || '',
        version: template.version,
        tags: template.tags ?? {}
      })
      if (templateRequiresAdvancedMode(template)) setMode('advanced')
      markClean()
    },
    [loadTemplate, markClean, setMode]
  )

  const saveFlow = useCallback(async () => {
    const state = useFlowStudioStore.getState()
    const templateId = state.templateId?.trim() || undefined
    setIsLoading(true)
    setError(null)

    try {
      const validationErrors = validateFlow(state.nodes, state.edges).filter(issue => issue.severity === 'error')
      if (validationErrors.length > 0) {
        throw new Error(
          `Validation failed: ${validationErrors
            .slice(0, 3)
            .map(issue => issue.message)
            .join('; ')}${validationErrors.length > 3 ? '...' : ''}`
        )
      }

      // Persist webhook secret draft to FS (best-effort; must not block save).
      const secretApply = await applyPendingWebhookSecretToNodes(accessToken, state.nodes, state.templateName)
      const nodesForSave = secretApply.nodes
      if (secretApply.applied) {
        useFlowStudioStore.setState({ nodes: secretApply.nodes })
      }

      // Convert studio graph to the backend FlowTemplate format
      const template = studioGraphToTemplate(
        nodesForSave,
        state.edges,
        state.templateName,
        state.templateDescription,
        state.templateTags,
        state.templateVersion,
        templateId
      )

      let savedTemplate: FlowTemplate
      if (templateId) {
        savedTemplate = await templateClient.updateTemplate(templateId, template)
      } else {
        savedTemplate = await templateClient.createTemplate(template)
      }

      const nodesWithWebhook = mergeWebhookConfigFromSavedTemplate(nodesForSave, savedTemplate)

      useFlowStudioStore.setState(currentState => ({
        nodes: nodesWithWebhook,
        templateId: savedTemplate?.id ?? templateId ?? currentState.templateId,
        templateName: savedTemplate?.name ?? currentState.templateName,
        templateDescription: savedTemplate?.description ?? currentState.templateDescription,
        templateTags: savedTemplate?.tags ?? currentState.templateTags,
        templateVersion:
          typeof savedTemplate?.version === 'number' &&
          Number.isInteger(savedTemplate.version) &&
          savedTemplate.version >= 1
            ? savedTemplate.version
            : currentState.templateVersion,
        isDirty: false,
        webhookConfigRefreshKey: currentState.webhookConfigRefreshKey + 1
      }))

      // Best-effort FS label sync — must not fail save (see syncWebhookCredentialDisplayName).
      const latest = useFlowStudioStore.getState()
      await syncWebhookCredentialDisplayName(accessToken, latest.nodes, latest.templateName)
    } catch (err) {
      if (templateId && isTemplateNotFoundError(err)) {
        useFlowStudioStore.setState({ templateId: undefined })
      }

      const msg = err instanceof Error ? err.message : 'Failed to save flow template'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, templateClient, markClean])

  const loadFlow = useCallback(
    async (templateId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const template = await templateClient.getTemplate(templateId)
        if (!template) {
          throw new Error(`Template ${templateId} not found`)
        }

        applyTemplateToStore(template, template.id || templateId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load flow template'
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [applyTemplateToStore, templateClient]
  )

  const loadDraft = useCallback(
    async (draftId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const baseUrl = resolveFlowbotBaseUrl()
        const response = await fetch(`${baseUrl}/flowbot/api/agent/workflow-drafts/${encodeURIComponent(draftId)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          let detail = `Failed to load workflow draft (${response.status})`
          try {
            const payload = await response.json()
            if (typeof payload?.detail === 'string' && payload.detail.trim()) {
              detail = payload.detail
            }
          } catch {}
          throw new Error(detail)
        }

        const template = (await response.json()) as FlowTemplate | null
        if (!template) {
          throw new Error(`Workflow draft ${draftId} not found`)
        }

        applyTemplateToStore(template, undefined)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load workflow draft'
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, applyTemplateToStore]
  )

  return useMemo(
    () => ({ saveFlow, loadFlow, loadDraft, isLoading, error }),
    [saveFlow, loadFlow, loadDraft, isLoading, error]
  )
}
