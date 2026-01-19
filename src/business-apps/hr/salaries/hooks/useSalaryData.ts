import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  getSalaryByEmployeeId,
  getCompensationComponentsBySalaryId,
  getSalaryStatistics
} from '../queries/salaryQueries'
import { SalaryData, CompensationComponent, SalaryStatistics } from '../types/salaryTypes'

interface UseSalaryDataProps {
  accessToken: string
  employeeId?: string
  limit?: number
}

interface SalaryDataResult {
  salary: SalaryData | null
  components: CompensationComponent[]
  statistics: SalaryStatistics | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Custom hook to fetch salary data for an employee
 */
export const useSalaryData = ({ accessToken, employeeId, limit = 20 }: UseSalaryDataProps): SalaryDataResult => {
  const [salary, setSalary] = useState<SalaryData | null>(null)
  const [components, setComponents] = useState<CompensationComponent[]>([])
  const [statistics, setStatistics] = useState<SalaryStatistics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient({ accessToken })
  const structureId = getCurrentActiveStructureId()

  const fetchData = async () => {
    if (!employeeId || !accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch salary data
      const salaryResult = await graphQLClient.query({
        query: getSalaryByEmployeeId,
        variables: {
          employeeId,
          limit,
          offset: 0
        }
      })

      const salaryData = salaryResult?.data?.salaries?.[0] || null
      setSalary(salaryData)

      // If we have salary data, fetch compensation components
      if (salaryData) {
        const componentsResult = await graphQLClient.query({
          query: getCompensationComponentsBySalaryId,
          variables: {
            salaryId: salaryData.id,
            limit,
            offset: 0
          }
        })

        setComponents(componentsResult?.data?.compensationComponents || [])
      }

      // Fetch salary statistics
      if (structureId) {
        const statisticsResult = await graphQLClient.query({
          query: getSalaryStatistics,
          variables: {
            structureId
          }
        })

        setStatistics(statisticsResult?.data?.salaryStatistics || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch salary data'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [employeeId, accessToken])

  return {
    salary,
    components,
    statistics,
    isLoading,
    error,
    refetch: fetchData
  }
}

export default useSalaryData
