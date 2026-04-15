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
  type DatasetRow = {
    category: string
    value: number
    manager_name?: string | null
    organizational_unit_name?: string | null
  }
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
    if (!row) return 0
    const numericValue = typeof row.value === 'number' ? row.value : Number(row.value)
    return Number.isFinite(numericValue) ? numericValue : 0
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
  interface ReportingChainDatasetRow {
    category: string
    value: number
    root_name?: string | null
    branch_name?: string | null
    leaf_id_text?: string | null
    leaf_name?: string | null
    chain_node_count?: number | null
    chain_path?: string | null
    chain_path_without_root?: string | null
    bottleneck_count?: number | null
    bottleneck_nodes?: string | null
  }

  const mapSpanDistributionRowToSpanOfControl = (r: DatasetRow): SpanOfControlData => {
    const rawDirectReports = typeof r.value === 'number' ? r.value : Number(r.value)
    const directReports = Number.isFinite(rawDirectReports) ? rawDirectReports : 0
    let efficiency: SpanOfControlData['efficiency']
    if (directReports > 7) {
      efficiency = 'Overloaded'
    } else if (directReports >= 3) {
      efficiency = 'Optimal'
    } else {
      efficiency = 'Underutilized'
    }
    let recommendation: string
    if (efficiency === 'Overloaded') {
      recommendation = t('hr-analytics-recommendation-overloaded')
    } else if (efficiency === 'Underutilized') {
      recommendation = t('hr-analytics-recommendation-underutilized')
    } else {
      recommendation = t('hr-analytics-recommendation-optimal')
    }
    return {
      managerId: r.category,
      managerName: r.manager_name?.trim() || r.category,
      organizationalUnit: r.organizational_unit_name?.trim() || r.manager_name?.trim() || r.category,
      directReports,
      managerLevel: null,
      efficiency,
      recommendation
    }
  }

  const parseSunburstRowsToEdges = (sunburstRows: Array<{ category: string; value: number }>): HierarchyEdgeRow[] => {
    return sunburstRows
      .map(r => {
        const rawCat = String(r?.category ?? '')
        const parts000 = rawCat.split('|000|')
        if (parts000.length < 4) return null
        const [parentIdRaw, parentNameRaw, childIdRaw, childNameRaw] = parts000
        const parentIdText = (parentIdRaw || '').trim() === 'ROOT' ? '' : (parentIdRaw || '').trim()
        const parentName = (parentNameRaw || '').trim()
        const childIdText = (childIdRaw || '').trim()
        const childName = (childNameRaw || '').trim()
        const val = Number(r?.value ?? 0)
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

  const depthPenaltyForChainLength = (chainLength: number): number => {
    if (chainLength > 6) return 20
    if (chainLength > 4) return 10
    return 0
  }

  const mapReportingChainDatasetRow = (
    row: ReportingChainDatasetRow,
    employeeCountByNodeId: Map<string, number>
  ): ReportingChainData => {
    const numericChainLength = typeof row.value === 'number' ? row.value : Number(row.value)
    const chainLength = Number.isFinite(numericChainLength) ? Math.max(0, Math.round(numericChainLength)) : 0
    const rawNodeCount =
      typeof row.chain_node_count === 'number' ? row.chain_node_count : Number(row.chain_node_count ?? 0)
    const levels = Number.isFinite(rawNodeCount) ? Math.max(1, Math.round(rawNodeCount)) : Math.max(1, chainLength + 1)
    const rawBottleneckCount =
      typeof row.bottleneck_count === 'number' ? row.bottleneck_count : Number(row.bottleneck_count ?? 0)
    const bottleneckCount = Number.isFinite(rawBottleneckCount) ? Math.max(0, Math.round(rawBottleneckCount)) : 0
    const bottleneckList = (row.bottleneck_nodes ?? '')
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
    const fallbackBottlenecks =
      bottleneckCount > 0 && bottleneckList.length === 0 ? [t('hr-analytics-bottlenecks-identified')] : bottleneckList
    const leafEmployeeCount = row.leaf_id_text ? (employeeCountByNodeId.get(String(row.leaf_id_text)) ?? 0) : 0
    const depthPenalty = depthPenaltyForChainLength(chainLength)
    const bottleneckPenalty = Math.min(30, bottleneckCount * 10)
    const efficiency = Math.max(50, 95 - depthPenalty - bottleneckPenalty)

    return {
      chainId: String(row.category),
      topManager: row.root_name?.trim() || row.branch_name?.trim() || t('hr-analytics-top-org-unit'),
      levels,
      totalEmployees: leafEmployeeCount,
      averageSpanOfControl: 0,
      chainPath: row.chain_path?.trim() || row.chain_path_without_root?.trim() || '',
      bottlenecks: fallbackBottlenecks,
      efficiency
    }
  }

  const buildNodesFromEdges = (edgeRows: HierarchyEdgeRow[]): OrganizationalNode[] => {
    type MutableNode = OrganizationalNode & { childrenIds?: string[] }

    const nodesById = new Map<string, MutableNode>()

    const getOrCreateNode = (id: string, name?: string | null): MutableNode => {
      const safeId = String(id)
      const existing = nodesById.get(safeId)
      if (existing) return existing
      const node: MutableNode = {
        id: safeId,
        name: String(name ?? id),
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
      nodesById.set(safeId, node)
      return node
    }

    const attachEdge = (row: HierarchyEdgeRow) => {
      const childId = String(row.child_id_text ?? '').trim()
      if (!childId) return
      const parentId = row.parent_id_text ? String(row.parent_id_text).trim() : ''
      const childNode = getOrCreateNode(childId, row.child_name ?? row.category)
      const parentNode = parentId ? getOrCreateNode(parentId, row.parent_name ?? '') : null

      if (parentNode) {
        childNode.parentId = parentNode.id
        parentNode.childrenIds!.push(childNode.id)
      }

      const numericValue = typeof row.value === 'number' ? row.value : Number(row.value ?? 0)
      childNode.employeeCount = Number.isFinite(numericValue) ? numericValue : 0
    }

    edgeRows.forEach(attachEdge)

    const computeRoots = (): MutableNode[] => {
      const roots: MutableNode[] = []
      nodesById.forEach(node => {
        if (!node.parentId) roots.push(node)
      })
      return roots
    }

    const assignLevelsBfs = (roots: MutableNode[]) => {
      const queue: Array<{ node: MutableNode; level: number }> = roots.map(r => ({ node: r, level: 0 }))
      while (queue.length > 0) {
        const { node, level } = queue.shift()!
        node.level = level
        const children = (node.childrenIds ?? []).map(id => nodesById.get(id)).filter(Boolean) as MutableNode[]
        children.forEach(child => queue.push({ node: child, level: level + 1 }))
      }
    }

    const finalizeSpanOfControl = () => {
      nodesById.forEach(node => {
        node.spanOfControl = (node.childrenIds ?? []).length
        delete (node as MutableNode).childrenIds
      })
    }

    assignLevelsBfs(computeRoots())
    finalizeSpanOfControl()

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
      let reportingChainRows: ReportingChainDatasetRow[] = []
      // Sunburst: we'll first try orgHierarchySunburstData (edges encoded in category), else fall back to GraphQL
      let edgeRowsFromDataset: HierarchyEdgeRow[] = []
      if (datasetClient) {
        const [overviewRes, hierarchyRes, spanDistRes, sunburstRes, reportingChainsRes] = await Promise.all([
          datasetClient.executeQuery('structuralOverviewMetrics', QueryType.DATASET, { structureId }),
          datasetClient.executeQuery('hierarchyDepthMetrics', QueryType.DATASET, { structureId }),
          datasetClient.executeQuery('spanOfControlDistribution', QueryType.DATASET, { structureId }),
          datasetClient
            .executeQuery('orgHierarchySunburstData', QueryType.DATASET, { structureId })
            .catch(() => ({ data: [] })),
          datasetClient
            .executeQuery('reportingChainsDetails', QueryType.DATASET, { structureId, pageSize: 50 })
            .catch(() => ({ data: [] }))
        ])
        overviewRows = toRows<DatasetRow>(overviewRes)
        hierarchyRows = toRows<DatasetRow>(hierarchyRes)
        spanDistRows = toRows<DatasetRow>(spanDistRes)
        reportingChainRows = toRows<ReportingChainDatasetRow>(reportingChainsRes)
        const sunburstRows = toRows<{ category: string; value: number }>(sunburstRes)

        if (Array.isArray(sunburstRows) && sunburstRows.length > 0) {
          edgeRowsFromDataset = parseSunburstRowsToEdges(sunburstRows)
        }
      }

      // Build organizational nodes from dataset edges only.
      let organizationalNodes: OrganizationalNode[] = []
      if (edgeRowsFromDataset.length > 0) {
        organizationalNodes = buildNodesFromEdges(edgeRowsFromDataset)
      }

      // No extra overrides needed when dataset provided edges + counts

      // Generate analysis data (prefer dataset rows for span-of-control distribution)
      const spanOfControlData: SpanOfControlData[] =
        spanDistRows.length > 0
          ? spanDistRows.map(r => mapSpanDistributionRowToSpanOfControl(r))
          : generateSpanOfControlAnalysis(organizationalNodes)
      const spanOfControlSummary = generateSpanOfControlSummary(spanOfControlData)
      const depthAnalysisData = generateDepthAnalysis(organizationalNodes)
      const employeeCountByNodeId = new Map(organizationalNodes.map(node => [node.id, node.employeeCount]))
      const reportingChainData: ReportingChainData[] =
        reportingChainRows.length > 0
          ? reportingChainRows.map(row => mapReportingChainDatasetRow(row, employeeCountByNodeId))
          : generateReportingChainAnalysis(organizationalNodes)
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

        // Keep span-of-control summary based on span distribution rows.
        // structuralOverviewMetrics can be stale/mismatched and should not overwrite the cards.

        // Override reporting chain summary cards from datasets when available
        reportingChainSummary = {
          ...reportingChainSummary,
          averageChainLength: dsAvgChain || reportingChainSummary.averageChainLength,
          minChainLength:
            typeof dsMinChain === 'number' && dsMinChain > 0 ? dsMinChain : reportingChainSummary.minChainLength,
          maxChainLength:
            typeof dsMaxChain === 'number' && dsMaxChain > 0 ? dsMaxChain : reportingChainSummary.maxChainLength
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
  }, [datasetClient, t])

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
