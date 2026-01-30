/**
 * SlideLayoutService - Professional slide layout templates
 *
 * Defines McKinsey-style slide patterns for enterprise presentations.
 * Each layout has a specific purpose and visual structure.
 */

import type { SlideTheme } from '../components/slideThemes'
import type { AnySlideElement, SlideData } from '../components/slideElements'
import { createTextElement, createShapeElement, createImageElement } from '../components/slideElements'
import {
  createMetricRow,
  createDataTable,
  createTimeline,
  createQuadrantMatrix,
  createBarChart,
  createPieChart,
  createLineChart,
  createProcessFlow,
  createComparisonColumns,
  COLORS
} from './SlideVisualBuilders'

// Slide dimensions
const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

// Layout types
export type SlideLayoutType =
  | 'title-cover'
  | 'section-divider'
  | 'agenda'
  | 'executive-summary'
  | 'key-metrics'
  | 'bullets'
  | 'two-column'
  | 'comparison'
  | 'data-table'
  | 'timeline'
  | 'quadrant-matrix'
  | 'bar-chart'
  | 'pie-chart'
  | 'line-chart'
  | 'process-flow'
  | 'image-left'
  | 'image-right'
  | 'full-image'
  | 'quote'
  | 'key-takeaway'
  | 'thank-you'

// Layout content interfaces
export interface TitleCoverContent {
  title: string
  subtitle?: string
  date?: string
  author?: string
  imageKeywords?: string
}

export interface SectionDividerContent {
  title: string
  sectionNumber?: number
  description?: string
}

export interface AgendaContent {
  title: string
  items: Array<{ title: string; description?: string }>
}

export interface ExecutiveSummaryContent {
  title: string
  keyMessage: string
  supportingPoints: Array<{ title: string; description: string }>
  conclusion?: string
}

export interface KeyMetricsContent {
  title: string
  metrics: Array<{
    label: string
    value: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
  }>
  source?: string
}

export interface BulletsContent {
  title: string
  bullets: string[]
  source?: string
}

export interface TwoColumnContent {
  title: string
  leftTitle?: string
  leftItems: string[]
  rightTitle?: string
  rightItems: string[]
}

export interface ComparisonContent {
  title: string
  leftTitle: string
  leftItems: string[]
  rightTitle: string
  rightItems: string[]
}

export interface DataTableContent {
  title: string
  headers: string[]
  rows: string[][]
  source?: string
}

export interface TimelineContent {
  title: string
  items: Array<{ date: string; title: string; description?: string }>
}

export interface QuadrantMatrixContent {
  title: string
  axisLabels: { x: string; y: string }
  quadrants: [
    { title: string; items: string[] },
    { title: string; items: string[] },
    { title: string; items: string[] },
    { title: string; items: string[] }
  ]
}

export interface BarChartContent {
  title: string
  data: Array<{ label: string; value: number }>
  source?: string
}

export interface PieChartContent {
  title: string
  data: Array<{ label: string; value: number; percentage?: number }>
  source?: string
  donut?: boolean
}

export interface LineChartContent {
  title: string
  data: Array<{ label: string; value: number }>
  xAxisLabel?: string
  yAxisLabel?: string
  source?: string
}

export interface ProcessFlowContent {
  title: string
  steps: Array<{ title: string; description?: string }>
}

export interface ImageSideContent {
  title: string
  content?: string
  bullets?: string[]
  imageKeywords: string
  source?: string
}

export interface FullImageContent {
  title: string
  subtitle?: string
  imageKeywords: string
}

export interface QuoteContent {
  quote: string
  attribution: string
  source?: string
}

export interface KeyTakeawayContent {
  title: string
  message: string
  supportingText?: string
}

export interface ThankYouContent {
  title: string
  subtitle?: string
  contactInfo?: string
}

export type SlideLayoutContent =
  | { layout: 'title-cover'; content: TitleCoverContent }
  | { layout: 'section-divider'; content: SectionDividerContent }
  | { layout: 'agenda'; content: AgendaContent }
  | { layout: 'executive-summary'; content: ExecutiveSummaryContent }
  | { layout: 'key-metrics'; content: KeyMetricsContent }
  | { layout: 'bullets'; content: BulletsContent }
  | { layout: 'two-column'; content: TwoColumnContent }
  | { layout: 'comparison'; content: ComparisonContent }
  | { layout: 'data-table'; content: DataTableContent }
  | { layout: 'timeline'; content: TimelineContent }
  | { layout: 'quadrant-matrix'; content: QuadrantMatrixContent }
  | { layout: 'bar-chart'; content: BarChartContent }
  | { layout: 'pie-chart'; content: PieChartContent }
  | { layout: 'line-chart'; content: LineChartContent }
  | { layout: 'process-flow'; content: ProcessFlowContent }
  | { layout: 'image-left'; content: ImageSideContent }
  | { layout: 'image-right'; content: ImageSideContent }
  | { layout: 'full-image'; content: FullImageContent }
  | { layout: 'quote'; content: QuoteContent }
  | { layout: 'key-takeaway'; content: KeyTakeawayContent }
  | { layout: 'thank-you'; content: ThankYouContent }

/**
 * Generate a slide from layout type and content
 */
export function generateSlideFromLayout(
  layoutContent: SlideLayoutContent,
  slideIndex: number,
  theme?: SlideTheme
): SlideData {
  const slideId = `slide-${Date.now()}-${slideIndex}`
  const elements: AnySlideElement[] = []

  const primaryColor = theme?.theme.colors.primary || COLORS.primary

  switch (layoutContent.layout) {
    case 'title-cover':
      return createTitleCoverSlide(slideId, layoutContent.content, primaryColor)

    case 'section-divider':
      return createSectionDividerSlide(slideId, layoutContent.content, primaryColor)

    case 'agenda':
      return createAgendaSlide(slideId, layoutContent.content, primaryColor)

    case 'executive-summary':
      return createExecutiveSummarySlide(slideId, layoutContent.content, primaryColor)

    case 'key-metrics':
      return createKeyMetricsSlide(slideId, layoutContent.content, primaryColor)

    case 'bullets':
      return createBulletsSlide(slideId, layoutContent.content, primaryColor)

    case 'two-column':
      return createTwoColumnSlide(slideId, layoutContent.content, primaryColor)

    case 'comparison':
      return createComparisonSlide(slideId, layoutContent.content, primaryColor)

    case 'data-table':
      return createDataTableSlide(slideId, layoutContent.content, primaryColor)

    case 'timeline':
      return createTimelineSlide(slideId, layoutContent.content, primaryColor)

    case 'quadrant-matrix':
      return createQuadrantMatrixSlide(slideId, layoutContent.content, primaryColor)

    case 'bar-chart':
      return createBarChartSlide(slideId, layoutContent.content, primaryColor)

    case 'pie-chart':
      return createPieChartSlide(slideId, layoutContent.content, primaryColor)

    case 'line-chart':
      return createLineChartSlide(slideId, layoutContent.content, primaryColor)

    case 'process-flow':
      return createProcessFlowSlide(slideId, layoutContent.content, primaryColor)

    case 'image-left':
      return createImageSideSlide(slideId, layoutContent.content, primaryColor, 'left')

    case 'image-right':
      return createImageSideSlide(slideId, layoutContent.content, primaryColor, 'right')

    case 'full-image':
      return createFullImageSlide(slideId, layoutContent.content)

    case 'quote':
      return createQuoteSlide(slideId, layoutContent.content, primaryColor)

    case 'key-takeaway':
      return createKeyTakeawaySlide(slideId, layoutContent.content, primaryColor)

    case 'thank-you':
      return createThankYouSlide(slideId, layoutContent.content, primaryColor)

    default:
      return { id: slideId, elements, background: { type: 'solid', color: '#ffffff' } }
  }
}

// Individual layout creators

function createTitleCoverSlide(slideId: string, content: TitleCoverContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Background accent shape
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent`,
      position: { x: 0, y: 0 },
      size: { width: SLIDE_WIDTH, height: 200 },
      fill: color,
      zIndex: 0
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 260 },
      size: { width: SLIDE_WIDTH - 160, height: 120 },
      fontSize: 56,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: 390 },
        size: { width: SLIDE_WIDTH - 160, height: 50 },
        fontSize: 24,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  // Date and author
  if (content.date || content.author) {
    const metaText = [content.author, content.date].filter(Boolean).join(' | ')
    elements.push(
      createTextElement({
        id: `${slideId}-meta`,
        content: metaText,
        position: { x: 80, y: SLIDE_HEIGHT - 80 },
        size: { width: SLIDE_WIDTH - 160, height: 30 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'bottom',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createSectionDividerSlide(slideId: string, content: SectionDividerContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent bar
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-bar`,
      position: { x: 0, y: 0 },
      size: { width: 10, height: SLIDE_HEIGHT },
      fill: color,
      zIndex: 0
    })
  )

  // Section number
  if (content.sectionNumber) {
    elements.push(
      createTextElement({
        id: `${slideId}-number`,
        content: `0${content.sectionNumber}`,
        position: { x: 80, y: 200 },
        size: { width: 120, height: 80 },
        fontSize: 64,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: color,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionNumber ? 300 : 280 },
      size: { width: SLIDE_WIDTH - 160, height: 100 },
      fontSize: 48,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Description
  if (content.description) {
    elements.push(
      createTextElement({
        id: `${slideId}-desc`,
        content: content.description,
        position: { x: 80, y: 410 },
        size: { width: SLIDE_WIDTH - 200, height: 60 },
        fontSize: 20,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createAgendaSlide(slideId: string, content: AgendaContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Divider
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-divider`,
      position: { x: 80, y: 130 },
      size: { width: 100, height: 4 },
      fill: color,
      zIndex: 1
    })
  )

  // Agenda items
  const itemHeight = Math.min(80, (SLIDE_HEIGHT - 200) / content.items.length)
  content.items.forEach((item, index) => {
    const itemY = 160 + index * itemHeight

    // Number circle
    elements.push(
      createShapeElement('circle', {
        id: `${slideId}-num-${index}`,
        position: { x: 80, y: itemY + 10 },
        size: { width: 36, height: 36 },
        fill: color,
        zIndex: 1
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-num-text-${index}`,
        content: `${index + 1}`,
        position: { x: 80, y: itemY + 10 },
        size: { width: 36, height: 36 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: '#ffffff',
        zIndex: 2
      })
    )

    // Item title
    elements.push(
      createTextElement({
        id: `${slideId}-item-title-${index}`,
        content: item.title,
        position: { x: 140, y: itemY + 8 },
        size: { width: SLIDE_WIDTH - 220, height: 30 },
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: COLORS.dark,
        zIndex: 1
      })
    )

    // Item description
    if (item.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-item-desc-${index}`,
          content: item.description,
          position: { x: 140, y: itemY + 40 },
          size: { width: SLIDE_WIDTH - 220, height: 30 },
          fontSize: 14,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: COLORS.muted,
          zIndex: 1
        })
      )
    }
  })

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createExecutiveSummarySlide(slideId: string, content: ExecutiveSummaryContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 40 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Key message box
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-message-bg`,
      position: { x: 80, y: 110 },
      size: { width: SLIDE_WIDTH - 160, height: 100 },
      fill: `${color}15`,
      strokeColor: color,
      strokeWidth: 2,
      cornerRadius: 8,
      zIndex: 0
    })
  )

  elements.push(
    createTextElement({
      id: `${slideId}-message`,
      content: content.keyMessage,
      position: { x: 100, y: 125 },
      size: { width: SLIDE_WIDTH - 200, height: 70 },
      fontSize: 20,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      lineHeight: 1.5,
      zIndex: 1
    })
  )

  // Supporting points
  const pointWidth = (SLIDE_WIDTH - 200) / content.supportingPoints.length
  content.supportingPoints.forEach((point, index) => {
    const pointX = 80 + index * (pointWidth + 20)

    elements.push(
      createTextElement({
        id: `${slideId}-point-title-${index}`,
        content: point.title,
        position: { x: pointX, y: 240 },
        size: { width: pointWidth, height: 40 },
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'top',
        color: color,
        zIndex: 1
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-point-desc-${index}`,
        content: point.description,
        position: { x: pointX, y: 285 },
        size: { width: pointWidth, height: 200 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.dark,
        lineHeight: 1.5,
        zIndex: 1
      })
    )
  })

  // Conclusion
  if (content.conclusion) {
    elements.push(
      createTextElement({
        id: `${slideId}-conclusion`,
        content: content.conclusion,
        position: { x: 80, y: SLIDE_HEIGHT - 100 },
        size: { width: SLIDE_WIDTH - 160, height: 60 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'bottom',
        color: COLORS.dark,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createKeyMetricsSlide(slideId: string, content: KeyMetricsContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Metrics row
  const metricElements = createMetricRow({
    metrics: content.metrics,
    position: { x: 80, y: 180 },
    source: content.source,
    zIndex: 2
  })
  elements.push(...metricElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createBulletsSlide(slideId: string, content: BulletsContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Bullets
  const bulletText = content.bullets.map(b => `• ${b}`).join('\n\n')
  elements.push(
    createTextElement({
      id: `${slideId}-bullets`,
      content: bulletText,
      position: { x: 80, y: 140 },
      size: { width: SLIDE_WIDTH - 160, height: 500 },
      fontSize: 22,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: COLORS.dark,
      lineHeight: 1.6,
      zIndex: 1
    })
  )

  // Source
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: content.source,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 30 },
        fontSize: 11,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'bottom',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createTwoColumnSlide(slideId: string, content: TwoColumnContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const colWidth = (SLIDE_WIDTH - 200) / 2

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Left column title
  if (content.leftTitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-left-title`,
        content: content.leftTitle,
        position: { x: 80, y: 140 },
        size: { width: colWidth, height: 40 },
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: color,
        zIndex: 1
      })
    )
  }

  // Left column items
  const leftText = content.leftItems.map(item => `• ${item}`).join('\n\n')
  elements.push(
    createTextElement({
      id: `${slideId}-left-items`,
      content: leftText,
      position: { x: 80, y: content.leftTitle ? 190 : 140 },
      size: { width: colWidth, height: 450 },
      fontSize: 18,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: COLORS.dark,
      lineHeight: 1.5,
      zIndex: 1
    })
  )

  // Right column title
  if (content.rightTitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-right-title`,
        content: content.rightTitle,
        position: { x: 80 + colWidth + 40, y: 140 },
        size: { width: colWidth, height: 40 },
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: color,
        zIndex: 1
      })
    )
  }

  // Right column items
  const rightText = content.rightItems.map(item => `• ${item}`).join('\n\n')
  elements.push(
    createTextElement({
      id: `${slideId}-right-items`,
      content: rightText,
      position: { x: 80 + colWidth + 40, y: content.rightTitle ? 190 : 140 },
      size: { width: colWidth, height: 450 },
      fontSize: 18,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: COLORS.dark,
      lineHeight: 1.5,
      zIndex: 1
    })
  )

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createComparisonSlide(slideId: string, content: ComparisonContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Comparison columns
  const compElements = createComparisonColumns({
    leftTitle: content.leftTitle,
    leftItems: content.leftItems,
    rightTitle: content.rightTitle,
    rightItems: content.rightItems,
    position: { x: 80, y: 150 },
    size: { width: SLIDE_WIDTH - 160, height: 480 },
    zIndex: 2
  })
  elements.push(...compElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createDataTableSlide(slideId: string, content: DataTableContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Table
  const tableElements = createDataTable({
    headers: content.headers,
    rows: content.rows,
    position: { x: 80, y: 140 },
    size: { width: SLIDE_WIDTH - 160, height: 480 },
    headerColor: color,
    source: content.source,
    zIndex: 2
  })
  elements.push(...tableElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createTimelineSlide(slideId: string, content: TimelineContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Timeline
  const timelineElements = createTimeline({
    items: content.items,
    position: { x: 80, y: 150 },
    color,
    zIndex: 2
  })
  elements.push(...timelineElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createQuadrantMatrixSlide(slideId: string, content: QuadrantMatrixContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 40 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Matrix
  const matrixElements = createQuadrantMatrix({
    quadrants: content.quadrants,
    axisLabels: content.axisLabels,
    position: { x: 340, y: 120 },
    size: { width: 600, height: 520 },
    zIndex: 2
  })
  elements.push(...matrixElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createBarChartSlide(slideId: string, content: BarChartContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Chart
  const chartElements = createBarChart({
    data: content.data,
    position: { x: 80, y: 150 },
    size: { width: SLIDE_WIDTH - 160, height: 480 },
    source: content.source,
    zIndex: 2
  })
  elements.push(...chartElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createPieChartSlide(slideId: string, content: PieChartContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Chart
  const chartElements = createPieChart({
    data: content.data,
    position: { x: 80, y: 150 },
    size: { width: SLIDE_WIDTH - 160, height: 480 },
    source: content.source,
    donut: content.donut,
    showLegend: true,
    zIndex: 2
  })
  elements.push(...chartElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createLineChartSlide(slideId: string, content: LineChartContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: color,
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Chart
  const chartElements = createLineChart({
    data: content.data,
    position: { x: 80, y: 150 },
    size: { width: SLIDE_WIDTH - 160, height: 480 },
    xAxisLabel: content.xAxisLabel,
    yAxisLabel: content.yAxisLabel,
    source: content.source,
    zIndex: 2
  })
  elements.push(...chartElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createProcessFlowSlide(slideId: string, content: ProcessFlowContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Process flow
  const flowElements = createProcessFlow({
    steps: content.steps,
    position: { x: 80, y: 200 },
    color,
    zIndex: 2
  })
  elements.push(...flowElements)

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createImageSideSlide(
  slideId: string,
  content: ImageSideContent,
  color: string,
  side: 'left' | 'right'
): SlideData {
  const elements: AnySlideElement[] = []
  const imageWidth = SLIDE_WIDTH * 0.4
  const contentWidth = SLIDE_WIDTH * 0.5

  // Title (full width)
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  const imageX = side === 'left' ? 80 : SLIDE_WIDTH - 80 - imageWidth
  const contentX = side === 'left' ? 80 + imageWidth + 40 : 80

  // Image placeholder (using Picsum for actual image)
  const imageUrl = `https://picsum.photos/seed/${content.imageKeywords.replace(/\s+/g, '')}/600/450`
  elements.push(
    createImageElement(imageUrl, {
      id: `${slideId}-image`,
      position: { x: imageX, y: 150 },
      size: { width: imageWidth, height: 450 },
      objectFit: 'cover',
      borderRadius: 12,
      zIndex: 1
    })
  )

  // Content
  if (content.content) {
    elements.push(
      createTextElement({
        id: `${slideId}-content`,
        content: content.content,
        position: { x: contentX, y: 150 },
        size: { width: contentWidth, height: content.bullets?.length ? 150 : 450 },
        fontSize: 18,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.dark,
        lineHeight: 1.6,
        zIndex: 1
      })
    )
  }

  // Bullets
  if (content.bullets?.length) {
    const bulletText = content.bullets.map(b => `• ${b}`).join('\n\n')
    elements.push(
      createTextElement({
        id: `${slideId}-bullets`,
        content: bulletText,
        position: { x: contentX, y: content.content ? 310 : 150 },
        size: { width: contentWidth, height: 300 },
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.dark,
        lineHeight: 1.5,
        zIndex: 1
      })
    )
  }

  // Source
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: content.source,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 30 },
        fontSize: 11,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'bottom',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createFullImageSlide(slideId: string, content: FullImageContent): SlideData {
  const elements: AnySlideElement[] = []

  // Full background image
  const imageUrl = `https://picsum.photos/seed/${content.imageKeywords.replace(/\s+/g, '')}/1280/720`
  elements.push(
    createImageElement(imageUrl, {
      id: `${slideId}-bg-image`,
      position: { x: 0, y: 0 },
      size: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      objectFit: 'cover',
      zIndex: 0
    })
  )

  // Overlay
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-overlay`,
      position: { x: 0, y: SLIDE_HEIGHT - 250 },
      size: { width: SLIDE_WIDTH, height: 250 },
      fill: 'rgba(0,0,0,0.7)',
      zIndex: 1
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: SLIDE_HEIGHT - 200 },
      size: { width: SLIDE_WIDTH - 160, height: 80 },
      fontSize: 48,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: '#ffffff',
      zIndex: 2
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: SLIDE_HEIGHT - 120 },
        size: { width: SLIDE_WIDTH - 160, height: 50 },
        fontSize: 24,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: '#e2e8f0',
        zIndex: 2
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#000000' }
  }
}

function createQuoteSlide(slideId: string, content: QuoteContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Quote mark
  elements.push(
    createTextElement({
      id: `${slideId}-quote-mark`,
      content: '"',
      position: { x: 100, y: 150 },
      size: { width: 120, height: 150 },
      fontSize: 150,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'top',
      color: `${color}30`,
      zIndex: 0
    })
  )

  // Quote text
  elements.push(
    createTextElement({
      id: `${slideId}-quote`,
      content: content.quote,
      position: { x: 150, y: 250 },
      size: { width: SLIDE_WIDTH - 300, height: 200 },
      fontSize: 32,
      fontWeight: 'normal',
      fontStyle: 'italic',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      lineHeight: 1.6,
      zIndex: 1
    })
  )

  // Attribution
  elements.push(
    createTextElement({
      id: `${slideId}-attribution`,
      content: `— ${content.attribution}`,
      position: { x: 150, y: 470 },
      size: { width: SLIDE_WIDTH - 300, height: 40 },
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'top',
      color: color,
      zIndex: 1
    })
  )

  // Source
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: content.source,
        position: { x: 150, y: 510 },
        size: { width: SLIDE_WIDTH - 300, height: 30 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createKeyTakeawaySlide(slideId: string, content: KeyTakeawayContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Background accent
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-accent-bg`,
      position: { x: 60, y: 180 },
      size: { width: SLIDE_WIDTH - 120, height: 360 },
      fill: `${color}10`,
      strokeColor: color,
      strokeWidth: 3,
      cornerRadius: 16,
      zIndex: 0
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 60 },
      size: { width: SLIDE_WIDTH - 160, height: 80 },
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: color,
      zIndex: 1
    })
  )

  // Key message
  elements.push(
    createTextElement({
      id: `${slideId}-message`,
      content: content.message,
      position: { x: 100, y: 250 },
      size: { width: SLIDE_WIDTH - 200, height: 150 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      lineHeight: 1.4,
      zIndex: 1
    })
  )

  // Supporting text
  if (content.supportingText) {
    elements.push(
      createTextElement({
        id: `${slideId}-support`,
        content: content.supportingText,
        position: { x: 100, y: 420 },
        size: { width: SLIDE_WIDTH - 200, height: 80 },
        fontSize: 18,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createThankYouSlide(slideId: string, content: ThankYouContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 260 },
      size: { width: SLIDE_WIDTH - 160, height: 100 },
      fontSize: 64,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: 370 },
        size: { width: SLIDE_WIDTH - 160, height: 50 },
        fontSize: 24,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.muted,
        zIndex: 1
      })
    )
  }

  // Contact info
  if (content.contactInfo) {
    elements.push(
      createTextElement({
        id: `${slideId}-contact`,
        content: content.contactInfo,
        position: { x: 80, y: SLIDE_HEIGHT - 100 },
        size: { width: SLIDE_WIDTH - 160, height: 40 },
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'bottom',
        color: color,
        zIndex: 1
      })
    )
  }

  // Decorative line
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-line`,
      position: { x: SLIDE_WIDTH / 2 - 50, y: 430 },
      size: { width: 100, height: 4 },
      fill: color,
      zIndex: 1
    })
  )

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

// Export
export const SlideLayoutService = {
  generateSlideFromLayout
}

export default SlideLayoutService
