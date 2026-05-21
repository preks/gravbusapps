import { useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface EmployeeEligibilityProfile {
  companyId: string
  contractTypeId: string
  employmentTypeId: string
}

export interface EmployeeSearchOption {
  value: string
  label: string
  profile: EmployeeEligibilityProfile
}

const EMPLOYEE_ELIGIBILITY_QUERY = `
  query GetEmployeeEligibilityProfile($structureId: uuid!, $search: String, $limit: Int) {
    EmployeePosition(
      where: {
        structureId: { _eq: $structureId }
        employee: { isDeleted: { _eq: false } }
        _or: [
          { firstName: { _ilike: $search } }
          { lastName: { _ilike: $search } }
          { employee: { displayName: { _ilike: $search } } }
        ]
      }
      limit: $limit
      orderBy: [{ firstName: ASC }, { lastName: ASC }]
    ) {
      employeeId
      companyId
      employee {
        displayName
        firstName
        lastName
        workingCondition {
          contractType {
            id
          }
          employmentType {
            id
          }
        }
      }
    }
  }
`

export const useEmployeeEligibilityProfile = (accessToken: string) => {
  const [options, setOptions] = useState<EmployeeSearchOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)

  const searchEmployees = useCallback(
    async (search?: string) => {
      if (!accessToken) return

      const structureId = getCurrentActiveStructureId()
      if (!structureId) return

      setIsLoading(true)
      try {
        const data = await graphqlClient.request(EMPLOYEE_ELIGIBILITY_QUERY, {
          structureId,
          search: search ? `%${search}%` : '%',
          limit: 30
        })

        const positions: any[] = data?.EmployeePosition || []

        setOptions(
          positions.map(pos => {
            const emp = pos.employee || {}
            const wc = emp.workingCondition || {}
            const name = emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || pos.employeeId

            return {
              value: pos.employeeId,
              label: name,
              profile: {
                companyId: pos.companyId || '',
                contractTypeId: wc.contractType?.id || '',
                employmentTypeId: wc.employmentType?.id || ''
              }
            }
          })
        )
      } catch (err) {
        console.error('Error searching employees for eligibility profile:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  return { options, isLoading, searchEmployees }
}
