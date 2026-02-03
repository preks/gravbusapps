import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface CurrentUserOrgData {
  organizationalUnitId?: string
  costCenterId?: string
  siteLocationId?: string
  companyId?: string
}

interface UseCurrentUserOrgDataProps {
  accessToken: string
  employeeId: string
}

export interface UseCurrentUserOrgDataResult {
  orgData: CurrentUserOrgData | null
  loading: boolean
  error: Error | null
}

/**
 * Hook to fetch current user's organizational data for job request context
 */
export const useCurrentUserOrgData = ({
  accessToken,
  employeeId
}: UseCurrentUserOrgDataProps): UseCurrentUserOrgDataResult => {
  const [orgData, setOrgData] = useState<CurrentUserOrgData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchOrgData = async () => {
      if (!employeeId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const query = `
          query GetCurrentUserOrgData($employeeId: uuid!) {
            Employee(where: { id: { _eq: $employeeId } }) {
              id
              employeePosition {
                organizationalUnit {
                  id
                }
                costCenter {
                  id
                }
                siteLocation {
                  id
                }
                company {
                  id
                }
              }
            }
          }
        `

        const response = await graphQLClient.request(query, {
          employeeId
        })

        if (response?.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]
          const position = employee.employeePosition

          setOrgData({
            organizationalUnitId: position?.organizationalUnit?.id,
            costCenterId: position?.costCenter?.id,
            siteLocationId: position?.siteLocation?.id,
            companyId: position?.company?.id
          })
        } else {
          setOrgData(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user organizational data'))
        setOrgData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrgData()
  }, [employeeId, accessToken, graphQLClient])

  return {
    orgData,
    loading,
    error
  }
}
