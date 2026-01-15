import { useCallback, useMemo } from 'react'
import { env } from '@/common/env/EnvUtils'
import {
  CustomDataDefinition,
  CreateDefinitionDto,
  UpdateDefinitionDto,
  SpreadsheetRow,
  CreateRowDto,
  UpdateRowDto,
  DefinitionKind,
  EntitySchemaProposal,
  BatchCreationResult,
  EntityRelationship
} from '../types'

interface CustomDataClient {
  // Definitions
  listDefinitions: (kind?: DefinitionKind, namespace?: string) => Promise<CustomDataDefinition[]>
  getDefinition: (id: string) => Promise<CustomDataDefinition>
  createDefinition: (dto: CreateDefinitionDto) => Promise<CustomDataDefinition>
  updateDefinition: (id: string, dto: UpdateDefinitionDto) => Promise<CustomDataDefinition>
  deleteDefinition: (id: string) => Promise<{ success: boolean }>

  // Spreadsheet rows
  listRows: (
    definitionKey: string,
    params?: { limit?: number; offset?: number }
  ) => Promise<{ rows: SpreadsheetRow[]; total: number }>
  createRow: (definitionKey: string, dto: CreateRowDto) => Promise<SpreadsheetRow>
  updateRow: (definitionKey: string, rowId: string, dto: UpdateRowDto) => Promise<SpreadsheetRow>
  deleteRow: (definitionKey: string, rowId: string) => Promise<{ success: boolean }>

  // Entity promotion
  promoteEntity: (definitionId: string) => Promise<CustomDataDefinition>

  // AI Schema Generation
  generateSchemaFromNaturalLanguage: (description: string) => Promise<EntitySchemaProposal>
  createEntitiesFromProposal: (proposal: EntitySchemaProposal, createdBy?: string) => Promise<BatchCreationResult>
  createRelationship: (relationship: EntityRelationship, createdBy?: string) => Promise<{ success: boolean }>
}

/**
 * Hook to create a client for custom-data API calls
 */
export const useCustomDataClient = (accessToken: string): CustomDataClient => {
  const baseUrl = useMemo(() => {
    return env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
  }, [])

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

      return response.json()
    },
    [baseUrl, accessToken]
  )

  const listDefinitions = useCallback(
    async (kind?: DefinitionKind, namespace?: string): Promise<CustomDataDefinition[]> => {
      const params = new URLSearchParams()
      if (kind) params.set('kind', kind)
      if (namespace) params.set('namespace', namespace)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      return fetchWithAuth<CustomDataDefinition[]>(`/api/custom-data/definitions${queryString}`)
    },
    [fetchWithAuth]
  )

  const getDefinition = useCallback(
    async (id: string): Promise<CustomDataDefinition> => {
      return fetchWithAuth<CustomDataDefinition>(`/api/custom-data/definitions/${id}`)
    },
    [fetchWithAuth]
  )

  const createDefinition = useCallback(
    async (dto: CreateDefinitionDto): Promise<CustomDataDefinition> => {
      return fetchWithAuth<CustomDataDefinition>('/api/custom-data/definitions', {
        method: 'POST',
        body: JSON.stringify(dto)
      })
    },
    [fetchWithAuth]
  )

  const updateDefinition = useCallback(
    async (id: string, dto: UpdateDefinitionDto): Promise<CustomDataDefinition> => {
      return fetchWithAuth<CustomDataDefinition>(`/api/custom-data/definitions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto)
      })
    },
    [fetchWithAuth]
  )

  const deleteDefinition = useCallback(
    async (id: string): Promise<{ success: boolean }> => {
      return fetchWithAuth<{ success: boolean }>(`/api/custom-data/definitions/${id}`, {
        method: 'DELETE'
      })
    },
    [fetchWithAuth]
  )

  const listRows = useCallback(
    async (
      definitionKey: string,
      params?: { limit?: number; offset?: number }
    ): Promise<{ rows: SpreadsheetRow[]; total: number }> => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.set('limit', String(params.limit))
      if (params?.offset) queryParams.set('offset', String(params.offset))
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

      return fetchWithAuth<{ rows: SpreadsheetRow[]; total: number }>(
        `/api/custom-data/spreadsheets/${definitionKey}/rows${queryString}`
      )
    },
    [fetchWithAuth]
  )

  const createRow = useCallback(
    async (definitionKey: string, dto: CreateRowDto): Promise<SpreadsheetRow> => {
      return fetchWithAuth<SpreadsheetRow>(`/api/custom-data/spreadsheets/${definitionKey}/rows`, {
        method: 'POST',
        body: JSON.stringify(dto)
      })
    },
    [fetchWithAuth]
  )

  const updateRow = useCallback(
    async (definitionKey: string, rowId: string, dto: UpdateRowDto): Promise<SpreadsheetRow> => {
      return fetchWithAuth<SpreadsheetRow>(`/api/custom-data/spreadsheets/${definitionKey}/rows/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto)
      })
    },
    [fetchWithAuth]
  )

  const deleteRow = useCallback(
    async (definitionKey: string, rowId: string): Promise<{ success: boolean }> => {
      return fetchWithAuth<{ success: boolean }>(`/api/custom-data/spreadsheets/${definitionKey}/rows/${rowId}`, {
        method: 'DELETE'
      })
    },
    [fetchWithAuth]
  )

  const promoteEntity = useCallback(
    async (definitionId: string): Promise<CustomDataDefinition> => {
      return fetchWithAuth<CustomDataDefinition>('/api/custom-data/entities/promote', {
        method: 'POST',
        body: JSON.stringify({ definitionId })
      })
    },
    [fetchWithAuth]
  )

  const generateSchemaFromNaturalLanguage = useCallback(
    async (description: string): Promise<EntitySchemaProposal> => {
      return fetchWithAuth<EntitySchemaProposal>('/api/custom-data/ai/generate-schema', {
        method: 'POST',
        body: JSON.stringify({ description })
      })
    },
    [fetchWithAuth]
  )

  const createEntitiesFromProposal = useCallback(
    async (proposal: EntitySchemaProposal, createdBy?: string): Promise<BatchCreationResult> => {
      return fetchWithAuth<BatchCreationResult>('/api/custom-data/ai/create-entities-batch', {
        method: 'POST',
        body: JSON.stringify({ proposal, createdBy })
      })
    },
    [fetchWithAuth]
  )

  const createRelationship = useCallback(
    async (relationship: EntityRelationship, createdBy?: string): Promise<{ success: boolean }> => {
      return fetchWithAuth<{ success: boolean }>('/api/custom-data/relationships', {
        method: 'POST',
        body: JSON.stringify({ relationship, createdBy })
      })
    },
    [fetchWithAuth]
  )

  return useMemo(
    () => ({
      listDefinitions,
      getDefinition,
      createDefinition,
      updateDefinition,
      deleteDefinition,
      listRows,
      createRow,
      updateRow,
      deleteRow,
      promoteEntity,
      generateSchemaFromNaturalLanguage,
      createEntitiesFromProposal,
      createRelationship
    }),
    [
      listDefinitions,
      getDefinition,
      createDefinition,
      updateDefinition,
      deleteDefinition,
      listRows,
      createRow,
      updateRow,
      deleteRow,
      promoteEntity,
      generateSchemaFromNaturalLanguage,
      createEntitiesFromProposal,
      createRelationship
    ]
  )
}
