import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import {
  SunburstNode,
  HierarchyStatistics,
  HierarchyTableData,
  CountryColorMap,
  CompanyColorMap,
  CostCenterColorMap
} from '../types/hierarchyTypes'

export type ViewMode = 'location' | 'company' | 'costcenter'

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
      const structureId = getCurrentActiveStructureId() ?? ''
      const localeCode = getCurrentActiveUserLocale() ?? 'en-US'

      const [locationAlternativeRes, companyAlternativeRes, costCenterAlternativeRes, statsRes] = await Promise.all([
        datasetClient
          ?.executeQuery('orgHierarchyView', QueryType.DATASET, { structureId, viewMode: 'location', localeCode })
          .catch(() => ({ data: [] })),
        datasetClient
          ?.executeQuery('orgHierarchyView', QueryType.DATASET, { structureId, viewMode: 'company', localeCode })
          .catch(() => ({ data: [] })),
        datasetClient
          ?.executeQuery('orgHierarchyView', QueryType.DATASET, { structureId, viewMode: 'costcenter', localeCode })
          .catch(() => ({ data: [] })),
        datasetClient?.executeQuery('orgHierarchyStats', QueryType.DATASET, { structureId }).catch(() => ({ data: [] }))
      ])

      const toRows = (response: unknown): AlternativeViewDatasetRow[] => {
        if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
          const rawRows = (response as { data?: AlternativeViewDatasetRow[] }).data
          return Array.isArray(rawRows) ? rawRows : []
        }
        return []
      }

      setAlternativeViewData({
        location: toRows(locationAlternativeRes),
        company: toRows(companyAlternativeRes),
        costcenter: toRows(costCenterAlternativeRes)
      })

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

      setStatistics(
        sqlStats ?? {
          totalEmployees: 0,
          totalOrganizationalUnits: 0,
          maxLevels: 0,
          countriesRepresented: 0,
          companiesCount: 0,
          costCentersCount: 0
        }
      )
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
  }, [datasetClient])

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
