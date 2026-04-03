/**
 * SlideStyleExtractionService - Extract visual style from reference materials
 *
 * Analyzes PDFs and other reference content to detect colors, themes,
 * branding, and layout patterns for AI-guided slide generation.
 */

import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

export interface ExtractedStyle {
  dominantColors: string[]
  isDarkTheme: boolean
  brandName?: string
  brandColors?: {
    primary: string
    secondary: string
  }
  suggestedTheme: string
  layoutHints: {
    hasIcons: boolean
    hasFeatureGrid: boolean
    hasGradients: boolean
    hasMultiColumn: boolean
  }
}

export interface StyleExtractionOptions {
  content: string
  contentType?: 'pdf' | 'document' | 'text'
}

/**
 * Build prompt for visual style analysis
 */
function buildStyleAnalysisPrompt(content: string): string {
  return `Analyze the following document content and extract visual style information for creating a professional presentation.

DOCUMENT CONTENT:
${content.substring(0, 8000)}

Please analyze and provide:

1. COLOR SCHEME:
- Is this a dark or light themed document?
- What are the dominant colors used? (provide hex codes if possible)
- Identify any brand colors

2. BRANDING:
- What is the company/brand name if visible?
- Any taglines or slogans?

3. LAYOUT PATTERNS:
- Does it use icon-based feature lists?
- Does it have multi-column layouts?
- Does it use gradient backgrounds?
- Does it have feature/product grids?

4. TYPOGRAPHY:
- Is the style modern, corporate, creative, or minimal?

Respond in this EXACT format:
THEME: dark|light
PRIMARY_COLOR: #hexcode
SECONDARY_COLOR: #hexcode
BRAND_NAME: Company Name (or NONE)
HAS_ICONS: true|false
HAS_FEATURE_GRID: true|false
HAS_GRADIENTS: true|false
HAS_MULTI_COLUMN: true|false
SUGGESTED_THEME: newwork-dark|newwork-light|corporate|dark|minimal
STYLE_NOTES: Brief description of the visual style`
}

/**
 * Parse style analysis response
 */
function parseStyleResponse(response: string): ExtractedStyle {
  const result: ExtractedStyle = {
    dominantColors: [],
    isDarkTheme: false,
    suggestedTheme: 'corporate',
    layoutHints: {
      hasIcons: false,
      hasFeatureGrid: false,
      hasGradients: false,
      hasMultiColumn: false
    }
  }

  const lines = response.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('THEME:')) {
      const value = trimmed.replace('THEME:', '').trim().toLowerCase()
      result.isDarkTheme = value === 'dark'
    }

    if (trimmed.startsWith('PRIMARY_COLOR:')) {
      const color = trimmed.replace('PRIMARY_COLOR:', '').trim()
      if (color.startsWith('#')) {
        result.dominantColors.push(color)
        if (!result.brandColors) result.brandColors = { primary: color, secondary: color }
        else result.brandColors.primary = color
      }
    }

    if (trimmed.startsWith('SECONDARY_COLOR:')) {
      const color = trimmed.replace('SECONDARY_COLOR:', '').trim()
      if (color.startsWith('#')) {
        result.dominantColors.push(color)
        if (result.brandColors) result.brandColors.secondary = color
      }
    }

    if (trimmed.startsWith('BRAND_NAME:')) {
      const name = trimmed.replace('BRAND_NAME:', '').trim()
      if (name && name.toUpperCase() !== 'NONE') {
        result.brandName = name
      }
    }

    if (trimmed.startsWith('HAS_ICONS:')) {
      result.layoutHints.hasIcons = trimmed.includes('true')
    }

    if (trimmed.startsWith('HAS_FEATURE_GRID:')) {
      result.layoutHints.hasFeatureGrid = trimmed.includes('true')
    }

    if (trimmed.startsWith('HAS_GRADIENTS:')) {
      result.layoutHints.hasGradients = trimmed.includes('true')
    }

    if (trimmed.startsWith('HAS_MULTI_COLUMN:')) {
      result.layoutHints.hasMultiColumn = trimmed.includes('true')
    }

    if (trimmed.startsWith('SUGGESTED_THEME:')) {
      result.suggestedTheme = trimmed.replace('SUGGESTED_THEME:', '').trim()
    }
  }

  return result
}

/**
 * Extract visual style from reference content using AI
 */
export async function extractStyleFromContent(
  options: StyleExtractionOptions,
  accessToken: string,
  onProgress?: (message: string) => void
): Promise<ExtractedStyle> {
  const flowbotUrl = resolveFlowbotBaseUrl()

  onProgress?.('Analyzing visual style...')

  const form = new FormData()
  form.append('message', buildStyleAnalysisPrompt(options.content))
  form.append('llm_model', 'gpt-5.4')
  form.append('use_web_search', 'false')
  form.append('language', 'en')

  try {
    const response = await fetch(`${flowbotUrl}/api/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    })

    if (!response.ok) {
      console.warn('[StyleExtraction] API request failed:', response.status)
      return getDefaultStyle()
    }

    const data = await response.json()
    const content = data.result?.message || data.message || ''

    onProgress?.('Style analysis complete')

    return parseStyleResponse(content)
  } catch (error) {
    console.error('[StyleExtraction] Error:', error)
    return getDefaultStyle()
  }
}

/**
 * Get default style when extraction fails
 */
function getDefaultStyle(): ExtractedStyle {
  return {
    dominantColors: ['#1e3a5f', '#3b82f6'],
    isDarkTheme: false,
    suggestedTheme: 'corporate',
    layoutHints: {
      hasIcons: false,
      hasFeatureGrid: false,
      hasGradients: false,
      hasMultiColumn: false
    }
  }
}

/**
 * Detect if content suggests a NEWWORK branded presentation
 */
export function detectNewworkBranding(content: string): boolean {
  const lowerContent = content.toLowerCase()
  return (
    lowerContent.includes('newwork') ||
    lowerContent.includes('everyday') ||
    lowerContent.includes('everyoffice') ||
    lowerContent.includes('everydrive') ||
    lowerContent.includes('everyai') ||
    lowerContent.includes('souverän')
  )
}

/**
 * Suggest theme based on extracted style and content
 */
export function suggestTheme(style: ExtractedStyle, content: string): string {
  if (detectNewworkBranding(content)) {
    return style.isDarkTheme ? 'newwork-dark' : 'newwork-light'
  }

  if (style.isDarkTheme) {
    return 'dark'
  }

  if (style.layoutHints.hasGradients) {
    return 'gradient'
  }

  return style.suggestedTheme || 'corporate'
}

/**
 * Format extracted style for generation prompt
 */
export function formatStyleForPrompt(style: ExtractedStyle): string {
  const lines: string[] = []

  lines.push('VISUAL STYLE GUIDANCE:')

  if (style.isDarkTheme) {
    lines.push('- Use dark theme with light text on dark backgrounds')
  } else {
    lines.push('- Use light theme with dark text on light backgrounds')
  }

  if (style.brandName) {
    lines.push(`- Brand: ${style.brandName}`)
  }

  if (style.brandColors) {
    lines.push(`- Primary color: ${style.brandColors.primary}`)
    lines.push(`- Secondary color: ${style.brandColors.secondary}`)
  }

  if (style.layoutHints.hasFeatureGrid) {
    lines.push('- Use feature-grid layout for product/feature listings')
  }

  if (style.layoutHints.hasIcons) {
    lines.push('- Include icons with bullet points and features')
    lines.push('- Use icon-bullets layout instead of plain bullets')
  }

  if (style.layoutHints.hasMultiColumn) {
    lines.push('- Use multi-column layouts where appropriate')
  }

  lines.push(`- Suggested theme: ${style.suggestedTheme}`)

  return lines.join('\n')
}

export const SlideStyleExtractionService = {
  extractStyleFromContent,
  detectNewworkBranding,
  suggestTheme,
  formatStyleForPrompt,
  getDefaultStyle
}

export default SlideStyleExtractionService
