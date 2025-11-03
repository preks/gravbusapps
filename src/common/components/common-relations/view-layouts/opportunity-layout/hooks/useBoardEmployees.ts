import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface Employee {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
}

interface UseBoardEmployeesProps {
  accessToken: string
  currentEmployeeId?: string
  opportunityType: 'CustomerOpportunity' | 'InvestmentOpportunity'
  selectedPipelineId: string
}

export const useBoardEmployees = ({
  accessToken,
  currentEmployeeId,
  opportunityType,
  selectedPipelineId
}: UseBoardEmployeesProps) => {
  const [employees, setEmployees] = useState<Array<{ id: string; label: string }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadEmployees = useCallback(async () => {
    if (!accessToken || !selectedPipelineId) {
      setEmployees([])
      return
    }

    setIsLoading(true)

    try {
      const query = `
        query GetEmployeesWithOpportunitiesInPipeline {
          ${opportunityType === 'InvestmentOpportunity' ? 'InvestmentOpportunity' : 'Opportunity'}(
            where: { 
              isDeleted: { _eq: false },
              ownerEmployee: { id: { _isNull: false } },
              ${opportunityType === 'InvestmentOpportunity' ? 'opportunityPipeline' : 'salesPipeline'}: { id: { _eq: "${selectedPipelineId}" } }
            },
            distinctOn: [ownerEmployeeId],
            limit: 100
          ) {
            ownerEmployee {
              id
              firstName
              lastName
              displayName
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        [key: string]: Array<{
          ownerEmployee?: Employee | null
        }>
      }>(query)

      const queryKey = opportunityType === 'InvestmentOpportunity' ? 'InvestmentOpportunity' : 'Opportunity'
      const uniqueEmployees = (result?.[queryKey] || [])
        .filter(item => item.ownerEmployee)
        .map(item => item.ownerEmployee!)
        .filter((employee, index, array) => array.findIndex(e => e.id === employee.id) === index)
        // Exclude current user (will be added as "Me")
        .filter(emp => emp.id !== currentEmployeeId)

      const getEmployeeDisplayName = (employee: Employee): string => {
        if (employee.displayName) return employee.displayName
        if (employee.firstName || employee.lastName) {
          return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
        }
        return 'Unknown Employee'
      }

      const employeeOptions = uniqueEmployees.map(emp => ({
        id: emp.id,
        label: getEmployeeDisplayName(emp)
      }))

      // Add "Me" as first option if current employee has opportunities
      const meOption = { id: currentEmployeeId || '', label: 'Me' }
      const finalOptions = currentEmployeeId ? [meOption, ...employeeOptions] : employeeOptions

      setEmployees(finalOptions)
    } catch (err) {
      console.error('Error fetching employees for board:', err)
      setEmployees([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, opportunityType, selectedPipelineId, currentEmployeeId])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  return { employees, isLoading, refetch: loadEmployees }
}
