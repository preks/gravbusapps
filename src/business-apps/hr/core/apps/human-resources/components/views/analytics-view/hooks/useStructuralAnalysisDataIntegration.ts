import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import {
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
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  useGetHierarchyEdgesMin,
  useGetHierarchyEdgesWithCounts
} from '../components/views/structural-analysis/components/organizational-hierarchy-report/queries/HierarchyQueries'

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
  const { t } = useTranslation(hrTranslations)
  const [data, setData] = useState<StructuralAnalysisIntegrationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const datasetClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)
  const { fetchHierarchyEdgesMin } = useGetHierarchyEdgesMin(context)
  const { fetchHierarchyEdgesWithCounts } = useGetHierarchyEdgesWithCounts(context)
  type DatasetRow = { category: string; value: number }
  interface DatasetResponse<T> {
    data: T[]
  }
  const toRows = <T>(res: unknown): T[] => {
    if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
      const d = (res as DatasetResponse<T>).data
      return Array.isArray(d) ? d : []
    }
    return []
  }
  const getValueByCategory = (rows: DatasetRow[], key: string): number => {
    const row = rows.find(r => String(r.category).toLowerCase() === key.toLowerCase())
    return typeof row?.value === 'number' ? row.value : 0
  }

  interface HierarchyEdgeRow {
    // mandatory dataset columns
    category: string
    value: number
    // optional helper columns we expect from the dataset
    parent_id_text?: string | null
    child_id_text?: string | null
    parent_name?: string | null
    child_name?: string | null
  }

  const buildNodesFromEdges = (edgeRows: HierarchyEdgeRow[]): OrganizationalNode[] => {
    type MutableNode = OrganizationalNode & { childrenIds?: string[] }

    const nodesById = new Map<string, MutableNode>()
    const ensureNode = (id: string, name: string | null | undefined): MutableNode => {
      const safeId = String(id)
      const safeName = String(name ?? id)
      const existing = nodesById.get(safeId)
      if (existing) return existing

      const created: MutableNode = {
        id: safeId,
        name: safeName,
        description: null,
        parentId: null,
        level: 0,
        employees: [],
        employeeCount: 0,
        directReports: 0,
        spanOfControl: 0,
        company: undefined,
        costCenter: undefined,
        childrenIds: []
      }
      nodesById.set(safeId, created)
      return created
    }

    for (const row of edgeRows) {
      const childId = String(row.child_id_text ?? '').trim()
      if (!childId) continue
      const parentId = row.parent_id_text ? String(row.parent_id_text).trim() : ''

      const childNode = ensureNode(childId, row.child_name ?? row.category)
      const parentNode = parentId ? ensureNode(parentId, row.parent_name ?? '') : null

      // assign parent relationship
      if (parentNode) {
        childNode.parentId = parentNode.id
        parentNode.childrenIds?.push(childNode.id)
      } else {
        childNode.parentId = null
      }

      // set direct employee count for the node from dataset value
      const numericValue = typeof row.value === 'number' ? row.value : Number(row.value ?? 0)
      childNode.employeeCount = Number.isFinite(numericValue) ? numericValue : 0
    }

    // derive levels via BFS from roots
    const roots: MutableNode[] = []
    nodesById.forEach(node => {
      if (!node.parentId) roots.push(node)
    })

    const queue: Array<{ node: MutableNode; level: number }> = roots.map(r => ({ node: r, level: 0 }))
    while (queue.length > 0) {
      const { node, level } = queue.shift()!
      node.level = level
      const children = (node.childrenIds ?? []).map(id => nodesById.get(id)).filter(Boolean) as MutableNode[]
      for (const child of children) {
        queue.push({ node: child, level: level + 1 })
      }
    }

    // compute span of control as number of direct child units
    nodesById.forEach(node => {
      node.spanOfControl = (node.childrenIds ?? []).length
      delete (node as MutableNode).childrenIds
    })

    return Array.from(nodesById.values())
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
      let spanDistRows: DatasetRow[] = []
      // Sunburst: we'll first try orgHierarchySunburstData (edges encoded in category), else fall back to GraphQL
      let edgeRowsFromDataset: HierarchyEdgeRow[] = []
      if (datasetClient) {
        const [overviewRes, hierarchyRes, spanDistRes, sunburstRes] = await Promise.all([
          datasetClient.executeQuery('structuralOverviewMetrics', QueryType.DATASET, { structureId }),
          datasetClient.executeQuery('hierarchyDepthMetrics', QueryType.DATASET, { structureId }),
          datasetClient.executeQuery('spanOfControlDistribution', QueryType.DATASET, { structureId }),
          datasetClient
            .executeQuery('orgHierarchySunburstData', QueryType.DATASET, { structureId })
            .catch(() => ({ data: [] }))
        ])
        overviewRows = toRows<DatasetRow>(overviewRes)
        hierarchyRows = toRows<DatasetRow>(hierarchyRes)
        spanDistRows = toRows<DatasetRow>(spanDistRes)
        const sunburstRows = toRows<{ category: string; value: number }>(sunburstRes)

        if (Array.isArray(sunburstRows) && sunburstRows.length > 0) {
          edgeRowsFromDataset = sunburstRows
            .map(r => {
              // Parse encoded edge using the standardized "|000|" separator
              const rawCat = String(r?.category ?? '')
              const parts000 = rawCat.split('|000|')
              if (parts000.length < 4) return null
              const [parentIdRaw, parentNameRaw, childIdRaw, childNameRaw] = parts000
              const parentIdText = (parentIdRaw || '').trim() === 'ROOT' ? '' : (parentIdRaw || '').trim()
              const parentName = (parentNameRaw || '').trim()
              const childIdText = (childIdRaw || '').trim()
              const childName = (childNameRaw || '').trim()
              const val = Number(r?.value ?? 0)
              // Keep zero-value rows; they are needed for correct totals/structure
              if (!Number.isFinite(val)) return null
              return {
                category: childName,
                value: val,
                parent_id_text: parentIdText || null,
                child_id_text: childIdText || null,
                parent_name: parentName || null,
                child_name: childName || null
              } as HierarchyEdgeRow
            })
            .filter(Boolean) as HierarchyEdgeRow[]
        }
      }

      // Build organizational nodes:
      // - Prefer dataset edges (already sized) for a true multi-ring sunburst with minimal payload
      // - Else fall back to GraphQL hierarchy (counts-enabled), then minimal edges
      let organizationalNodes: OrganizationalNode[] = []
      if (edgeRowsFromDataset.length > 0) {
        organizationalNodes = buildNodesFromEdges(edgeRowsFromDataset)
      } else {
        try {
          // Prefer counts-enabled minimal query to size nodes properly
          const asOf = new Date().toISOString()
          const gqlEdgesWithCounts = await fetchHierarchyEdgesWithCounts({ structureId, asOf })
          const edgesList = (gqlEdgesWithCounts as any)?.OrganizationalUnitRelationship ?? []
          if (Array.isArray(edgesList) && edgesList.length > 0) {
            const mapped: HierarchyEdgeRow[] = edgesList.map((e: any) => ({
              category: String(e?.child?.name ?? ''),
              value: Number(e?.child?.organizationalUnitEmployeeAggregate?.aggregate?.count ?? 0),
              parent_id_text: e?.parentId ?? null,
              child_id_text: e?.childId ?? null,
              parent_name: e?.parent?.name ?? null,
              child_name: e?.child?.name ?? null
            }))
            organizationalNodes = buildNodesFromEdges(mapped)
          }

          // If still empty, try edges-only minimal query and synthesize
          if (organizationalNodes.length === 0) {
            const gqlEdges = await fetchHierarchyEdgesMin({ structureId })
            const edgesOnly = (gqlEdges as any)?.OrganizationalUnitRelationship ?? []
            if (Array.isArray(edgesOnly) && edgesOnly.length > 0) {
              const mappedMin: HierarchyEdgeRow[] = edgesOnly.map((e: any) => ({
                category: String(e?.child?.name ?? ''),
                value: 1, // size leaves minimally; real counts not available here
                parent_id_text: e?.parentId ?? null,
                child_id_text: e?.childId ?? null,
                parent_name: e?.parent?.name ?? null,
                child_name: e?.child?.name ?? null
              }))
              organizationalNodes = buildNodesFromEdges(mappedMin)
            }
          }
        } catch {
          // ignore
        }
      }

      // No extra overrides needed when dataset provided edges + counts

      // Generate analysis data (prefer dataset rows for span-of-control distribution)
      const spanOfControlData: SpanOfControlData[] =
        spanDistRows.length > 0
          ? spanDistRows.map<SpanOfControlData>(r => {
              const directReports = typeof r.value === 'number' ? r.value : 0
              const efficiency = directReports > 7 ? 'Overloaded' : directReports >= 3 ? 'Optimal' : 'Underutilized'
              const recommendation =
                efficiency === 'Overloaded'
                  ? t('hr-analytics-recommendation-overloaded')
                  : efficiency === 'Underutilized'
                    ? t('hr-analytics-recommendation-underutilized')
                    : t('hr-analytics-recommendation-optimal')
              return {
                managerId: r.category, // no id available; use name as key
                managerName: r.category,
                organizationalUnit: r.category,
                directReports,
                managerLevel: null,
                efficiency,
                recommendation
              }
            })
          : generateSpanOfControlAnalysis(organizationalNodes)
      let spanOfControlSummary = generateSpanOfControlSummary(spanOfControlData)
      const depthAnalysisData = generateDepthAnalysis(organizationalNodes)
      const reportingChainData = generateReportingChainAnalysis(organizationalNodes)
      let reportingChainSummary = generateReportingChainSummary(reportingChainData)
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
        const dsMinChain = getValueByCategory(hierarchyRows, 'min_chain_length')
        const dsMaxChain = getValueByCategory(hierarchyRows, 'max_chain_length')

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

        // Override reporting chain summary cards from datasets when available
        reportingChainSummary = {
          ...reportingChainSummary,
          averageChainLength: dsAvgChain || reportingChainSummary.averageChainLength,
          minChainLength:
            typeof dsMinChain === 'number' && dsMinChain > 0 ? dsMinChain : reportingChainSummary.minChainLength,
          maxChainLength:
            typeof dsMaxChain === 'number' && dsMaxChain > 0 ? dsMaxChain : reportingChainSummary.maxChainLength
        }
        if (typeof dsOverburdenedCount === 'number') {
          const desired = Math.max(0, Math.floor(dsOverburdenedCount))
          if (desired < reportingChainSummary.bottlenecks.length) {
            reportingChainSummary = {
              ...reportingChainSummary,
              bottlenecks: reportingChainSummary.bottlenecks.slice(0, desired)
            }
          } else if (desired > reportingChainSummary.bottlenecks.length) {
            const padCount = desired - reportingChainSummary.bottlenecks.length
            const pads = Array.from({ length: padCount }).map((_, i) => ({
              managerId: `unknown-${i}`,
              managerName: 'N/A',
              chainsThroughManager: 0,
              impact: 0
            }))
            reportingChainSummary = {
              ...reportingChainSummary,
              bottlenecks: [...reportingChainSummary.bottlenecks, ...pads]
            }
          }
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
