import { useState, useEffect } from 'react'
import { useEmployeeCount } from './useEmployeeCount'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

export interface EmploymentTypeDistribution {
  id: string
  name: string
  count: number
  percentage: number
}

/**
 * Custom hook to fetch employment type distribution data including counts and percentages
 * @param accessToken User access token
 */
export function useEmploymentTypeDistribution(accessToken: string) {
  const [distribution, setDistribution] = useState<EmploymentTypeDistribution[]>([])
  // We don't need a separate initialLoading state as we combine all loading states
  const [error, setError] = useState<Error | null>(null)
  const [employmentTypeDataLoading, setEmploymentTypeDataLoading] = useState<boolean>(false)
  const [employmentTypeDataError, setEmploymentTypeDataError] = useState<Error | null>(null)

  // Dataset client for fetching data
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const { t } = useTranslation(hrTranslations)

  // Get total employee count
  const { count: totalEmployees, loading: countLoading, error: countError } = useEmployeeCount(accessToken)

  // Fetch employment type distribution data from GraphQL
  useEffect(() => {
    if (countLoading || !datasetClient) return

    setEmploymentTypeDataLoading(true)

    const localeCode = getCurrentActiveUserLocale()

    datasetClient
      .executeQuery('employmentTypeData', QueryType.DATASET, { localeCode })
      .then((response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : []

        // Build distribution directly from dataset (category, value)
        // category is already localized by the dataset (COALESCE(localized, canonical, 'Not Specified'))
        const items: EmploymentTypeDistribution[] = rows.map((r: any) => {
          const rawName = String(r.category || 'Unknown')
          const localizedName =
            rawName.trim().toLowerCase() === 'not specified'.toLowerCase() ? t('hr-analytics-not-specified') : rawName
          return {
            id: String(r.category || 'unknown'),
            name: localizedName,
            count: Number(r.value || 0),
            percentage: 0
          }
        })

        // Calculate percentages against total active employees
        const totalCount = Math.max(totalEmployees, 1)
        const distributionData: EmploymentTypeDistribution[] = items
          .map(item => ({
            ...item,
            percentage: Math.round((item.count / totalCount) * 100)
          }))
          .sort((a, b) => b.count - a.count)

        setDistribution(distributionData)
        setEmploymentTypeDataLoading(false)
        setEmploymentTypeDataError(null)
      })
      .catch((err: Error) => {
        console.error('[useEmploymentTypeDistribution] Error fetching employment type distribution (dataset):', err)
        setEmploymentTypeDataError(err)
        setEmploymentTypeDataLoading(false)
        // Fall back to empty distribution data
        setDistribution([])
      })
  }, [datasetClient, countLoading, totalEmployees])

  // Combine errors if any occur
  useEffect(() => {
    if (countError) {
      setError(countError)
    } else if (employmentTypeDataError) {
      setError(employmentTypeDataError)
    } else {
      setError(null)
    }
  }, [countError, employmentTypeDataError])

  // Determine overall loading state
  const isLoading = countLoading || employmentTypeDataLoading

  return {
    distribution,
    loading: isLoading,
    error,
    totalCount: totalEmployees
  }
}
