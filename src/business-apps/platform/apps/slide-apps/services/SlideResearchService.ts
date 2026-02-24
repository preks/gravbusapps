/**
 * SlideResearchService - Web search integration for slide generation
 *
 * Uses the FlowBot chat API with web search enabled to gather real data,
 * statistics, quotes, and sources for presentation content.
 */

import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

// Research result types
export interface ResearchFact {
  statement: string
  source: string
  url?: string
}

export interface ResearchStatistic {
  metric: string
  value: string
  context: string
  source: string
  url?: string
}

export interface ResearchQuote {
  text: string
  attribution: string
  source: string
}

export interface ResearchImage {
  description: string
  suggestedKeywords: string
}

export interface ResearchResult {
  topic: string
  summary: string
  facts: ResearchFact[]
  statistics: ResearchStatistic[]
  quotes: ResearchQuote[]
  images: ResearchImage[]
  sources: Array<{ name: string; url?: string }>
  rawContent: string
}

export interface ResearchOptions {
  topic: string
  additionalContext?: string
  referenceContent?: string
  slideCount: number
}

// Progress callback for UI updates (message = i18n key, params = optional variables)
export type ResearchProgressCallback = (message: string, params?: Record<string, string>) => void

/**
 * Build the research prompt that instructs the AI to gather real data
 */
function buildResearchPrompt(options: ResearchOptions): string {
  const { topic, additionalContext, referenceContent, slideCount } = options

  let prompt = `I need to create a professional presentation about: "${topic}"

The presentation will have approximately ${slideCount} slides.

Please research this topic thoroughly and provide me with:

1. **KEY FACTS** (at least 8-10 facts)
   - Real, verifiable facts about the topic
   - Include the source for each fact
   - Format: "Fact: [statement] | Source: [source name] | URL: [url if available]"

2. **STATISTICS & DATA** (at least 5-7 statistics)
   - Current statistics, percentages, numbers related to the topic
   - Include context and source for each
   - Format: "Stat: [metric] = [value] | Context: [context] | Source: [source] | URL: [url]"

3. **NOTABLE QUOTES** (2-3 quotes)
   - Relevant quotes from experts, leaders, or publications
   - Format: "Quote: [text] | By: [attribution] | Source: [source]"

4. **IMAGE SUGGESTIONS** (4-6 suggestions)
   - Describe images that would complement the content
   - Provide search keywords for each
   - Format: "Image: [description] | Keywords: [search keywords]"

5. **SUMMARY**
   - A brief executive summary of the topic (2-3 paragraphs)

IMPORTANT RULES:
- Use ONLY real, verifiable information from web search
- ALWAYS cite your sources with URLs when available
- DO NOT make up statistics or quotes
- Focus on recent/current information when relevant
- Be specific and detailed`

  if (additionalContext) {
    prompt += `\n\nAdditional context from user:\n${additionalContext}`
  }

  if (referenceContent) {
    prompt += `\n\nReference material provided:\n${referenceContent}`
  }

  prompt += `\n\nPlease search the web and provide comprehensive, well-sourced information.`

  return prompt
}

/**
 * Parse the streamed response to extract research data
 */
function parseResearchResponse(rawContent: string, topic: string): ResearchResult {
  const result: ResearchResult = {
    topic,
    summary: '',
    facts: [],
    statistics: [],
    quotes: [],
    images: [],
    sources: [],
    rawContent
  }

  const lines = rawContent.split('\n')
  let currentSection = ''
  const summaryLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect section headers
    if (trimmed.includes('KEY FACTS') || trimmed.includes('FACTS')) {
      currentSection = 'facts'
      continue
    } else if (trimmed.includes('STATISTICS') || trimmed.includes('DATA')) {
      currentSection = 'statistics'
      continue
    } else if (trimmed.includes('QUOTES') || trimmed.includes('NOTABLE QUOTES')) {
      currentSection = 'quotes'
      continue
    } else if (trimmed.includes('IMAGE') || trimmed.includes('SUGGESTIONS')) {
      currentSection = 'images'
      continue
    } else if (trimmed.includes('SUMMARY')) {
      currentSection = 'summary'
      continue
    }

    // Parse content based on section
    if (currentSection === 'facts') {
      const factMatch = trimmed.match(/(?:Fact:|[-•*])\s*(.+?)(?:\s*\|\s*Source:\s*(.+?))?(?:\s*\|\s*URL:\s*(.+?))?$/i)
      if (factMatch) {
        result.facts.push({
          statement: factMatch[1].trim(),
          source: factMatch[2]?.trim() || 'Web Search',
          url: factMatch[3]?.trim()
        })
      } else if (
        trimmed.startsWith('-') ||
        trimmed.startsWith('•') ||
        trimmed.startsWith('*') ||
        /^\d+\./.test(trimmed)
      ) {
        // Simple bullet point without explicit format
        const cleanText = trimmed.replace(/^[-•*\d.]+\s*/, '').trim()
        if (cleanText.length > 10) {
          // Extract source if mentioned inline
          const sourceMatch = cleanText.match(/\(([^)]+)\)$/)
          result.facts.push({
            statement: sourceMatch ? cleanText.replace(sourceMatch[0], '').trim() : cleanText,
            source: sourceMatch ? sourceMatch[1] : 'Web Search'
          })
        }
      }
    } else if (currentSection === 'statistics') {
      const statMatch = trimmed.match(
        /(?:Stat:|[-•*])\s*(.+?)\s*[=:]\s*(.+?)(?:\s*\|\s*Context:\s*(.+?))?(?:\s*\|\s*Source:\s*(.+?))?(?:\s*\|\s*URL:\s*(.+?))?$/i
      )
      if (statMatch) {
        result.statistics.push({
          metric: statMatch[1].trim(),
          value: statMatch[2].trim(),
          context: statMatch[3]?.trim() || '',
          source: statMatch[4]?.trim() || 'Web Search',
          url: statMatch[5]?.trim()
        })
      } else if (
        trimmed.startsWith('-') ||
        trimmed.startsWith('•') ||
        trimmed.startsWith('*') ||
        /^\d+\./.test(trimmed)
      ) {
        const cleanText = trimmed.replace(/^[-•*\d.]+\s*/, '').trim()
        // Try to extract number/percentage
        const numberMatch = cleanText.match(
          /(\d+(?:\.\d+)?%?|\$[\d,.]+[BMK]?|\d+(?:\.\d+)?\s*(?:million|billion|trillion)?)/i
        )
        if (numberMatch) {
          const sourceMatch = cleanText.match(/\(([^)]+)\)$/)
          result.statistics.push({
            metric:
              cleanText
                .replace(numberMatch[0], '')
                .replace(/\(([^)]+)\)$/, '')
                .trim() || 'Metric',
            value: numberMatch[1],
            context: '',
            source: sourceMatch ? sourceMatch[1] : 'Web Search'
          })
        }
      }
    } else if (currentSection === 'quotes') {
      const quoteMatch = trimmed.match(
        /(?:Quote:|[""])\s*(.+?)(?:[""])?\s*(?:\|\s*By:\s*(.+?))?(?:\|\s*Source:\s*(.+?))?$/i
      )
      if (quoteMatch) {
        result.quotes.push({
          text: quoteMatch[1].trim().replace(/^[""]|[""]$/g, ''),
          attribution: quoteMatch[2]?.trim() || 'Unknown',
          source: quoteMatch[3]?.trim() || 'Web Search'
        })
      } else if (trimmed.includes('"') || trimmed.includes('"')) {
        // Try to extract inline quote
        const inlineMatch = trimmed.match(/[""](.+?)[""](?:\s*[-–—]\s*(.+))?/i)
        if (inlineMatch) {
          result.quotes.push({
            text: inlineMatch[1].trim(),
            attribution: inlineMatch[2]?.trim() || 'Unknown',
            source: 'Web Search'
          })
        }
      }
    } else if (currentSection === 'images') {
      const imageMatch = trimmed.match(/(?:Image:|[-•*])\s*(.+?)(?:\s*\|\s*Keywords:\s*(.+?))?$/i)
      if (imageMatch) {
        result.images.push({
          description: imageMatch[1].trim(),
          suggestedKeywords:
            imageMatch[2]?.trim() || imageMatch[1].trim().toLowerCase().split(' ').slice(0, 4).join(' ')
        })
      } else if (
        trimmed.startsWith('-') ||
        trimmed.startsWith('•') ||
        trimmed.startsWith('*') ||
        /^\d+\./.test(trimmed)
      ) {
        const cleanText = trimmed.replace(/^[-•*\d.]+\s*/, '').trim()
        if (cleanText.length > 5) {
          result.images.push({
            description: cleanText,
            suggestedKeywords: cleanText.toLowerCase().split(' ').slice(0, 4).join(' ')
          })
        }
      }
    } else if (currentSection === 'summary') {
      summaryLines.push(trimmed)
    }
  }

  result.summary = summaryLines.join('\n')

  // Extract unique sources
  const sourceSet = new Set<string>()
  result.facts.forEach(f => {
    if (f.source) sourceSet.add(f.source)
  })
  result.statistics.forEach(s => {
    if (s.source) sourceSet.add(s.source)
  })
  result.quotes.forEach(q => {
    if (q.source) sourceSet.add(q.source)
  })

  result.sources = Array.from(sourceSet)
    .filter(s => s !== 'Web Search')
    .map(name => ({ name }))

  // If parsing yielded few results, try a more lenient parse of the raw content
  if (result.facts.length < 3 && result.statistics.length < 2) {
    extractFromRawContent(rawContent, result)
  }

  return result
}

/**
 * Fallback extraction from raw content when structured parsing fails
 */
function extractFromRawContent(rawContent: string, result: ResearchResult): void {
  const lines = rawContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 20) continue

    // Skip section headers
    if (/^#+\s|^\*\*[A-Z]/.test(trimmed)) continue

    // Look for statistics (numbers, percentages, currency)
    const hasNumber = /\d+(?:\.\d+)?%|\$[\d,.]+[BMK]?|\d+(?:\.\d+)?\s*(?:million|billion|trillion)/i.test(trimmed)

    if (hasNumber && result.statistics.length < 10) {
      const numberMatch = trimmed.match(
        /(\d+(?:\.\d+)?%|\$[\d,.]+[BMK]?|\d+(?:\.\d+)?\s*(?:million|billion|trillion)?)/i
      )
      if (numberMatch) {
        const sourceMatch = trimmed.match(/(?:Source:|According to|from)\s*([^,.\n]+)/i)
        result.statistics.push({
          metric: trimmed.replace(numberMatch[0], '').substring(0, 100).trim() || 'Metric',
          value: numberMatch[1],
          context: '',
          source: sourceMatch ? sourceMatch[1].trim() : 'Web Research'
        })
      }
    } else if (result.facts.length < 15 && trimmed.length > 30 && !hasNumber) {
      // Add as a fact if it looks like a statement
      if (/^[-•*]|^\d+\./.test(trimmed) || trimmed.includes(' is ') || trimmed.includes(' are ')) {
        const sourceMatch = trimmed.match(/(?:Source:|According to|from)\s*([^,.\n]+)/i)
        result.facts.push({
          statement: trimmed
            .replace(/^[-•*\d.]+\s*/, '')
            .substring(0, 200)
            .trim(),
          source: sourceMatch ? sourceMatch[1].trim() : 'Web Research'
        })
      }
    }
  }
}

/**
 * Main research function - calls chat API with web search
 */
export async function gatherResearch(
  options: ResearchOptions,
  accessToken: string,
  onProgress?: ResearchProgressCallback
): Promise<ResearchResult> {
  const baseUrl = resolveFlowbotBaseUrl()
  const url = `${baseUrl}/flowbot/api/agent/v2/chat`

  onProgress?.('progress-initiating-search')

  // Build the research prompt
  const prompt = buildResearchPrompt(options)

  // Create form data
  const form = new FormData()
  form.append('session_id', '') // New session
  form.append('user_input_text', prompt)
  form.append('llm_model', 'gpt-4o')
  form.append('use_web_search_tool', 'true')
  form.append('current_page_context', JSON.stringify({ type: 'unknown' }))

  onProgress?.('progress-search-info')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream'
    },
    body: form
  })

  if (!response.ok) {
    throw new Error(`Research API error: ${response.status} ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body from research API')
  }

  onProgress?.('progress-processing')

  // Parse SSE stream
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
      // Parse SSE frame
      let event = 'message'
      let data = ''

      for (const rawLine of part.split('\n')) {
        const line = rawLine.replace(/\r$/, '')
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          data += line.slice(5).trimStart()
        }
      }

      if (event === 'output-item' && data) {
        try {
          const output = JSON.parse(data)

          if (output.type === 'answer' && output.displayData) {
            // Extract text from display data
            for (const displayItem of output.displayData) {
              if (displayItem.type === 'text_block' && displayItem.content) {
                fullContent += displayItem.content + '\n'
              }
            }
          } else if (output.type === 'tool') {
            onProgress?.('progress-search-tool', { name: output.name || 'web' })
          }
        } catch {
          // Ignore parse errors for individual frames
        }
      }
    }
  }

  onProgress?.('progress-analyzing')

  // Parse the collected content into structured research
  const result = parseResearchResponse(fullContent, options.topic)

  // If we got very little data, the raw content might still be useful
  if (!result.summary && fullContent.length > 100) {
    result.summary = fullContent.substring(0, 500)
  }

  onProgress?.('progress-research-complete')

  return result
}

/**
 * Format research data as context for slide generation
 */
export function formatResearchForGeneration(research: ResearchResult): string {
  let content = `## VERIFIED RESEARCH DATA\n\n`
  content += `Topic: ${research.topic}\n\n`

  if (research.summary) {
    content += `### Executive Summary\n${research.summary}\n\n`
  }

  if (research.facts.length > 0) {
    content += `### Key Facts (${research.facts.length} items)\n`
    research.facts.forEach((fact, i) => {
      content += `${i + 1}. ${fact.statement}\n   Source: ${fact.source}${fact.url ? ` (${fact.url})` : ''}\n`
    })
    content += '\n'
  }

  if (research.statistics.length > 0) {
    content += `### Statistics & Data (${research.statistics.length} items)\n`
    research.statistics.forEach((stat, i) => {
      content += `${i + 1}. ${stat.metric}: ${stat.value}${stat.context ? ` - ${stat.context}` : ''}\n   Source: ${stat.source}${stat.url ? ` (${stat.url})` : ''}\n`
    })
    content += '\n'
  }

  if (research.quotes.length > 0) {
    content += `### Notable Quotes\n`
    research.quotes.forEach((quote, i) => {
      content += `${i + 1}. "${quote.text}" — ${quote.attribution} (${quote.source})\n`
    })
    content += '\n'
  }

  if (research.images.length > 0) {
    content += `### Suggested Images\n`
    research.images.forEach((img, i) => {
      content += `${i + 1}. ${img.description} | Keywords: ${img.suggestedKeywords}\n`
    })
    content += '\n'
  }

  if (research.sources.length > 0) {
    content += `### Sources\n`
    research.sources.forEach((src, i) => {
      content += `${i + 1}. ${src.name}${src.url ? `: ${src.url}` : ''}\n`
    })
  }

  content += `\n---\nIMPORTANT: Use ONLY the data above. Do NOT invent additional statistics or facts.\n`

  return content
}

export const SlideResearchService = {
  gatherResearch,
  formatResearchForGeneration
}

export default SlideResearchService
