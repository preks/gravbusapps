/**
 * SpeakerNotesService - AI-generated speaker notes for slides
 *
 * Generates talking points, timing suggestions, and transition phrases
 * for presentation slides using the FlowBot chat API.
 */

import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import type { SlideData, TextElement } from '../components/slideElements'

export interface SpeakerNote {
  slideId: string
  talkingPoints: string[]
  transitionPhrase?: string
  timingSuggestion?: string
  fullText: string
}

export interface SpeakerNotesOptions {
  slides: SlideData[]
  presentationTopic: string
  targetAudience?: 'executive' | 'technical' | 'sales' | 'general'
  totalDuration?: number
}

/**
 * Extract text content from a slide for context
 */
function extractSlideContent(slide: SlideData): {
  title: string
  content: string[]
  hasChart: boolean
  hasImage: boolean
} {
  let title = ''
  const content: string[] = []
  let hasChart = false
  let hasImage = false

  for (const element of slide.elements) {
    if (element.type === 'text') {
      const textEl = element as TextElement
      if (textEl.fontSize && textEl.fontSize >= 36 && !title) {
        title = textEl.content
      } else if (textEl.content && textEl.content.length > 10) {
        content.push(textEl.content)
      }
    } else if (element.type === 'chart') {
      hasChart = true
    } else if (element.type === 'image') {
      hasImage = true
    }
  }

  return { title, content, hasChart, hasImage }
}

/**
 * Build prompt for generating speaker notes
 */
function buildSpeakerNotesPrompt(options: SpeakerNotesOptions): string {
  const { slides, presentationTopic, targetAudience = 'general', totalDuration } = options

  const slideSummaries = slides.map((slide, index) => {
    const { title, content, hasChart, hasImage } = extractSlideContent(slide)
    let summary = `Slide ${index + 1}: "${title || 'Untitled'}"`
    if (content.length > 0) {
      summary += `\n  Content: ${content.slice(0, 3).join('; ').substring(0, 200)}`
    }
    if (hasChart) summary += '\n  [Contains chart/data visualization]'
    if (hasImage) summary += '\n  [Contains image]'
    return summary
  })

  const perSlideTime = totalDuration ? Math.round(totalDuration / slides.length) : 2

  const prompt = `Generate speaker notes for a ${slides.length}-slide presentation about "${presentationTopic}".

TARGET AUDIENCE: ${targetAudience}
${totalDuration ? `TOTAL DURATION: ${totalDuration} minutes (approximately ${perSlideTime} min per slide)` : ''}

SLIDE OVERVIEW:
${slideSummaries.join('\n\n')}

For EACH slide, provide:
1. **TALKING POINTS** (3-5 bullet points)
   - Key things to say when presenting this slide
   - Specific data callouts if there's a chart
   - Engaging questions or statements to connect with the audience

2. **TIMING** 
   - Suggested time to spend on this slide

3. **TRANSITION**
   - A natural transition phrase to the next slide

FORMAT YOUR RESPONSE AS:
---SLIDE 1---
TALKING POINTS:
• [point 1]
• [point 2]
• [point 3]
TIMING: [X minutes]
TRANSITION: [phrase to next slide]

---SLIDE 2---
...and so on

AUDIENCE-SPECIFIC GUIDANCE:
${getAudienceGuidance(targetAudience)}

Please generate professional, engaging speaker notes that will help the presenter deliver this content effectively.`

  return prompt
}

/**
 * Get audience-specific guidance for the prompt
 */
function getAudienceGuidance(audience: string): string {
  switch (audience) {
    case 'executive':
      return `- Focus on business impact, ROI, and strategic value
- Keep technical details minimal
- Emphasize key metrics and bottom-line results
- Use confident, decisive language`
    case 'technical':
      return `- Include technical details and specifications
- Explain the "how" behind features
- Reference technical standards or benchmarks
- Allow time for technical questions`
    case 'sales':
      return `- Focus on customer benefits and value proposition
- Include competitive differentiators
- Use persuasive language and calls-to-action
- Prepare for objection handling`
    default:
      return `- Balance technical and business content
- Use clear, accessible language
- Include relevant examples
- Engage with questions`
  }
}

/**
 * Parse AI response into structured speaker notes
 */
function parseSpeakerNotesResponse(rawContent: string, slideCount: number): SpeakerNote[] {
  const notes: SpeakerNote[] = []

  const slidePattern = /---SLIDE\s*(\d+)---/gi
  const sections = rawContent.split(slidePattern)

  for (let i = 1; i < sections.length; i += 2) {
    const slideNumber = parseInt(sections[i], 10)
    const content = sections[i + 1] || ''

    const talkingPoints: string[] = []
    let timing = ''
    let transition = ''

    const lines = content.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.toUpperCase().includes('TALKING POINTS')) {
        currentSection = 'points'
        continue
      } else if (trimmed.toUpperCase().includes('TIMING')) {
        currentSection = 'timing'
        const timingMatch = trimmed.match(/TIMING[:\s]+(.+)/i)
        if (timingMatch) {
          timing = timingMatch[1].trim()
        }
        continue
      } else if (trimmed.toUpperCase().includes('TRANSITION')) {
        currentSection = 'transition'
        const transitionMatch = trimmed.match(/TRANSITION[:\s]+(.+)/i)
        if (transitionMatch) {
          transition = transitionMatch[1].trim()
        }
        continue
      }

      if (currentSection === 'points') {
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
          talkingPoints.push(trimmed.replace(/^[•\-*]\s*/, '').trim())
        }
      } else if (currentSection === 'timing' && !timing && trimmed) {
        timing = trimmed
      } else if (currentSection === 'transition' && !transition && trimmed) {
        transition = trimmed
      }
    }

    const fullText =
      talkingPoints.length > 0
        ? talkingPoints.map(p => `• ${p}`).join('\n') +
          (timing ? `\n\n[Time: ${timing}]` : '') +
          (transition ? `\n\n→ ${transition}` : '')
        : ''

    notes.push({
      slideId: `slide-${slideNumber}`,
      talkingPoints,
      timingSuggestion: timing || undefined,
      transitionPhrase: transition || undefined,
      fullText
    })
  }

  // Ensure we have notes for all slides
  while (notes.length < slideCount) {
    notes.push({
      slideId: `slide-${notes.length + 1}`,
      talkingPoints: [],
      fullText: ''
    })
  }

  return notes.slice(0, slideCount)
}

/**
 * Generate speaker notes for slides using AI
 */
export async function generateSpeakerNotes(options: SpeakerNotesOptions, accessToken: string): Promise<SpeakerNote[]> {
  const baseUrl = resolveFlowbotBaseUrl()
  const url = `${baseUrl}/flowbot/api/agent/v2/chat`

  const prompt = buildSpeakerNotesPrompt(options)

  const form = new FormData()
  form.append('session_id', '')
  form.append('user_input_text', prompt)
  form.append('llm_model', 'gpt-5.4')
  form.append('use_web_search_tool', 'false')
  form.append('current_page_context', JSON.stringify({ type: 'unknown' }))

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream'
    },
    body: form
  })

  if (!response.ok) {
    throw new Error(`Speaker Notes API error: ${response.status} ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body from Speaker Notes API')
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let fullContent = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += value
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      let data = ''

      for (const rawLine of part.split('\n')) {
        const line = rawLine.replace(/\r$/, '')
        if (line.startsWith('data:')) {
          data += line.slice(5).trimStart()
        }
      }

      if (data) {
        try {
          const output = JSON.parse(data)
          if (output.type === 'answer' && output.displayData) {
            for (const displayItem of output.displayData) {
              if (displayItem.type === 'text_block' && displayItem.content) {
                fullContent += displayItem.content + '\n'
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return parseSpeakerNotesResponse(fullContent, options.slides.length)
}

/**
 * Generate simple speaker notes without AI (fallback)
 */
export function generateBasicSpeakerNotes(slide: SlideData, slideIndex: number): string {
  const { title, content, hasChart, hasImage } = extractSlideContent(slide)

  let notes = ''

  if (title) {
    notes += `• Introduce the topic: "${title}"\n`
  }

  if (hasChart) {
    notes += `• Walk through the data visualization - highlight key trends\n`
    notes += `• Point out the most significant data points\n`
  }

  if (hasImage) {
    notes += `• Reference the visual to reinforce your point\n`
  }

  if (content.length > 0) {
    notes += `• Cover the main points:\n`
    content.slice(0, 3).forEach(c => {
      const truncated = c.length > 50 ? c.substring(0, 50) + '...' : c
      notes += `  - ${truncated}\n`
    })
  }

  notes += `\n[Suggested time: ~2 minutes]`

  if (slideIndex > 0) {
    notes += `\n\n→ Transition to next topic`
  }

  return notes
}

/**
 * Apply speaker notes to slides
 */
export function applySpeakerNotesToSlides(slides: SlideData[], notes: SpeakerNote[]): SlideData[] {
  return slides.map((slide, index) => {
    const note = notes[index]
    if (note && note.fullText) {
      return {
        ...slide,
        notes: note.fullText
      }
    }
    return slide
  })
}

export const SpeakerNotesService = {
  generateSpeakerNotes,
  generateBasicSpeakerNotes,
  applySpeakerNotesToSlides
}

export default SpeakerNotesService
