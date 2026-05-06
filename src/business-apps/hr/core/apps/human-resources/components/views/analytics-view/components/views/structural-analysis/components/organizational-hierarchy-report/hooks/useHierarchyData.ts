import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { useHrAnalyticsFilters } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/context/HrAnalyticsFiltersContext'
import {
  SunburstNode,
  HierarchyStatistics,
  HierarchyTableData,
  CountryColorMap,
  CompanyColorMap,
  CostCenterColorMap
} from '../types/hierarchyTypes'

export type ViewMode = 'location' | 'company' | 'costcenter'
interface HierarchyLoadPayload {
  alternativeViewData: Record<ViewMode, AlternativeViewDatasetRow[]>
  statistics: HierarchyStatistics
}
const inFlightHierarchyRequests = new Map<string, Promise<HierarchyLoadPayload>>()

export interface AlternativeViewDatasetRow {
  category: string
  value: number
  view_mode?: string | null
  level?: number | null
  level_name?: string | null
  departments_count?: number | null
  level_total_employees?: number | null
  percentage_of_level?: number | null
}

interface HierarchyStatsDatasetRow {
  category: string
  value: number
  total_employees?: number | null
  total_organizational_units?: number | null
  max_levels?: number | null
  countries_represented?: number | null
  companies_count?: number | null
  cost_centers_count?: number | null
}

export interface HierarchyDataIntegrationResult {
  sunburstData: SunburstNode[]
  statistics: HierarchyStatistics
  tableData: HierarchyTableData
  alternativeViewData: Record<ViewMode, AlternativeViewDatasetRow[]>
  colorMap: CountryColorMap | CompanyColorMap | CostCenterColorMap
  isLoading: boolean
  error: string | null
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  refetch: () => void
}

export const useHierarchyDataIntegration = (context: BusinessAppContextProps): HierarchyDataIntegrationResult => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [sunburstData, setSunburstData] = useState<SunburstNode[]>([])
  const [statistics, setStatistics] = useState<HierarchyStatistics>({
    totalEmployees: 0,
    totalOrganizationalUnits: 0,
    maxLevels: 0,
    countriesRepresented: 0,
    companiesCount: 0,
    costCentersCount: 0
  })
  const [tableData, setTableData] = useState<HierarchyTableData>({
    location: [],
    company: [],
    costcenter: []
  })
  const [alternativeViewData, setAlternativeViewData] = useState<Record<ViewMode, AlternativeViewDatasetRow[]>>({
    location: [],
    company: [],
    costcenter: []
  })
  const [colorMap, setColorMap] = useState<CountryColorMap | CompanyColorMap | CostCenterColorMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('location')
  const datasetClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const structureId = getCurrentActiveStructureId()
      const localeCode = getCurrentActiveUserLocale() ?? 'en-US'
      const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
      const filterParams: Record<string, string> = { localeCode }
      if (structureId) filterParams.structureId = structureId
      if (companyIdsParam) filterParams.companyIds = companyIdsParam
      const statsParams: Record<string, string> = {}
      if (structureId) statsParams.structureId = structureId
      if (companyIdsParam) statsParams.companyIds = companyIdsParam
      const fetchKey = JSON.stringify({ structureId: structureId ?? '', companyIds: companyIdsParam, localeCode })

      const toRows = (response: unknown): AlternativeViewDatasetRow[] => {
        if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
          const rawRows = (response as { data?: AlternativeViewDatasetRow[] }).data
          return Array.isArray(rawRows) ? rawRows : []
        }
        return []
      }
      let requestPromise = inFlightHierarchyRequests.get(fetchKey)
      if (!requestPromise) {
        requestPromise = (async (): Promise<HierarchyLoadPayload> => {
          const [locationAlternativeRes, companyAlternativeRes, costCenterAlternativeRes, statsRes] = await Promise.all(
            [
              datasetClient
                ?.executeQuery('orgHierarchyView', QueryType.DATASET, { ...filterParams, viewMode: 'location' })
                .catch(() => ({ data: [] })),
              datasetClient
                ?.executeQuery('orgHierarchyView', QueryType.DATASET, { ...filterParams, viewMode: 'company' })
                .catch(() => ({ data: [] })),
              datasetClient
                ?.executeQuery('orgHierarchyView', QueryType.DATASET, { ...filterParams, viewMode: 'costcenter' })
                .catch(() => ({ data: [] })),
              datasetClient
                ?.executeQuery('orgHierarchyStats', QueryType.DATASET, statsParams)
                .catch(() => ({ data: [] }))
            ]
          )

          const alternativeData: Record<ViewMode, AlternativeViewDatasetRow[]> = {
            location: toRows(locationAlternativeRes),
            company: toRows(companyAlternativeRes),
            costcenter: toRows(costCenterAlternativeRes)
          }

          const statsRows = toRows(statsRes) as HierarchyStatsDatasetRow[]
          const firstStatsRow = statsRows[0]
          const toSafeNumber = (value: unknown): number => {
            const numericValue = typeof value === 'number' ? value : Number(value)
            return Number.isFinite(numericValue) ? numericValue : 0
          }
          const sqlStats: HierarchyStatistics | null = firstStatsRow
            ? {
                totalEmployees: toSafeNumber(firstStatsRow.total_employees),
                totalOrganizationalUnits: toSafeNumber(firstStatsRow.total_organizational_units),
                maxLevels: toSafeNumber(firstStatsRow.max_levels),
                countriesRepresented: toSafeNumber(firstStatsRow.countries_represented),
                companiesCount: toSafeNumber(firstStatsRow.companies_count),
                costCentersCount: toSafeNumber(firstStatsRow.cost_centers_count)
              }
            : null

          return {
            alternativeViewData: alternativeData,
            statistics: sqlStats ?? {
              totalEmployees: 0,
              totalOrganizationalUnits: 0,
              maxLevels: 0,
              countriesRepresented: 0,
              companiesCount: 0,
              costCentersCount: 0
            }
          }
        })().finally(() => {
          inFlightHierarchyRequests.delete(fetchKey)
        })
        inFlightHierarchyRequests.set(fetchKey, requestPromise)
      }

      const resolvedPayload = await requestPromise
      setAlternativeViewData(resolvedPayload.alternativeViewData)
      setStatistics(resolvedPayload.statistics)
      setSunburstData([])
      setTableData({
        location: [],
        company: [],
        costcenter: []
      })
      setColorMap({})
    } catch (err) {
      console.error('Error loading hierarchy data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [datasetClient, selectedCompanyIds])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    sunburstData,
    statistics,
    tableData,
    alternativeViewData,
    colorMap,
    isLoading,
    error,
    viewMode,
    setViewMode: handleViewModeChange,
    refetch: loadData
  }
}
