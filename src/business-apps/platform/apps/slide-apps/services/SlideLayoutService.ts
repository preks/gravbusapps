/**
 * SlideLayoutService - Professional slide layout templates
 *
 * Defines McKinsey-style slide patterns for enterprise presentations.
 * Each layout has a specific purpose and visual structure.
 */

import type { SlideTheme } from '../components/slideThemes'
import type {
  AnySlideElement,
  SlideData,
  SlideBackground,
  TextElement,
  ShapeElement
} from '../components/slideElements'
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createChartElement,
  createIconElement,
  createLogoElement,
  createFooterElement,
  createBadgeElement,
  createLayerElement,
  createMetricCardElement,
  getBrandedBackground
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
import type { BrandIdentity, LogoPosition, LogoSize, SlidePurpose } from '../types/template'

// Slide dimensions
const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

// Theme detection helpers
function isDarkBrandedTheme(color: string): boolean {
  return color === '#ffffff' || color === '#e91e8c'
}

function getThemeBackground(color: string): SlideBackground {
  if (isDarkBrandedTheme(color)) {
    return getBrandedBackground('newwork-dark') || { type: 'solid', color: '#0a0a0a' }
  }
  return { type: 'solid', color: '#ffffff' }
}

function getThemeColors(color: string) {
  const isDark = isDarkBrandedTheme(color)
  return {
    isDark,
    textColor: isDark ? '#ffffff' : COLORS.dark,
    mutedColor: isDark ? 'rgba(255,255,255,0.6)' : COLORS.muted,
    accentColor: isDark ? '#e91e8c' : color
  }
}

/**
 * Apply theme to individual element - converts colors for dark theme
 */
function applyThemeToElement(element: AnySlideElement, color: string): AnySlideElement {
  const { isDark, textColor, mutedColor } = getThemeColors(color)

  if (!isDark) return element

  if (element.type === 'text') {
    const textEl = element as TextElement
    // Convert dark text to light for dark backgrounds
    if (textEl.color === COLORS.dark || textEl.color === '#1e293b' || textEl.color === '#0f172a') {
      return { ...textEl, color: textColor }
    }
    if (textEl.color === COLORS.muted || textEl.color === '#64748b' || textEl.color === '#475569') {
      return { ...textEl, color: mutedColor }
    }
  }

  if (element.type === 'shape') {
    const shapeEl = element as ShapeElement
    // Convert light shape backgrounds to dark-appropriate styling
    if (shapeEl.fill === '#ffffff' || shapeEl.fill === '#f8fafc' || shapeEl.fill === '#f1f5f9') {
      return {
        ...shapeEl,
        fill: 'rgba(255, 255, 255, 0.05)',
        strokeColor:
          shapeEl.strokeColor === COLORS.border || shapeEl.strokeColor === '#e2e8f0'
            ? 'rgba(255, 255, 255, 0.1)'
            : shapeEl.strokeColor
      }
    }
    // Update border colors for dark theme
    if (shapeEl.strokeColor === COLORS.border || shapeEl.strokeColor === '#e2e8f0') {
      return { ...shapeEl, strokeColor: 'rgba(255, 255, 255, 0.15)' }
    }
  }

  return element
}

/**
 * Apply theme consistently to a slide - post-processes background and all elements
 */
function applyThemeToSlide(
  slide: SlideData,
  color: string,
  options?: { addMasterElements?: boolean; slideIndex?: number; totalSlides?: number }
): SlideData {
  const { isDark } = getThemeColors(color)

  // Light theme - keep slide as-is
  if (!isDark) return slide

  // Apply dark theme background if not already set correctly
  const hasCorrectBackground =
    slide.background?.type === 'branded' || (slide.background?.type === 'solid' && slide.background.color === '#0a0a0a')

  const themedSlide: SlideData = {
    ...slide,
    background: hasCorrectBackground ? slide.background : getThemeBackground(color),
    elements: slide.elements.map(el => applyThemeToElement(el, color))
  }

  // Optionally add master elements (logo, footer)
  if (options?.addMasterElements && options.slideIndex !== undefined && options.totalSlides !== undefined) {
    const withMaster = addMasterElements(themedSlide.elements, options.slideIndex, options.totalSlides, {
      logoPreset: 'newwork-dark',
      showPageNumber: true
    })
    return { ...themedSlide, elements: withMaster }
  }

  return themedSlide
}

// Master elements options
export interface MasterElementOptions {
  showLogo?: boolean
  logoPreset?: 'newwork-dark' | 'newwork-light' | 'newwork-color'
  showPageNumber?: boolean
  confidentialityText?: string
  dateText?: string
}

/**
 * Add master elements (logo, footer) to a slide
 */
export function addMasterElements(
  elements: AnySlideElement[],
  slideIndex: number,
  totalSlides: number,
  options: MasterElementOptions = {}
): AnySlideElement[] {
  const result = [...elements]
  const { showLogo = true, logoPreset = 'newwork-dark', showPageNumber = true, confidentialityText, dateText } = options

  // Add logo to top-right corner
  if (showLogo) {
    result.push(
      createLogoElement(logoPreset, {
        id: `master-logo-${slideIndex}`,
        position: { x: 1100, y: 30 },
        size: { width: 140, height: 45 },
        zIndex: 100
      })
    )
  }

  // Add footer
  if (showPageNumber || confidentialityText || dateText) {
    result.push(
      createFooterElement({
        id: `master-footer-${slideIndex}`,
        pageNumber: slideIndex + 1,
        totalPages: totalSlides,
        showPageNumber,
        confidentialityText,
        dateText,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10
      })
    )
  }

  return result
}

// Logo size configurations
const LOGO_SIZES: Record<LogoSize, { width: number; height: number }> = {
  small: { width: 80, height: 26 },
  medium: { width: 120, height: 40 },
  large: { width: 160, height: 52 }
}

// Logo position configurations for different slide types
type SlideType = 'cover' | 'section' | 'content' | 'closing'

function getLogoPosition(position: LogoPosition, slideType: SlideType, size: LogoSize): { x: number; y: number } {
  const logoSize = LOGO_SIZES[size]
  const margin = slideType === 'cover' ? 60 : 30
  const bottomMargin = slideType === 'cover' ? 80 : 30

  switch (position) {
    case 'top-left':
      return { x: margin, y: margin }
    case 'top-right':
      return { x: SLIDE_WIDTH - logoSize.width - margin, y: margin }
    case 'bottom-left':
      return { x: margin, y: SLIDE_HEIGHT - logoSize.height - bottomMargin }
    case 'bottom-right':
      return { x: SLIDE_WIDTH - logoSize.width - margin, y: SLIDE_HEIGHT - logoSize.height - bottomMargin }
  }
}

/**
 * Determine if a slide background is dark
 */
function isSlideDarkBackground(slide: SlideData): boolean {
  if (!slide.background) return false

  if (slide.background.type === 'branded') {
    return true
  }

  if (slide.background.type === 'solid') {
    const color = slide.background.color.toLowerCase()
    if (color === '#000000' || color === '#0a0a0a' || color === '#1a1a2e' || color === '#0f172a') {
      return true
    }
    // Check for dark colors using hex parsing
    if (color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      return luminance < 0.5
    }
  }

  return false
}

/**
 * Add brand logo to a slide based on brand identity
 */
export function addBrandLogoToSlide(slide: SlideData, branding: BrandIdentity, slideType: SlideType): SlideData {
  if (!branding.logo) return slide

  const isDark = isSlideDarkBackground(slide)
  const logoUrl = isDark ? branding.logo.lightUrl : branding.logo.darkUrl
  const position = getLogoPosition(branding.logo.position, slideType, branding.logo.size)
  const size = LOGO_SIZES[branding.logo.size]

  const logoElement = createImageElement({
    id: `brand-logo-${slide.id}`,
    src: logoUrl,
    position,
    size,
    zIndex: 100,
    fit: 'contain'
  })

  return {
    ...slide,
    elements: [...slide.elements, logoElement]
  }
}

/**
 * Add brand footer to a slide based on brand identity
 */
export function addBrandFooterToSlide(
  slide: SlideData,
  branding: BrandIdentity,
  slideIndex: number,
  totalSlides: number
): SlideData {
  if (!branding.footer?.text) return slide

  const isDark = isSlideDarkBackground(slide)
  const footerColor = isDark
    ? branding.colors?.mutedText || 'rgba(255, 255, 255, 0.5)'
    : branding.colors?.mutedText || 'rgba(0, 0, 0, 0.5)'

  const footerElement = createFooterElement({
    id: `brand-footer-${slide.id}`,
    pageNumber: slideIndex + 1,
    totalPages: totalSlides,
    showPageNumber: true,
    confidentialityText: branding.footer.text,
    color: footerColor,
    fontSize: 10
  })

  return {
    ...slide,
    elements: [...slide.elements, footerElement]
  }
}

/**
 * Apply branding to a single slide (logo + optional footer)
 */
export function applyBrandingToSlide(
  slide: SlideData,
  branding: BrandIdentity,
  slideIndex: number,
  totalSlides: number,
  slideType: SlideType = 'content'
): SlideData {
  let result = slide

  // Add logo
  if (branding.logo) {
    result = addBrandLogoToSlide(result, branding, slideType)
  }

  // Add footer if configured to show on all slides
  if (branding.footer?.showOnAllSlides) {
    result = addBrandFooterToSlide(result, branding, slideIndex, totalSlides)
  }

  return result
}

/**
 * Apply branding to all slides in a presentation
 */
export function applyBrandingToSlides(slides: SlideData[], branding: BrandIdentity): SlideData[] {
  return slides.map((slide, index) => {
    // Determine slide type based on index and layout patterns
    let slideType: SlideType = 'content'
    if (index === 0) {
      slideType = 'cover'
    } else if (index === slides.length - 1) {
      slideType = 'closing'
    } else if (
      slide.elements.length <= 3 &&
      slide.elements.some(
        el => el.type === 'text' && (el as TextElement).fontSize && parseInt((el as TextElement).fontSize || '0') >= 48
      )
    ) {
      slideType = 'section'
    }

    return applyBrandingToSlide(slide, branding, index, slides.length, slideType)
  })
}

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
  | 'feature-grid'
  | 'icon-bullets'
  | 'branded-cover'
  | 'product-grid'
  | 'statement'
  | 'two-panel-features'
  | 'architecture-diagram'
  | 'layered-stack'
  | 'three-column-comparison'
  | 'governance-badges'
  | 'metrics-dashboard'
  | 'module-architecture'
  | 'dual-flow-comparison'
  | 'mobile-showcase'
  | 'numbered-features'

/**
 * Maps layout types to their default slide purposes
 */
export const LAYOUT_PURPOSE_MAP: Record<SlideLayoutType, SlidePurpose> = {
  'title-cover': 'cover',
  'branded-cover': 'cover',
  'section-divider': 'section-divider',
  agenda: 'agenda',
  'executive-summary': 'content',
  'key-metrics': 'data-viz',
  bullets: 'bullets',
  'icon-bullets': 'bullets',
  'two-column': 'two-column',
  'two-panel-features': 'two-column',
  comparison: 'comparison',
  'three-column-comparison': 'comparison',
  'dual-flow-comparison': 'comparison',
  'data-table': 'data-viz',
  timeline: 'timeline',
  roadmap: 'timeline',
  'quadrant-matrix': 'data-viz',
  'bar-chart': 'data-viz',
  'pie-chart': 'data-viz',
  'line-chart': 'data-viz',
  'area-chart': 'data-viz',
  'radar-chart': 'data-viz',
  'metrics-dashboard': 'data-viz',
  'key-takeaway': 'key-point',
  statement: 'key-point',
  'swot-analysis': 'process',
  funnel: 'process',
  pyramid: 'process',
  'process-flow': 'process',
  'architecture-diagram': 'process',
  'layered-stack': 'process',
  'module-architecture': 'process',
  'icon-grid': 'content',
  'feature-grid': 'content',
  'product-grid': 'content',
  'numbered-features': 'content',
  'governance-badges': 'content',
  'image-left': 'image-focus',
  'image-right': 'image-focus',
  'full-image': 'image-focus',
  'mobile-showcase': 'image-focus',
  quote: 'quote',
  'thank-you': 'thank-you'
}

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

export interface FeatureGridContent {
  sectionTitle?: string
  title: string
  subtitle?: string
  features: Array<{
    name: string
    description: string
    icon: string
  }>
  highlights?: string[]
  containerTitle?: string
}

export interface IconBulletsContent {
  title: string
  items: Array<{
    text: string
    icon?: string
  }>
  bulletStyle: 'arrow' | 'check' | 'circle' | 'custom'
}

export interface BrandedCoverContent {
  companyName: string
  tagline?: string
  subtitle?: string
  logoPosition?: 'center' | 'corner'
  backgroundStyle?: 'dark' | 'light' | 'gradient'
}

export interface ProductGridContent {
  title: string
  sectionLabel?: string
  containerTitle?: string
  products: Array<{
    name: string
    description: string
    icon?: string
  }>
  highlights?: string[]
}

export interface StatementContent {
  statement: string
  sectionLabel?: string
  subtitle?: string
  supportingFeatures?: Array<{
    title: string
    description: string
  }>
}

export interface TwoPanelFeaturesContent {
  title: string
  sectionLabel?: string
  subtitle?: string
  leftPanel: {
    containerTitle?: string
    features: Array<{
      name: string
      description: string
      icon?: string
    }>
  }
  rightPanel: {
    title?: string
    highlights: Array<{
      title: string
      description: string
    }>
  }
}

export interface ArchitectureDiagramContent {
  title: string
  sectionLabel?: string
  centralConcept: {
    title: string
    subtitle?: string
  }
  leftConnector?: { label: string }
  rightConnector?: { label: string }
  bottomBar?: { label: string }
  leftBox?: { title: string; items: string[] }
  rightBox?: { title: string; items: string[] }
}

export interface LayeredStackContent {
  title: string
  sectionLabel?: string
  statement?: string
  layers: Array<{
    label: string
    description?: string
    iconName?: string
    color?: string
  }>
  orientation?: 'vertical' | 'horizontal'
}

export interface ThreeColumnComparisonContent {
  title: string
  sectionLabel?: string
  columns: [
    { title: string; subtitle?: string; points: Array<{ text: string; icon?: string }> },
    { title: string; subtitle?: string; points: Array<{ text: string; icon?: string }> },
    { title: string; subtitle?: string; points: Array<{ text: string; icon?: string }> }
  ]
  highlightColumn?: 0 | 1 | 2
  footnote?: string
}

export interface GovernanceBadgesContent {
  title: string
  sectionLabel?: string
  badges: Array<{
    label: string
    iconName: string
    color?: string
  }>
  subtitle?: string
  supportingPoints?: Array<{
    title: string
    description: string
  }>
}

export interface MetricsDashboardContent {
  title: string
  sectionLabel?: string
  metrics: Array<{
    value: string
    label: string
    description: string
    iconName?: string
  }>
  layout?: '2x2' | '1x4' | '3x1' | '2x3'
}

export interface ModuleArchitectureContent {
  title: string
  sectionLabel?: string
  centralModule?: {
    name: string
    subtitle?: string
  }
  topModules?: Array<{ name: string; icon?: string }>
  leftModules?: Array<{ name: string; icon?: string }>
  rightModules?: Array<{ name: string; icon?: string }>
  bottomLabel?: string
}

export interface DualFlowComparisonContent {
  title: string
  sectionLabel?: string
  leftFlow: {
    title: string
    subtitle?: string
    sections: Array<{
      label: string
      items: string[]
      annotation?: string
    }>
  }
  rightFlow: {
    title: string
    subtitle?: string
    sections: Array<{
      label: string
      items: string[]
      annotation?: string
    }>
  }
  footnote?: string
}

export interface MobileShowcaseContent {
  title: string
  sectionLabel?: string
  appName: string
  description: string
  features: Array<{
    title: string
    description?: string
    iconName?: string
  }>
  phonePosition?: 'left' | 'right' | 'center'
  phoneImageKeywords?: string
}

export interface NumberedFeaturesContent {
  title: string
  sectionLabel?: string
  features: Array<{
    number: string | number
    name: string
    description: string
    iconName?: string
  }>
  layout?: '2x2' | '2x3' | '3x2'
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
  | { layout: 'feature-grid'; content: FeatureGridContent }
  | { layout: 'icon-bullets'; content: IconBulletsContent }
  | { layout: 'branded-cover'; content: BrandedCoverContent }
  | { layout: 'product-grid'; content: ProductGridContent }
  | { layout: 'statement'; content: StatementContent }
  | { layout: 'two-panel-features'; content: TwoPanelFeaturesContent }
  | { layout: 'architecture-diagram'; content: ArchitectureDiagramContent }
  | { layout: 'layered-stack'; content: LayeredStackContent }
  | { layout: 'three-column-comparison'; content: ThreeColumnComparisonContent }
  | { layout: 'governance-badges'; content: GovernanceBadgesContent }
  | { layout: 'metrics-dashboard'; content: MetricsDashboardContent }
  | { layout: 'module-architecture'; content: ModuleArchitectureContent }
  | { layout: 'dual-flow-comparison'; content: DualFlowComparisonContent }
  | { layout: 'mobile-showcase'; content: MobileShowcaseContent }
  | { layout: 'numbered-features'; content: NumberedFeaturesContent }

/**
 * Generate a slide from layout type and content
 * Applies theme post-processing to ensure consistent styling across all layouts
 */
export function generateSlideFromLayout(
  layoutContent: SlideLayoutContent,
  slideIndex: number,
  theme?: SlideTheme
): SlideData {
  const slideId = `slide-${Date.now()}-${slideIndex}`
  const primaryColor = theme?.theme.colors.primary || COLORS.primary

  // Create slide using layout-specific function
  let slide: SlideData

  switch (layoutContent.layout) {
    case 'title-cover':
      slide = createTitleCoverSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'section-divider':
      slide = createSectionDividerSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'agenda':
      slide = createAgendaSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'executive-summary':
      slide = createExecutiveSummarySlide(slideId, layoutContent.content, primaryColor)
      break

    case 'key-metrics':
      slide = createKeyMetricsSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'bullets':
      slide = createBulletsSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'two-column':
      slide = createTwoColumnSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'comparison':
      slide = createComparisonSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'data-table':
      slide = createDataTableSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'timeline':
      slide = createTimelineSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'quadrant-matrix':
      slide = createQuadrantMatrixSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'bar-chart':
      slide = createBarChartSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'pie-chart':
      slide = createPieChartSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'line-chart':
      slide = createLineChartSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'area-chart':
      slide = createAreaChartSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'radar-chart':
      slide = createRadarChartSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'swot-analysis':
      slide = createSWOTSlide(slideId, layoutContent.content)
      break

    case 'funnel':
      slide = createFunnelSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'pyramid':
      slide = createPyramidSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'icon-grid':
      slide = createIconGridSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'roadmap':
      slide = createRoadmapSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'process-flow':
      slide = createProcessFlowSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'image-left':
      slide = createImageSideSlide(slideId, layoutContent.content, primaryColor, 'left')
      break

    case 'image-right':
      slide = createImageSideSlide(slideId, layoutContent.content, primaryColor, 'right')
      break

    case 'full-image':
      slide = createFullImageSlide(slideId, layoutContent.content)
      break

    case 'quote':
      slide = createQuoteSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'key-takeaway':
      slide = createKeyTakeawaySlide(slideId, layoutContent.content, primaryColor)
      break

    case 'thank-you':
      slide = createThankYouSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'feature-grid':
      slide = createFeatureGridSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'icon-bullets':
      slide = createIconBulletsSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'branded-cover':
      slide = createBrandedCoverSlide(slideId, layoutContent.content)
      break

    case 'product-grid':
      slide = createProductGridSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'statement':
      slide = createStatementSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'two-panel-features':
      slide = createTwoPanelFeaturesSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'architecture-diagram':
      slide = createArchitectureDiagramSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'layered-stack':
      slide = createLayeredStackSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'three-column-comparison':
      slide = createThreeColumnComparisonSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'governance-badges':
      slide = createGovernanceBadgesSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'metrics-dashboard':
      slide = createMetricsDashboardSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'module-architecture':
      slide = createModuleArchitectureSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'dual-flow-comparison':
      slide = createDualFlowComparisonSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'mobile-showcase':
      slide = createMobileShowcaseSlide(slideId, layoutContent.content, primaryColor)
      break

    case 'numbered-features':
      slide = createNumberedFeaturesSlide(slideId, layoutContent.content, primaryColor)
      break

    default:
      slide = { id: slideId, elements: [], background: { type: 'solid', color: '#ffffff' } }
  }

  // Apply theme post-processing to ensure consistent styling
  return applyThemeToSlide(slide, primaryColor)
}

// Individual layout creators

function createTitleCoverSlide(slideId: string, content: TitleCoverContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, mutedColor, accentColor } = getThemeColors(color)

  // Background accent shape - gradient banner at center for branded look
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent`,
      position: { x: 0, y: isDark ? 180 : 0 },
      size: { width: SLIDE_WIDTH, height: isDark ? 120 : 200 },
      fill: isDark ? 'linear-gradient(90deg, #e91e8c 0%, #f5a623 100%)' : accentColor,
      zIndex: 0
    })
  )

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: isDark ? 195 : 260 },
      size: { width: SLIDE_WIDTH - 160, height: isDark ? 90 : 120 },
      fontSize: isDark ? 48 : 56,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: isDark ? '#ffffff' : COLORS.dark,
      zIndex: 1
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: isDark ? 320 : 390 },
        size: { width: SLIDE_WIDTH - 160, height: 50 },
        fontSize: isDark ? 20 : 24,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'top',
        color: mutedColor,
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
        color: mutedColor,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

function createSectionDividerSlide(slideId: string, content: SectionDividerContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Detect dark/branded theme
  const isDarkTheme = color === '#ffffff' || color === '#e91e8c'
  const textColor = isDarkTheme ? '#ffffff' : COLORS.dark
  const mutedColor = isDarkTheme ? 'rgba(255,255,255,0.6)' : COLORS.muted
  const accentColor = isDarkTheme ? '#e91e8c' : color

  // Accent bar (left side)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-bar`,
      position: { x: 0, y: 0 },
      size: { width: 6, height: SLIDE_HEIGHT },
      fill: accentColor,
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
        color: accentColor,
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
      color: textColor,
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
        color: mutedColor,
        zIndex: 1
      })
    )
  }

  // Use branded dark background for professional look
  const background: SlideBackground = isDarkTheme
    ? getBrandedBackground('newwork-dark') || { type: 'solid', color: '#0a0a0a' }
    : { type: 'solid', color: '#ffffff' }

  return {
    id: slideId,
    elements,
    background
  }
}

function createAgendaSlide(slideId: string, content: AgendaContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Detect dark/branded theme
  const isDarkTheme = color === '#ffffff' || color === '#e91e8c'
  const textColor = isDarkTheme ? '#ffffff' : COLORS.dark
  const mutedColor = isDarkTheme ? 'rgba(255,255,255,0.6)' : COLORS.muted
  const accentColor = isDarkTheme ? '#e91e8c' : color

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
      color: textColor,
      zIndex: 1
    })
  )

  // Divider
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-divider`,
      position: { x: 80, y: 130 },
      size: { width: 100, height: 4 },
      fill: accentColor,
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
        fill: accentColor,
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
        color: isDarkTheme ? '#0a0a0a' : '#ffffff',
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
        color: textColor,
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
          color: mutedColor,
          zIndex: 1
        })
      )
    }
  })

  // Use branded dark background for professional look
  const background: SlideBackground = isDarkTheme
    ? getBrandedBackground('newwork-dark') || { type: 'solid', color: '#0a0a0a' }
    : { type: 'solid', color: '#ffffff' }

  return {
    id: slideId,
    elements,
    background
  }
}

function createExecutiveSummarySlide(slideId: string, content: ExecutiveSummaryContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, accentColor } = getThemeColors(color)

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
      color: textColor,
      zIndex: 1
    })
  )

  // Key message box
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-message-bg`,
      position: { x: 80, y: 110 },
      size: { width: SLIDE_WIDTH - 160, height: 100 },
      fill: isDark ? 'rgba(233, 30, 140, 0.15)' : `${accentColor}15`,
      strokeColor: accentColor,
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
      color: textColor,
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
        color: accentColor,
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
        color: textColor,
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
        color: textColor,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

function createKeyMetricsSlide(slideId: string, content: KeyMetricsContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, accentColor } = getThemeColors(color)

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: accentColor,
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
      color: textColor,
      zIndex: 1
    })
  )

  // Metrics row
  const metricElements = createMetricRow({
    metrics: content.metrics,
    position: { x: 80, y: 180 },
    source: content.source,
    zIndex: 2,
    isDark
  })
  elements.push(...metricElements)

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

function createBulletsSlide(slideId: string, content: BulletsContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { textColor, mutedColor, accentColor } = getThemeColors(color)

  // Accent line (use theme color)
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent-line`,
      position: { x: 80, y: 125 },
      size: { width: 160, height: 6 },
      fill: accentColor,
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
      color: textColor,
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
      color: textColor,
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
        color: mutedColor,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
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

function createFeatureGridSlide(slideId: string, content: FeatureGridContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Use dark theme colors (professional style)
  const isDarkTheme = color === '#ffffff' || color === '#e91e8c'
  const textColor = isDarkTheme ? '#ffffff' : COLORS.dark
  const mutedColor = isDarkTheme ? 'rgba(255,255,255,0.7)' : COLORS.muted
  const accentColor = isDarkTheme ? '#e91e8c' : color

  // Section title (small text above main title)
  if (content.sectionTitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionTitle,
        position: { x: 80, y: 30 },
        size: { width: 400, height: 30 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Main title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 2
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: 115 },
        size: { width: SLIDE_WIDTH - 400, height: 30 },
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Container box for features - full width for professional look
  const containerX = 80
  const containerY = 180
  const containerWidth = SLIDE_WIDTH - 160
  const containerHeight = 440

  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-container`,
      position: { x: containerX, y: containerY },
      size: { width: containerWidth, height: containerHeight },
      fill: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      strokeColor: isDarkTheme ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      strokeWidth: 1,
      cornerRadius: 16,
      zIndex: 1
    })
  )

  // Container title bar
  if (content.containerTitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-container-title`,
        content: content.containerTitle,
        position: { x: containerX + 30, y: containerY + 20 },
        size: { width: containerWidth - 60, height: 30 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )
  }

  // Feature grid (2 columns)
  const features = content.features.slice(0, 6)
  const gridStartY = containerY + (content.containerTitle ? 70 : 40)
  const colWidth = (containerWidth - 100) / 2
  const rowHeight = features.length <= 4 ? 90 : 75

  features.forEach((feature, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = containerX + 30 + col * (colWidth + 40)
    const y = gridStartY + row * rowHeight

    // Icon circle background
    elements.push(
      createShapeElement('ellipse', {
        id: `${slideId}-feature-${index}-icon-bg`,
        position: { x, y },
        size: { width: 40, height: 40 },
        fill: isDarkTheme ? 'rgba(233, 30, 140, 0.15)' : `${accentColor}15`,
        zIndex: 2
      })
    )

    // Icon
    elements.push(
      createIconElement(feature.icon || 'check-circle', {
        id: `${slideId}-feature-${index}-icon`,
        position: { x: x + 8, y: y + 8 },
        size: { width: 24, height: 24 },
        color: accentColor,
        zIndex: 3
      })
    )

    // Feature name
    elements.push(
      createTextElement({
        id: `${slideId}-feature-${index}-name`,
        content: feature.name,
        position: { x: x + 50, y },
        size: { width: colWidth - 60, height: 24 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )

    // Feature description
    if (feature.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-feature-${index}-desc`,
          content: feature.description,
          position: { x: x + 50, y: y + 26 },
          size: { width: colWidth - 60, height: 50 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: mutedColor,
          lineHeight: 1.4,
          zIndex: 2
        })
      )
    }
  })

  // Use branded dark background for professional look
  const background: SlideBackground = isDarkTheme
    ? getBrandedBackground('newwork-dark') || {
        type: 'gradient',
        gradient: {
          type: 'radial',
          angle: 0,
          stops: [
            { color: '#1a1a2e', position: 0 },
            { color: '#0a0a0a', position: 100 }
          ]
        }
      }
    : { type: 'solid', color: '#ffffff' }

  return {
    id: slideId,
    elements,
    background
  }
}

function createIconBulletsSlide(slideId: string, content: IconBulletsContent, color: string): SlideData {
  const elements: AnySlideElement[] = []

  // Use dark theme for professional style
  const isDarkTheme = color === '#ffffff' || color === '#e91e8c'
  const textColor = isDarkTheme ? '#ffffff' : COLORS.dark
  const accentColor = isDarkTheme ? '#e91e8c' : color

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 50 },
      size: { width: SLIDE_WIDTH - 160, height: 70 },
      fontSize: 44,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 2
    })
  )

  // Accent line under title
  elements.push(
    createShapeElement('rectangle', {
      id: `${slideId}-accent`,
      position: { x: 80, y: 125 },
      size: { width: 200, height: 4 },
      fill: accentColor,
      zIndex: 1
    })
  )

  // Bullet items with icons
  const startY = 160
  const itemHeight = 80
  const bulletMarkers: Record<string, string> = {
    arrow: '→',
    check: '✓',
    circle: '●',
    custom: '◆'
  }
  const marker = bulletMarkers[content.bulletStyle] || '→'

  content.items.forEach((item, index) => {
    const y = startY + index * itemHeight

    if (item.icon) {
      // Icon circle background
      elements.push(
        createShapeElement('ellipse', {
          id: `${slideId}-bullet-${index}-icon-bg`,
          position: { x: 80, y: y + 6 },
          size: { width: 36, height: 36 },
          fill: isDarkTheme ? 'rgba(233, 30, 140, 0.15)' : `${accentColor}15`,
          zIndex: 1
        })
      )
      // Use icon if provided
      elements.push(
        createIconElement(item.icon, {
          id: `${slideId}-bullet-${index}-icon`,
          position: { x: 86, y: y + 12 },
          size: { width: 24, height: 24 },
          color: accentColor,
          zIndex: 2
        })
      )
    } else {
      // Use text marker
      elements.push(
        createTextElement({
          id: `${slideId}-bullet-${index}-marker`,
          content: marker,
          position: { x: 80, y },
          size: { width: 40, height: 48 },
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: accentColor,
          zIndex: 2
        })
      )
    }

    // Bullet text
    elements.push(
      createTextElement({
        id: `${slideId}-bullet-${index}-text`,
        content: item.text,
        position: { x: 130, y },
        size: { width: SLIDE_WIDTH - 210, height: 48 },
        fontSize: 22,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        lineHeight: 1.4,
        zIndex: 2
      })
    )
  })

  // Use branded dark background for professional look
  const background: SlideBackground = isDarkTheme
    ? getBrandedBackground('newwork-dark') || {
        type: 'gradient',
        gradient: {
          type: 'radial',
          angle: 0,
          stops: [
            { color: '#1a1a2e', position: 0 },
            { color: '#0a0a0a', position: 100 }
          ]
        }
      }
    : { type: 'solid', color: '#ffffff' }

  return {
    id: slideId,
    elements,
    background
  }
}

function createBrandedCoverSlide(slideId: string, content: BrandedCoverContent): SlideData {
  const elements: AnySlideElement[] = []
  const isDark = content.backgroundStyle === 'dark' || content.backgroundStyle === 'gradient'
  const textColor = isDark ? '#ffffff' : COLORS.dark
  const mutedColor = isDark ? 'rgba(255,255,255,0.7)' : COLORS.muted

  // Company name with gradient effect
  elements.push(
    createTextElement({
      id: `${slideId}-company`,
      content: content.companyName,
      position: { x: 80, y: 280 },
      size: { width: SLIDE_WIDTH - 160, height: 100 },
      fontSize: 72,
      fontWeight: 'bold',
      textAlign: content.logoPosition === 'center' ? 'center' : 'left',
      verticalAlign: 'middle',
      color: textColor,
      gradient: {
        type: 'linear',
        angle: 90,
        stops: [
          { color: '#e91e8c', position: 0 },
          { color: '#f5a623', position: 100 }
        ]
      },
      zIndex: 2
    })
  )

  // Tagline
  if (content.tagline) {
    elements.push(
      createTextElement({
        id: `${slideId}-tagline`,
        content: content.tagline,
        position: { x: 80, y: 390 },
        size: { width: SLIDE_WIDTH - 160, height: 40 },
        fontSize: 20,
        fontWeight: 'normal',
        textAlign: content.logoPosition === 'center' ? 'center' : 'left',
        verticalAlign: 'top',
        color: mutedColor,
        letterSpacing: 4,
        zIndex: 2
      })
    )
  }

  // Subtitle (below tagline)
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: 450 },
        size: { width: SLIDE_WIDTH - 160, height: 60 },
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: content.logoPosition === 'center' ? 'center' : 'left',
        verticalAlign: 'top',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Get branded background or create dark gradient
  let background: SlideBackground
  if (isDark) {
    background = getBrandedBackground('newwork-dark') || {
      type: 'gradient',
      gradient: {
        type: 'radial',
        angle: 0,
        stops: [
          { color: '#1a1a2e', position: 0 },
          { color: '#0a0a0a', position: 100 }
        ]
      },
      overlay: {
        type: 'radial',
        angle: 135,
        stops: [
          { color: 'rgba(59, 130, 246, 0.15)', position: 0 },
          { color: 'transparent', position: 70 }
        ]
      }
    }
  } else {
    background = { type: 'solid', color: '#ffffff' }
  }

  return {
    id: slideId,
    elements,
    background
  }
}

function createProductGridSlide(slideId: string, content: ProductGridContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section-label`,
        content: content.sectionLabel,
        position: { x: 80, y: 35 },
        size: { width: 400, height: 24 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Main title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 55 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 2
    })
  )

  // Left panel - Product grid container
  const containerX = 80
  const containerY = 140
  const containerWidth = 540
  const containerHeight = 500

  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-container`,
      position: { x: containerX, y: containerY },
      size: { width: containerWidth, height: containerHeight },
      fill: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
      strokeColor: isDark ? 'rgba(255, 255, 255, 0.15)' : COLORS.border,
      strokeWidth: 1,
      cornerRadius: 16,
      zIndex: 1
    })
  )

  // Container title
  if (content.containerTitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-container-title`,
        content: content.containerTitle,
        position: { x: containerX + 20, y: containerY + 15 },
        size: { width: containerWidth - 40, height: 40 },
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )
  }

  // Products in 2x3 grid
  const products = content.products.slice(0, 6)
  const gridStartY = containerY + (content.containerTitle ? 70 : 30)
  const colWidth = (containerWidth - 60) / 2
  const rowHeight = 130

  products.forEach((product, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = containerX + 20 + col * (colWidth + 20)
    const y = gridStartY + row * rowHeight

    // Product name
    elements.push(
      createTextElement({
        id: `${slideId}-product-${index}-name`,
        content: product.name,
        position: { x, y },
        size: { width: colWidth, height: 28 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )

    // Icon if provided
    if (product.icon) {
      elements.push(
        createIconElement(product.icon, {
          id: `${slideId}-product-${index}-icon`,
          position: { x, y: y + 32 },
          size: { width: 24, height: 24 },
          color: accentColor,
          zIndex: 2
        })
      )
    }

    // Product description
    elements.push(
      createTextElement({
        id: `${slideId}-product-${index}-desc`,
        content: product.description,
        position: { x: product.icon ? x + 32 : x, y: y + 30 },
        size: { width: product.icon ? colWidth - 40 : colWidth, height: 70 },
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: mutedColor,
        lineHeight: 1.4,
        zIndex: 2
      })
    )
  })

  // Right panel - Highlights
  if (content.highlights && content.highlights.length > 0) {
    const highlightX = 680
    const highlightStartY = 200

    content.highlights.forEach((highlight, index) => {
      // Arrow marker
      elements.push(
        createTextElement({
          id: `${slideId}-highlight-${index}-marker`,
          content: '→',
          position: { x: highlightX, y: highlightStartY + index * 50 },
          size: { width: 30, height: 30 },
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: accentColor,
          zIndex: 2
        })
      )

      // Highlight text
      elements.push(
        createTextElement({
          id: `${slideId}-highlight-${index}-text`,
          content: highlight,
          position: { x: highlightX + 40, y: highlightStartY + index * 50 },
          size: { width: 480, height: 30 },
          fontSize: 18,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: textColor,
          zIndex: 2
        })
      )
    })
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

function createStatementSlide(slideId: string, content: StatementContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { textColor, mutedColor, accentColor } = getThemeColors(color)

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section-label`,
        content: content.sectionLabel,
        position: { x: 80, y: 40 },
        size: { width: 400, height: 24 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Large statement text
  elements.push(
    createTextElement({
      id: `${slideId}-statement`,
      content: content.statement,
      position: { x: 80, y: 80 },
      size: { width: SLIDE_WIDTH - 250, height: 200 },
      fontSize: 36,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: textColor,
      lineHeight: 1.3,
      zIndex: 2
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: 310 },
        size: { width: 500, height: 40 },
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )
  }

  // Supporting features
  if (content.supportingFeatures && content.supportingFeatures.length > 0) {
    const featuresStartY = content.subtitle ? 370 : 340
    const featureHeight = 70

    content.supportingFeatures.forEach((feature, index) => {
      const y = featuresStartY + index * featureHeight

      // Feature title
      elements.push(
        createTextElement({
          id: `${slideId}-feature-${index}-title`,
          content: feature.title,
          position: { x: 80, y },
          size: { width: SLIDE_WIDTH - 160, height: 28 },
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: accentColor,
          zIndex: 2
        })
      )

      // Feature description
      elements.push(
        createTextElement({
          id: `${slideId}-feature-${index}-desc`,
          content: feature.description,
          position: { x: 80, y: y + 28 },
          size: { width: SLIDE_WIDTH - 160, height: 36 },
          fontSize: 14,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: mutedColor,
          zIndex: 2
        })
      )
    })
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

function createTwoPanelFeaturesSlide(slideId: string, content: TwoPanelFeaturesContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section-label`,
        content: content.sectionLabel,
        position: { x: 80, y: 35 },
        size: { width: 400, height: 24 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Main title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 55 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 2
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: 115 },
        size: { width: SLIDE_WIDTH - 300, height: 30 },
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Left panel - Feature container
  const containerX = 80
  const containerY = 160
  const containerWidth = 540
  const containerHeight = 480

  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-left-container`,
      position: { x: containerX, y: containerY },
      size: { width: containerWidth, height: containerHeight },
      fill: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
      strokeColor: isDark ? 'rgba(255, 255, 255, 0.15)' : COLORS.border,
      strokeWidth: 1,
      cornerRadius: 16,
      zIndex: 1
    })
  )

  // Container title
  if (content.leftPanel.containerTitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-container-title`,
        content: content.leftPanel.containerTitle,
        position: { x: containerX + 20, y: containerY + 15 },
        size: { width: containerWidth - 40, height: 35 },
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )
  }

  // Features in 2x3 grid
  const features = content.leftPanel.features.slice(0, 6)
  const gridStartY = containerY + (content.leftPanel.containerTitle ? 65 : 30)
  const colWidth = (containerWidth - 60) / 2
  const rowHeight = features.length <= 4 ? 110 : 90

  features.forEach((feature, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = containerX + 20 + col * (colWidth + 20)
    const y = gridStartY + row * rowHeight

    // Icon background
    if (feature.icon) {
      elements.push(
        createShapeElement('ellipse', {
          id: `${slideId}-feature-${index}-icon-bg`,
          position: { x, y },
          size: { width: 36, height: 36 },
          fill: 'rgba(233, 30, 140, 0.15)',
          zIndex: 2
        })
      )

      elements.push(
        createIconElement(feature.icon, {
          id: `${slideId}-feature-${index}-icon`,
          position: { x: x + 6, y: y + 6 },
          size: { width: 24, height: 24 },
          color: accentColor,
          zIndex: 3
        })
      )
    }

    // Feature name
    elements.push(
      createTextElement({
        id: `${slideId}-feature-${index}-name`,
        content: feature.name,
        position: { x: feature.icon ? x + 44 : x, y },
        size: { width: colWidth - (feature.icon ? 50 : 0), height: 24 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )

    // Feature description
    if (feature.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-feature-${index}-desc`,
          content: feature.description,
          position: { x: feature.icon ? x + 44 : x, y: y + 26 },
          size: { width: colWidth - (feature.icon ? 50 : 0), height: 50 },
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: mutedColor,
          lineHeight: 1.3,
          zIndex: 2
        })
      )
    }
  })

  // Right panel - Highlights
  const rightX = 680
  const rightY = 180

  if (content.rightPanel.title) {
    elements.push(
      createTextElement({
        id: `${slideId}-right-title`,
        content: content.rightPanel.title,
        position: { x: rightX, y: rightY - 30 },
        size: { width: 500, height: 30 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )
  }

  content.rightPanel.highlights.forEach((highlight, index) => {
    const y = rightY + index * 80

    // Highlight title
    elements.push(
      createTextElement({
        id: `${slideId}-highlight-${index}-title`,
        content: highlight.title,
        position: { x: rightX, y },
        size: { width: 500, height: 28 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        zIndex: 2
      })
    )

    // Highlight description
    elements.push(
      createTextElement({
        id: `${slideId}-highlight-${index}-desc`,
        content: highlight.description,
        position: { x: rightX, y: y + 28 },
        size: { width: 500, height: 40 },
        fontSize: 13,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: mutedColor,
        lineHeight: 1.3,
        zIndex: 2
      })
    )
  })

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

function createArchitectureDiagramSlide(
  slideId: string,
  content: ArchitectureDiagramContent,
  color: string
): SlideData {
  const elements: AnySlideElement[] = []
  const { textColor, mutedColor } = getThemeColors(color)

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section-label`,
        content: content.sectionLabel,
        position: { x: 80, y: 35 },
        size: { width: 400, height: 24 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Main title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: 55 },
      size: { width: SLIDE_WIDTH - 160, height: 60 },
      fontSize: 40,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 2
    })
  )

  // Central concept bubble
  const centerX = SLIDE_WIDTH / 2 - 200
  const centerY = 200
  const bubbleWidth = 400
  const bubbleHeight = 100

  // Central bubble background with gradient
  elements.push(
    createShapeElement('rounded-rectangle', {
      id: `${slideId}-central-bubble`,
      position: { x: centerX, y: centerY },
      size: { width: bubbleWidth, height: bubbleHeight },
      fill: 'transparent',
      strokeColor: 'rgba(59, 130, 246, 0.5)',
      strokeWidth: 2,
      cornerRadius: 50,
      gradient: {
        type: 'linear',
        angle: 90,
        stops: [
          { color: 'rgba(59, 130, 246, 0.3)', position: 0 },
          { color: 'rgba(139, 92, 246, 0.2)', position: 100 }
        ]
      },
      zIndex: 2
    })
  )

  // Central concept title
  elements.push(
    createTextElement({
      id: `${slideId}-central-title`,
      content: content.centralConcept.title,
      position: { x: centerX + 20, y: centerY + 20 },
      size: { width: bubbleWidth - 40, height: 36 },
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 3
    })
  )

  // Central concept subtitle
  if (content.centralConcept.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-central-subtitle`,
        content: content.centralConcept.subtitle,
        position: { x: centerX + 20, y: centerY + 55 },
        size: { width: bubbleWidth - 40, height: 24 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 3
      })
    )
  }

  // Left connector
  if (content.leftConnector) {
    elements.push(
      createTextElement({
        id: `${slideId}-left-connector`,
        content: `← ${content.leftConnector.label}`,
        position: { x: 80, y: centerY + 35 },
        size: { width: 200, height: 30 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Right connector
  if (content.rightConnector) {
    elements.push(
      createTextElement({
        id: `${slideId}-right-connector`,
        content: `${content.rightConnector.label} →`,
        position: { x: SLIDE_WIDTH - 280, y: centerY + 35 },
        size: { width: 200, height: 30 },
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'right',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 2
      })
    )
  }

  // Left box
  if (content.leftBox) {
    const boxX = 80
    const boxY = 350

    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-left-box`,
        position: { x: boxX, y: boxY },
        size: { width: 280, height: 200 },
        fill: 'rgba(233, 30, 140, 0.1)',
        strokeColor: 'rgba(233, 30, 140, 0.3)',
        strokeWidth: 1,
        cornerRadius: 12,
        zIndex: 1
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-left-box-title`,
        content: content.leftBox.title,
        position: { x: boxX + 15, y: boxY + 15 },
        size: { width: 250, height: 30 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )

    content.leftBox.items.forEach((item, index) => {
      elements.push(
        createTextElement({
          id: `${slideId}-left-box-item-${index}`,
          content: item,
          position: { x: boxX + 15, y: boxY + 50 + index * 26 },
          size: { width: 250, height: 24 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: mutedColor,
          zIndex: 2
        })
      )
    })
  }

  // Right box
  if (content.rightBox) {
    const boxX = SLIDE_WIDTH - 360
    const boxY = 350

    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-right-box`,
        position: { x: boxX, y: boxY },
        size: { width: 280, height: 200 },
        fill: 'rgba(59, 130, 246, 0.1)',
        strokeColor: 'rgba(59, 130, 246, 0.3)',
        strokeWidth: 1,
        cornerRadius: 12,
        zIndex: 1
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-right-box-title`,
        content: content.rightBox.title,
        position: { x: boxX + 15, y: boxY + 15 },
        size: { width: 250, height: 30 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )

    content.rightBox.items.forEach((item, index) => {
      elements.push(
        createTextElement({
          id: `${slideId}-right-box-item-${index}`,
          content: item,
          position: { x: boxX + 15, y: boxY + 50 + index * 26 },
          size: { width: 250, height: 24 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: mutedColor,
          zIndex: 2
        })
      )
    })
  }

  // Bottom bar
  if (content.bottomBar) {
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-bottom-bar`,
        position: { x: 80, y: 600 },
        size: { width: SLIDE_WIDTH - 160, height: 50 },
        fill: 'rgba(59, 130, 246, 0.15)',
        strokeColor: 'rgba(59, 130, 246, 0.3)',
        strokeWidth: 1,
        cornerRadius: 8,
        zIndex: 1
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-bottom-bar-label`,
        content: content.bottomBar.label,
        position: { x: 80, y: 600 },
        size: { width: SLIDE_WIDTH - 160, height: 50 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 2
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Layered Stack Layout - for architectural layer visualizations
function createLayeredStackSlide(slideId: string, content: LayeredStackContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { textColor, accentColor } = getThemeColors(color)

  const layerColors = ['#e91e8c', '#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b']
  const layerCount = content.layers.length
  const orientation = content.orientation || 'vertical'

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 50 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 80 : 60 },
      size: { width: content.statement ? 500 : SLIDE_WIDTH - 160, height: 50 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  if (orientation === 'vertical') {
    const stackX = 80
    const stackY = 160
    const layerHeight = 70
    const layerWidth = content.statement ? 450 : 600
    const gap = 8

    content.layers.forEach((layer, index) => {
      const layerColor = layer.color || layerColors[index % layerColors.length]

      elements.push(
        createLayerElement(layer.label, {
          id: `${slideId}-layer-${index}`,
          position: { x: stackX, y: stackY + (layerHeight + gap) * index },
          size: { width: layerWidth, height: layerHeight },
          backgroundColor: layerColor,
          textColor: '#ffffff',
          borderColor: 'transparent',
          borderRadius: 8,
          depth: 4,
          iconName: layer.iconName,
          description: layer.description,
          labelFontSize: 18,
          descriptionFontSize: 12,
          zIndex: layerCount - index
        })
      )
    })

    // Statement on the right
    if (content.statement) {
      elements.push(
        createTextElement({
          id: `${slideId}-statement`,
          content: content.statement,
          position: { x: 600, y: 200 },
          size: { width: 580, height: 300 },
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'top',
          color: textColor,
          lineHeight: 1.5,
          zIndex: 1
        })
      )
    }
  } else {
    const stackY = 250
    const layerWidth = Math.min(180, (SLIDE_WIDTH - 200) / layerCount)
    const gap = 16
    const totalWidth = (layerWidth + gap) * layerCount - gap
    const startX = (SLIDE_WIDTH - totalWidth) / 2

    content.layers.forEach((layer, index) => {
      const layerColor = layer.color || layerColors[index % layerColors.length]

      elements.push(
        createLayerElement(layer.label, {
          id: `${slideId}-layer-${index}`,
          position: { x: startX + (layerWidth + gap) * index, y: stackY },
          size: { width: layerWidth, height: 200 },
          backgroundColor: layerColor,
          textColor: '#ffffff',
          borderColor: 'transparent',
          borderRadius: 12,
          depth: 4,
          iconName: layer.iconName,
          description: layer.description,
          labelFontSize: 16,
          descriptionFontSize: 11,
          zIndex: 1
        })
      )
    })
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Three-Column Comparison Layout
function createThreeColumnComparisonSlide(
  slideId: string,
  content: ThreeColumnComparisonContent,
  color: string
): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  const columnWidth = 360
  const columnGap = 30
  const totalWidth = columnWidth * 3 + columnGap * 2
  const startX = (SLIDE_WIDTH - totalWidth) / 2

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 40 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 65 : 50 },
      size: { width: SLIDE_WIDTH - 160, height: 50 },
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  // Columns
  content.columns.forEach((column, colIndex) => {
    const colX = startX + (columnWidth + columnGap) * colIndex
    const colY = 130
    const isHighlighted = content.highlightColumn === colIndex

    // Column container
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-col-bg-${colIndex}`,
        position: { x: colX, y: colY },
        size: { width: columnWidth, height: 500 },
        fill: isHighlighted ? 'rgba(233, 30, 140, 0.1)' : isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
        strokeColor: isHighlighted ? 'rgba(233, 30, 140, 0.3)' : isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
        strokeWidth: isHighlighted ? 2 : 1,
        cornerRadius: 12,
        zIndex: 0
      })
    )

    // Column title
    elements.push(
      createTextElement({
        id: `${slideId}-col-title-${colIndex}`,
        content: column.title,
        position: { x: colX + 20, y: colY + 20 },
        size: { width: columnWidth - 40, height: 30 },
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: isHighlighted ? accentColor : textColor,
        zIndex: 1
      })
    )

    // Column subtitle
    if (column.subtitle) {
      elements.push(
        createTextElement({
          id: `${slideId}-col-subtitle-${colIndex}`,
          content: column.subtitle,
          position: { x: colX + 20, y: colY + 52 },
          size: { width: columnWidth - 40, height: 24 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: mutedColor,
          zIndex: 1
        })
      )
    }

    // Points
    const pointStartY = column.subtitle ? colY + 90 : colY + 65
    column.points.forEach((point, pointIndex) => {
      elements.push(
        createTextElement({
          id: `${slideId}-col-${colIndex}-point-${pointIndex}`,
          content: `• ${point.text}`,
          position: { x: colX + 20, y: pointStartY + pointIndex * 50 },
          size: { width: columnWidth - 40, height: 45 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: textColor,
          lineHeight: 1.4,
          zIndex: 1
        })
      )
    })
  })

  // Footnote
  if (content.footnote) {
    elements.push(
      createTextElement({
        id: `${slideId}-footnote`,
        content: content.footnote,
        position: { x: 80, y: 660 },
        size: { width: SLIDE_WIDTH - 160, height: 30 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: accentColor,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Governance Badges Layout
function createGovernanceBadgesSlide(slideId: string, content: GovernanceBadgesContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { textColor, mutedColor, accentColor } = getThemeColors(color)

  const badgeCount = content.badges.length
  const badgeWidth = 140
  const badgeHeight = 80
  const badgeGap = 24
  const totalBadgeWidth = badgeWidth * badgeCount + badgeGap * (badgeCount - 1)
  const badgeStartX = (SLIDE_WIDTH - totalBadgeWidth) / 2

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 50 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 85 : 70 },
      size: { width: SLIDE_WIDTH - 160, height: 50 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  // Subtitle
  if (content.subtitle) {
    elements.push(
      createTextElement({
        id: `${slideId}-subtitle`,
        content: content.subtitle,
        position: { x: 80, y: content.sectionLabel ? 140 : 125 },
        size: { width: SLIDE_WIDTH - 160, height: 30 },
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: mutedColor,
        zIndex: 1
      })
    )
  }

  // Badges
  const badgeY = content.subtitle ? 200 : 180
  content.badges.forEach((badge, index) => {
    const badgeX = badgeStartX + (badgeWidth + badgeGap) * index
    const badgeColor = badge.color || accentColor

    elements.push(
      createBadgeElement(badge.label, {
        id: `${slideId}-badge-${index}`,
        position: { x: badgeX, y: badgeY },
        size: { width: badgeWidth, height: badgeHeight },
        backgroundColor: badgeColor,
        textColor: '#ffffff',
        borderRadius: 12,
        fontSize: 14,
        iconSize: 24,
        iconName: badge.iconName,
        variant: 'filled',
        zIndex: 1
      })
    )
  })

  // Supporting points
  if (content.supportingPoints && content.supportingPoints.length > 0) {
    const pointsStartY = badgeY + badgeHeight + 60
    const pointWidth = (SLIDE_WIDTH - 200) / Math.min(content.supportingPoints.length, 2)

    content.supportingPoints.forEach((point, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const pointX = 100 + col * pointWidth
      const pointY = pointsStartY + row * 100

      elements.push(
        createTextElement({
          id: `${slideId}-point-title-${index}`,
          content: point.title,
          position: { x: pointX, y: pointY },
          size: { width: pointWidth - 40, height: 28 },
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: textColor,
          zIndex: 1
        })
      )

      elements.push(
        createTextElement({
          id: `${slideId}-point-desc-${index}`,
          content: point.description,
          position: { x: pointX, y: pointY + 30 },
          size: { width: pointWidth - 40, height: 50 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: mutedColor,
          lineHeight: 1.4,
          zIndex: 1
        })
      )
    })
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Metrics Dashboard Layout
function createMetricsDashboardSlide(slideId: string, content: MetricsDashboardContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  const layout = content.layout || '2x2'
  let cols = 2
  let rows = 2

  switch (layout) {
    case '1x4':
      cols = 4
      rows = 1
      break
    case '3x1':
      cols = 3
      rows = 1
      break
    case '2x3':
      cols = 2
      rows = 3
      break
    default:
      cols = 2
      rows = 2
  }

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 50 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 80 : 60 },
      size: { width: SLIDE_WIDTH - 160, height: 50 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  // Metric cards
  const cardGap = 24
  const contentStartY = 160
  const availableWidth = SLIDE_WIDTH - 160
  const availableHeight = SLIDE_HEIGHT - contentStartY - 80
  const cardWidth = (availableWidth - cardGap * (cols - 1)) / cols
  const cardHeight = rows === 1 ? Math.min(300, availableHeight) : (availableHeight - cardGap * (rows - 1)) / rows

  content.metrics.slice(0, cols * rows).forEach((metric, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const cardX = 80 + col * (cardWidth + cardGap)
    const cardY = contentStartY + row * (cardHeight + cardGap)

    elements.push(
      createMetricCardElement(metric.value, metric.label, {
        id: `${slideId}-metric-${index}`,
        position: { x: cardX, y: cardY },
        size: { width: cardWidth, height: cardHeight },
        description: metric.description,
        iconName: metric.iconName,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
        valueColor: accentColor,
        labelColor: textColor,
        descriptionColor: mutedColor,
        borderRadius: 16,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
        borderWidth: 1,
        valueFontSize: cardHeight > 200 ? 48 : 36,
        labelFontSize: 18,
        descriptionFontSize: 13,
        zIndex: 1
      })
    )
  })

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Module Architecture Layout
function createModuleArchitectureSlide(slideId: string, content: ModuleArchitectureContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, accentColor } = getThemeColors(color)

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 40 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 70 : 50 },
      size: { width: SLIDE_WIDTH - 160, height: 40 },
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  const centerX = SLIDE_WIDTH / 2
  const centerY = 360

  // Central module
  if (content.centralModule) {
    const moduleWidth = 280
    const moduleHeight = 120

    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-central-bg`,
        position: { x: centerX - moduleWidth / 2, y: centerY - moduleHeight / 2 },
        size: { width: moduleWidth, height: moduleHeight },
        fill: accentColor,
        strokeColor: 'transparent',
        cornerRadius: 16,
        shadow: true,
        zIndex: 2
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-central-name`,
        content: content.centralModule.name,
        position: { x: centerX - moduleWidth / 2, y: centerY - 20 },
        size: { width: moduleWidth, height: 40 },
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: '#ffffff',
        zIndex: 3
      })
    )

    if (content.centralModule.subtitle) {
      elements.push(
        createTextElement({
          id: `${slideId}-central-subtitle`,
          content: content.centralModule.subtitle,
          position: { x: centerX - moduleWidth / 2, y: centerY + 20 },
          size: { width: moduleWidth, height: 24 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'center',
          verticalAlign: 'middle',
          color: 'rgba(255, 255, 255, 0.8)',
          zIndex: 3
        })
      )
    }
  }

  // Top modules
  if (content.topModules && content.topModules.length > 0) {
    const moduleWidth = 150
    const moduleHeight = 60
    const gap = 16
    const totalWidth = moduleWidth * content.topModules.length + gap * (content.topModules.length - 1)
    const startX = centerX - totalWidth / 2

    content.topModules.forEach((mod, index) => {
      const modX = startX + (moduleWidth + gap) * index

      elements.push(
        createShapeElement('rounded-rectangle', {
          id: `${slideId}-top-mod-${index}`,
          position: { x: modX, y: 140 },
          size: { width: moduleWidth, height: moduleHeight },
          fill: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
          strokeColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#93c5fd',
          strokeWidth: 1,
          cornerRadius: 10,
          zIndex: 1
        })
      )

      elements.push(
        createTextElement({
          id: `${slideId}-top-mod-name-${index}`,
          content: mod.name,
          position: { x: modX, y: 140 },
          size: { width: moduleWidth, height: moduleHeight },
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'center',
          verticalAlign: 'middle',
          color: isDark ? '#93c5fd' : '#1d4ed8',
          zIndex: 2
        })
      )
    })
  }

  // Left modules
  if (content.leftModules && content.leftModules.length > 0) {
    const moduleWidth = 120
    const moduleHeight = 50
    const gap = 12
    const startY = 240

    content.leftModules.forEach((mod, index) => {
      elements.push(
        createShapeElement('rounded-rectangle', {
          id: `${slideId}-left-mod-${index}`,
          position: { x: 80, y: startY + (moduleHeight + gap) * index },
          size: { width: moduleWidth, height: moduleHeight },
          fill: isDark ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe',
          strokeColor: isDark ? 'rgba(139, 92, 246, 0.4)' : '#a78bfa',
          strokeWidth: 1,
          cornerRadius: 8,
          zIndex: 1
        })
      )

      elements.push(
        createTextElement({
          id: `${slideId}-left-mod-name-${index}`,
          content: mod.name,
          position: { x: 80, y: startY + (moduleHeight + gap) * index },
          size: { width: moduleWidth, height: moduleHeight },
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'center',
          verticalAlign: 'middle',
          color: isDark ? '#a78bfa' : '#6d28d9',
          zIndex: 2
        })
      )
    })
  }

  // Right modules
  if (content.rightModules && content.rightModules.length > 0) {
    const moduleWidth = 120
    const moduleHeight = 50
    const gap = 12
    const startY = 240

    content.rightModules.forEach((mod, index) => {
      const modX = SLIDE_WIDTH - 80 - moduleWidth

      elements.push(
        createShapeElement('rounded-rectangle', {
          id: `${slideId}-right-mod-${index}`,
          position: { x: modX, y: startY + (moduleHeight + gap) * index },
          size: { width: moduleWidth, height: moduleHeight },
          fill: isDark ? 'rgba(6, 182, 212, 0.2)' : '#cffafe',
          strokeColor: isDark ? 'rgba(6, 182, 212, 0.4)' : '#22d3ee',
          strokeWidth: 1,
          cornerRadius: 8,
          zIndex: 1
        })
      )

      elements.push(
        createTextElement({
          id: `${slideId}-right-mod-name-${index}`,
          content: mod.name,
          position: { x: modX, y: startY + (moduleHeight + gap) * index },
          size: { width: moduleWidth, height: moduleHeight },
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'center',
          verticalAlign: 'middle',
          color: isDark ? '#22d3ee' : '#0891b2',
          zIndex: 2
        })
      )
    })
  }

  // Bottom label
  if (content.bottomLabel) {
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-bottom-bar`,
        position: { x: 200, y: 600 },
        size: { width: SLIDE_WIDTH - 400, height: 50 },
        fill: 'rgba(59, 130, 246, 0.15)',
        strokeColor: 'rgba(59, 130, 246, 0.3)',
        strokeWidth: 1,
        cornerRadius: 8,
        zIndex: 1
      })
    )

    elements.push(
      createTextElement({
        id: `${slideId}-bottom-label`,
        content: content.bottomLabel,
        position: { x: 200, y: 600 },
        size: { width: SLIDE_WIDTH - 400, height: 50 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: isDark ? '#93c5fd' : '#1d4ed8',
        zIndex: 2
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Dual-Flow Comparison Layout
function createDualFlowComparisonSlide(slideId: string, content: DualFlowComparisonContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  const columnWidth = 560
  const gap = 40
  const startX = (SLIDE_WIDTH - columnWidth * 2 - gap) / 2

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 40 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 70 : 50 },
      size: { width: SLIDE_WIDTH - 160, height: 40 },
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  const flows = [
    { flow: content.leftFlow, x: startX, isLeft: true },
    { flow: content.rightFlow, x: startX + columnWidth + gap, isLeft: false }
  ]

  flows.forEach(({ flow, x, isLeft }, flowIndex) => {
    const headerY = 120

    // Flow header background
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-flow-${flowIndex}-header-bg`,
        position: { x, y: headerY },
        size: { width: columnWidth, height: 50 },
        fill: isLeft
          ? isDark
            ? 'rgba(100, 116, 139, 0.2)'
            : '#f1f5f9'
          : isDark
            ? 'rgba(233, 30, 140, 0.15)'
            : 'rgba(233, 30, 140, 0.1)',
        strokeColor: 'transparent',
        cornerRadius: 8,
        zIndex: 0
      })
    )

    // Flow title
    elements.push(
      createTextElement({
        id: `${slideId}-flow-${flowIndex}-title`,
        content: flow.title,
        position: { x: x + 15, y: headerY + 5 },
        size: { width: columnWidth - 30, height: 40 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: isLeft ? mutedColor : accentColor,
        zIndex: 1
      })
    )

    // Sections
    let sectionY = headerY + 70
    flow.sections.forEach((section, sectionIndex) => {
      // Section container
      elements.push(
        createShapeElement('rounded-rectangle', {
          id: `${slideId}-flow-${flowIndex}-section-${sectionIndex}`,
          position: { x, y: sectionY },
          size: { width: columnWidth, height: 80 },
          fill: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
          strokeColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          strokeWidth: 1,
          cornerRadius: 8,
          zIndex: 0
        })
      )

      // Section label
      elements.push(
        createTextElement({
          id: `${slideId}-flow-${flowIndex}-section-${sectionIndex}-label`,
          content: section.label,
          position: { x: x + 15, y: sectionY + 10 },
          size: { width: columnWidth - 30, height: 24 },
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: textColor,
          zIndex: 1
        })
      )

      // Section items
      const itemsText = section.items.join(' • ')
      elements.push(
        createTextElement({
          id: `${slideId}-flow-${flowIndex}-section-${sectionIndex}-items`,
          content: itemsText,
          position: { x: x + 15, y: sectionY + 35 },
          size: { width: columnWidth - 30, height: 35 },
          fontSize: 12,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: mutedColor,
          zIndex: 1
        })
      )

      // Annotation
      if (section.annotation) {
        elements.push(
          createTextElement({
            id: `${slideId}-flow-${flowIndex}-section-${sectionIndex}-annotation`,
            content: section.annotation,
            position: { x: x + columnWidth - 150, y: sectionY + 10 },
            size: { width: 135, height: 20 },
            fontSize: 11,
            fontWeight: 'normal',
            textAlign: 'right',
            verticalAlign: 'middle',
            color: isLeft ? '#ef4444' : '#22c55e',
            fontStyle: 'italic',
            zIndex: 1
          })
        )
      }

      sectionY += 95
    })
  })

  // Footnote
  if (content.footnote) {
    elements.push(
      createTextElement({
        id: `${slideId}-footnote`,
        content: content.footnote,
        position: { x: 80, y: 660 },
        size: { width: SLIDE_WIDTH - 160, height: 30 },
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: accentColor,
        zIndex: 1
      })
    )
  }

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Mobile Showcase Layout
function createMobileShowcaseSlide(slideId: string, content: MobileShowcaseContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  const phonePosition = content.phonePosition || 'left'
  const phoneWidth = 260
  const phoneHeight = 520
  const contentWidth = 700

  let phoneX = 80
  let contentX = 400

  if (phonePosition === 'right') {
    phoneX = SLIDE_WIDTH - 80 - phoneWidth
    contentX = 80
  } else if (phonePosition === 'center') {
    phoneX = (SLIDE_WIDTH - phoneWidth) / 2
    contentX = 80
  }

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: contentX, y: 60 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: contentX, y: content.sectionLabel ? 90 : 70 },
      size: { width: contentWidth, height: 50 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  // App name
  elements.push(
    createTextElement({
      id: `${slideId}-app-name`,
      content: content.appName,
      position: { x: contentX, y: content.sectionLabel ? 145 : 125 },
      size: { width: contentWidth, height: 40 },
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: accentColor,
      zIndex: 1
    })
  )

  // Description
  elements.push(
    createTextElement({
      id: `${slideId}-description`,
      content: content.description,
      position: { x: contentX, y: content.sectionLabel ? 190 : 170 },
      size: { width: contentWidth, height: 80 },
      fontSize: 16,
      fontWeight: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      color: mutedColor,
      lineHeight: 1.5,
      zIndex: 1
    })
  )

  // Phone mock
  if (phonePosition !== 'center') {
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-phone-frame`,
        position: { x: phoneX, y: 100 },
        size: { width: phoneWidth, height: phoneHeight },
        fill: isDark ? '#1f2937' : '#374151',
        strokeColor: isDark ? '#374151' : '#1f2937',
        strokeWidth: 4,
        cornerRadius: 32,
        shadow: true,
        zIndex: 1
      })
    )

    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-phone-screen`,
        position: { x: phoneX + 12, y: 112 },
        size: { width: phoneWidth - 24, height: phoneHeight - 24 },
        fill: isDark ? '#0a0a0a' : '#ffffff',
        strokeColor: 'transparent',
        cornerRadius: 24,
        zIndex: 2
      })
    )
  }

  // Features
  const featuresStartY = phonePosition === 'center' ? 280 : 290
  const featureWidth = phonePosition === 'center' ? (SLIDE_WIDTH - 200) / 2 : contentWidth / 2

  content.features.forEach((feature, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const featureX = (phonePosition === 'center' ? 100 : contentX) + col * featureWidth
    const featureY = featuresStartY + row * 100

    elements.push(
      createTextElement({
        id: `${slideId}-feature-title-${index}`,
        content: `• ${feature.title}`,
        position: { x: featureX, y: featureY },
        size: { width: featureWidth - 20, height: 28 },
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 1
      })
    )

    if (feature.description) {
      elements.push(
        createTextElement({
          id: `${slideId}-feature-desc-${index}`,
          content: feature.description,
          position: { x: featureX + 15, y: featureY + 28 },
          size: { width: featureWidth - 35, height: 50 },
          fontSize: 13,
          fontWeight: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          color: mutedColor,
          lineHeight: 1.4,
          zIndex: 1
        })
      )
    }
  })

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Numbered Features Layout
function createNumberedFeaturesSlide(slideId: string, content: NumberedFeaturesContent, color: string): SlideData {
  const elements: AnySlideElement[] = []
  const { isDark, textColor, mutedColor, accentColor } = getThemeColors(color)

  const layout = content.layout || '2x3'
  let cols = 2
  let rows = 3

  switch (layout) {
    case '2x2':
      cols = 2
      rows = 2
      break
    case '3x2':
      cols = 3
      rows = 2
      break
    default:
      cols = 2
      rows = 3
  }

  // Section label
  if (content.sectionLabel) {
    elements.push(
      createTextElement({
        id: `${slideId}-section`,
        content: content.sectionLabel.toUpperCase(),
        position: { x: 80, y: 50 },
        size: { width: 300, height: 24 },
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        letterSpacing: 2,
        zIndex: 1
      })
    )
  }

  // Title
  elements.push(
    createTextElement({
      id: `${slideId}-title`,
      content: content.title,
      position: { x: 80, y: content.sectionLabel ? 80 : 60 },
      size: { width: SLIDE_WIDTH - 160, height: 50 },
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      verticalAlign: 'middle',
      color: textColor,
      zIndex: 1
    })
  )

  // Feature cards
  const cardGap = 24
  const contentStartY = 160
  const availableWidth = SLIDE_WIDTH - 160
  const availableHeight = SLIDE_HEIGHT - contentStartY - 60
  const cardWidth = (availableWidth - cardGap * (cols - 1)) / cols
  const cardHeight = (availableHeight - cardGap * (rows - 1)) / rows

  content.features.slice(0, cols * rows).forEach((feature, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const cardX = 80 + col * (cardWidth + cardGap)
    const cardY = contentStartY + row * (cardHeight + cardGap)

    // Card background
    elements.push(
      createShapeElement('rounded-rectangle', {
        id: `${slideId}-feature-bg-${index}`,
        position: { x: cardX, y: cardY },
        size: { width: cardWidth, height: cardHeight },
        fill: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
        strokeColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
        strokeWidth: 1,
        cornerRadius: 12,
        zIndex: 0
      })
    )

    // Number
    const numberStr = String(feature.number)
    elements.push(
      createTextElement({
        id: `${slideId}-feature-number-${index}`,
        content: numberStr,
        position: { x: cardX + 20, y: cardY + 15 },
        size: { width: 80, height: 50 },
        fontSize: 42,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: accentColor,
        zIndex: 1
      })
    )

    // Name
    elements.push(
      createTextElement({
        id: `${slideId}-feature-name-${index}`,
        content: feature.name,
        position: { x: cardX + 20, y: cardY + 70 },
        size: { width: cardWidth - 40, height: 30 },
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        verticalAlign: 'middle',
        color: textColor,
        zIndex: 1
      })
    )

    // Description
    elements.push(
      createTextElement({
        id: `${slideId}-feature-desc-${index}`,
        content: feature.description,
        position: { x: cardX + 20, y: cardY + 100 },
        size: { width: cardWidth - 40, height: cardHeight - 120 },
        fontSize: 13,
        fontWeight: 'normal',
        textAlign: 'left',
        verticalAlign: 'top',
        color: mutedColor,
        lineHeight: 1.4,
        zIndex: 1
      })
    )
  })

  return {
    id: slideId,
    elements,
    background: getThemeBackground(color)
  }
}

// Export
export const SlideLayoutService = {
  generateSlideFromLayout
}

export default SlideLayoutService
