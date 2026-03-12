/**
 * SlideGenerationService - Enterprise-grade AI slide generation
 *
 * Uses dedicated document-service endpoint for reliable generation.
 * Optionally uses research service for web search data gathering.
 * Supports automatic template matching for consistent branding.
 */

import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { SlideData, SlideElement } from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'
import {
  SlideResearchService,
  formatResearchForGeneration,
  type ResearchResult,
  type VisualStyleRecommendation
} from './SlideResearchService'
import { generateSlideFromLayout, type SlideLayoutContent, type SlideLayoutType } from './SlideLayoutService'
import { SlidesApiService } from './SlidesApiService'
import type { SlideTemplate } from '../types'

const API_URL = getDocumentServiceApiUrl()

// Content types for references
export type ContentType = 'document' | 'spreadsheet' | 'note' | 'slide'

export interface ContentReference {
  id: string
  type: ContentType
  title: string
}

/**
 * Fetch content from a reference document/note/spreadsheet/slide
 */
async function fetchReferenceContent(
  ref: ContentReference,
  accessToken: string
): Promise<{ title: string; content: string } | null> {
  try {
    const endpoint = getEndpointForType(ref.type)
    const response = await fetch(`${API_URL}/${endpoint}/${ref.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      console.warn(`[SlideGeneration] Failed to fetch ${ref.type} ${ref.id}: ${response.status}`)
      return null
    }

    const data = await response.json()
    return extractContentFromResponse(ref.type, data, ref.title)
  } catch (error) {
    console.error(`[SlideGeneration] Error fetching reference ${ref.id}:`, error)
    return null
  }
}

function getEndpointForType(type: ContentType): string {
  switch (type) {
    case 'document':
      return 'documents'
    case 'note':
      return 'notes'
    case 'spreadsheet':
      return 'spreadsheets'
    case 'slide':
      return 'slides'
  }
}

function extractContentFromResponse(
  type: ContentType,
  data: Record<string, unknown>,
  fallbackTitle: string
): { title: string; content: string } {
  const title = (data.title as string) || fallbackTitle

  switch (type) {
    case 'document':
      return { title, content: (data.content as string) || '' }
    case 'note':
      return { title, content: (data.content as string) || '' }
    case 'spreadsheet': {
      const sheets = data.sheets as Array<{ name: string; data: unknown[][] }> | undefined
      if (sheets && sheets.length > 0) {
        const content = sheets
          .map(sheet => {
            const rows = sheet.data || []
            return `Sheet: ${sheet.name}\n${rows.map(row => row.join('\t')).join('\n')}`
          })
          .join('\n\n')
        return { title, content }
      }
      return { title, content: '' }
    }
    case 'slide': {
      const contentJson = data.contentJson as
        | { slides?: Array<{ elements?: Array<{ type: string; content?: string }> }> }
        | undefined
      if (contentJson?.slides) {
        const content = contentJson.slides
          .map((slide, i) => {
            const texts = (slide.elements || [])
              .filter(el => el.type === 'text' && el.content)
              .map(el => el.content)
              .join('\n')
            return `Slide ${i + 1}:\n${texts}`
          })
          .join('\n\n')
        return { title, content }
      }
      return { title, content: '' }
    }
  }
}

/**
 * Truncate text to a maximum length, preserving complete sentences where possible
 */
function truncateContent(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  const truncated = text.substring(0, maxLength)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1) + '...'
  }

  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...'
}

// Cache for fetched reference content to avoid double-fetching
const referenceContentCache = new Map<string, { title: string; content: string } | null>()

/**
 * Fetch all reference content and format for AI prompt
 * @param truncate - If true, truncates to fit within backend API limits
 */
async function fetchAndFormatReferences(
  references: ContentReference[],
  accessToken: string,
  existingRequirementsLength: number = 0,
  truncate: boolean = true
): Promise<string> {
  if (!references || references.length === 0) return ''

  // Fetch content (with caching to avoid double requests)
  const contents = await Promise.all(
    references.map(async ref => {
      const cacheKey = `${ref.type}:${ref.id}`
      if (referenceContentCache.has(cacheKey)) {
        return referenceContentCache.get(cacheKey)
      }
      const content = await fetchReferenceContent(ref, accessToken)
      referenceContentCache.set(cacheKey, content)
      return content
    })
  )

  const validContents = contents.filter(
    (c): c is { title: string; content: string } => c !== null && c.content.length > 0
  )

  if (validContents.length === 0) return ''

  // Full content mode (for research service - no limit)
  if (!truncate) {
    const formatted = validContents.map(c => `### ${c.title}\n${c.content}`).join('\n\n---\n\n')
    return `\n\nREFERENCE MATERIALS (BASE THE PRESENTATION ON THIS CONTENT):\n${formatted}`
  }

  // Truncated mode (for document-service API - 1000 char limit)
  const HEADER = '\n\nREFERENCE:\n'
  const MAX_TOTAL = 950
  const availableSpace = MAX_TOTAL - existingRequirementsLength - HEADER.length - 50

  if (availableSpace < 100) {
    console.warn('[SlideGeneration] Not enough space for reference content')
    return ''
  }

  // Distribute space among references
  const spacePerRef = Math.floor(availableSpace / validContents.length)

  const formatted = validContents
    .map(c => {
      const titleLine = `[${c.title}]: `
      const contentSpace = spacePerRef - titleLine.length
      const truncatedContent = truncateContent(c.content, Math.max(contentSpace, 50))
      return titleLine + truncatedContent
    })
    .join('\n')

  return HEADER + formatted
}

export type StylePreference = 'auto' | 'dark' | 'light' | 'branded'

export interface GenerationOptions {
  description: string
  length: 'short' | 'medium' | 'long'
  additionalRequirements?: string
  references?: ContentReference[]
  useWebSearch?: boolean
  theme?: SlideTheme
  /** Optional i18n function for user-visible fallbacks (e.g. Option A/B, Thank You) */
  getMessage?: (key: string, params?: Record<string, string>) => string
  /** Enable automatic template matching (default: true) */
  useTemplateMatching?: boolean
  /** Specific template ID to use (overrides auto-matching) */
  templateId?: string
  /** Style preference for generated slides */
  stylePreference?: StylePreference
  /** Extract visual style from reference materials (default: true) */
  extractStyleFromReferences?: boolean
  /** Brand name for branded presentations */
  brandName?: string
  /** Custom brand colors */
  brandColors?: { primary: string; secondary: string }
}

export interface GenerationResult {
  slides: SlideData[]
  title: string
  sources?: string[]
  researchData?: ResearchResult
  /** Matched template info (if template matching found a match) */
  matchedTemplate?: {
    id: string
    name: string
    themeId?: string
  }
}

export type GenerationProgressCallback = (
  phase: 'research' | 'generation' | 'validation',
  message: string,
  params?: Record<string, string>
) => void

// Slide count ranges
const SLIDE_COUNT_RANGES = {
  short: { min: 5, max: 8, target: 7 },
  medium: { min: 9, max: 14, target: 12 },
  long: { min: 15, max: 25, target: 20 }
} as const

/**
 * Extract explicit template name from description
 * Looks for patterns like "use template X", "template X", "using X template"
 */
function extractExplicitTemplateName(text: string): string | null {
  const lowerText = text.toLowerCase()

  // Patterns to detect explicit template references
  const patterns = [
    /(?:use|using|with)\s+(?:the\s+)?template\s+["']?([a-z0-9\s-]+?)["']?(?:\s|$|,|\.)/i,
    /template\s+["']?([a-z0-9\s-]+?)["']?\s+(?:template)?/i,
    /["']([a-z0-9\s-]+?)["']\s+template/i,
    /template:\s*["']?([a-z0-9\s-]+?)["']?(?:\s|$|,|\.)/i
  ]

  for (const pattern of patterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Extract keywords from a description for template matching
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'and',
    'but',
    'or',
    'nor',
    'so',
    'yet',
    'both',
    'either',
    'neither',
    'not',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
    'just',
    'about',
    'create',
    'make',
    'build',
    'presentation',
    'slides',
    'slide',
    'generate',
    'me',
    'sample',
    'please'
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
}

/**
 * Calculate match score between description and template
 */
function calculateTemplateMatchScore(
  description: string,
  template: { name: string; description?: string },
  explicitTemplateName: string | null
): number {
  const templateName = template.name.toLowerCase()

  // If user explicitly requested this template by name, return highest score
  if (explicitTemplateName) {
    const normalizedExplicit = explicitTemplateName.toLowerCase().trim()
    const normalizedTemplate = templateName.toLowerCase().trim()

    // Exact match or template name contains the explicit name
    if (
      normalizedTemplate === normalizedExplicit ||
      normalizedTemplate.includes(normalizedExplicit) ||
      normalizedExplicit.includes(normalizedTemplate)
    ) {
      console.log(`[SlideGeneration] Explicit template match: "${normalizedExplicit}" matches "${normalizedTemplate}"`)
      return 1.0 // Perfect match
    }
  }

  // Fallback to keyword matching
  const descKeywords = extractKeywords(description)
  const templateText = `${template.name} ${template.description || ''}`.toLowerCase()
  const templateKeywords = extractKeywords(templateText)

  if (descKeywords.length === 0 || templateKeywords.length === 0) return 0

  let matchCount = 0
  for (const keyword of descKeywords) {
    // Check for exact match or partial match (word contains keyword)
    if (templateKeywords.some(tk => tk.includes(keyword) || keyword.includes(tk))) {
      matchCount++
    }
    // Also check if the template text contains the keyword
    if (templateText.includes(keyword)) {
      matchCount += 0.5
    }
  }

  // Normalize score (0-1 range)
  return matchCount / descKeywords.length
}

/**
 * Find the best matching template for a given description
 */
async function findMatchingTemplate(
  description: string,
  accessToken: string,
  minScore: number = 0.15
): Promise<SlideTemplate | null> {
  try {
    SlidesApiService.setAccessToken(accessToken)
    const templates = await SlidesApiService.listTemplates()

    if (templates.length === 0) {
      console.log('[SlideGeneration] No templates found in database')
      return null
    }

    // First, check for explicit template name request
    const explicitTemplateName = extractExplicitTemplateName(description)
    if (explicitTemplateName) {
      console.log(`[SlideGeneration] User explicitly requested template: "${explicitTemplateName}"`)
    }

    let bestMatch: { template: SlideTemplate | null; score: number } = {
      template: null,
      score: 0
    }

    for (const summary of templates) {
      const score = calculateTemplateMatchScore(
        description,
        {
          name: summary.name,
          description: summary.description
        },
        explicitTemplateName
      )

      if (score > bestMatch.score) {
        // Fetch full template to get slides
        const fullTemplate = await SlidesApiService.getTemplate(summary.id)
        if (fullTemplate) {
          bestMatch = { template: fullTemplate, score }
        }
      }

      // If we found an exact match (score = 1.0), no need to continue
      if (score >= 1.0) break
    }

    // Only return if score meets minimum threshold
    if (bestMatch.score >= minScore && bestMatch.template) {
      console.log(
        `[SlideGeneration] Found matching template: "${bestMatch.template.name}" (score: ${bestMatch.score.toFixed(2)})`
      )
      return bestMatch.template
    }

    return null
  } catch (error) {
    console.warn('[SlideGeneration] Template matching failed:', error)
    return null
  }
}

/**
 * Extract layout structure from template slides for AI guidance
 */
function extractTemplateStructure(slides: SlideData[]): string {
  const layouts = slides.map((slide, index) => {
    // Determine slide type based on elements
    const hasTitle = slide.elements.some((el: SlideElement) => el.type === 'text' && el.fontSize && el.fontSize >= 32)
    const hasBullets = slide.elements.some((el: SlideElement) => el.type === 'text' && el.content?.includes('•'))
    const hasImage = slide.elements.some((el: SlideElement) => el.type === 'image')
    const hasChart = slide.elements.some(
      (el: SlideElement) => el.type === 'shape' && ['rectangle', 'circle'].includes(el.shapeType || '')
    )

    let layoutType = 'content'
    if (index === 0) layoutType = 'title-cover'
    else if (index === slides.length - 1) layoutType = 'thank-you'
    else if (hasImage && hasBullets) layoutType = 'image-with-content'
    else if (hasChart) layoutType = 'data-visualization'
    else if (hasBullets) layoutType = 'bullets'
    else if (hasTitle && !hasBullets) layoutType = 'section-divider'

    // Extract sample content structure
    const titleEl = slide.elements.find((el: SlideElement) => el.type === 'text' && el.fontSize && el.fontSize >= 32)
    const title = titleEl?.content || `Slide ${index + 1}`

    return `Slide ${index + 1}: ${layoutType} - "${title}"`
  })

  return layouts.join('\n')
}

/**
 * Format template guidance for the AI
 */
function formatTemplateGuidance(template: SlideTemplate): string {
  const structure = extractTemplateStructure(template.contentJson.slides)

  return `
TEMPLATE GUIDANCE:
You are generating content based on an existing template "${template.name}".
Follow this slide structure closely, adapting the content to the new topic while maintaining the same flow and layout types.

Template Structure (${template.contentJson.slides.length} slides):
${structure}

Instructions:
- Generate exactly ${template.contentJson.slides.length} slides
- Follow the same layout sequence (title-cover, content slides, thank-you)
- Maintain similar content density per slide
- Adapt all content to the new topic while keeping the structural flow
`
}

/**
 * Deep clone a slide, preserving all visual properties
 */
function cloneSlide(slide: SlideData): SlideData {
  return JSON.parse(JSON.stringify(slide))
}

/**
 * Identify text elements in a slide for content replacement
 * Returns elements sorted by position (top to bottom, left to right)
 */
function getTextElements(slide: SlideData): SlideElement[] {
  return slide.elements
    .filter((el): el is SlideElement => el.type === 'text')
    .sort((a, b) => {
      // Sort by Y position first (top to bottom), then X (left to right)
      const yDiff = (a.y || 0) - (b.y || 0)
      if (Math.abs(yDiff) > 50) return yDiff
      return (a.x || 0) - (b.x || 0)
    })
}

/**
 * Determine if a text element is a title based on font size and position
 */
function isTitleElement(el: SlideElement): boolean {
  return (el.fontSize && el.fontSize >= 28) || (el.y !== undefined && el.y < 150)
}

/**
 * Populate template slides with AI-generated content
 * This preserves the template's visual design while replacing text content
 * If AI generates more slides than template has, template slides are repeated cyclically
 */
function populateTemplateWithContent(templateSlides: SlideData[], aiSlides: BackendSlideSpec[]): SlideData[] {
  if (templateSlides.length === 0) return []

  // Generate slides for all AI content, cycling through template slides
  return aiSlides.map((aiContent, index) => {
    // Use template slide cyclically (e.g., if template has 2 slides and AI has 5,
    // use template[0], template[1], template[0], template[1], template[0])
    const templateIndex = index % templateSlides.length
    const clonedSlide = cloneSlide(templateSlides[templateIndex])

    // Generate new ID for each cloned slide
    clonedSlide.id = `slide-${Date.now()}-${index}`

    const textElements = getTextElements(clonedSlide)
    if (textElements.length === 0) return clonedSlide

    // Find title element (largest font or topmost position)
    const titleElement = textElements.find(isTitleElement)
    const bodyElements = textElements.filter(el => el !== titleElement)

    // Update title
    if (titleElement && aiContent.title) {
      titleElement.content = aiContent.title
    }

    // Update body content based on what AI provided
    if (bodyElements.length > 0) {
      if (aiContent.bullets && aiContent.bullets.length > 0) {
        // Format as bullet list
        const bulletText = aiContent.bullets.map(b => `• ${b}`).join('\n')
        bodyElements[0].content = bulletText
      } else if (aiContent.content) {
        // Use plain content
        bodyElements[0].content = aiContent.content
      } else if (aiContent.subtitle) {
        // Use subtitle as body if nothing else
        bodyElements[0].content = aiContent.subtitle
      }

      // If there are additional body elements and two-column content
      if (bodyElements.length >= 2) {
        if (aiContent.leftColumn && aiContent.leftColumn.length > 0) {
          bodyElements[0].content = aiContent.leftColumn.map(b => `• ${b}`).join('\n')
        }
        if (aiContent.rightColumn && aiContent.rightColumn.length > 0) {
          bodyElements[1].content = aiContent.rightColumn.map(b => `• ${b}`).join('\n')
        }
      }
    }

    return clonedSlide
  })
}

// AI response types from backend
interface BackendSlideSpec {
  layout: string
  title: string
  subtitle?: string
  content?: string
  bullets?: string[]
  leftColumn?: string[]
  rightColumn?: string[]
  leftTitle?: string
  rightTitle?: string
  headers?: string[]
  rows?: string[][]
  items?: Array<{ date?: string; title: string; description?: string; icon?: string }>
  steps?: Array<{ title: string; description?: string }>
  data?: Array<{ label: string; value: number; percentage?: number }>
  metrics?: Array<{ label: string; value: string; trend?: string; trendValue?: string }>
  quadrants?: Array<{ title: string; items: string[] }>
  axisLabels?: { x: string; y: string }
  xAxisLabel?: string
  yAxisLabel?: string
  quote?: string
  attribution?: string
  source?: string
  imageKeywords?: string
  imageUrl?: string
  imageAttribution?: string
  // Feature grid / icon-bullets / branded-cover
  features?: Array<{ name: string; description: string; icon?: string }>
  bulletStyle?: 'arrow' | 'check' | 'circle'
  companyName?: string
  tagline?: string
  backgroundStyle?: 'dark' | 'light' | 'gradient'

  // Common professional fields
  sectionLabel?: string
  highlights?: string[]
  containerTitle?: string

  // Product Grid layout
  products?: Array<{ name: string; description: string; icon?: string }>

  // Statement layout
  statement?: string
  supportingFeatures?: Array<{ title: string; description: string }>

  // Two-Panel Features layout
  leftPanel?: {
    containerTitle?: string
    features: Array<{ name: string; description: string; icon?: string }>
  }
  rightPanel?: {
    title?: string
    highlights: Array<{ title: string; description: string }>
  }

  // Architecture Diagram layout
  centralConcept?: { title: string; subtitle?: string }
  leftConnector?: { label: string }
  rightConnector?: { label: string }
  bottomBar?: { label: string }
  leftBox?: { title: string; items: string[] }
  rightBox?: { title: string; items: string[] }

  // Layered Stack layout
  layers?: Array<{ label: string; description?: string; iconName?: string; color?: string }>
  orientation?: 'vertical' | 'horizontal'

  // Three-Column Comparison layout
  columns?: Array<{ title: string; subtitle?: string; points: Array<{ text: string; icon?: string }> }>
  highlightColumn?: number
  footnote?: string

  // Governance Badges layout
  badges?: Array<{ label: string; iconName: string; color?: string }>
  supportingPoints?: Array<{ title: string; description: string }>

  // Metrics Dashboard layout
  dashboardLayout?: '2x2' | '1x4' | '3x1' | '2x3'

  // Module Architecture layout
  centralModule?: { name: string; subtitle?: string }
  topModules?: Array<{ name: string; icon?: string }>
  leftModules?: Array<{ name: string; icon?: string }>
  rightModules?: Array<{ name: string; icon?: string }>
  bottomLabel?: string

  // Dual-Flow Comparison layout
  leftFlow?: {
    title: string
    subtitle?: string
    sections: Array<{ label: string; items: string[]; annotation?: string }>
  }
  rightFlow?: {
    title: string
    subtitle?: string
    sections: Array<{ label: string; items: string[]; annotation?: string }>
  }

  // Mobile Showcase layout
  appName?: string
  phonePosition?: 'left' | 'right' | 'center'
  phoneImageKeywords?: string

  // Numbered Features layout
  numberedFeatures?: Array<{ number: string | number; name: string; description: string; iconName?: string }>
  featuresLayout?: '2x2' | '2x3' | '3x2'
}

interface BackendGenerationResponse {
  title: string
  subtitle?: string
  slides: BackendSlideSpec[]
  sources?: string[]
  detectedStyle?: 'auto' | 'dark' | 'light' | 'branded'
}

/**
 * Call the document-service generate endpoint
 */
async function callDocumentServiceAPI(
  options: GenerationOptions,
  accessToken: string
): Promise<BackendGenerationResponse> {
  const baseUrl = getDocumentServiceApiUrl()
  const url = `${baseUrl}/slides/generate`

  const requestBody: Record<string, unknown> = {
    description: options.description,
    length: options.length,
    additionalRequirements: options.additionalRequirements,
    references: options.references,
    useWebSearch: options.useWebSearch
  }

  // Pass style preference to backend for professional layouts
  if (options.stylePreference && options.stylePreference !== 'auto') {
    requestBody.stylePreference = options.stylePreference
  }
  if (options.extractStyleFromReferences !== undefined) {
    requestBody.extractStyleFromReferences = options.extractStyleFromReferences
  }
  if (options.brandName) {
    requestBody.brandName = options.brandName
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Resolve localized fallback using getMessage if available
 */
function resolveFallback(
  key: string,
  fallback: string,
  getMessage?: (key: string, params?: Record<string, string>) => string
): string {
  return getMessage ? getMessage(key) : fallback
}

/**
 * Map backend slide spec to layout content for the layout service
 */
function mapToLayoutContent(
  spec: BackendSlideSpec,
  getMessage?: (key: string, params?: Record<string, string>) => string,
  effectiveStyle?: StylePreference
): SlideLayoutContent {
  const layout = spec.layout as SlideLayoutType
  const isDarkStyle = effectiveStyle === 'dark' || effectiveStyle === 'branded'

  switch (layout) {
    case 'title-cover':
      return {
        layout: 'title-cover',
        content: {
          title: spec.title,
          subtitle: spec.subtitle,
          imageKeywords: spec.imageKeywords
        }
      }

    case 'section-divider':
      return {
        layout: 'section-divider',
        content: {
          title: spec.title,
          description: spec.content || spec.subtitle
        }
      }

    case 'agenda': {
      // Ensure agenda has a proper title (not generic like "Slide 2")
      const agendaTitle =
        spec.title && !spec.title.toLowerCase().startsWith('slide ')
          ? spec.title
          : resolveFallback('generation-agenda', 'Agenda', getMessage)
      return {
        layout: 'agenda',
        content: {
          title: agendaTitle,
          items:
            spec.items?.map(i => ({ title: i.title, description: i.description })) ||
            spec.bullets?.map(b => ({ title: b })) ||
            []
        }
      }
    }

    case 'executive-summary':
      return {
        layout: 'executive-summary',
        content: {
          title: spec.title,
          keyMessage: spec.content || '',
          supportingPoints: [],
          conclusion: undefined
        }
      }

    case 'key-metrics':
      return {
        layout: 'key-metrics',
        content: {
          title: spec.title,
          metrics: (spec.metrics || []).map(m => ({
            label: m.label,
            value: m.value,
            trend: m.trend as 'up' | 'down' | 'neutral' | undefined,
            trendValue: m.trendValue
          })),
          source: spec.source
        }
      }

    case 'bullets':
      return {
        layout: 'bullets',
        content: {
          title: spec.title,
          bullets: spec.bullets || [],
          source: spec.source
        }
      }

    case 'two-column':
      return {
        layout: 'two-column',
        content: {
          title: spec.title,
          leftTitle: spec.leftTitle,
          leftItems: spec.leftColumn || [],
          rightTitle: spec.rightTitle,
          rightItems: spec.rightColumn || []
        }
      }

    case 'comparison':
      return {
        layout: 'comparison',
        content: {
          title: spec.title,
          leftTitle: spec.leftTitle || resolveFallback('generation-option-a', 'Option A', getMessage),
          leftItems: spec.leftColumn || [],
          rightTitle: spec.rightTitle || resolveFallback('generation-option-b', 'Option B', getMessage),
          rightItems: spec.rightColumn || []
        }
      }

    case 'data-table':
      return {
        layout: 'data-table',
        content: {
          title: spec.title,
          headers: spec.headers || [],
          rows: spec.rows || [],
          source: spec.source
        }
      }

    case 'timeline':
      return {
        layout: 'timeline',
        content: {
          title: spec.title,
          items: (spec.items || []).map(i => ({
            date: i.date || '',
            title: i.title,
            description: i.description
          }))
        }
      }

    case 'bar-chart':
      return {
        layout: 'bar-chart',
        content: {
          title: spec.title,
          data: spec.data || [],
          source: spec.source
        }
      }

    case 'pie-chart':
      return {
        layout: 'pie-chart',
        content: {
          title: spec.title,
          data: (spec.data || []).map(d => ({
            label: d.label,
            value: d.value,
            percentage: d.percentage
          })),
          source: spec.source
        }
      }

    case 'line-chart':
      return {
        layout: 'line-chart',
        content: {
          title: spec.title,
          data: spec.data || [],
          xAxisLabel: spec.xAxisLabel,
          yAxisLabel: spec.yAxisLabel,
          source: spec.source
        }
      }

    case 'process-flow':
      return {
        layout: 'process-flow',
        content: {
          title: spec.title,
          steps: spec.steps || []
        }
      }

    case 'image-left':
      return {
        layout: 'image-left',
        content: {
          title: spec.title,
          content: spec.content,
          bullets: spec.bullets,
          imageKeywords: spec.imageKeywords || spec.title.toLowerCase(),
          source: spec.source
        }
      }

    case 'image-right':
      return {
        layout: 'image-right',
        content: {
          title: spec.title,
          content: spec.content,
          bullets: spec.bullets,
          imageKeywords: spec.imageKeywords || spec.title.toLowerCase(),
          source: spec.source
        }
      }

    case 'full-image':
      return {
        layout: 'full-image',
        content: {
          title: spec.title,
          subtitle: spec.subtitle,
          imageKeywords: spec.imageKeywords || spec.title.toLowerCase()
        }
      }

    case 'quote':
      return {
        layout: 'quote',
        content: {
          quote: spec.quote || spec.content || '',
          attribution: spec.attribution || resolveFallback('generation-unknown', 'Unknown', getMessage),
          source: spec.source
        }
      }

    case 'key-takeaway':
      return {
        layout: 'key-takeaway',
        content: {
          title: spec.title,
          message: spec.content || '',
          supportingText: undefined
        }
      }

    case 'thank-you':
      return {
        layout: 'thank-you',
        content: {
          title: spec.title || resolveFallback('generation-thank-you', 'Thank You', getMessage),
          subtitle: spec.subtitle
        }
      }

    case 'feature-grid': {
      // Build features from features array (backend generated) or fallback to items/bullets
      let features: Array<{ name: string; description: string; icon: string }> = []
      if (spec.features && spec.features.length > 0) {
        // Use backend-generated features directly (with icons)
        features = spec.features.map(f => ({
          name: f.name,
          description: f.description || '',
          icon: f.icon || suggestIconForFeature(f.name)
        }))
      } else if (spec.items && spec.items.length > 0) {
        // Convert items to features
        features = spec.items.map(i => ({
          name: i.title,
          description: i.description || '',
          icon: i.icon || suggestIconForFeature(i.title)
        }))
      } else if (spec.bullets && spec.bullets.length > 0) {
        // Fallback: convert bullets to features
        features = spec.bullets.map(b => ({
          name: b,
          description: '',
          icon: suggestIconForFeature(b)
        }))
      }
      return {
        layout: 'feature-grid',
        content: {
          sectionTitle: spec.subtitle,
          title: spec.title,
          features,
          highlights: spec.items ? spec.bullets : undefined
        }
      }
    }

    case 'icon-bullets':
      return {
        layout: 'icon-bullets',
        content: {
          title: spec.title,
          items:
            spec.bullets?.map(b => ({
              text: b,
              icon: undefined
            })) || [],
          bulletStyle: spec.bulletStyle || 'arrow'
        }
      }

    case 'branded-cover':
      return {
        layout: 'branded-cover',
        content: {
          companyName: spec.companyName || spec.title,
          tagline: spec.tagline || spec.subtitle,
          subtitle: spec.subtitle,
          backgroundStyle: spec.backgroundStyle || (isDarkStyle ? 'dark' : 'light'),
          logoPosition: 'center' as const
        }
      }

    case 'product-grid':
      return {
        layout: 'product-grid',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          containerTitle: spec.containerTitle || spec.subtitle,
          products: (spec.products || spec.features || []).map(p => ({
            name: p.name,
            description: p.description || '',
            icon: p.icon
          })),
          highlights: spec.highlights || spec.bullets
        }
      }

    case 'statement':
      return {
        layout: 'statement',
        content: {
          statement: spec.statement || spec.content || spec.title,
          sectionLabel: spec.sectionLabel,
          subtitle: spec.subtitle,
          supportingFeatures:
            spec.supportingFeatures ||
            (spec.items || []).map(i => ({
              title: i.title,
              description: i.description || ''
            }))
        }
      }

    case 'two-panel-features':
      return {
        layout: 'two-panel-features',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          subtitle: spec.subtitle,
          leftPanel: spec.leftPanel || {
            containerTitle: spec.leftTitle,
            features: (spec.features || spec.items || []).map(f => ({
              name: f.name || f.title,
              description: f.description || '',
              icon: f.icon
            }))
          },
          rightPanel: spec.rightPanel || {
            title: spec.rightTitle,
            highlights: (spec.highlights || spec.bullets || []).map(h =>
              typeof h === 'string' ? { title: h, description: '' } : h
            )
          }
        }
      }

    case 'architecture-diagram':
      return {
        layout: 'architecture-diagram',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          centralConcept: spec.centralConcept || {
            title: spec.subtitle || spec.title,
            subtitle: spec.content
          },
          leftConnector: spec.leftConnector,
          rightConnector: spec.rightConnector,
          bottomBar: spec.bottomBar,
          leftBox: spec.leftBox,
          rightBox: spec.rightBox
        }
      }

    case 'layered-stack':
      return {
        layout: 'layered-stack',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          statement: spec.statement,
          layers: spec.layers || [],
          orientation: spec.orientation || 'vertical'
        }
      }

    case 'three-column-comparison':
      return {
        layout: 'three-column-comparison',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          columns: spec.columns || [
            { title: 'Option 1', points: [] },
            { title: 'Option 2', points: [] },
            { title: 'Option 3', points: [] }
          ],
          highlightColumn: spec.highlightColumn,
          footnote: spec.footnote
        }
      }

    case 'governance-badges':
      return {
        layout: 'governance-badges',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          badges: spec.badges || [],
          subtitle: spec.subtitle,
          supportingPoints: spec.supportingPoints
        }
      }

    case 'metrics-dashboard':
      return {
        layout: 'metrics-dashboard',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          metrics: (spec.metrics || []).map(m => ({
            value: m.value,
            label: m.label,
            description: m.description || '',
            iconName: m.iconName
          })),
          layout: spec.dashboardLayout || '2x2'
        }
      }

    case 'module-architecture':
      return {
        layout: 'module-architecture',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          centralModule: spec.centralModule,
          topModules: spec.topModules,
          leftModules: spec.leftModules,
          rightModules: spec.rightModules,
          bottomLabel: spec.bottomLabel
        }
      }

    case 'dual-flow-comparison':
      return {
        layout: 'dual-flow-comparison',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          leftFlow: spec.leftFlow || { title: 'Before', sections: [] },
          rightFlow: spec.rightFlow || { title: 'After', sections: [] },
          footnote: spec.footnote
        }
      }

    case 'mobile-showcase':
      return {
        layout: 'mobile-showcase',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          appName: spec.appName || spec.title,
          description: spec.content || spec.subtitle || '',
          features: spec.features || [],
          phonePosition: spec.phonePosition || 'left',
          phoneImageKeywords: spec.phoneImageKeywords
        }
      }

    case 'numbered-features':
      return {
        layout: 'numbered-features',
        content: {
          title: spec.title,
          sectionLabel: spec.sectionLabel,
          features: (spec.numberedFeatures || []).map(f => ({
            number: f.number,
            name: f.name,
            description: f.description,
            iconName: f.iconName
          })),
          layout: spec.featuresLayout || '2x3'
        }
      }

    default:
      // Fallback to bullets
      return {
        layout: 'bullets',
        content: {
          title: spec.title,
          bullets: spec.bullets || [spec.content || ''],
          source: spec.source
        }
      }
  }
}

/**
 * Suggest an icon name based on feature title
 */
function suggestIconForFeature(title: string): string {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('office') || lowerTitle.includes('document')) return 'file-text'
  if (lowerTitle.includes('drive') || lowerTitle.includes('file') || lowerTitle.includes('storage')) return 'hard-drive'
  if (lowerTitle.includes('ai') || lowerTitle.includes('intelligent')) return 'sparkles'
  if (lowerTitle.includes('chat') || lowerTitle.includes('message')) return 'message-circle'
  if (lowerTitle.includes('meeting') || lowerTitle.includes('video')) return 'video'
  if (lowerTitle.includes('calendar') || lowerTitle.includes('schedule')) return 'calendar'
  if (lowerTitle.includes('mail') || lowerTitle.includes('email') || lowerTitle.includes('box')) return 'inbox'
  if (lowerTitle.includes('page') || lowerTitle.includes('intranet') || lowerTitle.includes('web')) return 'globe'
  if (lowerTitle.includes('security') || lowerTitle.includes('secure')) return 'shield'
  if (lowerTitle.includes('cloud')) return 'cloud'
  if (lowerTitle.includes('mobile') || lowerTitle.includes('phone')) return 'smartphone'
  if (lowerTitle.includes('team') || lowerTitle.includes('collaboration')) return 'users'
  if (lowerTitle.includes('analytics') || lowerTitle.includes('report')) return 'bar-chart-2'
  if (lowerTitle.includes('setting') || lowerTitle.includes('config')) return 'settings'

  return 'check-circle'
}

/**
 * Transform backend slide specs to use professional layouts
 * based on style preference and visual style recommendations
 */
function transformSlidesToProfessionalLayouts(
  slides: BackendSlideSpec[],
  stylePreference?: StylePreference,
  visualStyle?: VisualStyleRecommendation
): BackendSlideSpec[] {
  const useProfessionalLayouts =
    stylePreference === 'dark' ||
    stylePreference === 'branded' ||
    visualStyle?.theme === 'newwork-dark' ||
    visualStyle?.hasFeatureGrid ||
    visualStyle?.hasIcons

  if (!useProfessionalLayouts) {
    return slides
  }

  console.log('[SlideGeneration] Transforming to professional layouts', { stylePreference, visualStyle })

  return slides.map((slide, index) => {
    const transformed = { ...slide }

    // Transform title-cover to branded-cover for first slide
    if (index === 0 && slide.layout === 'title-cover') {
      transformed.layout = 'branded-cover'
      console.log(`[SlideGeneration] Slide ${index}: title-cover -> branded-cover`)
      return transformed
    }

    // Transform bullets with multiple items array to feature-grid
    if (slide.layout === 'bullets' && slide.items && slide.items.length >= 3) {
      transformed.layout = 'feature-grid'
      console.log(`[SlideGeneration] Slide ${index}: bullets -> feature-grid (${slide.items.length} items)`)
      return transformed
    }

    // Transform bullets with 4+ bullet points to feature-grid (convert bullets to items)
    if (slide.layout === 'bullets' && slide.bullets && slide.bullets.length >= 4) {
      transformed.layout = 'feature-grid'
      // Convert bullets array to items array for feature-grid
      transformed.items = slide.bullets.map(bullet => ({
        title: bullet,
        description: ''
      }))
      console.log(
        `[SlideGeneration] Slide ${index}: bullets -> feature-grid (converted ${slide.bullets.length} bullets)`
      )
      return transformed
    }

    // Transform regular bullets (less than 4) to icon-bullets
    if (slide.layout === 'bullets' && slide.bullets && slide.bullets.length > 0) {
      transformed.layout = 'icon-bullets'
      console.log(`[SlideGeneration] Slide ${index}: bullets -> icon-bullets (${slide.bullets.length} bullets)`)
      return transformed
    }

    // Transform two-column layouts with items to feature-grid
    if (slide.layout === 'two-column' && slide.items && slide.items.length >= 4) {
      transformed.layout = 'feature-grid'
      console.log(`[SlideGeneration] Slide ${index}: two-column -> feature-grid`)
      return transformed
    }

    return transformed
  })
}

/**
 * Main generation function
 */
export async function generateSlides(
  options: GenerationOptions,
  accessToken: string,
  onProgress?: GenerationProgressCallback
): Promise<GenerationResult> {
  // Clear reference content cache for fresh fetch
  referenceContentCache.clear()

  let researchData: ResearchResult | undefined
  const sources: string[] = []
  let matchedTemplate: SlideTemplate | null = null

  // Phase 0: Template matching (if enabled, default: true)
  const useTemplateMatching = options.useTemplateMatching !== false

  if (useTemplateMatching) {
    onProgress?.('generation', 'progress-checking-templates')

    try {
      // Check for specific template ID first
      if (options.templateId) {
        SlidesApiService.setAccessToken(accessToken)
        matchedTemplate = await SlidesApiService.getTemplate(options.templateId)
        if (matchedTemplate) {
          console.log(`[SlideGeneration] Using specified template: "${matchedTemplate.name}"`)
        }
      } else {
        // Auto-match based on description
        matchedTemplate = await findMatchingTemplate(options.description, accessToken)
      }

      // Add template guidance to requirements
      if (matchedTemplate) {
        console.log(`[SlideGeneration] Matched template details:`, {
          id: matchedTemplate.id,
          name: matchedTemplate.name,
          themeId: matchedTemplate.contentJson.themeId,
          slideCount: matchedTemplate.contentJson.slides.length
        })
        const templateGuidance = formatTemplateGuidance(matchedTemplate)
        options = {
          ...options,
          additionalRequirements: `${options.additionalRequirements || ''}\n\n${templateGuidance}`,
          // Override length to match template slide count
          length:
            matchedTemplate.contentJson.slides.length <= 8
              ? 'short'
              : matchedTemplate.contentJson.slides.length <= 14
                ? 'medium'
                : 'long'
        }
        onProgress?.('generation', 'progress-using-template', {
          templateName: matchedTemplate.name
        })
      }
    } catch (err) {
      console.warn('[SlideGeneration] Template matching phase failed:', err)
    }
  }

  // Phase 0: Fetch reference content
  let fullReferenceContent = ''
  if (options.references && options.references.length > 0) {
    onProgress?.('research', 'progress-loading-references')

    try {
      // Fetch full content (no truncation) for research service
      fullReferenceContent = await fetchAndFormatReferences(
        options.references,
        accessToken,
        0, // No truncation for full content
        false // Don't truncate
      )

      // Create truncated version for document-service API (has 1000 char limit)
      const existingLength = (options.additionalRequirements || '').length
      const truncatedContent = await fetchAndFormatReferences(
        options.references,
        accessToken,
        existingLength,
        true // Truncate for API
      )
      if (truncatedContent) {
        options = {
          ...options,
          additionalRequirements: `${options.additionalRequirements || ''}${truncatedContent}`
        }
        console.log(
          `[SlideGeneration] Added ${options.references.length} reference(s) to prompt (truncated: ${truncatedContent.length} chars, full: ${fullReferenceContent.length} chars)`
        )
      }
    } catch (err) {
      console.error('[SlideGeneration] Failed to fetch reference content:', err)
    }
  }

  // Phase 1: Research (if web search enabled)
  if (options.useWebSearch) {
    onProgress?.('research', 'progress-search-info')

    try {
      researchData = await SlideResearchService.gatherResearch(
        {
          topic: options.description,
          additionalContext: options.additionalRequirements,
          referenceContent: fullReferenceContent || undefined,
          slideCount: SLIDE_COUNT_RANGES[options.length].target
        },
        accessToken,
        (msg, params) => onProgress?.('research', msg, params)
      )

      // Collect sources from research
      researchData.sources.forEach(s => sources.push(s.name))
      researchData.facts.forEach(f => {
        if (f.source && !sources.includes(f.source)) sources.push(f.source)
      })
      researchData.statistics.forEach(s => {
        if (s.source && !sources.includes(s.source)) sources.push(s.source)
      })

      // Add research data to additionalRequirements for the backend
      const researchContent = formatResearchForGeneration(researchData)
      options = {
        ...options,
        additionalRequirements: `${options.additionalRequirements || ''}\n\nRESEARCH DATA:\n${researchContent}`
      }
    } catch (err) {
      console.error('[SlideGeneration] Research phase failed:', err)
      onProgress?.('research', 'progress-web-search-failed')
    }
  }

  // Phase 2: Generate slides via document-service
  onProgress?.('generation', 'progress-generating')

  const apiResponse = await callDocumentServiceAPI(options, accessToken)

  // Collect sources from response
  if (apiResponse.sources) {
    apiResponse.sources.forEach(s => {
      if (!sources.includes(s)) sources.push(s)
    })
  }

  // Phase 2.5: Transform layouts based on style preference or detected style
  const transformedSlides = transformSlidesToProfessionalLayouts(
    apiResponse.slides,
    options.stylePreference || apiResponse.detectedStyle,
    researchData?.visualStyle
  )

  // Phase 3: Convert to slide data
  onProgress?.('validation', 'progress-building')

  let slides: SlideData[]

  // Determine theme based on style preference or backend-detected style
  const effectiveStyle = options.stylePreference || apiResponse.detectedStyle
  let effectiveTheme = options.theme
  if (effectiveStyle === 'dark' || effectiveStyle === 'branded') {
    // Use NEWWORK dark theme for dark/branded style
    effectiveTheme = {
      id: 'newwork-dark',
      name: 'NEWWORK Dark',
      preview: { primary: '#e91e8c', secondary: '#f5a623', background: '#0a0a0a' },
      theme: {
        colors: {
          primary: '#ffffff',
          secondary: '#e91e8c',
          tertiary: '#0a0a0a',
          quaternary: '#f5a623'
        },
        fonts: {
          header: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
          text: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
          monospace: '"Fira Code", "Monaco", monospace'
        },
        fontSizes: {
          h1: '72px',
          h2: '56px',
          h3: '40px',
          text: '32px',
          monospace: '24px'
        }
      }
    }
    console.log(`[SlideGeneration] Using dark theme (effectiveStyle: ${effectiveStyle})`)
  }

  if (matchedTemplate && matchedTemplate.contentJson.slides.length > 0) {
    // Use template slides as base, populate with AI-generated content
    // This preserves the template's visual design (backgrounds, layouts, element positions)
    slides = populateTemplateWithContent(matchedTemplate.contentJson.slides, transformedSlides)
    console.log(`[SlideGeneration] Populated ${slides.length} template slides with AI content`)
  } else {
    // No template - generate slides from scratch using layout service
    slides = transformedSlides.map((spec, index) => {
      const layoutContent = mapToLayoutContent(spec, options.getMessage, effectiveStyle)
      return generateSlideFromLayout(layoutContent, index, effectiveTheme)
    })
  }

  const result = {
    slides,
    title: apiResponse.title || options.description.substring(0, 50),
    sources: sources.length > 0 ? sources : undefined,
    researchData,
    matchedTemplate: matchedTemplate
      ? {
          id: matchedTemplate.id,
          name: matchedTemplate.name,
          themeId: matchedTemplate.contentJson.themeId
        }
      : undefined
  }
  return result
}

// Export service object
export const SlideGenerationService = {
  generateSlides
}

export default SlideGenerationService
