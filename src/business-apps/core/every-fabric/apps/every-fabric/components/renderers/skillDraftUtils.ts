// ---------------------------------------------------------------------------
// String-based helpers (regex-free to avoid SonarCloud S5852 DoS hotspots)
// ---------------------------------------------------------------------------

function stripBold(text: string): string {
  return text.replaceAll('**', '')
}

function stripAllEmphasis(text: string): string {
  return text.replaceAll('**', '').replaceAll('__', '').replaceAll('*', '')
}

function matchHeading(line: string, level: number): string | null {
  const prefix = '#'.repeat(level)
  if (!line.startsWith(prefix)) return null
  const next = line.charAt(prefix.length)
  if (next !== ' ' && next !== '\t') return null
  return line.slice(prefix.length).trim() || null
}

function matchBulletContent(line: string): string | null {
  const ch = line.charAt(0)
  if (ch !== '-' && ch !== '*' && ch !== '+') return null
  let i = 1
  while (i < line.length && (line.charAt(i) === ' ' || line.charAt(i) === '\t')) i++
  if (i === 1 || i >= line.length) return null
  return line.slice(i)
}

function matchNumberedContent(line: string): string | null {
  let i = 0
  while (i < line.length && (line.codePointAt(i) ?? 0) >= 48 && (line.codePointAt(i) ?? 0) <= 57) i++
  if (i === 0) return null
  const delim = line.charAt(i)
  if (delim !== '.' && delim !== ')') return null
  const next = line.charAt(i + 1)
  if (next !== ' ' && next !== '\t') return null
  return line.slice(i + 2).trimStart() || null
}

function matchListContent(line: string): string | null {
  return matchBulletContent(line) ?? matchNumberedContent(line)
}

function startsWithHeading(line: string): boolean {
  return matchHeading(line, 1) !== null || matchHeading(line, 2) !== null || matchHeading(line, 3) !== null
}

function startsWithBullet(line: string): boolean {
  const ch = line.charAt(0)
  return (ch === '-' || ch === '*' || ch === '+') && (line.charAt(1) === ' ' || line.charAt(1) === '\t')
}

function trimTrailingNewlines(text: string): string {
  let end = text.length
  while (end > 0 && text.charAt(end - 1) === '\n') end--
  return text.slice(0, end)
}

function trimLeadingNewlines(text: string): string {
  let start = 0
  while (start < text.length && text.charAt(start) === '\n') start++
  return text.slice(start)
}

/** Case-insensitive prefix check that also consumes trailing whitespace. */
function matchCiPrefix(text: string, prefix: string): string | null {
  if (text.length < prefix.length) return null
  if (text.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null
  return text.slice(prefix.length)
}

/** Strips surrounding whitespace tokens (for label matching). */
function matchLabelLine(line: string, prefix: string): string | null {
  const lower = line.toLowerCase()
  let i = 0
  // Match prefix tokens with flexible whitespace
  for (const ch of prefix) {
    if (ch === ' ') {
      while (i < lower.length && (lower.charAt(i) === ' ' || lower.charAt(i) === '\t')) i++
    } else {
      if (i >= lower.length || lower.charAt(i) !== ch) return null
      i++
    }
  }
  return line.slice(i)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function extractFirstHeading(markdown: string): string | null {
  for (const line of markdown.split('\n')) {
    const h1 = matchHeading(line.trim(), 1)
    if (h1) return stripBold(h1)
  }
  for (const line of markdown.split('\n')) {
    const h2 = matchHeading(line.trim(), 2)
    if (h2) return stripBold(h2)
  }
  return null
}

/**
 * Derives a meaningful skill title from the agent's structured proposal.
 * Tries multiple strategies on the summary line(s) before the first ## heading,
 * then falls back to non-generic headings, then 'Agent skill'.
 */
export function extractSkillTitle(markdown: string): string {
  const GENERIC_HEADINGS = new Set([
    'options',
    'capabilities',
    'features',
    'processing',
    'output',
    'integration',
    'keywords',
    'triggers',
    'instructions',
    'example',
    'core capabilities',
    'activation triggers',
    'specific tasks'
  ])

  const lines = markdown.split('\n')
  const summaryLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (startsWithHeading(trimmed)) break
    if (startsWithBullet(trimmed)) break
    summaryLines.push(trimmed)
  }

  const summary = summaryLines.join(' ')

  const patterns = [
    /(?:for\s+(?:your\s+|the\s+|a\s+)?)([\w/.-]+(?:\s[\w/.-]+)*)(?:\s+skill\b)/i,
    /(?:for\s+(?:your\s+|the\s+|a\s+)?)([\w/.-]+(?:\s[\w/.-]+)*)\s*[.!,]/i,
    /(?:to\s+build\s+(?:a\s+|the\s+)?)([\w/.-]+(?:\s[\w/.-]+)*)(?:\s+skill\b|\s+tool\b|\s*[.!,])/i,
    /(?:capabilities\s+(?:for|of)\s+(?:a\s+|the\s+|your\s+)?)([\w/.-]+(?:\s[\w/.-]+)*)\s*[.!,:]/i
  ]

  for (const re of patterns) {
    const m = summary.match(re)
    if (m) {
      const topic = m[1].trim().replace(/\s+/g, ' ')
      if (topic.length >= 3 && topic.length <= 80) return topic
    }
  }

  for (const line of lines) {
    const h = matchHeading(line.trim(), 2)
    if (h) {
      const clean = stripBold(h)
      if (!GENERIC_HEADINGS.has(clean.toLowerCase())) return clean
    }
  }

  return 'Agent skill'
}

/** Normalizes one line of list item text (strip emphasis) — matches FinalAnswer list extraction. */
export function normalizeSkillPickListLine(raw: string): string {
  return stripAllEmphasis(raw).trim()
}

export interface SkillPickSection {
  title: string
  items: string[]
}

/**
 * Groups top-level markdown list lines under the nearest preceding `##` / `###` heading.
 * List lines use the same patterns as legacy `extractListItems` (no leading indent).
 * Items before the first such heading are grouped under title "Options".
 */
export function extractSkillPickSections(markdown: string): SkillPickSection[] {
  const lines = markdown.split('\n')
  const sections: SkillPickSection[] = []

  const appendListItem = (rawLine: string) => {
    const content = matchListContent(rawLine)
    if (!content) return
    const raw = normalizeSkillPickListLine(content)
    if (!raw) return
    if (sections.length === 0) {
      sections.push({ title: 'Options', items: [] })
    }
    const last = sections[sections.length - 1]!
    last.items.push(raw)
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const h2 = matchHeading(trimmed, 2)
    const h3 = matchHeading(trimmed, 3)
    if (h2 || h3) {
      const title = normalizeSkillPickListLine((h2 ?? h3 ?? '').trim())
      if (!title) continue
      const last = sections[sections.length - 1]
      if (last && last.items.length === 0) {
        last.title = title
      } else {
        sections.push({ title, items: [] })
      }
      continue
    }
    appendListItem(trimmed)
  }

  return sections.filter(s => s.items.length > 0)
}

/** Flat list of pickable items in document order (for counts and draft keys). */
export function extractListItems(markdown: string): string[] {
  return extractSkillPickSections(markdown).flatMap(s => s.items)
}

/**
 * Heuristic: does this markdown look like a Step-1b structured capabilities proposal?
 *
 * Matches the contract documented in skill-creator.md: at least one `## Heading` followed
 * by two or more `- **Label**: detail` bullets. We check for the bold-label-with-colon
 * pattern explicitly so that ordinary markdown (e.g. agent_thinking notes that happen to
 * contain a heading and a bullet list of file paths) does not get mis-rendered as the
 * interactive skill checklist.
 */
export function looksLikeSkillProposal(markdown: string): boolean {
  if (!markdown || typeof markdown !== 'string') return false
  let hasH2 = false
  for (const line of markdown.split('\n')) {
    if (matchHeading(line.trim(), 2)) {
      hasH2 = true
      break
    }
  }
  if (!hasH2) return false
  const lines = markdown.split('\n')
  let labelledBullets = 0
  for (const raw of lines) {
    const trimmed = raw.trim()
    const content = matchBulletContent(trimmed)
    if (!content) continue
    if (content.startsWith('**') && content.includes('**:')) {
      labelledBullets += 1
      if (labelledBullets >= 2) return true
    }
  }
  return false
}

export function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return s || 'custom-skill'
}

/** Split "Label: detail" or "**Label**: detail" into instruction parts. */
export function parseInstructionLine(raw: string): { label: string; detail: string } {
  const stripped = stripBold(raw).trim()
  const colon = stripped.indexOf(':')
  if (colon > 0 && colon < stripped.length - 1) {
    return {
      label: stripped.slice(0, colon).trim(),
      detail: stripped.slice(colon + 1).trim()
    }
  }
  return { label: stripped, detail: 'Apply this when it matches the user request.' }
}

export function imperativeFromItem(item: string): string {
  const { label, detail } = parseInstructionLine(item)
  if (detail && detail !== 'Apply this when it matches the user request.') {
    const first = detail.split(/[.!?]/)[0]?.trim()
    if (first && first.length < 120) return first.endsWith('.') ? first : `${first}.`
  }
  const base = stripBold(label)
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} when relevant.`
}

/**
 * Extracts a usable skill_id from a SKILL.md draft by reading the YAML frontmatter `name` field.
 * Falls back to the first markdown heading (slugified), then 'custom-skill'.
 */
export function extractSkillIdFromDraft(draft: string): string {
  const parts = _getFrontmatterBlock(draft)
  if (parts) {
    for (const line of parts.fm.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('name:')) {
        const raw = trimmed.slice(5).trim()
        if (raw) return slugify(raw)
      }
    }
  }
  const heading = extractFirstHeading(draft)
  if (heading) return slugify(heading)
  return 'custom-skill'
}

/**
 * Builds an editable SKILL.md-shaped draft from the agent output and checked list items.
 * Follows the format from skill-creator.md Step 3: YAML frontmatter with a "pushy"
 * trigger description, imperative instructions, and a contextual example.
 */
export function buildSkillMdDraft(agentOutputMarkdown: string, selected: Iterable<string>): string {
  const items = [...selected]
  if (items.length === 0) return ''
  const title = extractSkillTitle(agentOutputMarkdown)
  const name = slugify(title)
  const parsed = items.map(i => parseInstructionLine(i))
  const labels = parsed.map(p => p.label)
  const triggerPhrases = labels
    .slice(0, 5)
    .map(l => `"${l.toLowerCase()}"`)
    .join(', ')

  const description = [
    `Use whenever the user wants to ${labels[0]?.toLowerCase() ?? 'use this skill'}`,
    labels.length > 1
      ? `, ${labels
          .slice(1)
          .map(l => l.toLowerCase())
          .join(', ')}`
      : '',
    `, or related tasks.\n`,
    `  Trigger on: ${triggerPhrases}`,
    `, or any similar request — even if the user does not use those exact words.`
  ].join('')

  const instructionBullets = items
    .map(item => {
      const { label, detail } = parseInstructionLine(item)
      return `- **${label}**: ${detail}`
    })
    .join('\n')

  const firstDetail = parsed[0]?.detail
  const hasRealDetail = firstDetail && firstDetail !== 'Apply this when it matches the user request.'
  const exampleInput = labels[0]
    ? `Can you help me with ${labels[0].toLowerCase()}?`
    : 'Describe a typical user request here.'
  const exampleOutput = hasRealDetail
    ? (firstDetail.split(/[.!?]/)[0]?.trim() ?? 'Deliver the expected output') + '.'
    : 'The agent follows the instructions above and delivers the expected output.'

  return `---
name: ${name}
description: >
  ${description}
license: Enterprise-Internal
---

# ${title}

This skill enables the agent to handle the capabilities below.

## Instructions

${instructionBullets}

## Example

### Input
- User: "${exampleInput}"

### Output
- ${exampleOutput}`
}

/**
 * One test case in an Eval Review block emitted by the skill-creator agent at Step 4.
 *
 * `id` is derived deterministically from index + slugified name so both sides (parser + feedback
 * reply builder) agree without needing the agent to invent ids.
 */
export interface EvalReviewCase {
  id: string
  name: string
  prompt: string
  output: string
  /** Optional baseline output (`Output (baseline):` block) for skill vs no-skill comparison. */
  baselineOutput?: string
}

export interface EvalReviewPayload {
  /** Iteration number from the `## Eval Review — iteration N` header, or null if not parseable. */
  iteration: number | null
  /** First non-empty paragraph after the header — shown in the panel chrome. */
  summary: string
  cases: EvalReviewCase[]
}

const DASHES = new Set(['-', '\u2013', '\u2014'])

function matchEvalHeader(line: string): { matched: boolean; iteration: number | null } {
  const h2 = matchHeading(line, 2)
  if (!h2) return { matched: false, iteration: null }
  const rest = matchCiPrefix(h2.trimStart(), 'Eval Review')
  if (rest === null) return { matched: false, iteration: null }
  const trimmedRest = rest.trim()
  if (!trimmedRest) return { matched: true, iteration: null }
  let i = 0
  while (i < trimmedRest.length && (trimmedRest.charAt(i) === ' ' || DASHES.has(trimmedRest.charAt(i)))) i++
  const afterDash = trimmedRest.slice(i).trim()
  const iterPart = matchCiPrefix(afterDash, 'iteration ')
  if (!iterPart) return { matched: true, iteration: null }
  const num = Number.parseInt(iterPart.trim(), 10)
  return { matched: true, iteration: Number.isNaN(num) ? null : num }
}

function matchTestCaseHeader(line: string): { matched: boolean; index: number; name: string } | null {
  const h3 = matchHeading(line, 3)
  if (!h3) return null
  const rest = matchCiPrefix(h3.trimStart(), 'Test case ')
  if (rest === null) return null
  let i = 0
  while (i < rest.length && (rest.codePointAt(i) ?? 0) >= 48 && (rest.codePointAt(i) ?? 0) <= 57) i++
  if (i === 0) return null
  const index = Number.parseInt(rest.slice(0, i), 10)
  let name = ''
  const afterNum = rest.slice(i).trim()
  if (afterNum) {
    let j = 0
    while (j < afterNum.length && (afterNum.charAt(j) === ' ' || DASHES.has(afterNum.charAt(j)))) j++
    name = afterNum.slice(j).trim()
  }
  return { matched: true, index, name }
}

/**
 * Parses a Step-4 "Eval Review" markdown block into structured cases the EvalReviewPanel can render.
 *
 * Recognises both em-dash (`—`, `–`) and ASCII hyphen separators in the headers so authors don't get
 * tripped up by editor autocorrect. Returns `null` when no `## Eval Review` header is present, or
 * when no test cases parse out — that signals MessageBubble to fall back to the plain `?` bubble.
 */
export function extractEvalReviewCases(markdown: string): EvalReviewPayload | null {
  if (!markdown || typeof markdown !== 'string') return null

  const lines = markdown.split('\n')
  let headerIdx = -1
  let iteration: number | null = null

  for (let i = 0; i < lines.length; i++) {
    const result = matchEvalHeader(lines[i].trim())
    if (result.matched) {
      headerIdx = i
      iteration = result.iteration
      break
    }
  }
  if (headerIdx === -1) return null

  let summary = ''
  let cursor = headerIdx + 1
  for (; cursor < lines.length; cursor++) {
    const trimmed = lines[cursor].trim()
    if (!trimmed) continue
    if (matchTestCaseHeader(trimmed) || matchHeading(trimmed, 2)) break
    summary = trimmed
    cursor++
    break
  }

  const cases: EvalReviewCase[] = []
  let current: { index: number; name: string; lines: string[] } | null = null

  const flush = () => {
    if (!current) return
    const parsed = parseCaseBody(current.lines)
    if (parsed.prompt || parsed.output) {
      const slug = slugify(current.name || `test-case-${current.index}`)
      cases.push({
        id: `case-${current.index}-${slug}`,
        name: current.name || `Test case ${current.index}`,
        prompt: parsed.prompt,
        output: parsed.output,
        ...(parsed.baselineOutput ? { baselineOutput: parsed.baselineOutput } : {})
      })
    }
    current = null
  }

  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor]
    const trimmed = line.trim()

    const caseMatch = matchTestCaseHeader(trimmed)
    if (caseMatch) {
      flush()
      current = {
        index: caseMatch.index,
        name: caseMatch.name,
        lines: []
      }
      continue
    }

    if (matchHeading(trimmed, 2) && !matchEvalHeader(trimmed).matched) {
      flush()
      break
    }

    if (current) current.lines.push(line)
  }

  flush()

  if (cases.length === 0) return null
  return { iteration, summary, cases }
}

interface ParsedCaseBody {
  prompt: string
  output: string
  baselineOutput?: string
}

function matchPromptLabel(line: string): string | null {
  const rest = matchLabelLine(line, 'prompt :')
  if (rest !== null) return rest
  return matchLabelLine(line, 'prompt:')
}

function matchBaselineLabel(line: string): string | null {
  const rest = matchLabelLine(line, 'output (baseline) :')
  if (rest !== null) return rest
  const r2 = matchLabelLine(line, 'output (baseline):')
  if (r2 !== null) return r2
  const r3 = matchLabelLine(line, 'output(baseline) :')
  if (r3 !== null) return r3
  return matchLabelLine(line, 'output(baseline):')
}

function matchOutputLabel(line: string): string | null {
  if (matchBaselineLabel(line) !== null) return null
  const rest = matchLabelLine(line, 'output :')
  if (rest !== null) return rest
  return matchLabelLine(line, 'output:')
}

function parseCaseBody(bodyLines: string[]): ParsedCaseBody {
  let prompt = ''
  type Mode = 'none' | 'output' | 'baseline'
  let mode: Mode = 'none'
  const outputLines: string[] = []
  const baselineLines: string[] = []

  const sink = (m: Mode) => (m === 'output' ? outputLines : m === 'baseline' ? baselineLines : null)

  for (const raw of bodyLines) {
    const trimmed = raw.trim()

    if (!prompt) {
      const pm = matchPromptLabel(trimmed)
      if (pm !== null) {
        prompt = pm.trim()
        continue
      }
    }

    const bm = matchBaselineLabel(trimmed)
    if (bm !== null) {
      mode = 'baseline'
      const tail = bm.trim()
      if (tail) baselineLines.push(tail)
      continue
    }

    const om = matchOutputLabel(trimmed)
    if (om !== null) {
      mode = 'output'
      const tail = om.trim()
      if (tail) outputLines.push(tail)
      continue
    }

    const target = sink(mode)
    if (target) target.push(raw)
  }

  const collapse = (xs: string[]): string => trimLeadingNewlines(trimTrailingNewlines(xs.join('\n')))
  return {
    prompt,
    output: collapse(outputLines),
    ...(baselineLines.length ? { baselineOutput: collapse(baselineLines) } : {})
  }
}

/**
 * Builds the markdown reply the EvalReviewPanel posts back when the user clicks "Submit all reviews".
 *
 * Empty/whitespace-only feedback values are emitted as bare `- **case-id**:` lines, which is the
 * shape skill-creator.md treats as "this case looks fine, no changes needed".
 */
export function buildEvalFeedbackReply(
  cases: EvalReviewCase[],
  feedback: Record<string, string>,
  iteration: number | null
): string {
  const header = iteration === null ? '## Feedback' : `## Feedback for iteration ${iteration}`
  const bullets = cases.map(c => {
    const value = (feedback[c.id] ?? '').trim()
    return value ? `- **${c.id}**: ${value}` : `- **${c.id}**:`
  })
  return [header, '', ...bullets].join('\n')
}

// ---------------------------------------------------------------------------
// YAML frontmatter tools: list utilities
// ---------------------------------------------------------------------------

/** Extracts the YAML frontmatter block (content between the first pair of ---). Returns null if not found. */
function _getFrontmatterBlock(draft: string): { before: string; fm: string; after: string } | null {
  const text = draft.trimStart()
  if (!text.startsWith('---')) return null
  const firstEnd = text.indexOf('\n---', 3)
  if (firstEnd === -1) return null
  const fm = text.slice(3, firstEnd) // content between first --- and closing ---
  const after = text.slice(firstEnd + 4) // everything after closing ---\n
  return { before: '---', fm, after }
}

/** Returns the tools: list from the YAML frontmatter, or [] if absent or draft has no frontmatter. */
export function getToolsFromSkillDraft(draft: string): string[] {
  const parts = _getFrontmatterBlock(draft)
  if (!parts) return []
  const fmLines = parts.fm.split('\n')
  let inTools = false
  const tools: string[] = []
  for (const line of fmLines) {
    if (line.trimStart().startsWith('tools:') && !line.trimStart().startsWith('tools: ')) {
      inTools = true
      continue
    }
    if (inTools) {
      const trimmed = line.trimStart()
      if (trimmed.startsWith('- ')) {
        tools.push(trimmed.slice(2).trim())
      } else {
        break
      }
    }
  }
  return tools.filter(Boolean)
}

/** Adds toolName to the tools: list in the YAML frontmatter.
 *  Creates the tools: key if absent. No-op if toolName is already present. */
export function addToolToSkillDraft(draft: string, toolName: string): string {
  const parts = _getFrontmatterBlock(draft)
  if (!parts) return draft
  const current = getToolsFromSkillDraft(draft)
  if (current.includes(toolName)) return draft
  const newTools = [...current, toolName]
  return _setToolsInDraft(parts, newTools)
}

/** Removes toolName from the tools: list. Drops the tools: key entirely if the list becomes empty. */
export function removeToolFromSkillDraft(draft: string, toolName: string): string {
  const parts = _getFrontmatterBlock(draft)
  if (!parts) return draft
  const current = getToolsFromSkillDraft(draft)
  const newTools = current.filter(n => n !== toolName)
  return _setToolsInDraft(parts, newTools)
}

/** Drops the tools: key entirely from the frontmatter, regardless of its contents. */
export function removeAllToolsFromSkillDraft(draft: string): string {
  const parts = _getFrontmatterBlock(draft)
  if (!parts) return draft
  return _setToolsInDraft(parts, [])
}

/** Internal: rewrites the frontmatter with the given tools list (empty = remove key). */
function _setToolsInDraft(parts: { before: string; fm: string; after: string }, tools: string[]): string {
  const fmLines = parts.fm.split('\n')
  const filtered: string[] = []
  let inTools = false
  for (const line of fmLines) {
    if (line.trimStart().startsWith('tools:') && !line.trimStart().startsWith('tools: ')) {
      inTools = true
      continue
    }
    if (inTools && line.trimStart().startsWith('- ')) continue
    inTools = false
    filtered.push(line)
  }
  let newFm = trimTrailingNewlines(filtered.join('\n')) + '\n'
  if (tools.length > 0) {
    newFm += `tools:\n${tools.map(t => `  - ${t}`).join('\n')}\n`
  }
  return `---${newFm}---${parts.after}`
}
