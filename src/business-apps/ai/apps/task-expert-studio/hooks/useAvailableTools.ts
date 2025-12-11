import { useCallback, useEffect, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'

export interface UnifiedTool {
  id: string
  code: string // Used for tool assignment (function.<name>)
  name: string
  description?: string | null
  type: 'function'
  version?: number
  source: 'functions-service'
  functionTool?: LatestFunctionItem
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
  if (!functionsClientRef.current) {
    functionsClientRef.current = new FunctionsServiceClient()
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

      // Sort by name
      const allTools = functionTools.sort((a, b) => a.name.localeCompare(b.name))

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
