// Extract text elements from slide XML with rich formatting and hyperlinks.

import type { TextElement, TextLink, GradientConfig } from '../../components/slideElements'
import { createTextElement } from '../../components/slideElements'
import type { OoxmlTheme, OoxmlParagraph, OoxmlTextRun, SlideRelationships } from './types'
import {
  emuToPixels,
  hundredthsPointToPixels,
  rotationToAngle,
  extractTransform,
  getChild,
  resolveColor,
  parseSolidFill,
  parseGradientFill,
  isInsideGroup
} from './ooxmlUtils'

const ALIGNMENT_MAP: Record<string, TextElement['textAlign']> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'left'
}

function parseRunProperties(rPr: Element | undefined, theme?: OoxmlTheme): Partial<OoxmlTextRun> {
  if (!rPr) return {}

  const result: Partial<OoxmlTextRun> = {}

  if (rPr.getAttribute('b') === '1') result.bold = true
  if (rPr.getAttribute('i') === '1') result.italic = true
  if (rPr.getAttribute('u') === 'sng' || rPr.getAttribute('u') === 'dbl') result.underline = true
  if (rPr.getAttribute('strike') === 'sngStrike' || rPr.getAttribute('strike') === 'dblStrike') {
    result.strikethrough = true
  }

  const sz = rPr.getAttribute('sz')
  if (sz) result.fontSize = parseInt(sz)

  const latin = getChild(rPr, 'a:latin')
  if (latin) {
    const typeface = latin.getAttribute('typeface')
    if (typeface && !typeface.startsWith('+')) result.fontFamily = typeface
  }

  const solidFill = getChild(rPr, 'a:solidFill')
  if (solidFill) {
    const color = resolveColor(solidFill, theme)
    if (color) result.color = color
  }

  const hlinkClick = getChild(rPr, 'a:hlinkClick')
  if (hlinkClick) {
    const rId =
      hlinkClick.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
      hlinkClick.getAttribute('r:id')
    if (rId) result.hyperlinkRelId = rId
  }

  return result
}

function parseParagraphs(txBody: Element, theme?: OoxmlTheme): OoxmlParagraph[] {
  const paragraphs: OoxmlParagraph[] = []
  const pElements = txBody.getElementsByTagName('a:p')

  for (let i = 0; i < pElements.length; i++) {
    const p = pElements[i]
    if (p.parentElement !== txBody) continue

    const pPr = getChild(p, 'a:pPr')
    const alignment = pPr?.getAttribute('algn') as OoxmlParagraph['alignment']
    const level = pPr?.getAttribute('lvl') ? parseInt(pPr.getAttribute('lvl')!) : undefined

    const runs: OoxmlTextRun[] = []
    for (let j = 0; j < p.childNodes.length; j++) {
      const child = p.childNodes[j] as Element
      if (child.tagName === 'a:r') {
        const rPr = getChild(child, 'a:rPr')
        const tEl = getChild(child, 'a:t')
        const text = tEl?.textContent || ''
        if (text) {
          runs.push({ text, ...parseRunProperties(rPr, theme) })
        }
      } else if (child.tagName === 'a:br') {
        runs.push({ text: '\n' })
      }
    }

    paragraphs.push({ runs, alignment, level })
  }

  return paragraphs
}

function determineDominantFormatting(paragraphs: OoxmlParagraph[]): {
  fontSize: number
  fontWeight: TextElement['fontWeight']
  fontStyle: TextElement['fontStyle']
  textDecoration: TextElement['textDecoration']
  fontFamily: string
  color: string
  textAlign: TextElement['textAlign']
} {
  let maxLen = 0
  let dominant: OoxmlTextRun = { text: '' }

  for (const para of paragraphs) {
    for (const run of para.runs) {
      if (run.text.length > maxLen) {
        maxLen = run.text.length
        dominant = run
      }
    }
  }

  const firstAlignment = paragraphs[0]?.alignment
  return {
    fontSize: dominant.fontSize ? hundredthsPointToPixels(dominant.fontSize) : 32,
    fontWeight: dominant.bold ? 'bold' : 'normal',
    fontStyle: dominant.italic ? 'italic' : 'normal',
    textDecoration: dominant.strikethrough ? 'line-through' : dominant.underline ? 'underline' : 'none',
    fontFamily: dominant.fontFamily || 'Inter',
    color: dominant.color || '#1e293b',
    textAlign: ALIGNMENT_MAP[firstAlignment || 'l'] || 'left'
  }
}

function extractShapeFill(shape: Element, theme?: OoxmlTheme): { backgroundColor: string; gradient?: GradientConfig } {
  const spPr = getChild(shape, 'p:spPr')
  if (!spPr) return { backgroundColor: 'transparent' }

  const noFill = getChild(spPr, 'a:noFill')
  if (noFill) return { backgroundColor: 'transparent' }

  const solidFill = getChild(spPr, 'a:solidFill')
  if (solidFill) {
    const color = parseSolidFill(solidFill, theme)
    return { backgroundColor: color || 'transparent' }
  }

  const gradFill = getChild(spPr, 'a:gradFill')
  if (gradFill) {
    const parsed = parseGradientFill(gradFill, theme)
    if (parsed) return { backgroundColor: parsed.stops[0]?.color || 'transparent', gradient: parsed }
  }

  return { backgroundColor: 'transparent' }
}

function buildTextAndLinks(
  paragraphs: OoxmlParagraph[],
  relationships: SlideRelationships
): { content: string; links: TextLink[] } {
  const links: TextLink[] = []
  let content = ''

  for (let pi = 0; pi < paragraphs.length; pi++) {
    if (pi > 0) content += '\n'
    for (const run of paragraphs[pi].runs) {
      const start = content.length
      content += run.text
      const end = content.length

      if (run.hyperlinkRelId) {
        const url = relationships.hyperlinks.get(run.hyperlinkRelId)
        if (url) {
          links.push({
            id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            start,
            end,
            url
          })
        }
      }
    }
  }

  return { content: content.trim(), links }
}

export function extractTextElements(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships
): TextElement[] {
  const elements: TextElement[] = []
  const shapes = slideXml.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]

    if (isInsideGroup(shape)) continue

    const txBody = getChild(shape, 'p:txBody')
    if (!txBody) continue

    const paragraphs = parseParagraphs(txBody, theme)
    const allRuns = paragraphs.flatMap(p => p.runs)
    const hasText = allRuns.some(r => r.text.trim().length > 0)
    if (!hasText) continue

    const transform = extractTransform(shape)
    if (!transform) continue

    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    const formatting = determineDominantFormatting(paragraphs)
    const { content, links } = buildTextAndLinks(paragraphs, relationships)
    const shapeFill = extractShapeFill(shape, theme)

    if (!content) continue

    const fontSize = Math.max(12, Math.min(128, Math.round(formatting.fontSize)))

    elements.push(
      createTextElement({
        id: `text-import-${Date.now()}-${i}`,
        content,
        links: links.length > 0 ? links : undefined,
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: { width: Math.max(40, width), height: Math.max(20, height) },
        fontSize,
        fontWeight: formatting.fontWeight,
        fontStyle: formatting.fontStyle,
        textDecoration: formatting.textDecoration,
        fontFamily: formatting.fontFamily,
        color: formatting.color,
        backgroundColor: shapeFill.backgroundColor,
        gradient: shapeFill.gradient,
        textAlign: formatting.textAlign,
        rotation: rotationToAngle(transform.rotation)
      })
    )
  }

  return elements
}
