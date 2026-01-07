import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_CATALOG_ENTRIES } from '@/common/data/catalog/queries/catalogQueries'

export interface AbsenceTypeDetails {
  id: string
  name: string
  objectValue?: {
    checkEntitlement?: boolean
    measurement?: string
    [key: string]: any
  }
}

export const useAbsenceTypeDetails = (
  context: BusinessAppContextProps,
  absenceTypeId?: string
): { details: AbsenceTypeDetails | null; isLoading: boolean; error: string | null } => {
  const [details, setDetails] = useState<AbsenceTypeDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const loadAbsenceTypeDetails = useCallback(async () => {
    if (!context.accessToken || !absenceTypeId) {
      setDetails(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_CATALOG_ENTRIES({
        catalogIdentifier: 'AbsenceType',
        version: 'v1',
        limit: 1,
        offset: 0,
        entryId: absenceTypeId,
        includeChildCatalogEntries: false
      })

      const response = await graphqlClient.request<{ CatalogEntry: any[] }>(query)
      const entries = response.CatalogEntry || []

      if (entries.length === 0) {
        setDetails(null)
        return
      }

      const entry = entries[0]
      setDetails({
        id: entry.id,
        name: entry.value || entry.code || entry.id,
        objectValue: entry.objectValue
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load absence type details')
      setDetails(null)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, context.accessToken, absenceTypeId])

  useEffect(() => {
    loadAbsenceTypeDetails()
  }, [loadAbsenceTypeDetails])

  return {
    details,
    isLoading,
    error
  }
}
