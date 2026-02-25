/**
 * useFlowStudioData - Shared data fetching for Flow Studio.
 * Loads agents (prompts), workflow functions, and catalogs from real APIs.
 * Centralizes data that multiple config panels need.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  FunctionsServiceClient,
  type LatestFunctionItem,
  type FunctionVersionMeta
} from '@/common/network/functions/FunctionsServiceClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CATALOGS } from '@/common/data/catalog/queries/catalogQueries'
import type { BaseCatalog, CatalogResponse } from '@/common/data/catalog/types/catalogTypes'

export interface CatalogOption {
  identifier: string
  name: string
  version: string
  entryCount: number
}

export interface FlowStudioData {
  /** All prompts/agents from Prompt Manager */
  agents: PromptODM[]
  agentsLoading: boolean
  agentsError: string | null
  refetchAgents: () => Promise<void>

  /** Workflow-enabled functions from Functions Service */
  functions: LatestFunctionItem[]
  functionsLoading: boolean
  functionsError: string | null
  refetchFunctions: () => Promise<void>

  /** Available catalogs for form field data sources */
  catalogs: CatalogOption[]
  catalogsLoading: boolean

  /** Load versions for a specific agent */
  loadAgentVersions: (agentId: string) => Promise<number[]>
  /** Load parameters for a specific agent */
  loadAgentParameters: (agentId: string) => Promise<{ system: string[]; user: string[] }>

  /** Load versions for a specific function */
  loadFunctionVersions: (functionId: string) => Promise<FunctionVersionMeta[]>
}

export function useFlowStudioData(accessToken: string): FlowStudioData {
  const promptClient = usePromptManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  // --- Agents ---
  const [agents, setAgents] = useState<PromptODM[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentsError, setAgentsError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true)
    setAgentsError(null)
    try {
      const response = await promptClient.getPrompts({ limit: 100, offset: 0 })
      setAgents(response.data || [])
    } catch (err) {
      setAgentsError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setAgentsLoading(false)
    }
  }, [promptClient])

  useEffect(() => {
    if (accessToken) fetchAgents()
  }, [accessToken, fetchAgents])

  const loadAgentVersions = useCallback(
    async (agentId: string): Promise<number[]> => {
      try {
        const res = await promptClient.getPromptVersions(agentId, { limit: 100, offset: 0 })
        return (res.data || [])
          .map(v => Number(v.version))
          .filter(v => !Number.isNaN(v))
          .sort((a, b) => b - a)
      } catch {
        return []
      }
    },
    [promptClient]
  )

  const loadAgentParameters = useCallback(
    async (agentId: string) => {
      try {
        const params = await promptClient.getPromptParameters(agentId)
        return {
          system: params.system_parameters || [],
          user: params.user_parameters || []
        }
      } catch {
        return { system: [], user: [] }
      }
    },
    [promptClient]
  )

  // --- Functions ---
  const [functions, setFunctions] = useState<LatestFunctionItem[]>([])
  const [functionsLoading, setFunctionsLoading] = useState(false)
  const [functionsError, setFunctionsError] = useState<string | null>(null)

  const fetchFunctions = useCallback(async () => {
    setFunctionsLoading(true)
    setFunctionsError(null)
    try {
      const client = new FunctionsServiceClient(accessToken)
      const response = await client.listLatest({ workflowEnabled: true })
      setFunctions(response || [])
    } catch (err) {
      setFunctionsError(err instanceof Error ? err.message : 'Failed to load functions')
    } finally {
      setFunctionsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (accessToken) fetchFunctions()
  }, [accessToken, fetchFunctions])

  const loadFunctionVersions = useCallback(
    async (functionId: string): Promise<FunctionVersionMeta[]> => {
      try {
        const client = new FunctionsServiceClient(accessToken)
        const response = await client.getVersions(functionId)
        return (response.versions || []).sort((a, b) => (b.version || 0) - (a.version || 0))
      } catch {
        return []
      }
    },
    [accessToken]
  )

  // --- Catalogs ---
  const [catalogs, setCatalogs] = useState<CatalogOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)

  useEffect(() => {
    const fetchCatalogs = async () => {
      setCatalogsLoading(true)
      try {
        const query = GET_CATALOGS({ limit: 100, includeCatalogEntries: false })
        const result = await graphqlClient.request<CatalogResponse>(query)
        const baseCatalogs: BaseCatalog[] = result.Catalog || []
        setCatalogs(
          baseCatalogs.map(c => ({
            identifier: c.identifier,
            name: c.name,
            version: c.version || 'v1',
            entryCount: c.catalogEntriesAggregate?.aggregate?.count || 0
          }))
        )
      } catch {
        setCatalogs([])
      } finally {
        setCatalogsLoading(false)
      }
    }
    if (accessToken) fetchCatalogs()
  }, [accessToken, graphqlClient])

  return useMemo(
    () => ({
      agents,
      agentsLoading,
      agentsError,
      refetchAgents: fetchAgents,
      functions,
      functionsLoading,
      functionsError,
      refetchFunctions: fetchFunctions,
      catalogs,
      catalogsLoading,
      loadAgentVersions,
      loadAgentParameters,
      loadFunctionVersions
    }),
    [
      agents,
      agentsLoading,
      agentsError,
      fetchAgents,
      functions,
      functionsLoading,
      functionsError,
      fetchFunctions,
      catalogs,
      catalogsLoading,
      loadAgentVersions,
      loadAgentParameters,
      loadFunctionVersions
    ]
  )
}
