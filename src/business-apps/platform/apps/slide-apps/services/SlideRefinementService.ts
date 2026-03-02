/**
 * SlideRefinementService - AI-powered slide refinement
 *
 * Allows users to refine individual slides by providing instructions
 * for improvements, layout changes, or content updates.
 *
 * Uses the existing /slides/generate endpoint by passing the current
 * slide content as context and requesting a single refined slide.
 */

import type { SlideData, TextElement } from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'
import { generateSlides } from './SlideGenerationService'

export interface SerializedSlideContent {
  textContent: string
  hasImage: boolean
  hasTable: boolean
  hasChart: boolean
  hasCode: boolean
  elementCount: number
}

/**
 * Serialize slide content for AI understanding
 */
export function serializeSlideForAI(slide: SlideData): SerializedSlideContent {
  let textContent = ''

  // Extract text content with hierarchy hints
  const textElements = slide.elements
    .filter((e): e is TextElement => e.type === 'text')
    .sort((a, b) => a.position.y - b.position.y)

  textElements.forEach(el => {
    if (el.fontSize >= 40) {
      textContent += `Title: ${el.content}\n`
    } else if (el.fontSize >= 28) {
      textContent += `Subtitle: ${el.content}\n`
    } else if (el.content.startsWith('•') || el.content.includes('\n•')) {
      textContent += `Bullets:\n${el.content}\n`
    } else {
      textContent += `Content: ${el.content}\n`
    }
  })

  // Detect element types
  const hasImage = slide.elements.some(e => e.type === 'image')
  const hasTable = slide.elements.some(e => e.type === 'table')
  const hasCode = slide.elements.some(e => e.type === 'code')

  // Detect charts (shapes that look like chart elements)
  const shapeElements = slide.elements.filter(e => e.type === 'shape')
  const hasChart = shapeElements.length > 5

  if (hasImage) textContent += '\n[Contains image]\n'
  if (hasTable) textContent += '[Contains data table]\n'
  if (hasChart) textContent += '[Contains chart/visualization]\n'
  if (hasCode) textContent += '[Contains code block]\n'

  return {
    textContent: textContent.trim(),
    hasImage,
    hasTable,
    hasChart,
    hasCode,
    elementCount: slide.elements.length
  }
}

export interface RefineSlideOptions {
  slide: SlideData
  instructions: string
  useWebSearch?: boolean
  theme?: SlideTheme
}

export interface RefineSlideResult {
  slide: SlideData
  sources?: string[]
}

/**
 * Extract the main topic/title from the serialized content
 */
function extractMainTopic(serializedContent: string): string {
  const lines = serializedContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('Title: ')) {
      return line.replace('Title: ', '').trim()
    }
  }
  // Fallback: use first non-empty line
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('[')) {
      return trimmed.replace(/^(Title|Subtitle|Content|Bullets):?\s*/i, '')
    }
  }
  return 'Presentation slide'
}

/**
 * Apply refined content from AI to the original slide, preserving visual design
 * This keeps the original slide's backgrounds, shapes, positions, and colors
 * while updating only the text content
 */
function applyRefinedContentToOriginal(originalSlide: SlideData, refinedSlide: SlideData): SlideData {
  // Deep clone the original slide to preserve all visual elements
  const result: SlideData = JSON.parse(JSON.stringify(originalSlide))

  // Get text elements from both slides, sorted by position (top to bottom)
  const originalTextElements = result.elements
    .filter((e): e is TextElement => e.type === 'text')
    .sort((a, b) => a.position.y - b.position.y)

  const refinedTextElements = refinedSlide.elements
    .filter((e): e is TextElement => e.type === 'text')
    .sort((a, b) => a.position.y - b.position.y)

  if (originalTextElements.length === 0 || refinedTextElements.length === 0) {
    return result
  }

  // Match text elements by role (title, subtitle, body) based on font size and position
  const categorizeElement = (el: TextElement): 'title' | 'subtitle' | 'body' => {
    if (el.fontSize >= 40) return 'title'
    if (el.fontSize >= 28) return 'subtitle'
    return 'body'
  }

  // Group elements by category
  const originalByCategory = {
    title: originalTextElements.filter(e => categorizeElement(e) === 'title'),
    subtitle: originalTextElements.filter(e => categorizeElement(e) === 'subtitle'),
    body: originalTextElements.filter(e => categorizeElement(e) === 'body')
  }

  const refinedByCategory = {
    title: refinedTextElements.filter(e => categorizeElement(e) === 'title'),
    subtitle: refinedTextElements.filter(e => categorizeElement(e) === 'subtitle'),
    body: refinedTextElements.filter(e => categorizeElement(e) === 'body')
  }

  // Update content for each category, matching by index within category
  for (const category of ['title', 'subtitle', 'body'] as const) {
    const originals = originalByCategory[category]
    const refined = refinedByCategory[category]

    originals.forEach((originalEl, index) => {
      if (refined[index]) {
        // Update only the content, keep all styling and position
        originalEl.content = refined[index].content
      }
    })
  }

  return result
}

/**
 * Main refinement function - uses the generate endpoint with current slide as context
 */
export async function refineSlide(
  options: RefineSlideOptions,
  accessToken: string,
  onProgress?: (message: string) => void
): Promise<RefineSlideResult> {
  onProgress?.('Analyzing current slide...')

  // Serialize current slide for AI context
  const serializedSlide = serializeSlideForAI(options.slide)

  onProgress?.('Refining slide...')

  // Extract the original topic from the slide
  const originalTopic = extractMainTopic(serializedSlide.textContent)

  // The description should be the ORIGINAL slide topic - this is what the AI will base the slide on
  const description = originalTopic

  // Put ALL the refinement instructions in additionalRequirements
  const additionalRequirements = `THIS IS A SLIDE REFINEMENT TASK - NOT A NEW PRESENTATION.

ORIGINAL SLIDE CONTENT TO IMPROVE:
${serializedSlide.textContent}

USER'S MODIFICATION REQUEST:
"${options.instructions}"

INSTRUCTIONS:
1. Generate exactly 1 slide only
2. Keep the SAME topic and subject matter as the original slide above
3. Apply the user's modification request to IMPROVE the slide
4. Do NOT change the topic - only improve HOW it's presented
5. The user's request describes HOW to change the slide, not WHAT the slide should be about
${serializedSlide.hasImage ? '6. The original slide has an image - consider keeping visual elements' : ''}
${serializedSlide.hasChart ? '6. The original slide has a chart - consider keeping or enhancing the data visualization' : ''}
${serializedSlide.hasTable ? '6. The original slide has a table - consider keeping or enhancing the tabular data' : ''}`

  // Use the existing generate endpoint with "short" length (minimum slides)
  // Disable template matching for refinement to avoid exceeding additionalRequirements limit
  const result = await generateSlides(
    {
      description,
      length: 'short',
      additionalRequirements,
      useWebSearch: options.useWebSearch,
      theme: options.theme,
      useTemplateMatching: false
    },
    accessToken,
    phase => {
      if (phase === 'generation') onProgress?.('Refining slide...')
      else if (phase === 'validation') onProgress?.('Building refined slide...')
    }
  )

  onProgress?.('Building refined slide...')

  // Take the first slide from the result
  if (result.slides.length === 0) {
    throw new Error('No slide was generated')
  }

  // Apply refined content to original slide, preserving visual design (backgrounds, shapes, colors)
  const refinedSlide = applyRefinedContentToOriginal(options.slide, result.slides[0])

  return {
    slide: refinedSlide,
    sources: result.sources
  }
}

// Export service object
export const SlideRefinementService = {
  refineSlide,
  serializeSlideForAI
}

export default SlideRefinementService
