import { useEffect, useMemo, useState } from 'react'
import { useCustomDataClient } from '@/business-apps/core/create/apps/custom-data-manager/hooks/useCustomDataClient'
import type {
  CustomDataDefinition,
  CustomDataNamespace
} from '@/business-apps/core/create/apps/custom-data-manager/types'

interface UseCustomDataEntitiesResult {
  namespaces: CustomDataNamespace[]
  namespacesLoading: boolean
  definitions: CustomDataDefinition[]
  definitionsLoading: boolean
  error: string | null
}

const NAMESPACE_LIMIT = 100
const NAMESPACE_SORT = '+namespace'

/**
 * Loads custom-data namespaces and, for the selected namespace, its entity
 * definitions (with columns). Powers the namespace/entity pickers in the
 * "Save to Custom Data" flow studio step.
 */
export const useCustomDataEntities = (accessToken: string, namespace?: string): UseCustomDataEntitiesResult => {
  const client = useCustomDataClient(accessToken)
  const [namespaces, setNamespaces] = useState<CustomDataNamespace[]>([])
  const [namespacesLoading, setNamespacesLoading] = useState(false)
  const [definitions, setDefinitions] = useState<CustomDataDefinition[]>([])
  const [definitionsLoading, setDefinitionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setNamespacesLoading(true)
    client
      .listNamespaces({ offset: 0, limit: NAMESPACE_LIMIT, sort: NAMESPACE_SORT })
      .then(response => {
        if (!cancelled) setNamespaces(response.data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load namespaces')
      })
      .finally(() => {
        if (!cancelled) setNamespacesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, client])

  useEffect(() => {
    const trimmed = String(namespace || '').trim()
    if (!accessToken || !trimmed) {
      setDefinitions([])
      return
    }
    let cancelled = false
    setDefinitionsLoading(true)
    client
      .listDefinitions(trimmed)
      .then(list => {
        if (!cancelled) setDefinitions(list)
      })
      .catch(err => {
        if (cancelled) return
        setDefinitions([])
        setError(err instanceof Error ? err.message : 'Failed to load entities')
      })
      .finally(() => {
        if (!cancelled) setDefinitionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, client, namespace])

  return useMemo(
    () => ({ namespaces, namespacesLoading, definitions, definitionsLoading, error }),
    [namespaces, namespacesLoading, definitions, definitionsLoading, error]
  )
}
