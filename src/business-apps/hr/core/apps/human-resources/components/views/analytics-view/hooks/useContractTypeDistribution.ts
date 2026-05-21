import { useState, useEffect, useRef } from 'react'
import { useEmployeeCount } from './useEmployeeCount'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

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
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [distribution, setDistribution] = useState<ContractTypeDistribution[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [contractTypeDataLoading, setContractTypeDataLoading] = useState<boolean>(false)
  const [contractTypeDataError, setContractTypeDataError] = useState<Error | null>(null)

  // Dataset client for fetching data
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const { t } = useTranslation(hrTranslations)

  // Get total employee count for percentage calculation
  const { count: totalEmployees, loading: countLoading, error: countError } = useEmployeeCount(accessToken)
  const lastFetchKeyRef = useRef<string>('')

  // Module-level in-flight cache for dataset requests
  const staticCache =
    (useContractTypeDistribution as any).__cache ||
    ((useContractTypeDistribution as any).__cache = new Map<string, Promise<any>>())

  // Fetch contract type distribution data using Dataset
  useEffect(() => {
    if (countLoading) return

    if (!datasetClient) {
      setContractTypeDataError(prev =>
        prev?.message === 'Dataset client is not available' ? prev : new Error('Dataset client is not available')
      )
      setContractTypeDataLoading(false)
      return
    }

    const localeCode = getCurrentActiveUserLocale()
    const structureId = getCurrentActiveStructureId()
    const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
    const fetchKey = `dataset|employeeContractTypeData|${accessToken}|${localeCode}|${structureId ?? ''}|${companyIdsParam}`
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey

    setContractTypeDataLoading(true)
    setContractTypeDataError(null)

    let p = staticCache.get(fetchKey)
    if (!p) {
      const params: Record<string, string> = { localeCode }
      if (structureId) params.structureId = structureId
      if (companyIdsParam) params.companyIds = companyIdsParam
      p = datasetClient.executeQuery('employeeContractTypeData', QueryType.DATASET, params)
      staticCache.set(fetchKey, p)
    }

    p.then((result: any) => {
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
    }).catch((err: any) => {
      console.error('[useContractTypeDistribution] Error fetching contract type distribution (dataset):', err)
      setContractTypeDataLoading(false)
      setContractTypeDataError(err)
    })
  }, [accessToken, totalEmployees, countLoading, datasetClient, t, selectedCompanyIds])

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
