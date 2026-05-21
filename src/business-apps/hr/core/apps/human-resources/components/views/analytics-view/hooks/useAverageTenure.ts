import { useState, useEffect, useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import {
  useQueryExecutionClient,
  QueryType,
  Services,
  type DatasetDTO,
  type QueryExecutionParams
} from '@/common/network/dataset'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

/**
 * Tenure representation with years and months
 */
interface Tenure {
  years: number
  months: number
}

type DatasetQueryClient = {
  executeQuery: (name: string, queryType: QueryType, params?: QueryExecutionParams) => Promise<DatasetDTO>
}

function tenureFromDataset(ds: DatasetDTO): Tenure {
  const avgMonthsRaw = ds.data?.length > 0 ? Number(ds.data[0]?.value ?? 0) : 0
  const avgMonths = Math.max(0, Math.round(avgMonthsRaw))
  return { years: Math.floor(avgMonths / 12), months: avgMonths % 12 }
}

async function loadTenureDatasetOnce(
  queryClient: DatasetQueryClient,
  accessToken: string,
  structureId: string | undefined,
  companyIdsParam: string,
  staticCache: Map<string, Promise<DatasetDTO>>,
  lastFetchKeyRef: MutableRefObject<string>
): Promise<'skip' | Tenure> {
  const fetchKey = `${accessToken}|${structureId ?? ''}|${companyIdsParam}`
  if (lastFetchKeyRef.current === fetchKey) {
    return 'skip'
  }
  lastFetchKeyRef.current = fetchKey
  let pending = staticCache.get(fetchKey)
  if (!pending) {
    const params: QueryExecutionParams = {}
    if (structureId) {
      params.structureId = structureId
    }
    if (companyIdsParam) {
      params.companyIds = companyIdsParam
    }
    pending = queryClient.executeQuery('averageEmployeeTenure', QueryType.DATASET, params)
    staticCache.set(fetchKey, pending)
  }
  const ds = await pending
  return tenureFromDataset(ds)
}

/**
 * Hook to calculate the average tenure of all employees
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing average tenure data, loading state, and error
 */
export const useAverageTenure = (accessToken: string) => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [averageTenure, setAverageTenure] = useState<Tenure>({ years: 0, months: 0 })
  const [formattedTenure, setFormattedTenure] = useState<string>('-')
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)
  const { t } = useTranslation(hrTranslations)

  // Dataset client
  const queryClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const lastFetchKeyRef = useRef<string>('')
  const staticCache =
    (useAverageTenure as any).__cache || ((useAverageTenure as any).__cache = new Map<string, Promise<DatasetDTO>>())

  /**
   * Format tenure into a string representation (e.g., "3.2 yrs")
   */
  const formatTenure = (tenure: Tenure): string => {
    const { years, months } = tenure

    // If less than a year, show months only
    if (years === 0) {
      return `${months} ${months === 1 ? t('hr-analytics-month-singular') : t('hr-analytics-months-plural')}`
    }

    // For more than a year, show years with decimal point
    const decimalMonths = Math.round((months / 12) * 10) / 10
    return `${years + decimalMonths} ${t('hr-analytics-years-abbr')}`
  }

  /**
   * Fetch average tenure from dataset (runner-safe) and format
   * Expects dataset 'averageEmployeeTenure' returning one row:
   *   { category: 'average_tenure_months', value: <numeric months> }
   */
  const fetchAverageTenure = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useAverageTenure] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      const structureId = getCurrentActiveStructureId() ?? undefined
      const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
      const tenureResult = await loadTenureDatasetOnce(
        queryClient,
        accessToken,
        structureId,
        companyIdsParam,
        staticCache,
        lastFetchKeyRef
      )

      if (tenureResult === 'skip') {
        if (isMounted.current) {
          setLoading(false)
        }
        return
      }

      const avgTenure = tenureResult
      if (isMounted.current) {
        setAverageTenure(avgTenure)
        setFormattedTenure(formatTenure(avgTenure))
        setEmployeeCount(0)
        setError(null)
        setLoading(false)
      }
    } catch (err) {
      console.error('[useAverageTenure] Error calculating average tenure:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useAverageTenure] Failed to calculate average tenure'))
        setLoading(false)
      }
    }
  }, [accessToken, queryClient, t, selectedCompanyIds])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true
    fetchAverageTenure()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchAverageTenure])

  return {
    averageTenure,
    formattedTenure,
    employeeCount,
    loading,
    error
  }
}
