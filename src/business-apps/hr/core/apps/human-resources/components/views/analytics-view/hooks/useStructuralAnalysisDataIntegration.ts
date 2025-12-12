import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import {
  processOrganizationalData,
  generateSpanOfControlAnalysis,
  generateSpanOfControlSummary,
  generateDepthAnalysis,
  generateReportingChainAnalysis,
  generateReportingChainSummary,
  generateSunburstData,
  calculateStructuralStatistics
} from '../components/views/structural-analysis/utils/structuralUtils'
import {
  OrganizationalNode,
  SpanOfControlData,
  SpanOfControlSummary,
  DepthAnalysisData,
  ReportingChainData,
  ReportingChainSummary,
  SunburstNode,
  StructuralStatistics
} from '../components/views/structural-analysis/types/structuralTypes'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface StructuralAnalysisIntegrationData {
  organizationalNodes: OrganizationalNode[]
  spanOfControlData: SpanOfControlData[]
  spanOfControlSummary: SpanOfControlSummary
  depthAnalysisData: DepthAnalysisData[]
  reportingChainData: ReportingChainData[]
  reportingChainSummary: ReportingChainSummary
  sunburstData: SunburstNode
  structuralStatistics: StructuralStatistics
}

export const useStructuralAnalysisDataIntegration = (context: BusinessAppContextProps) => {
  const [data, setData] = useState<StructuralAnalysisIntegrationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const datasetClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)
  type DatasetRow = { category: string; value: number }
  const getValueByCategory = (rows: DatasetRow[], key: string): number => {
    const row = rows.find(r => String(r.category).toLowerCase() === key.toLowerCase())
    return typeof row?.value === 'number' ? row.value : 0
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const structureId = getCurrentActiveStructureId()
      if (!structureId) {
        throw new Error('No structure ID available')
      }

      // Execute datasets
      let overviewRows: DatasetRow[] = []
      let hierarchyRows: DatasetRow[] = []
      if (datasetClient) {
        const [overviewRes, hierarchyRes] = await Promise.all([
          datasetClient.executeQuery('structuralOverviewMetrics', QueryType.DATASET, { structureId }),
          datasetClient.executeQuery('hierarchyDepthMetrics', QueryType.DATASET, { structureId })
        ])
        overviewRows = ((overviewRes as any)?.data ?? []) as DatasetRow[]
        hierarchyRows = ((hierarchyRes as any)?.data ?? []) as DatasetRow[]
        // Fire depth dataset (not consumed here)
        datasetClient
          .executeQuery('depthAnalysisByLevelDataset', QueryType.DATASET, { structureId })
          .catch(() => void 0)
      }

      // Minimal raw data (we're not using hierarchy GraphQL anymore)
      const rawData = {
        organizationalUnitRelationships: [],
        employeeSiteLocations: [],
        costCenters: []
      }

      // Process organizational data to build hierarchy
      const organizationalNodes = processOrganizationalData(rawData)

      // Generate analysis data
      const spanOfControlData = generateSpanOfControlAnalysis(organizationalNodes)
      let spanOfControlSummary = generateSpanOfControlSummary(spanOfControlData)
      const depthAnalysisData = generateDepthAnalysis(organizationalNodes)
      const reportingChainData = generateReportingChainAnalysis(organizationalNodes)
      const reportingChainSummary = generateReportingChainSummary(reportingChainData)
      const sunburstData = generateSunburstData(organizationalNodes)

      // Calculate overall statistics
      let structuralStatistics = calculateStructuralStatistics(
        organizationalNodes,
        spanOfControlData,
        reportingChainSummary
      )

      // Override with dataset metrics
      if (overviewRows.length > 0 || hierarchyRows.length > 0) {
        const dsTotalEmployees = getValueByCategory(overviewRows, 'total_employees')
        const dsTotalManagers = getValueByCategory(overviewRows, 'total_managers')
        const dsTotalUnits = getValueByCategory(overviewRows, 'total_units')
        const dsAvgSpan = getValueByCategory(overviewRows, 'avg_span_of_control')
        const dsOptimalCount = getValueByCategory(overviewRows, 'optimal_count')
        const dsUnderutilizedCount = getValueByCategory(overviewRows, 'underutilized_count')
        const dsOverburdenedCount = getValueByCategory(overviewRows, 'overburdened_count')
        const dsHierarchyDepth = getValueByCategory(hierarchyRows, 'hierarchy_depth')
        const dsAvgChain = getValueByCategory(hierarchyRows, 'avg_chain_length')

        structuralStatistics = {
          ...structuralStatistics,
          totalEmployees: dsTotalEmployees || structuralStatistics.totalEmployees,
          totalManagers: dsTotalManagers || structuralStatistics.totalManagers,
          totalUnits: dsTotalUnits || structuralStatistics.totalUnits,
          averageSpanOfControl: dsAvgSpan || structuralStatistics.averageSpanOfControl,
          hierarchyDepth: dsHierarchyDepth || structuralStatistics.hierarchyDepth,
          maxDepth: dsHierarchyDepth || structuralStatistics.maxDepth,
          averageReportingChainLength: dsAvgChain || structuralStatistics.averageReportingChainLength
        }

        // Also override span of control summary counts for Key Insights
        spanOfControlSummary = {
          ...spanOfControlSummary,
          totalManagers: dsTotalManagers || spanOfControlSummary.totalManagers,
          averageSpan: dsAvgSpan ? Math.round(dsAvgSpan * 10) / 10 : spanOfControlSummary.averageSpan,
          optimalCount: dsOptimalCount || spanOfControlSummary.optimalCount,
          underUtilizedCount: dsUnderutilizedCount || spanOfControlSummary.underUtilizedCount,
          overBurdenedCount: dsOverburdenedCount || spanOfControlSummary.overBurdenedCount
        }
      }

      const integratedData: StructuralAnalysisIntegrationData = {
        organizationalNodes,
        spanOfControlData,
        spanOfControlSummary,
        depthAnalysisData,
        reportingChainData,
        reportingChainSummary,
        sunburstData,
        structuralStatistics
      }

      setData(integratedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading structural analysis data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [datasetClient])

  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    data,
    isLoading,
    error,
    refetch: loadData
  }
}
