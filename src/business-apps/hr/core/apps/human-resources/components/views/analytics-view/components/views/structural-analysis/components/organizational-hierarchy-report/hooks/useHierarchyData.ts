import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useGetHierarchyData } from '../queries/HierarchyQueries'
import {
  processHierarchyData,
  buildSunburstData,
  generateCompanyColorMap,
  generateCostCenterColorMap,
  generateTableData
} from '../utils/hierarchyUtils'
import {
  SunburstNode,
  HierarchyStatistics,
  HierarchyTableData,
  CountryColorMap,
  CompanyColorMap,
  CostCenterColorMap
} from '../types/hierarchyTypes'

export type ViewMode = 'location' | 'company' | 'costcenter'

export interface HierarchyDataIntegrationResult {
  sunburstData: SunburstNode[]
  statistics: HierarchyStatistics
  tableData: HierarchyTableData
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
  const [colorMap, setColorMap] = useState<CountryColorMap | CompanyColorMap | CostCenterColorMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('location')
  const [rawData, setRawData] = useState<any>(null)

  const { fetchHierarchyData } = useGetHierarchyData(context)

  const processData = useCallback((data: any, mode: ViewMode) => {
    try {
      const processed = processHierarchyData(data)

      // Generate table data from processed nodes
      const newTableData = generateTableData(processed.nodes, processed.statistics)

      let newColorMap: CountryColorMap | CompanyColorMap | CostCenterColorMap
      if (mode === 'company') {
        const companies = new Set<string>()
        processed.nodes.forEach(node => {
          // Collect companies from employee-company assignments
          node.employeeCountByCompany?.forEach((_, companyKey) => {
            if (companyKey !== 'Unknown') {
              companies.add(companyKey)
            }
          })
        })
        newColorMap = generateCompanyColorMap(companies)
      } else if (mode === 'costcenter') {
        const costCenters = new Set<string>()
        processed.nodes.forEach(node => {
          node.employeeCountByCostCenter?.forEach((_, costCenter) => {
            costCenters.add(costCenter)
          })
        })
        newColorMap = generateCostCenterColorMap(costCenters)
      } else {
        newColorMap = processed.colorMap
      }

      const newSunburstData = buildSunburstData(
        processed.nodes,
        newColorMap,
        mode,
        mode === 'company' ? 'company' : mode === 'costcenter' ? 'costcenter' : 'country'
      )

      setSunburstData(newSunburstData)
      setStatistics(processed.statistics)
      setTableData(newTableData)
      setColorMap(newColorMap)
    } catch (err) {
      console.error('Error processing hierarchy data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error processing data')
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const structureId = getCurrentActiveStructureId() ?? ''

      const data = await fetchHierarchyData({ structureId })
      setRawData(data)
      processData(data, viewMode)
    } catch (err) {
      console.error('Error loading hierarchy data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [fetchHierarchyData, viewMode, processData])

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode)
      if (rawData) {
        processData(rawData, mode)
      }
    },
    [rawData, processData]
  )

  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  useEffect(() => {
    if (rawData && !isLoading) {
      processData(rawData, viewMode)
    }
  }, [viewMode, rawData, isLoading, processData])

  return {
    sunburstData,
    statistics,
    tableData,
    colorMap,
    isLoading,
    error,
    viewMode,
    setViewMode: handleViewModeChange,
    refetch: loadData
  }
}
