/**
 * useFlowStudioClient - API client for Flow Studio save/load.
 * Wires to the real FlowTemplateClient for template persistence.
 */

import { useCallback, useMemo, useState } from 'react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { useFlowStudioStore } from './useFlowStudioStore'
import { studioGraphToTemplate, templateToStudioGraph } from '../utils/templateConverter'

interface FlowStudioClient {
  /** Save the current flow to the backend */
  saveFlow: () => Promise<void>
  /** Load a flow template by ID */
  loadFlow: (templateId: string) => Promise<void>
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveFlow = useCallback(async () => {
    const state = useFlowStudioStore.getState()
    const templateId = state.templateId?.trim() || undefined
    setIsLoading(true)
    setError(null)

    try {
      // Convert studio graph to the backend FlowTemplate format
      const template = studioGraphToTemplate(
        state.nodes,
        state.edges,
        state.templateName,
        state.templateDescription,
        state.templateTags,
        state.templateVersion
      )

      if (templateId) {
        // Update existing template
        await templateClient.updateTemplate(templateId, template)
      } else {
        // Create new template
        const created = await templateClient.createTemplate(template)
        // Store the new template ID back (via store if needed)
        if (created?.id) {
          useFlowStudioStore.setState({ templateId: created.id })
        }
      }

      markClean()
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
  }, [templateClient, markClean])

  const loadFlow = useCallback(
    async (templateId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const template = await templateClient.getTemplate(templateId)
        if (!template) {
          throw new Error(`Template ${templateId} not found`)
        }

        // Convert backend FlowTemplate to studio graph format
        const { nodes, edges } = templateToStudioGraph(template)
        loadTemplate(template.id || templateId, nodes, edges, {
          name: template.name || 'Untitled Flow',
          description: template.description || '',
          version: template.version,
          tags: template.tags ?? {}
        })

        markClean()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load flow template'
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [templateClient, loadTemplate, markClean]
  )

  return useMemo(() => ({ saveFlow, loadFlow, isLoading, error }), [saveFlow, loadFlow, isLoading, error])
}
