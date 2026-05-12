import { useState, useEffect, useCallback } from 'react'
import { useCustomDataClient } from './useCustomDataClient'
import { CustomDataDefinition, CreateDefinitionDto, UpdateDefinitionDto } from '../types'

interface UseDefinitionsResult {
  definitions: CustomDataDefinition[]
  isLoading: boolean
  error: string | null
  selectedDefinition: CustomDataDefinition | null

  // Actions
  refetch: () => Promise<void>
  createDefinition: (dto: CreateDefinitionDto) => Promise<CustomDataDefinition>
  updateDefinition: (definition: CustomDataDefinition, dto: UpdateDefinitionDto) => Promise<CustomDataDefinition>
  selectDefinition: (definition: CustomDataDefinition | null) => void
  loadDefinition: (namespace: string, entity: string) => Promise<CustomDataDefinition | null>
}

/**
 * Hook for managing custom data definitions
 */
export const useDefinitions = (accessToken: string, namespace?: string): UseDefinitionsResult => {
  const client = useCustomDataClient(accessToken)

  const [definitions, setDefinitions] = useState<CustomDataDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDefinition, setSelectedDefinition] = useState<CustomDataDefinition | null>(null)

  const fetchDefinitions = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await client.listDefinitions(namespace)
      setDefinitions(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load definitions'
      setError(message)
      console.error('Failed to fetch definitions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [client, accessToken, namespace])

  useEffect(() => {
    fetchDefinitions()
  }, [fetchDefinitions])

  const createDefinition = useCallback(
    async (dto: CreateDefinitionDto): Promise<CustomDataDefinition> => {
      const newDefinition = await client.createDefinition(dto)
      setDefinitions(prev => [...prev, newDefinition])
      return newDefinition
    },
    [client]
  )

  const updateDefinition = useCallback(
    async (definition: CustomDataDefinition, dto: UpdateDefinitionDto): Promise<CustomDataDefinition> => {
      const updated = await client.updateDefinition(definition.namespace, definition.entityName, dto)
      setDefinitions(prev => prev.map(current => (current.id === definition.id ? updated : current)))
      if (selectedDefinition?.id === definition.id) {
        setSelectedDefinition(updated)
      }
      return updated
    },
    [client, selectedDefinition]
  )

  const selectDefinition = useCallback((definition: CustomDataDefinition | null) => {
    setSelectedDefinition(definition)
  }, [])

  const loadDefinition = useCallback(
    async (namespace: string, entity: string): Promise<CustomDataDefinition | null> => {
      try {
        const definition = await client.getDefinition(namespace, entity)
        setSelectedDefinition(definition)
        return definition
      } catch (err) {
        console.error('Failed to load definition:', err)
        return null
      }
    },
    [client]
  )

  return {
    definitions,
    isLoading,
    error,
    selectedDefinition,
    refetch: fetchDefinitions,
    createDefinition,
    updateDefinition,
    selectDefinition,
    loadDefinition
  }
}
