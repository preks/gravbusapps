/**
 * SlideVisualBuilders - Professional visual element builders for presentations
 *
 * Creates McKinsey-style visual components using the slide element primitives.
 * Includes metric cards, tables, timelines, quadrant matrices, and more.
 */

import type { SlideTheme } from '../components/slideThemes'
import type { AnySlideElement, Position, Size } from '../components/slideElements'
import {
  createTextElement,
  createShapeElement,
  createTableElement,
  createIconElement
} from '../components/slideElements'

// Slide dimensions
const SLIDE_WIDTH = 1280

// Professional color palette
export const COLORS = {
  primary: '#1e3a5f',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#64748b',
  light: '#f8fafc',
  dark: '#1e293b',
  border: '#e2e8f0',
  muted: '#94a3b8'
}

// Chart colors for visualizations
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899' // pink
]

interface MetricCardParams {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  source?: string
  position: Position
  width?: number
  height?: number
  color?: string
  theme?: SlideTheme
  zIndex?: number
  isDark?: boolean
}

/**
 * Create an executive-style metric card
 */
export function createMetricCard(params: MetricCardParams): AnySlideElement[] {
  const {
    label,
    value,
    trend,
    trendValue,
    source,
    position,
    width = 280,
    height = 160,
    color = COLORS.primary,
    zIndex = 1,
    isDark = false
  } = params

  const elements: AnySlideElement[] = []
  const cardId = `metric-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Theme-aware colors
  const bgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : COLORS.border
  const textColor = isDark ? '#ffffff' : COLORS.dark
  const mutedTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : COLORS.muted
  const accentColor = isDark ? '#e91e8c' : color

  // Card background
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${cardId}-bg`,
      position,
      size: { width, height },
      fill: bgColor,
      strokeColor: borderColor,
      strokeWidth: 1,
      cornerRadius: 12,
      zIndex
    })
  )

  // Accent bar at top
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${cardId}-accent`,
      position: { x: position.x, y: position.y },
      size: { width, height: 6 },
      fill: accentColor,
      cornerRadius: 12,
      zIndex: zIndex + 1
    })
  )

  // Value (large number)
  elements.push(
    createTextElement({
      id: `${cardId}-value`,
      content: value,
      position: { x: position.x + 20, y: position.y + 30 },
      size: { width: width - 40, height: 60 },
      fontSize: 42,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: zIndex + 2
    })
  )

  // Label
  elements.push(
    createTextElement({
      id: `${cardId}-label`,
      content: label,
      position: { x: position.x + 20, y: position.y + 95 },
      size: { width: width - 40, height: 30 },
      fontSize: 14,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: mutedTextColor,
      zIndex: zIndex + 2
    })
  )

  // Trend indicator
  if (trend && trend !== 'neutral' && trendValue) {
    const trendColor = trend === 'up' ? COLORS.success : COLORS.danger
    const trendSymbol = trend === 'up' ? '↑' : '↓'

    elements.push(
      createTextElement({
        id: `${cardId}-trend`,
        content: `${trendSymbol} ${trendValue}`,
        position: { x: position.x + width - 80, y: position.y + 30 },
        size: { width: 60, height: 30 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
        verticalAlign: 'middle',
        color: trendColor,
        zIndex: zIndex + 2
      })
    )
  }

  // Source citation
  if (source) {
    elements.push(
      createTextElement({
        id: `${cardId}-source`,
        content: source,
        position: { x: position.x + 20, y: position.y + height - 25 },
        size: { width: width - 40, height: 20 },
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'bottom',
        color: mutedTextColor,
        zIndex: zIndex + 2
      })
    )
  }

  return elements
}

interface MetricRowParams {
  metrics: Array<{
    label: string
    value: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    color?: string
  }>
  position: Position
  spacing?: number
  cardWidth?: number
  source?: string
  zIndex?: number
  isDark?: boolean
}

/**
 * Create a row of metric cards (3-4 cards in a row)
 */
export function createMetricRow(params: MetricRowParams): AnySlideElement[] {
  const { metrics, position, spacing = 20, cardWidth = 280, source, zIndex = 1, isDark = false } = params

  const elements: AnySlideElement[] = []
  const count = Math.min(metrics.length, 4)
  const computedWidth = (SLIDE_WIDTH - position.x * 2 - spacing * (count - 1)) / count
  const actualWidth = Math.min(cardWidth, computedWidth)

  metrics.slice(0, 4).forEach((metric, index) => {
    const cardElements = createMetricCard({
      ...metric,
      position: {
        x: position.x + index * (actualWidth + spacing),
        y: position.y
      },
      width: actualWidth,
      source: index === 0 ? source : undefined,
      color: metric.color || CHART_COLORS[index % CHART_COLORS.length],
      zIndex: zIndex + index * 5,
      isDark
    })
    elements.push(...cardElements)
  })

  return elements
}

interface DataTableParams {
  headers: string[]
  rows: string[][]
  position: Position
  size: Size
  headerColor?: string
  source?: string
  zIndex?: number
}

/**
 * Create a professional data table
 */
export function createDataTable(params: DataTableParams): AnySlideElement[] {
  const { headers, rows, position, size, headerColor = COLORS.primary, source, zIndex = 1 } = params

  const elements: AnySlideElement[] = []

  // Create table element
  elements.push(
    createTableElement(headers, rows, {
      id: `table-${Date.now()}`,
      position,
      size,
      headerBackground: headerColor,
      headerTextColor: '#ffffff',
      rowBackground: '#ffffff',
      rowAlternateBackground: '#f8fafc',
      rowTextColor: COLORS.dark,
      borderColor: COLORS.border,
      borderWidth: 1,
      fontSize: 14,
      headerFontSize: 14,
      cellPadding: 12,
      borderRadius: 8,
      zIndex
    })
  )

  // Source citation below table
  if (source) {
    elements.push(
      createTextElement({
        id: `table-source-${Date.now()}`,
        content: source,
        position: { x: position.x, y: position.y + size.height + 8 },
        size: { width: size.width, height: 20 },
        fontSize: 11,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: zIndex + 1
      })
    )
  }

  return elements
}

interface TimelineItem {
  date: string
  title: string
  description?: string
}

interface TimelineParams {
  items: TimelineItem[]
  position: Position
  width?: number
  itemHeight?: number
  color?: string
  zIndex?: number
}

/**
 * Create a timeline visualization
 */
export function createTimeline(params: TimelineParams): AnySlideElement[] {
  const { items, position, width = SLIDE_WIDTH - 160, itemHeight = 80, color = COLORS.primary, zIndex = 1 } = params

  const elements: AnySlideElement[] = []
  const lineId = `timeline-${Date.now()}`

  // Vertical line
  elements.push(
    createShapeElement('rectangle', {
      id: `${lineId}-line`,
      position: { x: position.x + 80, y: position.y },
      size: { width: 3, height: items.length * itemHeight },
      fill: COLORS.border,
      zIndex
    })
  )

  items.forEach((item, index) => {
    const itemY = position.y + index * itemHeight

    // Circle marker
    elements.push(
      createShapeElement('circle', {
        id: `${lineId}-marker-${index}`,
        position: { x: position.x + 72, y: itemY + 8 },
        size: { width: 20, height: 20 },
        fill: color,
        zIndex: zIndex + 1
      })
    )

    // Date
    elements.push(
      createTextElement({
        id: `${lineId}-date-${index}`,
        content: item.date,
        position: { x: position.x, y: itemY + 5 },
        size: { width: 70, height: 30 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'right',
        verticalAlign: 'top',
        color: color,
        zIndex: zIndex + 2
      })
    )

    // Title
    elements.push(
      createTextElement({
        id: `${lineId}-title-${index}`,
        content: item.title,
        position: { x: position.x + 110, y: itemY + 5 },
        size: { width: width - 130, height: 25 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.dark,
        zIndex: zIndex + 2
      })
    )

    // Description
    if (item.description) {
      elements.push(
        createTextElement({
          id: `${lineId}-desc-${index}`,
          content: item.description,
          position: { x: position.x + 110, y: itemY + 30 },
          size: { width: width - 130, height: 45 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: COLORS.neutral,
          lineHeight: 1.4,
          zIndex: zIndex + 2
        })
      )
    }
  })

  return elements
}

interface QuadrantItem {
  title: string
  items: string[]
}

interface QuadrantMatrixParams {
  title?: string
  quadrants: [QuadrantItem, QuadrantItem, QuadrantItem, QuadrantItem]
  axisLabels: { x: string; y: string }
  position: Position
  size?: Size
  zIndex?: number
}

/**
 * Create a 2x2 quadrant matrix (like BCG matrix)
 */
export function createQuadrantMatrix(params: QuadrantMatrixParams): AnySlideElement[] {
  const { quadrants, axisLabels, position, size = { width: 600, height: 500 }, zIndex = 1 } = params

  const elements: AnySlideElement[] = []
  const matrixId = `matrix-${Date.now()}`
  const quadrantWidth = (size.width - 40) / 2
  const quadrantHeight = (size.height - 60) / 2
  const colors = [COLORS.success, COLORS.warning, COLORS.danger, COLORS.primary]

  // Y-axis label
  elements.push(
    createTextElement({
      id: `${matrixId}-y-axis`,
      content: axisLabels.y,
      position: { x: position.x, y: position.y + size.height / 2 - 50 },
      size: { width: 30, height: 100 },
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.muted,
      rotation: -90,
      zIndex
    })
  )

  // X-axis label
  elements.push(
    createTextElement({
      id: `${matrixId}-x-axis`,
      content: axisLabels.x,
      position: { x: position.x + 40, y: position.y + size.height - 25 },
      size: { width: size.width - 40, height: 25 },
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'bottom',
      color: COLORS.muted,
      zIndex
    })
  )

  // Quadrants
  const quadrantPositions = [
    { x: position.x + 40, y: position.y }, // Top-left
    { x: position.x + 40 + quadrantWidth, y: position.y }, // Top-right
    { x: position.x + 40, y: position.y + quadrantHeight }, // Bottom-left
    { x: position.x + 40 + quadrantWidth, y: position.y + quadrantHeight } // Bottom-right
  ]

  quadrants.forEach((quadrant, index) => {
    const qPos = quadrantPositions[index]
    const qColor = colors[index]

    // Quadrant background
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${matrixId}-quad-${index}`,
        position: { x: qPos.x + 2, y: qPos.y + 2 },
        size: { width: quadrantWidth - 4, height: quadrantHeight - 4 },
        fill: `${qColor}15`,
        strokeColor: qColor,
        strokeWidth: 2,
        cornerRadius: 8,
        zIndex
      })
    )

    // Quadrant title
    elements.push(
      createTextElement({
        id: `${matrixId}-quad-title-${index}`,
        content: quadrant.title,
        position: { x: qPos.x + 12, y: qPos.y + 12 },
        size: { width: quadrantWidth - 24, height: 30 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'top',
        color: qColor,
        zIndex: zIndex + 1
      })
    )

    // Quadrant items
    if (quadrant.items.length > 0) {
      const itemText = quadrant.items.map(item => `• ${item}`).join('\n')
      elements.push(
        createTextElement({
          id: `${matrixId}-quad-items-${index}`,
          content: itemText,
          position: { x: qPos.x + 12, y: qPos.y + 45 },
          size: { width: quadrantWidth - 24, height: quadrantHeight - 60 },
          fontSize: 12,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: COLORS.dark,
          lineHeight: 1.5,
          zIndex: zIndex + 1
        })
      )
    }
  })

  return elements
}

interface BarChartParams {
  data: Array<{ label: string; value: number; color?: string }>
  position: Position
  size: Size
  title?: string
  source?: string
  showValues?: boolean
  zIndex?: number
}

/**
 * Create a horizontal bar chart
 */
export function createBarChart(params: BarChartParams): AnySlideElement[] {
  const { data, position, size, title, source, showValues = true, zIndex = 1 } = params

  const elements: AnySlideElement[] = []
  const chartId = `barchart-${Date.now()}`
  const maxValue = Math.max(...data.map(d => d.value))
  const barHeight = Math.min(40, (size.height - 40) / data.length - 10)
  const labelWidth = 100
  const chartAreaWidth = size.width - labelWidth - 60

  // Title
  if (title) {
    elements.push(
      createTextElement({
        id: `${chartId}-title`,
        content: title,
        position: { x: position.x, y: position.y },
        size: { width: size.width, height: 30 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: COLORS.dark,
        zIndex
      })
    )
  }

  const startY = position.y + (title ? 40 : 0)

  data.forEach((item, index) => {
    const barY = startY + index * (barHeight + 10)
    const barWidth = (item.value / maxValue) * chartAreaWidth
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length]

    // Label
    elements.push(
      createTextElement({
        id: `${chartId}-label-${index}`,
        content: item.label,
        position: { x: position.x, y: barY },
        size: { width: labelWidth - 10, height: barHeight },
        fontSize: 13,
        fontWeight: 'normal',
        textAlign: 'right',
        verticalAlign: 'middle',
        color: COLORS.dark,
        zIndex: zIndex + 1
      })
    )

    // Bar
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${chartId}-bar-${index}`,
        position: { x: position.x + labelWidth, y: barY },
        size: { width: Math.max(barWidth, 4), height: barHeight },
        fill: color,
        cornerRadius: 4,
        zIndex: zIndex + 1
      })
    )

    // Value
    if (showValues) {
      elements.push(
        createTextElement({
          id: `${chartId}-value-${index}`,
          content: item.value.toLocaleString(),
          position: { x: position.x + labelWidth + barWidth + 8, y: barY },
          size: { width: 50, height: barHeight },
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: COLORS.dark,
          zIndex: zIndex + 2
        })
      )
    }
  })

  // Source
  if (source) {
    elements.push(
      createTextElement({
        id: `${chartId}-source`,
        content: source,
        position: { x: position.x, y: position.y + size.height - 20 },
        size: { width: size.width, height: 20 },
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'bottom',
        color: COLORS.muted,
        zIndex
      })
    )
  }

  return elements
}

interface ProcessFlowStep {
  title: string
  description?: string
}

interface ProcessFlowParams {
  steps: ProcessFlowStep[]
  position: Position
  width?: number
  color?: string
  zIndex?: number
}

/**
 * Create a horizontal process flow diagram
 */
export function createProcessFlow(params: ProcessFlowParams): AnySlideElement[] {
  const { steps, position, width = SLIDE_WIDTH - 160, color = COLORS.primary, zIndex = 1 } = params

  const elements: AnySlideElement[] = []
  const flowId = `flow-${Date.now()}`
  const stepWidth = (width - (steps.length - 1) * 40) / steps.length
  const boxHeight = 80

  steps.forEach((step, index) => {
    const stepX = position.x + index * (stepWidth + 40)

    // Step box
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${flowId}-box-${index}`,
        position: { x: stepX, y: position.y },
        size: { width: stepWidth, height: boxHeight },
        fill: index === 0 ? color : '#ffffff',
        strokeColor: color,
        strokeWidth: 2,
        cornerRadius: 8,
        zIndex
      })
    )

    // Step number
    elements.push(
      createTextElement({
        id: `${flowId}-num-${index}`,
        content: `${index + 1}`,
        position: { x: stepX + 10, y: position.y + 10 },
        size: { width: 24, height: 24 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: index === 0 ? '#ffffff' : color,
        backgroundColor: index === 0 ? 'transparent' : `${color}20`,
        zIndex: zIndex + 1
      })
    )

    // Step title
    elements.push(
      createTextElement({
        id: `${flowId}-title-${index}`,
        content: step.title,
        position: { x: stepX + 10, y: position.y + 40 },
        size: { width: stepWidth - 20, height: 35 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'top',
        color: index === 0 ? '#ffffff' : COLORS.dark,
        zIndex: zIndex + 1
      })
    )

    // Arrow (except for last step)
    if (index < steps.length - 1) {
      elements.push(
        createShapeElement('arrow-right', {
          id: `${flowId}-arrow-${index}`,
          position: { x: stepX + stepWidth + 5, y: position.y + boxHeight / 2 - 10 },
          size: { width: 30, height: 20 },
          fill: color,
          zIndex
        })
      )
    }

    // Description below
    if (step.description) {
      elements.push(
        createTextElement({
          id: `${flowId}-desc-${index}`,
          content: step.description,
          position: { x: stepX, y: position.y + boxHeight + 10 },
          size: { width: stepWidth, height: 50 },
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'center',
          verticalAlign: 'top',
          color: COLORS.muted,
          lineHeight: 1.4,
          zIndex
        })
      )
    }
  })

  return elements
}

interface ComparisonColumnParams {
  leftTitle: string
  leftItems: string[]
  rightTitle: string
  rightItems: string[]
  position: Position
  size: Size
  leftColor?: string
  rightColor?: string
  zIndex?: number
}

/**
 * Create a two-column comparison layout
 */
export function createComparisonColumns(params: ComparisonColumnParams): AnySlideElement[] {
  const {
    leftTitle,
    leftItems,
    rightTitle,
    rightItems,
    position,
    size,
    leftColor = COLORS.success,
    rightColor = COLORS.danger,
    zIndex = 1
  } = params

  const elements: AnySlideElement[] = []
  const compId = `comp-${Date.now()}`
  const colWidth = (size.width - 20) / 2
  const headerHeight = 40

  // Left column header
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${compId}-left-header`,
      position: { x: position.x, y: position.y },
      size: { width: colWidth, height: headerHeight },
      fill: leftColor,
      cornerRadius: 8,
      zIndex
    })
  )

  elements.push(
    createTextElement({
      id: `${compId}-left-title`,
      content: leftTitle,
      position: { x: position.x + 15, y: position.y + 8 },
      size: { width: colWidth - 30, height: headerHeight - 16 },
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: '#ffffff',
      zIndex: zIndex + 1
    })
  )

  // Right column header
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${compId}-right-header`,
      position: { x: position.x + colWidth + 20, y: position.y },
      size: { width: colWidth, height: headerHeight },
      fill: rightColor,
      cornerRadius: 8,
      zIndex
    })
  )

  elements.push(
    createTextElement({
      id: `${compId}-right-title`,
      content: rightTitle,
      position: { x: position.x + colWidth + 35, y: position.y + 8 },
      size: { width: colWidth - 30, height: headerHeight - 16 },
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: '#ffffff',
      zIndex: zIndex + 1
    })
  )

  // Left column items
  const leftText = leftItems.map(item => `• ${item}`).join('\n\n')
  elements.push(
    createTextElement({
      id: `${compId}-left-items`,
      content: leftText,
      position: { x: position.x + 10, y: position.y + headerHeight + 15 },
      size: { width: colWidth - 20, height: size.height - headerHeight - 30 },
      fontSize: 14,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: COLORS.dark,
      lineHeight: 1.5,
      zIndex: zIndex + 1
    })
  )

  // Right column items
  const rightText = rightItems.map(item => `• ${item}`).join('\n\n')
  elements.push(
    createTextElement({
      id: `${compId}-right-items`,
      content: rightText,
      position: { x: position.x + colWidth + 30, y: position.y + headerHeight + 15 },
      size: { width: colWidth - 20, height: size.height - headerHeight - 30 },
      fontSize: 14,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: COLORS.dark,
      lineHeight: 1.5,
      zIndex: zIndex + 1
    })
  )

  return elements
}

interface PieChartParams {
  data: Array<{ label: string; value: number; percentage?: number; color?: string }>
  position: Position
  size: Size
  title?: string
  source?: string
  showLegend?: boolean
  donut?: boolean
  zIndex?: number
}

/**
 * Create a pie or donut chart
 */
export function createPieChart(params: PieChartParams): AnySlideElement[] {
  const { data, position, size, title, source, showLegend = true, donut = false, zIndex = 1 } = params

  const elements: AnySlideElement[] = []
  const chartId = `pie-${Date.now()}`
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const centerX = position.x + (showLegend ? size.width * 0.35 : size.width / 2)
  const centerY = position.y + (title ? 50 : 20) + (size.height - (title ? 70 : 40)) / 2
  const radius = Math.min(size.width * (showLegend ? 0.3 : 0.4), (size.height - (title ? 70 : 40)) / 2)

  // Title
  if (title) {
    elements.push(
      createTextElement({
        id: `${chartId}-title`,
        content: title,
        position: { x: position.x, y: position.y },
        size: { width: size.width, height: 35 },
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: COLORS.dark,
        zIndex
      })
    )
  }

  // Draw pie segments as overlapping circles with colored borders
  let currentAngle = -90 // Start from top
  data.forEach((item, index) => {
    const percentage = (item.value / total) * 100
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length]
    const segmentAngle = (percentage / 100) * 360

    // Create a wedge shape using a rounded rectangle (simplified visual)
    const wedgeX = centerX + Math.cos(((currentAngle + segmentAngle / 2) * Math.PI) / 180) * (radius * 0.3)
    const wedgeY = centerY + Math.sin(((currentAngle + segmentAngle / 2) * Math.PI) / 180) * (radius * 0.3)

    elements.push(
      createShapeElement('circle', {
        id: `${chartId}-segment-${index}`,
        position: { x: wedgeX - radius * 0.4, y: wedgeY - radius * 0.4 },
        size: { width: radius * 0.8, height: radius * 0.8 },
        fill: color,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        zIndex: zIndex + index
      })
    )

    currentAngle += segmentAngle
  })

  // Center circle for donut
  if (donut) {
    elements.push(
      createShapeElement('circle', {
        id: `${chartId}-center`,
        position: { x: centerX - radius * 0.4, y: centerY - radius * 0.4 },
        size: { width: radius * 0.8, height: radius * 0.8 },
        fill: '#ffffff',
        zIndex: zIndex + data.length + 1
      })
    )
  }

  // Legend
  if (showLegend) {
    const legendX = position.x + size.width * 0.55
    const legendStartY = position.y + (title ? 60 : 30)
    const legendItemHeight = 35

    data.forEach((item, index) => {
      const y = legendStartY + index * legendItemHeight
      const color = item.color || CHART_COLORS[index % CHART_COLORS.length]
      const percentage = item.percentage ?? Math.round((item.value / total) * 100)

      // Color box
      elements.push(
        createShapeElement('rounded-rectangle', {
          id: `${chartId}-legend-box-${index}`,
          position: { x: legendX, y: y + 5 },
          size: { width: 16, height: 16 },
          fill: color,
          cornerRadius: 3,
          zIndex: zIndex + 1
        })
      )

      // Label
      elements.push(
        createTextElement({
          id: `${chartId}-legend-label-${index}`,
          content: `${item.label} (${percentage}%)`,
          position: { x: legendX + 24, y: y },
          size: { width: size.width * 0.4, height: 26 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: COLORS.dark,
          zIndex: zIndex + 1
        })
      )
    })
  }

  // Source
  if (source) {
    elements.push(
      createTextElement({
        id: `${chartId}-source`,
        content: `Source: ${source}`,
        position: { x: position.x, y: position.y + size.height - 20 },
        size: { width: size.width, height: 20 },
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'right',
        verticalAlign: 'bottom',
        color: COLORS.muted,
        zIndex
      })
    )
  }

  return elements
}

interface LineChartParams {
  data: Array<{ label: string; value: number }>
  position: Position
  size: Size
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  source?: string
  lineColor?: string
  zIndex?: number
}

/**
 * Create a line chart with optional area fill
 */
export function createLineChart(params: LineChartParams): AnySlideElement[] {
  const {
    data,
    position,
    size,
    title,
    xAxisLabel,
    yAxisLabel,
    source,
    lineColor = COLORS.secondary,
    zIndex = 1
  } = params

  const elements: AnySlideElement[] = []
  const chartId = `line-${Date.now()}`
  const maxValue = Math.max(...data.map(d => d.value))
  const padding = { top: title ? 50 : 20, right: 30, bottom: 50, left: 50 }
  const chartWidth = size.width - padding.left - padding.right
  const chartHeight = size.height - padding.top - padding.bottom

  // Title
  if (title) {
    elements.push(
      createTextElement({
        id: `${chartId}-title`,
        content: title,
        position: { x: position.x, y: position.y },
        size: { width: size.width, height: 35 },
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: COLORS.dark,
        zIndex
      })
    )
  }

  // Chart area background
  elements.push(
    createShapeElement('rectangle', {
      id: `${chartId}-bg`,
      position: { x: position.x + padding.left, y: position.y + padding.top },
      size: { width: chartWidth, height: chartHeight },
      fill: '#fafafa',
      strokeColor: COLORS.border,
      strokeWidth: 1,
      zIndex
    })
  )

  // Y-axis label
  if (yAxisLabel) {
    elements.push(
      createTextElement({
        id: `${chartId}-y-label`,
        content: yAxisLabel,
        position: { x: position.x, y: position.y + padding.top + chartHeight / 2 - 50 },
        size: { width: 30, height: 100 },
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: COLORS.muted,
        rotation: -90,
        zIndex
      })
    )
  }

  // X-axis label
  if (xAxisLabel) {
    elements.push(
      createTextElement({
        id: `${chartId}-x-label`,
        content: xAxisLabel,
        position: { x: position.x + padding.left, y: position.y + size.height - 20 },
        size: { width: chartWidth, height: 20 },
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex
      })
    )
  }

  // Grid lines and data points
  const pointSpacing = chartWidth / (data.length - 1 || 1)

  // Draw horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = position.y + padding.top + (chartHeight * i) / 4
    elements.push(
      createShapeElement('line', {
        id: `${chartId}-grid-${i}`,
        position: { x: position.x + padding.left, y },
        size: { width: chartWidth, height: 1 },
        fill: 'transparent',
        strokeColor: COLORS.border,
        strokeWidth: 1,
        zIndex
      })
    )
  }

  // Draw data points and connecting lines
  data.forEach((item, index) => {
    const x = position.x + padding.left + index * pointSpacing
    const normalizedValue = item.value / maxValue
    const y = position.y + padding.top + chartHeight * (1 - normalizedValue)

    // Data point
    elements.push(
      createShapeElement('circle', {
        id: `${chartId}-point-${index}`,
        position: { x: x - 6, y: y - 6 },
        size: { width: 12, height: 12 },
        fill: lineColor,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        zIndex: zIndex + 2
      })
    )

    // X-axis label
    elements.push(
      createTextElement({
        id: `${chartId}-xlabel-${index}`,
        content: item.label,
        position: { x: x - 30, y: position.y + padding.top + chartHeight + 5 },
        size: { width: 60, height: 20 },
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex
      })
    )

    // Value label
    elements.push(
      createTextElement({
        id: `${chartId}-value-${index}`,
        content: String(item.value),
        position: { x: x - 25, y: y - 25 },
        size: { width: 50, height: 18 },
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'bottom',
        color: lineColor,
        zIndex: zIndex + 3
      })
    )

    // Connecting line to next point
    if (index < data.length - 1) {
      const nextX = position.x + padding.left + (index + 1) * pointSpacing
      const nextY = position.y + padding.top + chartHeight * (1 - data[index + 1].value / maxValue)

      elements.push(
        createShapeElement('line', {
          id: `${chartId}-line-${index}`,
          position: { x, y },
          size: { width: nextX - x, height: Math.abs(nextY - y) || 1 },
          fill: 'transparent',
          strokeColor: lineColor,
          strokeWidth: 3,
          zIndex: zIndex + 1
        })
      )
    }
  })

  // Source
  if (source) {
    elements.push(
      createTextElement({
        id: `${chartId}-source`,
        content: `Source: ${source}`,
        position: { x: position.x + size.width - 200, y: position.y + 10 },
        size: { width: 190, height: 20 },
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'right',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex
      })
    )
  }

  return elements
}

interface FeatureGridParams {
  features: Array<{
    name: string
    description: string
    icon: string
  }>
  position: Position
  size: Size
  columns?: 2 | 3
  color?: string
  zIndex?: number
}

/**
 * Create a feature grid with icons
 */
export function createFeatureGrid(params: FeatureGridParams): AnySlideElement[] {
  const { features, position, size, columns = 2, color = COLORS.primary, zIndex = 1 } = params

  const elements: AnySlideElement[] = []
  const gridId = `feature-grid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const colWidth = size.width / columns
  const rowHeight = 100
  const padding = 20

  features.forEach((feature, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = position.x + col * colWidth + padding
    const y = position.y + row * rowHeight

    // Icon
    elements.push(
      createIconElement(feature.icon || 'file-text', {
        id: `${gridId}-icon-${index}`,
        position: { x, y },
        size: { width: 28, height: 28 },
        color,
        zIndex: zIndex + 1
      })
    )

    // Feature name
    elements.push(
      createTextElement({
        id: `${gridId}-name-${index}`,
        content: feature.name,
        position: { x: x + 36, y },
        size: { width: colWidth - 60, height: 28 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color,
        zIndex: zIndex + 1
      })
    )

    // Feature description
    elements.push(
      createTextElement({
        id: `${gridId}-desc-${index}`,
        content: feature.description,
        position: { x: x + 36, y: y + 30 },
        size: { width: colWidth - 60, height: 50 },
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: zIndex + 1
      })
    )
  })

  return elements
}

interface IconListParams {
  items: Array<{
    text: string
    icon?: string
  }>
  position: Position
  width: number
  itemHeight?: number
  bulletStyle?: 'arrow' | 'check' | 'circle' | 'icon'
  color?: string
  textColor?: string
  zIndex?: number
}

/**
 * Create a bullet list with icons or custom markers
 */
export function createIconList(params: IconListParams): AnySlideElement[] {
  const {
    items,
    position,
    width,
    itemHeight = 50,
    bulletStyle = 'arrow',
    color = COLORS.primary,
    textColor = COLORS.dark,
    zIndex = 1
  } = params

  const elements: AnySlideElement[] = []
  const listId = `icon-list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const bulletMarkers: Record<string, string> = {
    arrow: '→',
    check: '✓',
    circle: '●'
  }

  items.forEach((item, index) => {
    const y = position.y + index * itemHeight

    if (bulletStyle === 'icon' && item.icon) {
      // Use icon
      elements.push(
        createIconElement(item.icon, {
          id: `${listId}-icon-${index}`,
          position: { x: position.x, y: y + 6 },
          size: { width: 24, height: 24 },
          color,
          zIndex: zIndex + 1
        })
      )
    } else {
      // Use text marker
      const marker = bulletMarkers[bulletStyle] || '→'
      elements.push(
        createTextElement({
          id: `${listId}-marker-${index}`,
          content: marker,
          position: { x: position.x, y },
          size: { width: 30, height: 36 },
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color,
          zIndex: zIndex + 1
        })
      )
    }

    // Item text
    elements.push(
      createTextElement({
        id: `${listId}-text-${index}`,
        content: item.text,
        position: { x: position.x + 40, y },
        size: { width: width - 50, height: 36 },
        fontSize: 20,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: zIndex + 1
      })
    )
  })

  return elements
}

// Export all builders
export const SlideVisualBuilders = {
  createMetricCard,
  createMetricRow,
  createDataTable,
  createTimeline,
  createQuadrantMatrix,
  createBarChart,
  createPieChart,
  createLineChart,
  createProcessFlow,
  createComparisonColumns,
  createFeatureGrid,
  createIconList,
  CHART_COLORS,
  COLORS
}

export default SlideVisualBuilders
