import { useEffect, useState } from 'react'
import { useProcessCompletion } from '../../../../../../common/hooks/useProcessCompletion'
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '../../../../../../common/utils/windowUtils'
import { getOptimizedDashboardQuery } from '../queries/ServerSideAggregationQueries'
import { processCompleteServerSideAggregations } from '../utils/serverSideAggregationUtils'
import { DashboardData, TimeFilter } from '../types'
import { HubGlobalFilters } from './useHubGlobalFilters'

export interface UseDashboardDataProps {
  accessToken: string
  timeFilter?: TimeFilter
  filters?: HubGlobalFilters
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
}

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
      totalVacationEntitlement: 0
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

      const result = await graphQLClient.request<any>(query)

      const processedData = processCompleteServerSideAggregations(result, absenceGroups, timeFilter)

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
