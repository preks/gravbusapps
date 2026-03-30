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
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { GetCatalogsResponse } from '@/common/types/CatalogTypes'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { extractPromptParameters } from '../utils/promptParameterUtils'

export interface CatalogOption {
  identifier: string
  name: string
  version: string
  entryCount: number
}

export interface EntityOption {
  type: string
  name: string
  fields: string[]
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
  catalogsError: string | null
  catalogsQuery: string
  catalogsHasMore: boolean
  searchCatalogs: (query: string) => Promise<void>
  loadMoreCatalogs: () => Promise<void>

  /** Available entities for form field data sources (advanced) */
  entities: EntityOption[]
  entitiesLoading: boolean
  entitiesError: string | null

  /** Custom data (namespace-scoped) data sources (advanced) */
  customDataNamespaces: string[]
  customDataNamespacesLoading: boolean
  customDataKeysByNamespace: Record<string, string[]>
  customDataKeysLoadingByNamespace: Record<string, boolean>
  fetchCustomDataKeys: (namespace: string) => Promise<void>

  /** Load versions for a specific agent */
  loadAgentVersions: (agentId: string) => Promise<PromptODM[]>
  /** Load parameters for a specific agent */
  loadAgentParameters: (agentId: string, version?: number) => Promise<{ system: string[]; user: string[] }>

  /** Load versions for a specific function */
  loadFunctionVersions: (functionId: string) => Promise<FunctionVersionMeta[]>
}

export function useFlowStudioData(accessToken: string): FlowStudioData {
  const promptClient = usePromptManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

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
    async (agentId: string): Promise<PromptODM[]> => {
      try {
        const res = await promptClient.getPromptVersions(agentId, { limit: 100, offset: 0 })
        return (res.data || []).sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
      } catch {
        return []
      }
    },
    [promptClient]
  )

  const loadAgentParameters = useCallback(
    async (agentId: string, version?: number) => {
      try {
        const normalizedVersion = Number(version)
        if (Number.isFinite(normalizedVersion)) {
          const res = await promptClient.getPromptVersions(agentId, { limit: 100, offset: 0 })
          const matchedVersion = (res.data || []).find(item => Number(item.version) === normalizedVersion)
          if (matchedVersion) return extractPromptParameters(matchedVersion)
        }

        const loadedPrompt = agents.find(item => item._id === agentId)
        if (loadedPrompt) return extractPromptParameters(loadedPrompt)

        const params = await promptClient.getPromptParameters(agentId)
        return {
          system: params.system_parameters || [],
          user: params.user_parameters || []
        }
      } catch {
        return { system: [], user: [] }
      }
    },
    [agents, promptClient]
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
  const CATALOG_PAGE_SIZE = 30
  const [catalogs, setCatalogs] = useState<CatalogOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const [catalogsError, setCatalogsError] = useState<string | null>(null)
  const [catalogsQuery, setCatalogsQuery] = useState('')
  const [catalogsOffset, setCatalogsOffset] = useState(0)
  const [catalogsHasMore, setCatalogsHasMore] = useState(false)

  const fetchCatalogPage = useCallback(
    async (query: string, offset: number, append: boolean) => {
      setCatalogsLoading(true)
      setCatalogsError(null)
      try {
        // Prefer GraphQL (gives entry counts), but fall back to Catalog Manager REST if GraphQL is unavailable.
        try {
          const gql = GET_CATALOGS({
            limit: CATALOG_PAGE_SIZE,
            offset,
            includeCatalogEntries: false,
            search: query || undefined
          })
          const result = await graphqlClient.request<CatalogResponse>(gql)
          const baseCatalogs: BaseCatalog[] = result.Catalog || []
          const total = result.CatalogAggregate?.aggregate?.count ?? baseCatalogs.length
          const page = baseCatalogs.map(c => ({
            identifier: c.identifier,
            name: c.name,
            version: c.version || 'v1',
            entryCount: c.catalogEntriesAggregate?.aggregate?.count || 0
          }))
          setCatalogs(prev => (append ? [...prev, ...page] : page))
          setCatalogsHasMore(offset + page.length < total)
          return
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load catalogs'
          console.error('Catalog GraphQL fetch failed:', message)
        }

        const res = await catalogClient.getCatalogs({
          limit: CATALOG_PAGE_SIZE,
          offset,
          searchCriteria: query || undefined,
          returnTotalRecords: true
        })
        const data = (res as GetCatalogsResponse)?.data ?? []
        const total = (res as GetCatalogsResponse as any)?.paging?.totalRecords ?? offset + data.length
        const page = data.map(c => ({
          identifier: c.identifier,
          name: c.name,
          version: c.version || 'v1',
          entryCount: 0
        }))
        setCatalogs(prev => (append ? [...prev, ...page] : page))
        setCatalogsHasMore(offset + page.length < Number(total || 0))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load catalogs'
        setCatalogs([])
        setCatalogsHasMore(false)
        setCatalogsError(message)
      } finally {
        setCatalogsLoading(false)
      }
    },
    [CATALOG_PAGE_SIZE, catalogClient, graphqlClient]
  )

  const searchCatalogs = useCallback(
    async (query: string) => {
      const q = String(query || '').trim()
      setCatalogsQuery(q)
      setCatalogsOffset(0)
      await fetchCatalogPage(q, 0, false)
    },
    [fetchCatalogPage]
  )

  const loadMoreCatalogs = useCallback(async () => {
    if (catalogsLoading) return
    if (!catalogsHasMore) return
    const nextOffset = catalogsOffset + CATALOG_PAGE_SIZE
    setCatalogsOffset(nextOffset)
    await fetchCatalogPage(catalogsQuery, nextOffset, true)
  }, [CATALOG_PAGE_SIZE, catalogsHasMore, catalogsLoading, catalogsOffset, catalogsQuery, fetchCatalogPage])

  useEffect(() => {
    if (!accessToken) return
    searchCatalogs('')
  }, [accessToken, searchCatalogs])

  // --- Entities (Flow Engine) ---
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [entitiesLoading, setEntitiesLoading] = useState(false)
  const [entitiesError, setEntitiesError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEntities = async () => {
      setEntitiesLoading(true)
      setEntitiesError(null)
      try {
        const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/entities?includeFields=true`)
        if (!response.ok) throw new Error(`Entities request failed: ${response.status} ${response.statusText}`)
        const data = await response.json()
        const list = Object.values((data && data.entities) || {}) as any[]
        setEntities(
          list
            .map(e => {
              const type = String(e?.type || e?.entity || e?.entityType || '')
              const name = String(e?.name || e?.displayName || type)
              const rawFields = Array.isArray(e?.fields) ? e.fields : []
              const fields = rawFields.map((f: any) => String(f?.name || f?.field || f)).filter(Boolean)
              fields.sort((a: string, b: string) => a.localeCompare(b))
              return { type, name, fields }
            })
            .filter(e => e.type)
            .sort((a, b) => String(a.name || a.type).localeCompare(String(b.name || b.type)))
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load entities'
        console.error('Entities fetch failed:', message)
        setEntities([])
        setEntitiesError(message)
      } finally {
        setEntitiesLoading(false)
      }
    }
    fetchEntities()
  }, [])

  // --- Custom data (Flow Engine) ---
  const [customDataNamespaces, setCustomDataNamespaces] = useState<string[]>([])
  const [customDataNamespacesLoading, setCustomDataNamespacesLoading] = useState(false)
  const [customDataKeysByNamespace, setCustomDataKeysByNamespace] = useState<Record<string, string[]>>({})
  const [customDataKeysLoadingByNamespace, setCustomDataKeysLoadingByNamespace] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchNamespaces = async () => {
      if (!accessToken) return
      setCustomDataNamespacesLoading(true)
      try {
        const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/custom-data/namespaces`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error(`Custom data namespaces failed: ${response.status} ${response.statusText}`)
        const data = await response.json()
        const list = Array.isArray(data) ? data : []
        setCustomDataNamespaces(list.map((n: any) => String(n.namespace)).filter(Boolean))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load custom data namespaces'
        console.error('Custom data namespaces fetch failed:', message)
        setCustomDataNamespaces([])
      } finally {
        setCustomDataNamespacesLoading(false)
      }
    }
    fetchNamespaces()
  }, [accessToken])

  const fetchCustomDataKeys = useCallback(
    async (namespace: string) => {
      const ns = String(namespace || '').trim() || 'default'
      if (!accessToken) return
      if (customDataKeysByNamespace[ns]) return
      if (customDataKeysLoadingByNamespace[ns]) return

      setCustomDataKeysLoadingByNamespace(prev => ({ ...prev, [ns]: true }))
      try {
        const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/custom-data-sources/schema`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-schema-namespace': ns
          }
        })
        if (!response.ok) throw new Error(`Custom data schema failed: ${response.status} ${response.statusText}`)
        const data = await response.json()
        const keys = Object.keys((data && data.dataSources) || {})
        setCustomDataKeysByNamespace(prev => ({ ...prev, [ns]: keys }))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load custom data keys'
        console.error('Custom data keys fetch failed:', message)
        setCustomDataKeysByNamespace(prev => ({ ...prev, [ns]: [] }))
      } finally {
        setCustomDataKeysLoadingByNamespace(prev => ({ ...prev, [ns]: false }))
      }
    },
    [accessToken, customDataKeysByNamespace, customDataKeysLoadingByNamespace]
  )

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
      catalogsError,
      catalogsQuery,
      catalogsHasMore,
      searchCatalogs,
      loadMoreCatalogs,
      entities,
      entitiesLoading,
      entitiesError,
      customDataNamespaces,
      customDataNamespacesLoading,
      customDataKeysByNamespace,
      customDataKeysLoadingByNamespace,
      fetchCustomDataKeys,
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
      catalogsError,
      catalogsQuery,
      catalogsHasMore,
      searchCatalogs,
      loadMoreCatalogs,
      entities,
      entitiesLoading,
      entitiesError,
      customDataNamespaces,
      customDataNamespacesLoading,
      customDataKeysByNamespace,
      customDataKeysLoadingByNamespace,
      fetchCustomDataKeys,
      loadAgentVersions,
      loadAgentParameters,
      loadFunctionVersions
    ]
  )
}
