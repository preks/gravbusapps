/**
 * SlideMetadataService - Centralized logic for slide purpose metadata
 *
 * Handles purpose definitions, inference, matching, validation, and migration.
 */

import type { SlideData, AnySlideElement } from '../components/slideElements'
import type { SlidePurpose, SlidePosition, SlideCapabilities, SlideTemplateMeta, SlideTemplate } from '../types'

/**
 * Definition for each slide purpose
 */
export interface PurposeDefinition {
  label: string
  description: string
  defaultPosition: SlidePosition
  defaultMaxUsage?: number
  defaultCapabilities: SlideCapabilities
  compatibleLayouts: string[]
}

/**
 * Validation result from validateSlideMeta
 */
export interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Content analysis result for matching
 */
export interface ContentAnalysis {
  suggestedPurpose: SlidePurpose
  hasImage: boolean
  hasChart: boolean
  hasBullets: boolean
  bulletCount: number
  hasMultiColumn: boolean
  hasTable: boolean
  position: 'start' | 'middle' | 'end'
}

/**
 * Icon names for each purpose (Lucide icon names)
 */
export const PURPOSE_ICONS: Record<SlidePurpose, string> = {
  cover: 'Presentation',
  agenda: 'List',
  'section-divider': 'Minus',
  content: 'FileText',
  'key-point': 'Target',
  bullets: 'ListOrdered',
  'two-column': 'Columns',
  'image-focus': 'Image',
  'data-viz': 'BarChart3',
  quote: 'Quote',
  timeline: 'Clock',
  comparison: 'ArrowLeftRight',
  team: 'Users',
  process: 'Workflow',
  conclusion: 'CheckCircle',
  cta: 'MousePointerClick',
  'thank-you': 'Heart'
}

/**
 * Master definitions for all slide purposes
 */
export const PURPOSE_DEFINITIONS: Record<SlidePurpose, PurposeDefinition> = {
  cover: {
    label: 'Cover',
    description: 'Title and intro slide',
    defaultPosition: 'first',
    defaultMaxUsage: 1,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['title-cover', 'branded-cover']
  },
  agenda: {
    label: 'Agenda',
    description: 'Table of contents or overview',
    defaultPosition: 'early',
    defaultMaxUsage: 1,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 8,
      image: false,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['agenda']
  },
  'section-divider': {
    label: 'Section Divider',
    description: 'Divider between sections',
    defaultPosition: 'any',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['section-divider']
  },
  content: {
    label: 'Content',
    description: 'General content slide',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: true,
      maxBullets: 6,
      image: true,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['feature-grid', 'icon-bullets', 'product-grid', 'statement', 'numbered-features']
  },
  'key-point': {
    label: 'Key Point',
    description: 'Single important message',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['statement', 'key-takeaway']
  },
  bullets: {
    label: 'Bullet List',
    description: 'List of points',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 6,
      image: false,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['bullets', 'icon-bullets']
  },
  'two-column': {
    label: 'Two Column',
    description: 'Side-by-side content',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 4,
      image: true,
      chart: false,
      table: false,
      icons: false,
      multiColumn: true,
      columnCount: 2
    },
    compatibleLayouts: ['two-column', 'two-panel-features']
  },
  'image-focus': {
    label: 'Image Focus',
    description: 'Image with caption',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: true,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['image-right', 'image-left', 'mobile-showcase']
  },
  'data-viz': {
    label: 'Data & Charts',
    description: 'Charts, statistics, metrics',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: false,
      image: false,
      chart: true,
      table: true,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['bar-chart', 'pie-chart', 'line-chart', 'data-table', 'key-metrics', 'metrics-dashboard']
  },
  quote: {
    label: 'Quote',
    description: 'Testimonial or quote',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: false,
      subtitle: false,
      bullets: false,
      image: true,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['quote']
  },
  timeline: {
    label: 'Timeline',
    description: 'Chronological content',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['timeline']
  },
  comparison: {
    label: 'Comparison',
    description: 'Before/after or versus',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 4,
      image: false,
      chart: false,
      table: true,
      icons: false,
      multiColumn: true,
      columnCount: 2
    },
    compatibleLayouts: ['comparison', 'three-column-comparison', 'dual-flow-comparison']
  },
  team: {
    label: 'Team',
    description: 'Team members',
    defaultPosition: 'late',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: false,
      image: true,
      chart: false,
      table: false,
      icons: false,
      multiColumn: true,
      columnCount: 4
    },
    compatibleLayouts: ['team']
  },
  process: {
    label: 'Process',
    description: 'Steps or workflow',
    defaultPosition: 'middle',
    defaultMaxUsage: undefined,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['process', 'architecture-diagram', 'layered-stack', 'module-architecture']
  },
  conclusion: {
    label: 'Conclusion',
    description: 'Summary or takeaways',
    defaultPosition: 'late',
    defaultMaxUsage: 1,
    defaultCapabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 5,
      image: false,
      chart: false,
      table: false,
      icons: true,
      multiColumn: false
    },
    compatibleLayouts: ['bullets', 'key-takeaway']
  },
  cta: {
    label: 'Call to Action',
    description: 'Call to action slide',
    defaultPosition: 'late',
    defaultMaxUsage: 1,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['cta', 'statement']
  },
  'thank-you': {
    label: 'Thank You',
    description: 'Closing slide',
    defaultPosition: 'last',
    defaultMaxUsage: 1,
    defaultCapabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    compatibleLayouts: ['thank-you']
  }
}

/**
 * Get default capabilities for a purpose
 */
export function getDefaultCapabilities(purpose: SlidePurpose): SlideCapabilities {
  return { ...PURPOSE_DEFINITIONS[purpose].defaultCapabilities }
}

/**
 * Get default position for a purpose
 */
export function getDefaultPosition(purpose: SlidePurpose): SlidePosition {
  return PURPOSE_DEFINITIONS[purpose].defaultPosition
}

/**
 * Get default max usage for a purpose
 */
export function getDefaultMaxUsage(purpose: SlidePurpose): number | undefined {
  return PURPOSE_DEFINITIONS[purpose].defaultMaxUsage
}

/**
 * Create default SlideTemplateMeta for a purpose
 */
export function createDefaultMeta(purpose: SlidePurpose): SlideTemplateMeta {
  const def = PURPOSE_DEFINITIONS[purpose]
  return {
    purpose,
    position: def.defaultPosition,
    capabilities: { ...def.defaultCapabilities },
    maxUsage: def.defaultMaxUsage
  }
}

/**
 * Check if an element is a text element with content
 */
function isTextElement(el: AnySlideElement): boolean {
  return el.type === 'text' && !!(el as { content?: string }).content
}

/**
 * Check if slide has a large title element (likely a cover slide)
 */
function hasLargeTitleElement(slide: SlideData): boolean {
  for (const el of slide.elements) {
    if (el.type === 'text') {
      const textEl = el as { fontSize?: number; size?: { height: number } }
      if ((textEl.fontSize && textEl.fontSize >= 48) || (textEl.size?.height && textEl.size.height >= 100)) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if slide has bullet content
 */
function hasBulletContent(slide: SlideData): boolean {
  for (const el of slide.elements) {
    if (el.type === 'text') {
      const content = (el as { content?: string }).content || ''
      if (content.includes('•') || content.includes('-') || content.includes('\n')) {
        return true
      }
    }
  }
  return false
}

/**
 * Count bullet points in slide
 */
function countBullets(slide: SlideData): number {
  let count = 0
  for (const el of slide.elements) {
    if (el.type === 'text') {
      const content = (el as { content?: string }).content || ''
      count += (content.match(/[•\-\n]/g) || []).length
    }
  }
  return count
}

/**
 * Check if slide contains chart elements
 */
function hasChartElement(slide: SlideData): boolean {
  return slide.elements.some(el => el.type === 'chart')
}

/**
 * Check if slide contains table elements
 */
function hasTableElement(slide: SlideData): boolean {
  return slide.elements.some(el => el.type === 'table')
}

/**
 * Check if slide contains image elements
 */
function hasImageElement(slide: SlideData): boolean {
  return slide.elements.some(el => el.type === 'image')
}

/**
 * Check if slide has quote-like content
 */
function hasQuoteContent(slide: SlideData): boolean {
  for (const el of slide.elements) {
    if (el.type === 'text') {
      const content = ((el as { content?: string }).content || '').toLowerCase()
      if (content.includes('"') || content.includes('"') || content.includes('—')) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if slide has thank-you content
 */
function hasThankYouContent(slide: SlideData): boolean {
  for (const el of slide.elements) {
    if (el.type === 'text') {
      const content = ((el as { content?: string }).content || '').toLowerCase()
      if (content.includes('thank') || content.includes('questions') || content.includes('contact')) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if slide has multi-column layout
 */
function hasMultiColumnLayout(slide: SlideData): boolean {
  const textElements = slide.elements.filter(isTextElement)
  if (textElements.length < 2) return false

  const xPositions = textElements.map(el => el.position.x)
  const uniqueXRegions = new Set(xPositions.map(x => Math.floor(x / 300)))
  return uniqueXRegions.size >= 2
}

/**
 * Infer purpose from a slide's content
 */
export function inferPurposeFromSlide(slide: SlideData, index: number, totalSlides: number): SlidePurpose {
  const isFirst = index === 0
  const isLast = index === totalSlides - 1

  if (isFirst && hasLargeTitleElement(slide)) {
    return 'cover'
  }

  if (isLast && hasThankYouContent(slide)) {
    return 'thank-you'
  }

  if (hasChartElement(slide) || hasTableElement(slide)) {
    return 'data-viz'
  }

  if (hasQuoteContent(slide)) {
    return 'quote'
  }

  const hasImage = hasImageElement(slide)
  const imageArea = calculateImageArea(slide)
  if (hasImage && imageArea > 0.4) {
    return 'image-focus'
  }

  if (hasMultiColumnLayout(slide)) {
    return 'two-column'
  }

  if (hasBulletContent(slide)) {
    const bulletCount = countBullets(slide)
    if (index === 1 && bulletCount >= 3) {
      return 'agenda'
    }
    return 'bullets'
  }

  if (slide.elements.length <= 3 && hasLargeTitleElement(slide)) {
    return 'key-point'
  }

  return 'content'
}

/**
 * Calculate image area as percentage of slide
 */
function calculateImageArea(slide: SlideData): number {
  const slideArea = 1280 * 720
  let imageArea = 0

  for (const el of slide.elements) {
    if (el.type === 'image') {
      imageArea += el.size.width * el.size.height
    }
  }

  return imageArea / slideArea
}

/**
 * Analyze content for matching purposes
 */
export function analyzeSlideContent(layout: string, index: number, total: number): ContentAnalysis {
  const position: 'start' | 'middle' | 'end' = index === 0 ? 'start' : index >= total - 1 ? 'end' : 'middle'

  const layoutLower = layout.toLowerCase()

  const hasChart = layoutLower.includes('chart') || layoutLower.includes('metric') || layoutLower.includes('data')
  const hasImage = layoutLower.includes('image') || layoutLower.includes('showcase') || layoutLower.includes('mobile')
  const hasBullets = layoutLower.includes('bullet') || layoutLower.includes('list') || layoutLower.includes('feature')
  const hasMultiColumn =
    layoutLower.includes('column') || layoutLower.includes('comparison') || layoutLower.includes('two-panel')
  const hasTable = layoutLower.includes('table')

  let suggestedPurpose: SlidePurpose = 'content'

  if (layoutLower.includes('cover') || layoutLower.includes('title-cover')) {
    suggestedPurpose = 'cover'
  } else if (layoutLower.includes('thank')) {
    suggestedPurpose = 'thank-you'
  } else if (layoutLower.includes('agenda')) {
    suggestedPurpose = 'agenda'
  } else if (layoutLower.includes('section-divider')) {
    suggestedPurpose = 'section-divider'
  } else if (layoutLower.includes('quote')) {
    suggestedPurpose = 'quote'
  } else if (layoutLower.includes('timeline')) {
    suggestedPurpose = 'timeline'
  } else if (layoutLower.includes('comparison') || layoutLower.includes('dual-flow')) {
    suggestedPurpose = 'comparison'
  } else if (
    layoutLower.includes('process') ||
    layoutLower.includes('architecture') ||
    layoutLower.includes('workflow')
  ) {
    suggestedPurpose = 'process'
  } else if (layoutLower.includes('team')) {
    suggestedPurpose = 'team'
  } else if (hasChart) {
    suggestedPurpose = 'data-viz'
  } else if (hasImage && !hasBullets) {
    suggestedPurpose = 'image-focus'
  } else if (hasMultiColumn) {
    suggestedPurpose = 'two-column'
  } else if (hasBullets) {
    suggestedPurpose = 'bullets'
  } else if (layoutLower.includes('statement') || layoutLower.includes('key')) {
    suggestedPurpose = 'key-point'
  }

  return {
    suggestedPurpose,
    hasImage,
    hasChart,
    hasBullets,
    bulletCount: hasBullets ? 4 : 0,
    hasMultiColumn,
    hasTable,
    position
  }
}

/**
 * Score how well a content slide matches a template slide
 */
function scoreMatch(content: ContentAnalysis, meta: SlideTemplateMeta, usageCount: number): number {
  let score = 0

  if (content.suggestedPurpose === meta.purpose) {
    score += 50
  }

  const generalContentPurposes: SlidePurpose[] = ['content', 'bullets', 'key-point']
  if (generalContentPurposes.includes(content.suggestedPurpose) && generalContentPurposes.includes(meta.purpose)) {
    score += 20
  }

  if (content.hasChart && meta.capabilities.chart) score += 15
  if (content.hasImage && meta.capabilities.image) score += 10
  if (content.hasBullets && meta.capabilities.bullets) score += 10
  if (content.hasMultiColumn && meta.capabilities.multiColumn) score += 10
  if (content.hasTable && meta.capabilities.table) score += 10

  if (content.position === 'start' && (meta.position === 'first' || meta.position === 'early')) {
    score += 10
  } else if (content.position === 'end' && (meta.position === 'last' || meta.position === 'late')) {
    score += 10
  } else if (content.position === 'middle' && (meta.position === 'middle' || meta.position === 'any')) {
    score += 5
  }

  if (meta.maxUsage !== undefined && usageCount >= meta.maxUsage) {
    score -= 100
  }

  return score
}

/**
 * Find best template slide for given content
 */
export function findBestSlideForContent(
  content: ContentAnalysis,
  slideMeta: SlideTemplateMeta[],
  usageCounts: Map<number, number>
): number {
  if (slideMeta.length === 0) return 0

  let bestIndex = 0
  let bestScore = -Infinity

  for (let i = 0; i < slideMeta.length; i++) {
    const meta = slideMeta[i]
    const usage = usageCounts.get(i) || 0
    const score = scoreMatch(content, meta, usage)

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  console.log(
    '[SlideMetadata] Best match for',
    content.suggestedPurpose,
    'is slide',
    bestIndex,
    'with score',
    bestScore
  )
  return bestIndex
}

/**
 * Match content slides to template slides
 */
export function matchContentToTemplateSlides(
  contentLayouts: string[],
  slideMeta: SlideTemplateMeta[]
): Map<number, number> {
  const result = new Map<number, number>()
  const usageCounts = new Map<number, number>()

  for (let i = 0; i < contentLayouts.length; i++) {
    const analysis = analyzeSlideContent(contentLayouts[i], i, contentLayouts.length)
    const templateIndex = findBestSlideForContent(analysis, slideMeta, usageCounts)

    result.set(i, templateIndex)

    const currentUsage = usageCounts.get(templateIndex) || 0
    usageCounts.set(templateIndex, currentUsage + 1)

    console.log(
      '[SlideMetadata] Content slide',
      i,
      '(',
      analysis.suggestedPurpose,
      ') -> template slide',
      templateIndex
    )
  }

  return result
}

/**
 * Validate slide metadata array
 */
export function validateSlideMeta(slideMeta: SlideTemplateMeta[]): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  if (slideMeta.length === 0) {
    warnings.push('No slide metadata defined')
    return { valid: true, warnings, errors }
  }

  const firstSlides = slideMeta.filter(m => m.position === 'first')
  if (firstSlides.length > 1) {
    warnings.push('Multiple slides with position "first" - only the first one will be used')
  }

  const lastSlides = slideMeta.filter(m => m.position === 'last')
  if (lastSlides.length > 1) {
    warnings.push('Multiple slides with position "last" - only the first one will be used')
  }

  const coverSlides = slideMeta.filter(m => m.purpose === 'cover')
  if (coverSlides.length > 0 && !coverSlides.some(m => m.position === 'first' || m.position === 'early')) {
    warnings.push('Cover slide should have position "first" or "early"')
  }

  const thankYouSlides = slideMeta.filter(m => m.purpose === 'thank-you')
  if (thankYouSlides.length > 0 && !thankYouSlides.some(m => m.position === 'last' || m.position === 'late')) {
    warnings.push('Thank-you slide should have position "last" or "late"')
  }

  const contentPurposes: SlidePurpose[] = ['content', 'bullets', 'key-point', 'two-column', 'image-focus', 'data-viz']
  const hasContentSlide = slideMeta.some(m => contentPurposes.includes(m.purpose))
  if (!hasContentSlide) {
    warnings.push('No content-type slides defined - template may not work well for general presentations')
  }

  for (let i = 0; i < slideMeta.length; i++) {
    const meta = slideMeta[i]
    if (!PURPOSE_DEFINITIONS[meta.purpose]) {
      errors.push(`Slide ${i + 1}: Invalid purpose "${meta.purpose}"`)
    }
  }

  console.log('[SlideMetadata] Validation result:', { valid: errors.length === 0, warnings, errors })

  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Migrate a legacy template without slideMeta
 */
export function migrateLegacyTemplate(template: SlideTemplate): SlideTemplate {
  if (template.slideMeta && template.slideMeta.length > 0) {
    return template
  }

  const slides = template.contentJson?.slides || []
  if (slides.length === 0) {
    return template
  }

  const inferredMeta: SlideTemplateMeta[] = slides.map((slide, index) => {
    const purpose = inferPurposeFromSlide(slide, index, slides.length)
    return createDefaultMeta(purpose)
  })

  console.log('[SlideMetadata] Migrated legacy template with', inferredMeta.length, 'slides')

  return {
    ...template,
    slideMeta: inferredMeta,
    contentJson: {
      ...template.contentJson,
      _templateMeta: template.contentJson._templateMeta
        ? { ...template.contentJson._templateMeta, slideMeta: inferredMeta }
        : undefined
    }
  }
}

/**
 * Get all available purposes as array
 */
export function getAllPurposes(): SlidePurpose[] {
  return Object.keys(PURPOSE_DEFINITIONS) as SlidePurpose[]
}

/**
 * Get all available positions as array
 */
export function getAllPositions(): SlidePosition[] {
  return ['first', 'early', 'middle', 'late', 'last', 'any']
}

export const SlideMetadataService = {
  PURPOSE_DEFINITIONS,
  PURPOSE_ICONS,
  getDefaultCapabilities,
  getDefaultPosition,
  getDefaultMaxUsage,
  createDefaultMeta,
  inferPurposeFromSlide,
  analyzeSlideContent,
  findBestSlideForContent,
  matchContentToTemplateSlides,
  validateSlideMeta,
  migrateLegacyTemplate,
  getAllPurposes,
  getAllPositions
}

export default SlideMetadataService
