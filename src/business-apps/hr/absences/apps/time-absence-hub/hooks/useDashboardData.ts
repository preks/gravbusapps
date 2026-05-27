import { useEffect, useState } from 'react'
import { useProcessCompletion } from '../../../../../../common/hooks/useProcessCompletion'
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '../../../../../../common/utils/windowUtils'
import {
  GET_CURRENT_SALARIES_BY_EMPLOYEE_IDS,
  getOptimizedDashboardQuery
} from '../queries/ServerSideAggregationQueries'
import { processCompleteServerSideAggregations } from '../utils/serverSideAggregationUtils'
import { DashboardData, TimeFilter } from '../types'
import { hasHubPopulationFilters, HubGlobalFilters } from './useHubGlobalFilters'

export interface UseDashboardDataProps {
  accessToken: string
  timeFilter?: TimeFilter
  filters?: HubGlobalFilters
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
}

const getScopedEmployeeIds = (result: any): string[] => {
  const ids = new Set<string>()
  const scopedEmployeePositions = Array.isArray(result?.scopedEmployeePositions) ? result.scopedEmployeePositions : []

  scopedEmployeePositions.forEach((position: any) => {
    const employeeId = String(position?.employee?.id ?? '')
    if (employeeId) {
      ids.add(employeeId)
    }
  })

  return Array.from(ids)
}

const getTodayDateKey = (): string => new Date().toISOString().slice(0, 10)

export const useDashboardData = ({
  accessToken,
  timeFilter = 'current-year',
  filters,
  derivedDateRange
}: UseDashboardDataProps): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    totalAbsences: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    cancelledAbsences: 0,
    averageDuration: 0,
    approvalRate: 0,

    averageVacationDays: 0,
    averageUsed: 0,
    averagePending: 0,
    totalVacationLiability: 0,

    departmentStats: [],
    monthlyData: [],
    rawAbsences: [],
    statusBreakdown: [],
    typeBreakdown: [],

    entitlements: {
      averageVacationPerEmployee: 0,
      totalActiveEmployees: 0,
      averageAvailable: 0,
      averageUsed: 0,
      totalVacationLiability: 0,
      totalVacationEntitlement: 0,
      estimatedCostPerDay: 0,
      totalLiabilityEstimate: 0,
      currencyCode: 'EUR',
      hasMultipleCurrencies: false
    },

    isLoading: true,
    error: null
  })

  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }))

      catalogClient.setAccessToken(accessToken)
      const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

      const absenceGroupsData = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          includeChildCatalogEntries: true
        }
      )

      const absenceGroups: Record<string, string> = {}
      absenceGroupsData.data.forEach((group: any) => {
        absenceGroups[group.id] = group.value
        if (group.catalogEntryLocalId) {
          absenceGroups[group.catalogEntryLocalId] = group.value
        }
      })

      const absenceTypesData = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AbsenceType', version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          includeChildCatalogEntries: true
        }
      )

      const vacationType = absenceTypesData.data.find((type: any) => type.id === 'AbsenceType:v1:A001')
      const vacationGroupId = vacationType?.id

      const query = getOptimizedDashboardQuery(timeFilter, vacationGroupId, filters, derivedDateRange)

      let result = await graphQLClient.request<any>(query)
      const hasPopulationFilter = hasHubPopulationFilters(filters)

      if (hasPopulationFilter) {
        const scopedEmployeeIds = getScopedEmployeeIds(result)
        if (scopedEmployeeIds.length > 0) {
          const salaryResult = await graphQLClient.request<any>(GET_CURRENT_SALARIES_BY_EMPLOYEE_IDS, {
            employeeIds: scopedEmployeeIds,
            today: getTodayDateKey()
          })
          result = { ...result, currentSalaries: salaryResult.currentSalaries ?? [] }
        }
      }

      const processedData = processCompleteServerSideAggregations(
        result,
        absenceGroups,
        timeFilter,
        hasPopulationFilter
      )

      setData(processedData)
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, timeFilter, filters, derivedDateRange])

  useProcessCompletion({
    onSuccess: () => {
      fetchData()
    }
  })

  return data
}

export default useDashboardData
