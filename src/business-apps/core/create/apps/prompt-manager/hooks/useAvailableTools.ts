import { useCallback, useEffect, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { INTERNAL_TOOLS, type InternalToolDefinition } from '../definitions/internal-tools'

export interface UnifiedTool {
  id: string
  code: string // Used for tool assignment (function.<name> or internal.<name>)
  name: string
  description?: string | null
  type: 'function' | 'internal'
  category?: string // For internal tools: lead, opportunity, contact, account
  version?: number
  source: 'functions-service' | 'internal'
  functionTool?: LatestFunctionItem
  internalTool?: InternalToolDefinition
}

export interface UseAvailableToolsResult {
  tools: UnifiedTool[]
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Fetches task-expert-enabled functions from functions-service as tools
 */
export const useAvailableTools = (context: BusinessAppContextProps): UseAvailableToolsResult => {
  // Use ref to keep functionsClient stable across renders
  const functionsClientRef = useRef<FunctionsServiceClient | null>(null)
  // Recreate client when access token changes (functions endpoints are authenticated)
  if (!functionsClientRef.current || (functionsClientRef.current as any).__token !== context.accessToken) {
    const client = new FunctionsServiceClient(context.accessToken)
    ;(client as any).__token = context.accessToken
    functionsClientRef.current = client
  }

  const [tools, setTools] = useState<UnifiedTool[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef<string | null>(null) // Track which accessToken we've loaded for

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch task-expert-enabled functions from functions-service
      const functionsResult = await functionsClientRef.current!.listLatest({ agentEnabled: true }).catch(() => [])

      const functionTools: UnifiedTool[] = functionsResult.map(func => ({
        id: func.id,
        code: `function.${func.name}`, // Use function.<name> format for functions
        name: func.name,
        description: func.description || null,
        type: 'function' as const,
        version: func.latestVersion?.version,
        source: 'functions-service' as const,
        functionTool: func
      }))

      // Add internal tools
      const internalToolsList: UnifiedTool[] = INTERNAL_TOOLS.map(tool => ({
        id: `internal-${tool.id}`,
        code: `internal.${tool.id}`, // Use internal.<name> format for internal tools
        name: tool.name,
        description: tool.description,
        type: 'internal' as const,
        category: tool.category,
        source: 'internal' as const,
        internalTool: tool
      }))

      // Combine and sort by name
      const allTools = [...internalToolsList, ...functionTools].sort((a, b) => a.name.localeCompare(b.name))

      setTools(allTools)
      hasLoadedRef.current = context.accessToken // Mark as loaded for this accessToken
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tools')
      setTools([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  // Load tools once per accessToken
  useEffect(() => {
    // Only load if we haven't loaded for this accessToken yet
    if (hasLoadedRef.current !== context.accessToken) {
      reload().catch(() => undefined)
    }
  }, [context.accessToken, reload])

  return {
    tools,
    isLoading,
    error,
    reload
  }
}

export default useAvailableTools
