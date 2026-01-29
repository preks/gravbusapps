/**
 * useTemplateEntitySchemas
 *
 * Fetches entity schemas from the flow-engine API (same source as FlowCreator)
 * for use in the template editor "Insert field" panel. Entities expose types
 * and fields that can be inserted as placeholders (e.g. {{jobCandidate.firstName}}).
 */

import { useState, useEffect, useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'

export interface EntityFieldSchema {
  name: string
  displayName: string
  type: string
  description?: string
  required?: boolean
  catalogName?: string
  referencedEntity?: string
  icon?: string
  category?: string
}

export interface EntitySchema {
  type: string
  displayName: string
  description: string
  icon?: string
  apiEndpoint?: string
  exampleId?: string
  fields: EntityFieldSchema[]
}

export interface UseTemplateEntitySchemasResult {
  schemas: Record<string, EntitySchema> | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const getFlowEngineUrl = (): string =>
  env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

/**
 * Fetches entity schemas from flow-engine API (same as FlowCreator).
 */
export function useTemplateEntitySchemas(): UseTemplateEntitySchemasResult {
  const [schemas, setSchemas] = useState<Record<string, EntitySchema> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSchemas = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = `${getFlowEngineUrl()}/api/entities?includeFields=true`
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch entity schemas: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      const raw = data.schemas ?? data.entities ?? {}
      if (typeof raw !== 'object') {
        throw new Error('Invalid response: entities/schemas is not an object')
      }
      setSchemas(raw)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setSchemas(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchemas()
  }, [fetchSchemas])

  return { schemas, isLoading, error, refetch: fetchSchemas }
}
