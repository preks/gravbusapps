import { useCallback, useMemo } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import {
  type CreateDefinitionDto,
  type CreateNamespaceDto,
  type CustomDataSuggestionApplyResult,
  type CustomDataDefinition,
  type CustomDataNamespace,
  type CustomDataSuggestionRequest,
  type CustomDataSuggestionStreamEvent,
  type EntitySchemaProposal,
  type NamespaceAggregate,
  type NamespacePromotionResult,
  type RowMutationResult,
  type UpdateDefinitionDto
} from '../types'

interface CustomDataClient {
  listNamespaces: () => Promise<CustomDataNamespace[]>
  createNamespace: (dto: CreateNamespaceDto) => Promise<CustomDataNamespace>
  getNamespaceAggregate: (namespace: string, context?: string) => Promise<NamespaceAggregate>
  listDefinitions: (namespace?: string) => Promise<CustomDataDefinition[]>
  getDefinition: (namespace: string, entity: string) => Promise<CustomDataDefinition>
  createDefinition: (dto: CreateDefinitionDto) => Promise<CustomDataDefinition>
  updateDefinition: (namespace: string, entity: string, dto: UpdateDefinitionDto) => Promise<CustomDataDefinition>
  deleteDefinition: (namespace: string, entity: string) => Promise<void>
  promoteEntity: (namespace: string, entity: string) => Promise<CustomDataDefinition>
  promoteNamespace: (namespace: string, updatedBy?: string) => Promise<NamespacePromotionResult>
  streamCustomEntitySuggestion: (
    namespace: string,
    request: CustomDataSuggestionRequest,
    options: {
      onEvent: (event: CustomDataSuggestionStreamEvent) => void
      signal?: AbortSignal
    }
  ) => Promise<void>
  applySuggestedModel: (
    namespace: string,
    proposal: EntitySchemaProposal,
    updatedBy?: string
  ) => Promise<CustomDataSuggestionApplyResult>
  createRow: (namespace: string, definitionKey: string, values: Record<string, unknown>) => Promise<RowMutationResult>
  updateRow: (
    namespace: string,
    definitionKey: string,
    rowId: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  deleteRow: (namespace: string, definitionKey: string, rowId: string) => Promise<RowMutationResult>
}

type RowMutationResponse = RowMutationResult

function toRowMutationResult(response: RowMutationResponse): RowMutationResult {
  return {
    success: Boolean(response.success),
    resultData: response.resultData,
    error: response.error
  }
}

type ApiRowMutationResponse = {
  success: boolean
  resultData?: Record<string, unknown>
  error?: string
}

const DEFAULT_NAMESPACE = 'default'

function buildCustomEntityPath(namespace: string, entity?: string): string {
  const encodedNamespace = encodeURIComponent(namespace)

  if (!entity) {
    return `/v1/custom-data/namespaces/${encodedNamespace}/custom-entities`
  }

  return `/v1/custom-data/namespaces/${encodedNamespace}/custom-entities/${encodeURIComponent(entity)}`
}

/**
 * Hook to create a client for custom-data API calls
 */
export const useCustomDataClient = (accessToken: string): CustomDataClient => {
  const baseUrl = getFlowEngineApiBaseUrl()

  const fetchWithAuth = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = `${baseUrl}${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...options.headers
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }

      if (response.status === 204) {
        return undefined as T
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        return undefined as T
      }

      return response.json()
    },
    [baseUrl, accessToken]
  )

  const listNamespaces = useCallback(
    async (): Promise<CustomDataNamespace[]> => fetchWithAuth<CustomDataNamespace[]>('/v1/custom-data/namespaces'),
    [fetchWithAuth]
  )

  const streamCustomEntitySuggestion = useCallback(
    async (
      namespace: string,
      request: CustomDataSuggestionRequest,
      options: {
        onEvent: (event: CustomDataSuggestionStreamEvent) => void
        signal?: AbortSignal
      }
    ): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/v1/custom-data/namespaces/${encodeURIComponent(namespace)}/custom-entities/suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(request),
          signal: options.signal
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Streaming response body is missing')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const emitChunk = (chunk: string) => {
        const trimmedChunk = chunk.trim()
        if (!trimmedChunk || trimmedChunk.startsWith(':')) {
          return
        }

        const dataPayload = trimmedChunk
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n')

        if (!dataPayload) {
          return
        }

        options.onEvent(JSON.parse(dataPayload) as CustomDataSuggestionStreamEvent)
      }

      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

        const eventChunks = buffer.split('\n\n')
        buffer = eventChunks.pop() || ''

        for (const chunk of eventChunks) {
          emitChunk(chunk)
        }

        if (done) {
          break
        }
      }

      if (buffer.trim()) {
        emitChunk(buffer)
      }
    },
    [accessToken, baseUrl]
  )

  const createNamespace = useCallback(
    async (dto: CreateNamespaceDto): Promise<CustomDataNamespace> =>
      fetchWithAuth<CustomDataNamespace>('/v1/custom-data/namespaces', {
        method: 'POST',
        body: JSON.stringify(dto)
      }),
    [fetchWithAuth]
  )

  const getNamespaceAggregate = useCallback(
    async (namespace: string, context: string = 'service'): Promise<NamespaceAggregate> => {
      const query = new URLSearchParams({ context }).toString()
      return fetchWithAuth<NamespaceAggregate>(`/v1/custom-data/namespaces/${encodeURIComponent(namespace)}?${query}`)
    },
    [fetchWithAuth]
  )

  const listDefinitions = useCallback(
    async (namespace?: string): Promise<CustomDataDefinition[]> => {
      if (namespace) {
        return fetchWithAuth<CustomDataDefinition[]>(buildCustomEntityPath(namespace))
      }

      const namespaces = await listNamespaces()
      const definitionsByNamespace = await Promise.all(
        namespaces.map(currentNamespace =>
          fetchWithAuth<CustomDataDefinition[]>(buildCustomEntityPath(currentNamespace.namespace))
        )
      )

      return definitionsByNamespace.flat()
    },
    [fetchWithAuth, listNamespaces]
  )

  const getDefinition = useCallback(
    async (namespace: string, entity: string): Promise<CustomDataDefinition> =>
      fetchWithAuth<CustomDataDefinition>(buildCustomEntityPath(namespace, entity)),
    [fetchWithAuth]
  )

  const createDefinition = useCallback(
    async (dto: CreateDefinitionDto): Promise<CustomDataDefinition> =>
      fetchWithAuth<CustomDataDefinition>(buildCustomEntityPath(dto.namespace || DEFAULT_NAMESPACE), {
        method: 'POST',
        body: JSON.stringify({
          key: dto.key,
          display_name: dto.display_name,
          description: dto.description,
          columns_json: dto.columns_json,
          created_by: dto.created_by
        })
      }),
    [fetchWithAuth]
  )

  const updateDefinition = useCallback(
    async (namespace: string, entity: string, dto: UpdateDefinitionDto): Promise<CustomDataDefinition> =>
      fetchWithAuth<CustomDataDefinition>(buildCustomEntityPath(namespace, entity), {
        method: 'PATCH',
        body: JSON.stringify(dto)
      }),
    [fetchWithAuth]
  )

  const deleteDefinition = useCallback(
    async (namespace: string, entity: string): Promise<void> => {
      await fetchWithAuth<void>(buildCustomEntityPath(namespace, entity), {
        method: 'DELETE'
      })
    },
    [fetchWithAuth]
  )

  const promoteEntity = useCallback(
    async (namespace: string, entity: string): Promise<CustomDataDefinition> =>
      fetchWithAuth<CustomDataDefinition>(`${buildCustomEntityPath(namespace, entity)}/promotions`, {
        method: 'POST'
      }),
    [fetchWithAuth]
  )

  const promoteNamespace = useCallback(
    async (namespace: string, updatedBy?: string): Promise<NamespacePromotionResult> =>
      fetchWithAuth<NamespacePromotionResult>(
        `/v1/custom-data/namespaces/${encodeURIComponent(namespace)}/promotions`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...(updatedBy ? { updated_by: updatedBy } : {})
          })
        }
      ),
    [fetchWithAuth]
  )

  const applySuggestedModel = useCallback(
    async (
      namespace: string,
      proposal: EntitySchemaProposal,
      updatedBy?: string
    ): Promise<CustomDataSuggestionApplyResult> =>
      fetchWithAuth<CustomDataSuggestionApplyResult>(
        `/v1/custom-data/namespaces/${encodeURIComponent(namespace)}/custom-entities/suggestions/apply`,
        {
          method: 'POST',
          body: JSON.stringify({
            proposal,
            ...(updatedBy ? { updated_by: updatedBy } : {})
          })
        }
      ),
    [fetchWithAuth]
  )

  const createRow = useCallback(
    async (namespace: string, definitionKey: string, values: Record<string, unknown>): Promise<RowMutationResult> => {
      const response = await fetchWithAuth<ApiRowMutationResponse>(
        `${buildCustomEntityPath(namespace, definitionKey)}/rows`,
        {
          method: 'POST',
          body: JSON.stringify({ values })
        }
      )

      return toRowMutationResult(response)
    },
    [fetchWithAuth]
  )

  const updateRow = useCallback(
    async (
      namespace: string,
      definitionKey: string,
      rowId: string,
      values: Record<string, unknown>
    ): Promise<RowMutationResult> => {
      const response = await fetchWithAuth<ApiRowMutationResponse>(
        `${buildCustomEntityPath(namespace, definitionKey)}/rows/${encodeURIComponent(rowId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ values })
        }
      )

      return toRowMutationResult(response)
    },
    [fetchWithAuth]
  )

  const deleteRow = useCallback(
    async (namespace: string, definitionKey: string, rowId: string): Promise<RowMutationResult> => {
      const response = await fetchWithAuth<ApiRowMutationResponse>(
        `${buildCustomEntityPath(namespace, definitionKey)}/rows/${encodeURIComponent(rowId)}`,
        {
          method: 'DELETE'
        }
      )

      return toRowMutationResult(response)
    },
    [fetchWithAuth]
  )

  return useMemo(
    () => ({
      listNamespaces,
      createNamespace,
      getNamespaceAggregate,
      listDefinitions,
      getDefinition,
      createDefinition,
      updateDefinition,
      deleteDefinition,
      promoteEntity,
      promoteNamespace,
      streamCustomEntitySuggestion,
      applySuggestedModel,
      createRow,
      updateRow,
      deleteRow
    }),
    [
      listNamespaces,
      createNamespace,
      getNamespaceAggregate,
      listDefinitions,
      getDefinition,
      createDefinition,
      updateDefinition,
      deleteDefinition,
      promoteEntity,
      promoteNamespace,
      streamCustomEntitySuggestion,
      applySuggestedModel,
      createRow,
      updateRow,
      deleteRow
    ]
  )
}
