import { useState, useEffect } from 'react'
import { useEmployeeCount } from './useEmployeeCount'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

export interface ContractTypeDistribution {
  id: string
  name: string
  count: number
  percentage: number
}

/**
 * Hook to fetch and calculate contract type distribution data
 * @param accessToken The access token for authentication
 * @returns Contract type distribution data with counts and percentages
 */
export function useContractTypeDistribution(accessToken: string) {
  const [distribution, setDistribution] = useState<ContractTypeDistribution[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [contractTypeDataLoading, setContractTypeDataLoading] = useState<boolean>(false)
  const [contractTypeDataError, setContractTypeDataError] = useState<Error | null>(null)

  // Dataset client for fetching data
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const { t } = useTranslation(hrTranslations)

  // Get total employee count for percentage calculation
  const { count: totalEmployees, loading: countLoading, error: countError } = useEmployeeCount(accessToken)

  // Fetch contract type distribution data using Dataset
  useEffect(() => {
    if (countLoading || !datasetClient) return

    setContractTypeDataLoading(true)

    const localeCode = getCurrentActiveUserLocale()

    datasetClient
      .executeQuery('employeeContractTypeData', QueryType.DATASET, { localeCode })
      .then((result: any) => {
        setContractTypeDataLoading(false)

        const rows = Array.isArray(result?.data) ? result.data : []

        // Create distribution data with counts and percentages from dataset rows
        const items: ContractTypeDistribution[] = rows.map((r: any) => {
          const rawName = String(r.category || 'Unknown')
          const name =
            rawName.trim().toLowerCase() === 'not specified'.toLowerCase() ? t('hr-analytics-not-specified') : rawName
          const count = Number(r.value || 0)
          const percentage = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0
          return {
            id: String(r.category || 'unknown'),
            name,
            count,
            percentage
          }
        })

        // Sort by count in descending order
        const sortedDistribution = items.sort((a, b) => b.count - a.count)

        setDistribution(sortedDistribution)
      })
      .catch((err: any) => {
        console.error('[useContractTypeDistribution] Error fetching contract type distribution (dataset):', err)
        setContractTypeDataLoading(false)
        setContractTypeDataError(err)
      })
  }, [datasetClient, totalEmployees, countLoading])

  // Combine all possible errors
  useEffect(() => {
    const finalError = countError || contractTypeDataError
    setError(finalError)
  }, [countError, contractTypeDataError])

  // Determine overall loading state
  const isLoading = countLoading || contractTypeDataLoading

  return {
    distribution,
    loading: isLoading,
    error
  }
}
