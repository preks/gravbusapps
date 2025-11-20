import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EntityDataForStatusChange {
  id: string
  version: number
  firstName?: string
  lastName?: string
  email?: string
  companyName?: string
  leadStatusRef: string
  leadStatus: {
    id: string
    code: string
    value: string
  }
}

export interface UseEntityDataForStatusChangeOptions {
  entityType: 'Lead' | 'InvestmentLead'
  includeDeletedFilter?: boolean
}

/**
 * Generic hook for fetching entity data in status change popups
 * Supports both CRM Lead and IRM InvestmentLead entities
 */
export const useEntityDataForStatusChange = (
  entityId: string,
  accessToken: string,
  options: UseEntityDataForStatusChangeOptions
) => {
  const [entity, setEntity] = useState<EntityDataForStatusChange | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const { entityType, includeDeletedFilter = false } = options

  useEffect(() => {
    const fetchEntity = async () => {
      if (!entityId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const deletedFilter = includeDeletedFilter ? ', isDeleted: {_eq: false}' : ''
        const query = `
          query Get${entityType}ById($entityId: uuid!) {
            ${entityType}(where: {id: {_eq: $entityId}${deletedFilter}}) {
              id
              version
              firstName
              lastName
              email
              companyName
              leadStatusRef
              leadStatus {
                id
                code
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{
          [key: string]: EntityDataForStatusChange[]
        }>(query, { entityId })

        if (result[entityType] && result[entityType].length > 0) {
          setEntity(result[entityType][0])
        } else {
          setError(`${entityType} not found`)
        }
      } catch (err) {
        console.error(`Error fetching ${entityType} data:`, err)
        setError(`Failed to load ${entityType} data`)
      } finally {
        setLoading(false)
      }
    }

    fetchEntity()
  }, [entityId, accessToken, entityType, includeDeletedFilter, graphqlClient])

  return {
    entity,
    loading,
    error
  }
}
