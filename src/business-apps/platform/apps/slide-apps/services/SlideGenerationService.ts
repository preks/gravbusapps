/**
 * SlideGenerationService - Enterprise-grade AI slide generation
 *
 * Uses dedicated document-service endpoint for reliable generation.
 * Optionally uses research service for web search data gathering.
 */

import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { SlideData } from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'
import { SlideResearchService, formatResearchForGeneration, type ResearchResult } from './SlideResearchService'
import { generateSlideFromLayout, type SlideLayoutContent, type SlideLayoutType } from './SlideLayoutService'

// Content types for references
export type ContentType = 'document' | 'spreadsheet' | 'note' | 'slides'

export interface ContentReference {
  id: string
  type: ContentType
  title: string
}

export interface GenerationOptions {
  description: string
  length: 'short' | 'medium' | 'long'
  additionalRequirements?: string
  references?: ContentReference[]
  useWebSearch?: boolean
  theme?: SlideTheme
}

export interface GenerationResult {
  slides: SlideData[]
  title: string
  sources?: string[]
  researchData?: ResearchResult
}

export type GenerationProgressCallback = (phase: 'research' | 'generation' | 'validation', message: string) => void

// Slide count ranges
const SLIDE_COUNT_RANGES = {
  short: { min: 5, max: 8, target: 7 },
  medium: { min: 9, max: 14, target: 12 },
  long: { min: 15, max: 25, target: 20 }
} as const

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
  items?: Array<{ date?: string; title: string; description?: string }>
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
}

interface BackendGenerationResponse {
  title: string
  subtitle?: string
  slides: BackendSlideSpec[]
  sources?: string[]
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

  const requestBody = {
    description: options.description,
    length: options.length,
    additionalRequirements: options.additionalRequirements,
    references: options.references,
    useWebSearch: options.useWebSearch
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
 * Map backend slide spec to layout content for the layout service
 */
function mapToLayoutContent(spec: BackendSlideSpec): SlideLayoutContent {
  const layout = spec.layout as SlideLayoutType

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

    case 'agenda':
      return {
        layout: 'agenda',
        content: {
          title: spec.title,
          items:
            spec.items?.map(i => ({ title: i.title, description: i.description })) ||
            spec.bullets?.map(b => ({ title: b })) ||
            []
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
          leftTitle: spec.leftTitle || 'Option A',
          leftItems: spec.leftColumn || [],
          rightTitle: spec.rightTitle || 'Option B',
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
          attribution: spec.attribution || 'Unknown',
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
          title: spec.title || 'Thank You',
          subtitle: spec.subtitle
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
 * Main generation function
 */
export async function generateSlides(
  options: GenerationOptions,
  accessToken: string,
  onProgress?: GenerationProgressCallback
): Promise<GenerationResult> {
  let researchData: ResearchResult | undefined
  const sources: string[] = []

  // Phase 1: Research (if web search enabled)
  if (options.useWebSearch) {
    onProgress?.('research', 'Searching the web for information...')

    try {
      researchData = await SlideResearchService.gatherResearch(
        {
          topic: options.description,
          additionalContext: options.additionalRequirements,
          slideCount: SLIDE_COUNT_RANGES[options.length].target
        },
        accessToken,
        msg => onProgress?.('research', msg)
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
      onProgress?.('research', 'Web search failed, continuing without research data')
    }
  }

  // Phase 2: Generate slides via document-service
  onProgress?.('generation', 'Generating presentation...')

  const apiResponse = await callDocumentServiceAPI(options, accessToken)

  // Collect sources from response
  if (apiResponse.sources) {
    apiResponse.sources.forEach(s => {
      if (!sources.includes(s)) sources.push(s)
    })
  }

  // Phase 3: Convert to slide data using layout service
  onProgress?.('validation', 'Building slides...')

  const slides: SlideData[] = apiResponse.slides.map((spec, index) => {
    const layoutContent = mapToLayoutContent(spec)
    return generateSlideFromLayout(layoutContent, index, options.theme)
  })

  return {
    slides,
    title: apiResponse.title || options.description.substring(0, 50),
    sources: sources.length > 0 ? sources : undefined,
    researchData
  }
}

// Export service object
export const SlideGenerationService = {
  generateSlides
}

export default SlideGenerationService
