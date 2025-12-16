import {
  OrganizationalNode,
  SpanOfControlData,
  SpanOfControlSummary,
  DepthAnalysisData,
  ReportingChainData,
  ReportingChainSummary,
  SunburstNode,
  StructuralStatistics
} from '../types/structuralTypes'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

// Color schemes for visualizations
export const chartColors = {
  primary: [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ],
  depth: [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)'
  ],
  status: {
    optimal: 'var(--nw-success)',
    warning: 'var(--nw-warning)',
    critical: 'var(--nw-destructive)'
  }
}

// (processOrganizationalData removed; hierarchy is now built from dataset/edges elsewhere)

// Generate span of control analysis data
export const generateSpanOfControlAnalysis = (nodes: OrganizationalNode[]): SpanOfControlData[] => {
  const { t } = useTranslation(hrTranslations)
  return nodes
    .filter(node => node.directReports > 0) // Only managers
    .map(node => {
      const managerName = node.name
      const directReports = node.directReports

      let efficiency: 'Optimal' | 'Overloaded' | 'Underutilized'
      let recommendation: string

      if (directReports >= 3 && directReports <= 7) {
        efficiency = 'Optimal'
        recommendation = t('hr-analytics-recommendation-optimal')
      } else if (directReports > 7) {
        efficiency = 'Overloaded'
        recommendation = t('hr-analytics-recommendation-overloaded')
      } else {
        efficiency = 'Underutilized'
        recommendation = t('hr-analytics-recommendation-underutilized')
      }

      return {
        managerId: node.id,
        managerName,
        organizationalUnit: node.name,
        directReports,
        managerLevel: null, // We don't have this info in the current structure
        efficiency,
        recommendation
      }
    })
}

// Generate span of control summary
export const generateSpanOfControlSummary = (spanData: SpanOfControlData[]): SpanOfControlSummary => {
  const totalManagers = spanData.length
  const optimalCount = spanData.filter(d => d.efficiency === 'Optimal').length
  const underUtilizedCount = spanData.filter(d => d.efficiency === 'Underutilized').length
  const overBurdenedCount = spanData.filter(d => d.efficiency === 'Overloaded').length
  const averageSpan =
    totalManagers > 0 ? spanData.reduce((sum, data) => sum + data.directReports, 0) / totalManagers : 0

  return {
    totalManagers,
    averageSpan: Math.round(averageSpan * 10) / 10,
    optimalCount,
    underUtilizedCount,
    overBurdenedCount,
    recommendedSpanMin: 3,
    recommendedSpanMax: 7
  }
}

// Generate organizational depth analysis
export const generateDepthAnalysis = (nodes: OrganizationalNode[]): DepthAnalysisData[] => {
  const levelData = new Map<number, { units: OrganizationalNode[]; employees: number }>()

  nodes.forEach(node => {
    if (!levelData.has(node.level)) {
      levelData.set(node.level, { units: [], employees: 0 })
    }
    const data = levelData.get(node.level)!
    data.units.push(node)
    data.employees += node.employeeCount
  })

  return Array.from(levelData.entries())
    .map(([level, data]) => {
      const averageSpanOfControl =
        data.units.length > 0 ? data.units.reduce((sum, unit) => sum + unit.spanOfControl, 0) / data.units.length : 0

      const efficiency =
        averageSpanOfControl >= 3 && averageSpanOfControl <= 7 ? 85 : averageSpanOfControl > 7 ? 60 : 70

      return {
        level,
        unitCount: data.units.length,
        employeeCount: data.employees,
        averageSpanOfControl,
        efficiency
      }
    })
    .sort((a, b) => a.level - b.level)
}

// Generate reporting chain analysis
export const generateReportingChainAnalysis = (nodes: OrganizationalNode[]): ReportingChainData[] => {
  const chains: ReportingChainData[] = []
  const rootNodes = nodes.filter(node => !node.parentId)

  rootNodes.forEach((root, index) => {
    const maxDepth = getMaxDepthFromNode(root, nodes)
    const totalEmployees = getTotalEmployeesFromNode(root, nodes)
    const avgSpan = getAverageSpanFromNode(root, nodes)
    const bottlenecks = findBottlenecks(root, nodes)

    chains.push({
      chainId: `chain-${index + 1}`,
      topManager: root.name,
      levels: maxDepth + 1,
      totalEmployees,
      averageSpanOfControl: avgSpan,
      bottlenecks,
      efficiency: bottlenecks.length === 0 ? 90 : Math.max(50, 90 - bottlenecks.length * 10)
    })
  })

  return chains
}

// Generate reporting chain summary
export const generateReportingChainSummary = (chainData: ReportingChainData[]): ReportingChainSummary => {
  const chainLengths = chainData.map(chain => chain.levels)
  const averageChainLength =
    chainLengths.length > 0 ? chainLengths.reduce((sum, length) => sum + length, 0) / chainLengths.length : 0

  const maxChainLength = Math.max(...chainLengths, 0)
  const minChainLength = Math.min(...chainLengths, 0)

  // Create chain distribution
  const distribution = new Map<number, number>()
  chainLengths.forEach(length => {
    distribution.set(length, (distribution.get(length) || 0) + 1)
  })

  const chainDistribution = Array.from(distribution.entries())
    .map(([length, count]) => ({
      length,
      count,
      percentage: chainLengths.length > 0 ? (count / chainLengths.length) * 100 : 0
    }))
    .sort((a, b) => a.length - b.length)

  // Find bottlenecks from all chains
  const bottleneckMap = new Map<string, number>()
  chainData.forEach(chain => {
    chain.bottlenecks.forEach(bottleneck => {
      const current = bottleneckMap.get(bottleneck) || 0
      bottleneckMap.set(bottleneck, current + 1)
    })
  })

  const bottlenecks = Array.from(bottleneckMap.entries())
    .map(([description, count]) => ({
      managerId: description.split(' ')[0] || 'unknown',
      managerName: description,
      chainsThroughManager: count,
      impact: count
    }))
    .sort((a, b) => b.chainsThroughManager - a.chainsThroughManager)
    .slice(0, 10) // Top 10 bottlenecks

  return {
    averageChainLength: Math.round(averageChainLength * 10) / 10,
    maxChainLength,
    minChainLength,
    chainDistribution,
    bottlenecks
  }
}

// Helper function to get maximum depth from a node
const getMaxDepthFromNode = (node: OrganizationalNode, allNodes: OrganizationalNode[]): number => {
  const children = allNodes.filter(n => n.parentId === node.id)
  if (children.length === 0) return 0

  return 1 + Math.max(...children.map(child => getMaxDepthFromNode(child, allNodes)))
}

// Helper function to get total employees under a node
const getTotalEmployeesFromNode = (node: OrganizationalNode, allNodes: OrganizationalNode[]): number => {
  let total = node.employeeCount
  const children = allNodes.filter(n => n.parentId === node.id)

  children.forEach(child => {
    total += getTotalEmployeesFromNode(child, allNodes)
  })

  return total
}

// Helper function to get average span of control from a node
const getAverageSpanFromNode = (node: OrganizationalNode, allNodes: OrganizationalNode[]): number => {
  const managersInChain = getAllManagersFromNode(node, allNodes)
  if (managersInChain.length === 0) return 0

  const totalSpan = managersInChain.reduce((sum, manager) => sum + manager.directReports, 0)
  return totalSpan / managersInChain.length
}

// Helper function to get all managers under a node
const getAllManagersFromNode = (node: OrganizationalNode, allNodes: OrganizationalNode[]): OrganizationalNode[] => {
  const managers: OrganizationalNode[] = []
  if (node.directReports > 0) managers.push(node)

  const children = allNodes.filter(n => n.parentId === node.id)
  children.forEach(child => {
    managers.push(...getAllManagersFromNode(child, allNodes))
  })

  return managers
}

// Helper function to find bottlenecks in reporting chain
const findBottlenecks = (node: OrganizationalNode, allNodes: OrganizationalNode[]): string[] => {
  const bottlenecks: string[] = []
  const managers = getAllManagersFromNode(node, allNodes)

  managers.forEach(manager => {
    if (manager.directReports > 10) {
      bottlenecks.push(`${manager.name} (${manager.directReports} direct reports)`)
    }
  })

  return bottlenecks
}

// Helper function to generate color shades
const generateColorShades = (baseColor: string, depth: number): string => {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate shade factor (lighter for deeper levels)
  const shadeFactor = 1 - depth * 0.15 // Each level gets 15% lighter
  const clampedFactor = Math.max(0.3, shadeFactor) // Don't go too light

  // Apply shade
  const newR = Math.round(r + (255 - r) * (1 - clampedFactor))
  const newG = Math.round(g + (255 - g) * (1 - clampedFactor))
  const newB = Math.round(b + (255 - b) * (1 - clampedFactor))

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Generate sunburst chart data
export const generateSunburstData = (nodes: OrganizationalNode[]): SunburstNode => {
  const maxLevel = Math.max(...nodes.map(n => n.level))

  const buildSunburstNode = (
    level: number,
    parentId: string | null = null,
    baseColor: string | null = null,
    colorDepth: number = 0
  ): SunburstNode[] => {
    const nodesAtLevel = nodes.filter(n => n.level === level && n.parentId === parentId)

    return nodesAtLevel.map((node, index) => {
      // Assign color based on hierarchy
      let nodeColor: string
      if (level === 0) {
        // Top level children get base colors from the palette
        nodeColor = chartColors.primary[index % chartColors.primary.length]
      } else if (baseColor) {
        // Deeper levels get shades of their parent's color
        nodeColor = generateColorShades(baseColor, colorDepth)
      } else {
        // Fallback
        nodeColor = chartColors.depth[level % chartColors.depth.length]
      }

      const rawChildren = level < maxLevel ? buildSunburstNode(level + 1, node.id, nodeColor, colorDepth + 1) : []
      // Hide zero-value branches at the visualization layer without affecting totals:
      // keep only children whose subtree total (child.value) is > 0. This preserves
      // ancestors needed for non-zero descendants while removing pure-zero leaves.
      const children = Array.isArray(rawChildren) ? rawChildren.filter(c => (c?.value ?? 0) > 0) : []

      // Calculate total employees in this node's subtree (including all descendants)
      const totalSubtreeEmployees = getTotalEmployeesFromNode(node, nodes)

      return {
        id: node.id, // Add unique ID for proper key generation
        name: node.name,
        value: totalSubtreeEmployees, // Use subtree total instead of just direct employees
        level: node.level,
        employees: node.employees.map(emp => emp.fullName || '').filter(name => name.trim() !== ''), // Add employees list for tooltip
        children: children.length > 0 ? children : undefined,
        color: nodeColor
      }
    })
  }

  const rootChildren = buildSunburstNode(0)

  // Calculate total employees across all nodes (avoiding double counting)
  const totalEmployees = nodes.reduce((sum, node) => sum + node.employeeCount, 0)

  return {
    name: 'Organization',
    value: totalEmployees,
    level: -1,
    employees: [], // Root has no direct employees
    children: rootChildren,
    color: 'var(--nw-muted)' // Light gray for root
  }
}

// Calculate overall statistics
export const calculateStructuralStatistics = (
  nodes: OrganizationalNode[],
  spanData: SpanOfControlData[],
  chainSummary: ReportingChainSummary
): StructuralStatistics => {
  const totalEmployees = nodes.reduce((sum, node) => sum + node.employeeCount, 0)
  const totalManagers = spanData.length
  const maxDepth = Math.max(...nodes.map(n => n.level)) + 1
  const avgSpanOfControl =
    spanData.length > 0 ? spanData.reduce((sum, data) => sum + data.directReports, 0) / spanData.length : 0

  // Calculate organizational efficiency (0-100 scale)
  const spanEfficiency =
    spanData.length > 0 ? (spanData.filter(d => d.efficiency === 'Optimal').length / spanData.length) * 100 : 100
  const depthEfficiency = Math.max(0, 100 - (maxDepth - 4) * 10) // Penalty for deep hierarchies
  const chainEfficiency = Math.max(0, 100 - (chainSummary.averageChainLength - 3) * 15) // Penalty for long chains

  const organizationalEfficiency = (spanEfficiency + depthEfficiency + chainEfficiency) / 3

  // Calculate structural health score
  const healthFactors = [
    spanEfficiency,
    depthEfficiency,
    chainEfficiency,
    Math.min(100, (totalEmployees / Math.max(nodes.length, 1)) * 10) // Employee density factor
  ]

  const structuralHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length

  return {
    totalEmployees,
    totalUnits: nodes.length,
    totalManagers,
    maxDepth,
    hierarchyDepth: maxDepth, // alias for maxDepth
    averageSpanOfControl: Math.round(avgSpanOfControl * 10) / 10,
    averageReportingChainLength: chainSummary.averageChainLength,
    organizationalEfficiency: Math.round(organizationalEfficiency),
    structuralHealthScore: Math.round(structuralHealthScore)
  }
}

// Generate color for chart elements
export const generateColor = (index: number, type: 'primary' | 'depth' | 'status' = 'primary'): string => {
  const colors = chartColors[type]
  if (typeof colors === 'string') return colors
  if (Array.isArray(colors)) return colors[index % colors.length]
  return chartColors.primary[0]
}
