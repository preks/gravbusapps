/**
 * Parses raw source citation artifacts from LLM-generated content.
 *
 * LLMs (especially when performing web search) embed inline citation markers like:
 *   【search†output】
 *   【4†source】
 *   [search†output]
 *   Source: "Title" web-search results (Site Name) [search†output]
 *
 * This utility strips the ugly markers while keeping meaningful content intact,
 * and extracts structured citation data when a recognised pattern is found.
 */

export interface InlineWebCitation {
  /** The search query or page title from the citation */
  title: string
  /** The source site or description, if present */
  site?: string
}

export interface ParsedMessageContent {
  /** The cleaned message content (markers stripped) */
  content: string
  /** Extracted web citations to render as styled UI elements */
  webCitations: InlineWebCitation[]
}

// Matches: Source: "Title" optional-description (Site Name) [search†output]
const SOURCE_LINE_REGEX =
  /^Source:\s*["\u201C]([^"\u201D]+)["\u201D]\s*(?:web-search results\s*)?(?:\(([^)]+)\))?\s*(?:\[search[†‡][^\]]*\])?\s*$/gm

/**
 * Parse LLM message content: strip ugly citation markers, extract structured
 * citation data when available, and clean up artefacts left behind.
 */
export function parseSourceCitations(content: string): ParsedMessageContent {
  if (!content) return { content, webCitations: [] }

  const webCitations: InlineWebCitation[] = []

  // 1. Extract Source: "..." lines as structured citations (less common format)
  let cleaned = content.replace(SOURCE_LINE_REGEX, (_match, title: string, site?: string) => {
    webCitations.push({ title: title.trim(), site: site?.trim() })
    return ''
  })

  // 2. Strip [search†output], [search†web] etc. markers (square-bracket style)
  cleaned = cleaned.replace(/\[search[†‡][^\]]*\]/g, '')

  // 3. Strip 【…†…】 markers (lenticular-bracket style, e.g. 【search†output】, 【4†source】)
  //    Matches any content inside 【 】 that contains a † character
  cleaned = cleaned.replace(/【[^】]*†[^】]*】/g, '')

  // 4. Remove any dangling empty "Source:" labels
  cleaned = cleaned.replace(/^Source:\s*$/gm, '')

  // 5. Clean up spacing artefacts left by marker removal:
  //    - space before punctuation (e.g. " ." → ".")
  //    - double spaces
  cleaned = cleaned.replace(/ +([.,;:!?])/g, '$1')
  cleaned = cleaned.replace(/ {2,}/g, ' ')

  // 6. Collapse 3+ newlines → 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // 7. Trim
  cleaned = cleaned.trim()

  return { content: cleaned, webCitations }
}
