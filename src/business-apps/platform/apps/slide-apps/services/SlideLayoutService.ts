/**
 * SlideLayoutService - Professional slide layout templates
 *
 * Defines McKinsey-style slide patterns for enterprise presentations.
 * Each layout has a specific purpose and visual structure.
 */

import type { SlideTheme } from '../components/slideThemes'
import type { AnySlideElement, SlideData } from '../components/slideElements'
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createChartElement
} from '../components/slideElements'
import {
  createMetricRow,
  createDataTable,
  createTimeline,
  createQuadrantMatrix,
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
  | 'area-chart'
  | 'radar-chart'
  | 'swot-analysis'
  | 'funnel'
  | 'pyramid'
  | 'icon-grid'
  | 'roadmap'
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

export interface AreaChartContent {
  title: string
  data: Array<{ label: string; value: number }>
  xAxisLabel?: string
  yAxisLabel?: string
  source?: string
  fillOpacity?: number
}

export interface RadarChartContent {
  title: string
  data: Array<{ label: string; value: number }>
  categories: string[]
  source?: string
}

export interface SWOTContent {
  title: string
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
}

export interface FunnelContent {
  title: string
  stages: Array<{ label: string; value: number; percentage?: number }>
  source?: string
}

export interface PyramidContent {
  title: string
  levels: Array<{ label: string; description?: string }>
}

export interface IconGridContent {
  title: string
  items: Array<{ icon: string; label: string; description?: string }>
  columns?: 3 | 4
}

export interface RoadmapContent {
  title: string
  milestones: Array<{
    date: string
    title: string
    description?: string
    status?: 'completed' | 'current' | 'upcoming'
  }>
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
  | { layout: 'area-chart'; content: AreaChartContent }
  | { layout: 'radar-chart'; content: RadarChartContent }
  | { layout: 'swot-analysis'; content: SWOTContent }
  | { layout: 'funnel'; content: FunnelContent }
  | { layout: 'pyramid'; content: PyramidContent }
  | { layout: 'icon-grid'; content: IconGridContent }
  | { layout: 'roadmap'; content: RoadmapContent }
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

    case 'area-chart':
      return createAreaChartSlide(slideId, layoutContent.content, primaryColor)

    case 'radar-chart':
      return createRadarChartSlide(slideId, layoutContent.content, primaryColor)

    case 'swot-analysis':
      return createSWOTSlide(slideId, layoutContent.content)

    case 'funnel':
      return createFunnelSlide(slideId, layoutContent.content, primaryColor)

    case 'pyramid':
      return createPyramidSlide(slideId, layoutContent.content, primaryColor)

    case 'icon-grid':
      return createIconGridSlide(slideId, layoutContent.content, primaryColor)

    case 'roadmap':
      return createRoadmapSlide(slideId, layoutContent.content, primaryColor)

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

  // Chart using ChartElement for interactive Recharts rendering
  elements.push(
    createChartElement('bar', {
      id: `${slideId}-chart`,
      title: '',
      data: content.data.map(d => ({ label: d.label, value1: d.value })),
      series: [{ key: 'value1', label: 'Value' }],
      showLegend: false,
      showGrid: true,
      showTooltip: true,
      position: { x: 80, y: 150 },
      size: { width: SLIDE_WIDTH - 160, height: content.source ? 440 : 480 },
      backgroundColor: 'transparent',
      borderRadius: 8,
      zIndex: 2
    })
  )

  // Source citation
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: `Source: ${content.source}`,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 20 },
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

  // Chart using ChartElement for interactive Recharts rendering
  elements.push(
    createChartElement('pie', {
      id: `${slideId}-chart`,
      title: '',
      data: content.data.map(d => ({ label: d.label, value1: d.value })),
      series: [{ key: 'value1', label: 'Value' }],
      showLegend: true,
      showGrid: false,
      showTooltip: true,
      position: { x: 80, y: 150 },
      size: { width: SLIDE_WIDTH - 160, height: content.source ? 440 : 480 },
      backgroundColor: 'transparent',
      borderRadius: 8,
      zIndex: 2
    })
  )

  // Source citation
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: `Source: ${content.source}`,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 20 },
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

  // Chart using ChartElement for interactive Recharts rendering
  elements.push(
    createChartElement('line', {
      id: `${slideId}-chart`,
      title: '',
      data: content.data.map(d => ({ label: d.label, value1: d.value })),
      series: [{ key: 'value1', label: content.yAxisLabel || 'Value' }],
      showLegend: false,
      showGrid: true,
      showTooltip: true,
      position: { x: 80, y: 150 },
      size: { width: SLIDE_WIDTH - 160, height: content.source ? 440 : 480 },
      backgroundColor: 'transparent',
      borderRadius: 8,
      zIndex: 2
    })
  )

  // Source citation
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: `Source: ${content.source}`,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 20 },
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

function createAreaChartSlide(slideId: string, content: AreaChartContent, color: string): SlideData {
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

  // Chart using ChartElement with area type
  elements.push(
    createChartElement('area', {
      id: `${slideId}-chart`,
      title: '',
      data: content.data.map(d => ({ label: d.label, value1: d.value })),
      series: [{ key: 'value1', label: content.yAxisLabel || 'Value' }],
      showLegend: false,
      showGrid: true,
      showTooltip: true,
      position: { x: 80, y: 150 },
      size: { width: SLIDE_WIDTH - 160, height: content.source ? 440 : 480 },
      backgroundColor: 'transparent',
      borderRadius: 8,
      zIndex: 2
    })
  )

  // Source citation
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: `Source: ${content.source}`,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 20 },
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

function createRadarChartSlide(slideId: string, content: RadarChartContent, color: string): SlideData {
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

  // Chart using ChartElement with radar type
  elements.push(
    createChartElement('radar', {
      id: `${slideId}-chart`,
      title: '',
      data: content.data.map(d => ({ label: d.label, value1: d.value })),
      series: [{ key: 'value1', label: 'Score' }],
      showLegend: false,
      showGrid: true,
      showTooltip: true,
      position: { x: 80, y: 150 },
      size: { width: SLIDE_WIDTH - 160, height: content.source ? 440 : 480 },
      backgroundColor: 'transparent',
      borderRadius: 8,
      zIndex: 2
    })
  )

  // Source citation
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: `Source: ${content.source}`,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 20 },
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

function createSWOTSlide(slideId: string, content: SWOTContent): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 30 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // SWOT quadrant colors (using semantic colors)
  const quadrantColors = {
    strengths: '#22c55e',
    weaknesses: '#ef4444',
    opportunities: '#3b82f6',
    threats: '#f97316'
  }

  const quadrantWidth = (SLIDE_WIDTH - 200) / 2
  const quadrantHeight = 280
  const startY = 110
  const leftX = 80
  const rightX = leftX + quadrantWidth + 40

  // Quadrant labels and positions
  const quadrants = [
    { key: 'strengths', label: 'S', title: 'Strengths', items: content.strengths, x: leftX, y: startY },
    { key: 'weaknesses', label: 'W', title: 'Weaknesses', items: content.weaknesses, x: rightX, y: startY },
    {
      key: 'opportunities',
      label: 'O',
      title: 'Opportunities',
      items: content.opportunities,
      x: leftX,
      y: startY + quadrantHeight + 20
    },
    { key: 'threats', label: 'T', title: 'Threats', items: content.threats, x: rightX, y: startY + quadrantHeight + 20 }
  ]

  quadrants.forEach(q => {
    const qColor = quadrantColors[q.key as keyof typeof quadrantColors]

    // Quadrant background
    elements.push(
      createShapeElement('rectangle', {
        id: `${slideId}-${q.key}-bg`,
        position: { x: q.x, y: q.y },
        size: { width: quadrantWidth, height: quadrantHeight },
        fill: `${qColor}10`,
        stroke: qColor,
        strokeWidth: 2,
        borderRadius: 8,
        zIndex: 1
      })
    )

    // Quadrant letter badge
    elements.push(
      createShapeElement('rectangle', {
        id: `${slideId}-${q.key}-badge`,
        position: { x: q.x + 12, y: q.y + 12 },
        size: { width: 36, height: 36 },
        fill: qColor,
        borderRadius: 6,
        zIndex: 2
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-${q.key}-letter`,
        content: q.label,
        position: { x: q.x + 12, y: q.y + 12 },
        size: { width: 36, height: 36 },
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: '#ffffff',
        zIndex: 3
      })
    )

    // Quadrant title
    elements.push(
      createTextElement({
        id: `${slideId}-${q.key}-title`,
        content: q.title,
        position: { x: q.x + 56, y: q.y + 12 },
        size: { width: quadrantWidth - 68, height: 36 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: qColor,
        zIndex: 2
      })
    )

    // Quadrant items
    const itemsText = q.items
      .slice(0, 4)
      .map(item => `• ${item}`)
      .join('\n')
    elements.push(
      createTextElement({
        id: `${slideId}-${q.key}-items`,
        content: itemsText,
        position: { x: q.x + 16, y: q.y + 56 },
        size: { width: quadrantWidth - 32, height: quadrantHeight - 72 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: COLORS.dark,
        lineHeight: 1.6,
        zIndex: 2
      })
    )
  })

  return {
    id: slideId,
    elements,
    background: { type: 'solid', color: '#ffffff' }
  }
}

function createFunnelSlide(slideId: string, content: FunnelContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Accent line
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

  // Funnel stages
  const stages = content.stages.slice(0, 6)
  const funnelTop = 180
  const funnelHeight = 420
  const stageHeight = funnelHeight / stages.length
  const maxWidth = SLIDE_WIDTH - 300
  const minWidth = 200

  stages.forEach((stage, index) => {
    const progress = index / (stages.length - 1 || 1)
    const stageWidth = maxWidth - (maxWidth - minWidth) * progress
    const stageX = (SLIDE_WIDTH - stageWidth) / 2
    const stageY = funnelTop + index * stageHeight

    // Calculate color gradient (darker as we go down)
    const colorIntensity = 1 - progress * 0.5

    // Stage background (trapezoid effect using overlapping rectangles)
    elements.push(
      createShapeElement('rectangle', {
        id: `${slideId}-stage-${index}-bg`,
        position: { x: stageX, y: stageY },
        size: { width: stageWidth, height: stageHeight - 4 },
        fill: color,
        opacity: colorIntensity,
        borderRadius: 4,
        zIndex: 2
      })
    )

    // Stage label
    elements.push(
      createTextElement({
        id: `${slideId}-stage-${index}-label`,
        content: stage.label,
        position: { x: stageX + 20, y: stageY },
        size: { width: stageWidth - 150, height: stageHeight - 4 },
        fontSize: 16,
        fontWeight: 'semibold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: '#ffffff',
        zIndex: 3
      })
    )

    // Stage value
    const valueText = stage.percentage
      ? `${stage.value.toLocaleString()} (${stage.percentage}%)`
      : stage.value.toLocaleString()

    elements.push(
      createTextElement({
        id: `${slideId}-stage-${index}-value`,
        content: valueText,
        position: { x: stageX + stageWidth - 140, y: stageY },
        size: { width: 120, height: stageHeight - 4 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
        verticalAlign: 'middle',
        color: '#ffffff',
        zIndex: 3
      })
    )
  })

  // Source citation
  if (content.source) {
    elements.push(
      createTextElement({
        id: `${slideId}-source`,
        content: `Source: ${content.source}`,
        position: { x: 80, y: SLIDE_HEIGHT - 50 },
        size: { width: SLIDE_WIDTH - 160, height: 20 },
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

function createPyramidSlide(slideId: string, content: PyramidContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 30 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Pyramid levels (from top to bottom, getting wider)
  const levels = content.levels.slice(0, 5)
  const pyramidTop = 120
  const pyramidHeight = 520
  const levelHeight = pyramidHeight / levels.length
  const minWidth = 150
  const maxWidth = SLIDE_WIDTH - 200

  levels.forEach((level, index) => {
    const progress = index / (levels.length - 1 || 1)
    const levelWidth = minWidth + (maxWidth - minWidth) * progress
    const levelX = (SLIDE_WIDTH - levelWidth) / 2
    const levelY = pyramidTop + index * levelHeight

    // Level background
    const colorIntensity = 1 - progress * 0.4
    elements.push(
      createShapeElement('rectangle', {
        id: `${slideId}-level-${index}-bg`,
        position: { x: levelX, y: levelY },
        size: { width: levelWidth, height: levelHeight - 8 },
        fill: color,
        opacity: colorIntensity,
        borderRadius: 6,
        zIndex: 2
      })
    )

    // Level label
    elements.push(
      createTextElement({
        id: `${slideId}-level-${index}-label`,
        content: level.label,
        position: { x: levelX + 20, y: levelY },
        size: { width: levelWidth - 40, height: level.description ? (levelHeight - 8) * 0.5 : levelHeight - 8 },
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: level.description ? 'bottom' : 'middle',
        color: '#ffffff',
        zIndex: 3
      })
    )

    // Level description (if provided)
    if (level.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-level-${index}-desc`,
          content: level.description,
          position: { x: levelX + 20, y: levelY + (levelHeight - 8) * 0.45 },
          size: { width: levelWidth - 40, height: (levelHeight - 8) * 0.5 },
          fontSize: 12,
          fontWeight: 'normal',
          textAlign: 'center',
          verticalAlign: 'top',
          color: 'rgba(255,255,255,0.9)',
          zIndex: 3
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

function createIconGridSlide(slideId: string, content: IconGridContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 30 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Grid layout
  const columns = content.columns || 3
  const items = content.items.slice(0, columns * 3)
  const rows = Math.ceil(items.length / columns)
  const gridTop = 120
  const gridLeft = 100
  const gridWidth = SLIDE_WIDTH - 200
  const gridHeight = 520
  const cellWidth = gridWidth / columns
  const cellHeight = gridHeight / rows

  items.forEach((item, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const cellX = gridLeft + col * cellWidth
    const cellY = gridTop + row * cellHeight

    // Icon circle
    elements.push(
      createShapeElement('ellipse', {
        id: `${slideId}-icon-${index}-circle`,
        position: { x: cellX + (cellWidth - 60) / 2, y: cellY + 10 },
        size: { width: 60, height: 60 },
        fill: `${color}20`,
        stroke: color,
        strokeWidth: 2,
        zIndex: 2
      })
    )

    // Icon placeholder (letter for icon name)
    elements.push(
      createTextElement({
        id: `${slideId}-icon-${index}-letter`,
        content: item.icon.charAt(0).toUpperCase(),
        position: { x: cellX + (cellWidth - 60) / 2, y: cellY + 10 },
        size: { width: 60, height: 60 },
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: color,
        zIndex: 3
      })
    )

    // Label
    elements.push(
      createTextElement({
        id: `${slideId}-icon-${index}-label`,
        content: item.label,
        position: { x: cellX + 10, y: cellY + 80 },
        size: { width: cellWidth - 20, height: 30 },
        fontSize: 16,
        fontWeight: 'semibold',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.dark,
        zIndex: 2
      })
    )

    // Description (if provided)
    if (item.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-icon-${index}-desc`,
          content: item.description,
          position: { x: cellX + 10, y: cellY + 110 },
          size: { width: cellWidth - 20, height: cellHeight - 130 },
          fontSize: 12,
          fontWeight: 'normal',
          textAlign: 'center',
          verticalAlign: 'top',
          color: COLORS.muted,
          zIndex: 2
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

function createRoadmapSlide(slideId: string, content: RoadmapContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 30 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: COLORS.dark,
      zIndex: 1
    })
  )

  // Timeline line
  const timelineY = 350
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-timeline-line`,
      position: { x: 80, y: timelineY - 2 },
      size: { width: SLIDE_WIDTH - 160, height: 4 },
      fill: COLORS.muted,
      borderRadius: 2,
      zIndex: 1
    })
  )

  // Milestones
  const milestones = content.milestones.slice(0, 6)
  const timelineWidth = SLIDE_WIDTH - 200
  const milestoneSpacing = timelineWidth / (milestones.length - 1 || 1)

  milestones.forEach((milestone, index) => {
    const x = 100 + index * milestoneSpacing

    // Status colors
    const statusColors = {
      completed: '#22c55e',
      current: color,
      upcoming: COLORS.muted
    }
    const milestoneColor = statusColors[milestone.status || 'upcoming']

    // Milestone dot
    elements.push(
      createShapeElement('ellipse', {
        id: `${slideId}-milestone-${index}-dot`,
        position: { x: x - 12, y: timelineY - 12 },
        size: { width: 24, height: 24 },
        fill: milestoneColor,
        zIndex: 3
      })
    )

    // Inner dot for current
    if (milestone.status === 'current') {
      elements.push(
        createShapeElement('ellipse', {
          id: `${slideId}-milestone-${index}-inner`,
          position: { x: x - 6, y: timelineY - 6 },
          size: { width: 12, height: 12 },
          fill: '#ffffff',
          zIndex: 4
        })
      )
    }

    // Check mark for completed
    if (milestone.status === 'completed') {
      elements.push(
        createTextElement({
          id: `${slideId}-milestone-${index}-check`,
          content: '✓',
          position: { x: x - 12, y: timelineY - 12 },
          size: { width: 24, height: 24 },
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'center',
          verticalAlign: 'middle',
          color: '#ffffff',
          zIndex: 4
        })
      )
    }

    // Date (above the line)
    elements.push(
      createTextElement({
        id: `${slideId}-milestone-${index}-date`,
        content: milestone.date,
        position: { x: x - 60, y: timelineY - 70 },
        size: { width: 120, height: 30 },
        fontSize: 12,
        fontWeight: 'semibold',
        textAlign: 'center',
        verticalAlign: 'bottom',
        color: milestoneColor,
        zIndex: 2
      })
    )

    // Title (below the line)
    elements.push(
      createTextElement({
        id: `${slideId}-milestone-${index}-title`,
        content: milestone.title,
        position: { x: x - 80, y: timelineY + 30 },
        size: { width: 160, height: 40 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'top',
        color: COLORS.dark,
        zIndex: 2
      })
    )

    // Description (if provided)
    if (milestone.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-milestone-${index}-desc`,
          content: milestone.description,
          position: { x: x - 80, y: timelineY + 70 },
          size: { width: 160, height: 60 },
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'center',
          verticalAlign: 'top',
          color: COLORS.muted,
          lineHeight: 1.4,
          zIndex: 2
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
