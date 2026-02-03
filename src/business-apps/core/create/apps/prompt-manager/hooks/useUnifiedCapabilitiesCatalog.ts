import { useCallback, useEffect, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ToolODM, MCPConfig } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { UnifiedCapability } from '../components/task-expert-builder/types'

export interface UseUnifiedCapabilitiesCatalogResult {
  capabilities: UnifiedCapability[]
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Unified capabilities catalog merging:
 * - Functions Service tools (workflow-enabled functions)
 * - Prompt Manager tool library (MCP)
 */
export const useUnifiedCapabilitiesCatalog = (
  context: BusinessAppContextProps
): UseUnifiedCapabilitiesCatalogResult => {
  const functionsClientRef = useRef<FunctionsServiceClient | null>(null)
  if (!functionsClientRef.current) {
    functionsClientRef.current = new FunctionsServiceClient()
  }

  const pmClient = usePromptManagerClient(context.accessToken)

  const [capabilities, setCapabilities] = useState<UnifiedCapability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch from multiple sources in parallel
      const [functionsResult, pmToolsResult] = await Promise.all([
        functionsClientRef.current!.listLatest({ agentEnabled: true }).catch(() => [] as LatestFunctionItem[]),
        pmClient.getTools({ limit: 100, toolType: 'mcp' }).catch(() => ({ data: [] as ToolODM[] }))
      ])

      const unified: UnifiedCapability[] = []

      // 1. Functions Service tools
      functionsResult.forEach(func => {
        unified.push({
          id: func.id,
          code: `function.${func.name}`,
          name: func.name,
          description: func.description || null,
          kind: 'function',
          supportsVersion: true,
          sourceMeta: {
            functionId: func.id
          }
        })
      })

      // 2. Prompt Manager tool library (MCP tools)
      pmToolsResult.data.forEach(tool => {
        const backendCode = (tool as any).code as string | undefined
        if (tool.type === 'mcp') {
          const mcpConfig = tool.config as MCPConfig
          unified.push({
            id: `pm-mcp-${tool._id}`,
            code: backendCode || `mcp.${tool.name?.toLowerCase().replace(/\s+/g, '-') || tool._id}`,
            name: tool.name,
            description: tool.description || null,
            kind: 'mcp',
            supportsVersion: false,
            sourceMeta: {
              promptManagerToolId: tool._id,
              mcpUrl: mcpConfig.url,
              transport: mcpConfig.transport,
              internal: !!tool.internal
            }
          })
        }
      })

      // Sort by name
      unified.sort((a, b) => a.name.localeCompare(b.name))
      setCapabilities(unified)
      hasLoadedRef.current = context.accessToken
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load capabilities')
      setCapabilities([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, pmClient])

  useEffect(() => {
    if (hasLoadedRef.current !== context.accessToken) {
      reload().catch(() => undefined)
    }
  }, [context.accessToken, reload])

  return {
    capabilities,
    isLoading,
    error,
    reload
  }
}

export default useUnifiedCapabilitiesCatalog
