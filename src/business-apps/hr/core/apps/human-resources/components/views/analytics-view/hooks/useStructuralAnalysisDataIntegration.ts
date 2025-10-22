import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetStructuralAnalysisData } from '../queries/StructuralAnalysisQueries'
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

  const { fetchStructuralAnalysisData } = useGetStructuralAnalysisData(context)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const structureId = getCurrentActiveStructureId()
      if (!structureId) {
        throw new Error('No structure ID available')
      }

      // Fetch raw data from GraphQL
      const rawData = await fetchStructuralAnalysisData({ structureId })

      // Process organizational data to build hierarchy
      const organizationalNodes = processOrganizationalData(rawData)

      // Generate analysis data
      const spanOfControlData = generateSpanOfControlAnalysis(organizationalNodes)
      const spanOfControlSummary = generateSpanOfControlSummary(spanOfControlData)
      const depthAnalysisData = generateDepthAnalysis(organizationalNodes)
      const reportingChainData = generateReportingChainAnalysis(organizationalNodes)
      const reportingChainSummary = generateReportingChainSummary(reportingChainData)
      const sunburstData = generateSunburstData(organizationalNodes)

      // Calculate overall statistics
      const structuralStatistics = calculateStructuralStatistics(
        organizationalNodes,
        spanOfControlData,
        reportingChainSummary
      )

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
  }, [fetchStructuralAnalysisData])

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
