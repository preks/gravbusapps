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

export interface IndustryTrend {
  trend: string
  impact: string
  timeframe?: string
  source?: string
}

export interface CompetitorInfo {
  name: string
  position: string
  differentiation?: string
}

export interface HistoricalMilestone {
  year: string
  event: string
  significance?: string
}

export interface ChartDataSuggestion {
  chartType: 'bar' | 'line' | 'pie' | 'area'
  title: string
  dataPoints: Array<{ label: string; value: number }>
  source?: string
}

export interface ResearchResult {
  topic: string
  summary: string
  facts: ResearchFact[]
  statistics: ResearchStatistic[]
  quotes: ResearchQuote[]
  images: ResearchImage[]
  industryTrends: IndustryTrend[]
  competitorInfo: CompetitorInfo[]
  historicalContext: HistoricalMilestone[]
  chartSuggestions: ChartDataSuggestion[]
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

4. **INDUSTRY TRENDS** (3-5 trends)
   - Current and emerging trends in the industry
   - Expected impact and timeframe
   - Format: "Trend: [trend] | Impact: [impact] | Timeframe: [timeframe] | Source: [source]"

5. **COMPETITOR/MARKET INFO** (if applicable, 2-4 items)
   - Key players, market positions, differentiators
   - Format: "Competitor: [name] | Position: [market position] | Differentiator: [key differentiator]"

6. **HISTORICAL CONTEXT** (3-5 milestones)
   - Key historical events, milestones, or evolution
   - Format: "Milestone: [year] | Event: [event] | Significance: [significance]"

7. **CHART DATA SUGGESTIONS** (2-4 suggestions)
   - Specific data that would make good visualizations
   - Include actual numbers when available
   - Format: "Chart: [title] | Type: [bar/line/pie/area] | Data: [label1:value1, label2:value2, ...]"

8. **IMAGE SUGGESTIONS** (4-6 suggestions)
   - Describe images that would complement the content
   - Provide search keywords for each
   - Format: "Image: [description] | Keywords: [search keywords]"

9. **SUMMARY**
   - A brief executive summary of the topic (2-3 paragraphs)

IMPORTANT RULES:
- Use ONLY real, verifiable information from web search
- ALWAYS cite your sources with URLs when available
- DO NOT make up statistics or quotes
- Focus on recent/current information when relevant
- Be specific and detailed
- For chart data, provide actual numbers from reliable sources`

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
    industryTrends: [],
    competitorInfo: [],
    historicalContext: [],
    chartSuggestions: [],
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
    if (trimmed.includes('KEY FACTS') || (trimmed.includes('FACTS') && !trimmed.includes('TREND'))) {
      currentSection = 'facts'
      continue
    } else if (trimmed.includes('STATISTICS') || (trimmed.includes('DATA') && !trimmed.includes('CHART'))) {
      currentSection = 'statistics'
      continue
    } else if (trimmed.includes('QUOTES') || trimmed.includes('NOTABLE QUOTES')) {
      currentSection = 'quotes'
      continue
    } else if (trimmed.includes('INDUSTRY TREND') || trimmed.includes('TRENDS')) {
      currentSection = 'trends'
      continue
    } else if (trimmed.includes('COMPETITOR') || trimmed.includes('MARKET INFO')) {
      currentSection = 'competitors'
      continue
    } else if (trimmed.includes('HISTORICAL') || trimmed.includes('MILESTONES')) {
      currentSection = 'history'
      continue
    } else if (trimmed.includes('CHART DATA') || trimmed.includes('CHART SUGGESTION')) {
      currentSection = 'charts'
      continue
    } else if (trimmed.includes('IMAGE') && trimmed.includes('SUGGESTION')) {
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
    } else if (currentSection === 'trends') {
      const trendMatch = trimmed.match(
        /(?:Trend:|[-•*])\s*(.+?)(?:\s*\|\s*Impact:\s*(.+?))?(?:\s*\|\s*Timeframe:\s*(.+?))?(?:\s*\|\s*Source:\s*(.+?))?$/i
      )
      if (trendMatch) {
        result.industryTrends.push({
          trend: trendMatch[1].trim(),
          impact: trendMatch[2]?.trim() || '',
          timeframe: trendMatch[3]?.trim(),
          source: trendMatch[4]?.trim()
        })
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        const cleanText = trimmed.replace(/^[-•*\d.]+\s*/, '').trim()
        if (cleanText.length > 10) {
          result.industryTrends.push({
            trend: cleanText,
            impact: ''
          })
        }
      }
    } else if (currentSection === 'competitors') {
      const compMatch = trimmed.match(
        /(?:Competitor:|[-•*])\s*(.+?)(?:\s*\|\s*Position:\s*(.+?))?(?:\s*\|\s*Differentiator:\s*(.+?))?$/i
      )
      if (compMatch) {
        result.competitorInfo.push({
          name: compMatch[1].trim(),
          position: compMatch[2]?.trim() || '',
          differentiation: compMatch[3]?.trim()
        })
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        const cleanText = trimmed.replace(/^[-•*\d.]+\s*/, '').trim()
        if (cleanText.length > 5) {
          result.competitorInfo.push({
            name: cleanText,
            position: ''
          })
        }
      }
    } else if (currentSection === 'history') {
      const histMatch = trimmed.match(
        /(?:Milestone:|[-•*])\s*(\d{4})\s*(?:\||\:)?\s*(?:Event:\s*)?(.+?)(?:\s*\|\s*Significance:\s*(.+?))?$/i
      )
      if (histMatch) {
        result.historicalContext.push({
          year: histMatch[1],
          event: histMatch[2].trim(),
          significance: histMatch[3]?.trim()
        })
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        const yearMatch = trimmed.match(/(\d{4})\s*[-:]\s*(.+)/)
        if (yearMatch) {
          result.historicalContext.push({
            year: yearMatch[1],
            event: yearMatch[2].trim()
          })
        }
      }
    } else if (currentSection === 'charts') {
      const chartMatch = trimmed.match(
        /(?:Chart:|[-•*])\s*(.+?)(?:\s*\|\s*Type:\s*(bar|line|pie|area))?(?:\s*\|\s*Data:\s*(.+?))?$/i
      )
      if (chartMatch && chartMatch[3]) {
        const dataPoints: Array<{ label: string; value: number }> = []
        const dataStr = chartMatch[3]
        const pairs = dataStr.split(',').map(s => s.trim())
        for (const pair of pairs) {
          const [label, valueStr] = pair.split(':').map(s => s.trim())
          const value = parseFloat(valueStr?.replace(/[^0-9.]/g, '') || '0')
          if (label && !isNaN(value)) {
            dataPoints.push({ label, value })
          }
        }
        if (dataPoints.length > 0) {
          result.chartSuggestions.push({
            chartType: (chartMatch[2]?.toLowerCase() as 'bar' | 'line' | 'pie' | 'area') || 'bar',
            title: chartMatch[1].trim(),
            dataPoints
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
  form.append('llm_model', 'gpt-5.4')
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

  if (research.industryTrends.length > 0) {
    content += `### Industry Trends (${research.industryTrends.length} items)\n`
    research.industryTrends.forEach((trend, i) => {
      content += `${i + 1}. ${trend.trend}${trend.impact ? ` - Impact: ${trend.impact}` : ''}${trend.timeframe ? ` (${trend.timeframe})` : ''}\n`
    })
    content += '\n'
  }

  if (research.competitorInfo.length > 0) {
    content += `### Competitor/Market Info (${research.competitorInfo.length} items)\n`
    research.competitorInfo.forEach((comp, i) => {
      content += `${i + 1}. ${comp.name}${comp.position ? `: ${comp.position}` : ''}${comp.differentiation ? ` - ${comp.differentiation}` : ''}\n`
    })
    content += '\n'
  }

  if (research.historicalContext.length > 0) {
    content += `### Historical Context (${research.historicalContext.length} milestones)\n`
    research.historicalContext.forEach((milestone, i) => {
      content += `${i + 1}. ${milestone.year}: ${milestone.event}${milestone.significance ? ` - ${milestone.significance}` : ''}\n`
    })
    content += '\n'
  }

  if (research.chartSuggestions.length > 0) {
    content += `### Chart Data (${research.chartSuggestions.length} visualizations)\n`
    research.chartSuggestions.forEach((chart, i) => {
      const dataStr = chart.dataPoints.map(d => `${d.label}: ${d.value}`).join(', ')
      content += `${i + 1}. ${chart.title} (${chart.chartType} chart): ${dataStr}\n`
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
