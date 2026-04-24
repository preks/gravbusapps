// Extract text elements from slide XML with rich formatting and hyperlinks.

import type {
  TextElement,
  TextLink,
  ShapeInText,
  GradientConfig,
  RichTextParagraph,
  RichTextRun,
  RichTextTransform
} from '../../components/slideElements'
import { createTextElement } from '../../components/slideElements'
import type { OoxmlTheme, OoxmlParagraph, OoxmlTextRun, OoxmlCap, SlideRelationships } from './types'
import {
  emuToPixels,
  hundredthsPointToPixels,
  rotationToAngle,
  extractTransform,
  getChild,
  resolveTextFillColor,
  parseSolidFill,
  isInsideGroup,
  nextImportUid
} from './ooxmlUtils'
import { resolveTextBackgroundFromShape } from './shapeStyleResolver'
import type {
  InheritedLevelDefaults,
  InheritedLevelMap,
  InheritedTextDefaultsResolver
} from './extractInheritedTextDefaults'
import { getLevelDefaults } from './extractInheritedTextDefaults'

const ALIGNMENT_MAP: Record<string, TextElement['textAlign']> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'left'
}

/**
 * Resolve a <a:latin typeface="..."> value.
 *
 * OOXML uses `+mj-lt`, `+mj-ea`, `+mj-cs` (major latin/east-asian/complex) and
 * `+mn-*` (minor) as references to the current theme's font scheme. If we skip
 * them, the imported slide loses its theme fonts entirely and the renderer
 * falls back to the browser default. Here we resolve them so the run carries a
 * concrete family name matching what PowerPoint shows.
 */
export function resolveTypeface(raw: string | null | undefined, theme?: OoxmlTheme): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('+mj')) return theme?.majorFont || undefined
  if (trimmed.startsWith('+mn')) return theme?.minorFont || undefined
  // Any other `+`-prefixed token is a scheme reference we don't support yet.
  if (trimmed.startsWith('+')) return undefined

  return trimmed
}

/**
 * Normalize OOXML `cap` attribute values. PowerPoint emits `all` (uppercase),
 * `small` (small-caps), or `none` (explicit opt-out). Any other string is
 * ignored so upstream inheritance can still apply.
 */
function parseCap(raw: string | null | undefined): OoxmlCap | undefined {
  if (!raw) return undefined
  const lower = raw.toLowerCase()
  if (lower === 'all' || lower === 'small' || lower === 'none') return lower as OoxmlCap
  return undefined
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

  const cap = parseCap(rPr.getAttribute('cap'))
  if (cap) result.cap = cap

  const sz = rPr.getAttribute('sz')
  if (sz) result.fontSize = parseInt(sz)

  const latin = getChild(rPr, 'a:latin')
  if (latin) {
    const typeface = resolveTypeface(latin.getAttribute('typeface'), theme)
    if (typeface) result.fontFamily = typeface
  }

  // Accept both `<a:solidFill>` and `<a:gradFill>` on text runs — slide 1
  // of the Enterprise AI deck paints "The NEWWORK Enterprise AI." with a
  // three-stop bg1 gradient so the ends fade. The legacy `solidFill`-only
  // path left `result.color` undefined there, which made the dominant run
  // fall back to the theme's `dk1` (#000) and disappear on the dark slide.
  const fillColor = resolveTextFillColor(rPr, theme)
  if (fillColor) result.color = fillColor

  const hlinkClick = getChild(rPr, 'a:hlinkClick')
  if (hlinkClick) {
    const rId =
      hlinkClick.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
      hlinkClick.getAttribute('r:id')
    if (rId) result.hyperlinkRelId = rId
  }

  return result
}

/**
 * Map an OOXML `cap` value to the editor's `textTransform` vocabulary.
 * `none` is explicitly propagated (so it can override upstream inheritance)
 * but `undefined` means "no opinion" and falls through to box/paragraph
 * defaults.
 */
function capToTransform(cap: OoxmlCap | undefined): RichTextTransform | undefined {
  switch (cap) {
    case 'all':
      return 'uppercase'
    case 'small':
      return 'small-caps'
    case 'none':
      return 'none'
    default:
      return undefined
  }
}

/**
 * Parse a `<a:bodyPr>` autofit directive. PowerPoint stores text-shrink
 * ratios as per-mille values on `<a:normAutofit fontScale="90000"
 * lnSpcReduction="10000"/>` — 100000 means "no change". We expose the raw
 * scales so callers can re-apply the reduction when mapping to editor
 * pixels, preserving the visual size PowerPoint rendered.
 */
export interface BodyAutofit {
  fontScale: number
  lineSpaceReduction: number
  mode: 'none' | 'normal' | 'shape' | 'spAutoFit' | 'noAutofit'
}

export function parseBodyAutofit(bodyPr: Element | undefined): BodyAutofit {
  const result: BodyAutofit = { fontScale: 1, lineSpaceReduction: 0, mode: 'none' }
  if (!bodyPr) return result

  const normAutofit = getChild(bodyPr, 'a:normAutofit')
  if (normAutofit) {
    result.mode = 'normal'
    const fs = normAutofit.getAttribute('fontScale')
    if (fs) {
      const val = parseInt(fs)
      // fontScale is stored per-mille (100000 == 100%).
      if (Number.isFinite(val) && val > 0) result.fontScale = val / 100000
    }
    const lsr = normAutofit.getAttribute('lnSpcReduction')
    if (lsr) {
      const val = parseInt(lsr)
      if (Number.isFinite(val) && val >= 0) result.lineSpaceReduction = val / 100000
    }
    return result
  }

  if (getChild(bodyPr, 'a:spAutoFit')) {
    result.mode = 'spAutoFit'
    return result
  }

  if (getChild(bodyPr, 'a:noAutofit')) {
    result.mode = 'noAutofit'
    return result
  }

  return result
}

interface BodyTextBoxLayout {
  verticalAlign: TextElement['verticalAlign']
  padding: number
}

function parseBodyTextBoxLayout(
  bodyPr: Element | undefined,
  fallbackVerticalAlign: TextElement['verticalAlign']
): BodyTextBoxLayout {
  const result: BodyTextBoxLayout = {
    verticalAlign: fallbackVerticalAlign,
    padding: 8
  }
  if (!bodyPr) return result

  const anchor = (bodyPr.getAttribute('anchor') || '').toLowerCase()
  if (anchor === 't') result.verticalAlign = 'top'
  else if (anchor === 'ctr') result.verticalAlign = 'middle'
  else if (anchor === 'b') result.verticalAlign = 'bottom'

  const insetAttrs = ['lIns', 'rIns', 'tIns', 'bIns']
    .map(attr => bodyPr.getAttribute(attr))
    .filter((raw): raw is string => !!raw)
    .map(raw => parseInt(raw))
    .filter(val => Number.isFinite(val))
    .map(emuToPixels)

  if (insetAttrs.length > 0) {
    const avgInset = insetAttrs.reduce((sum, val) => sum + val, 0) / insetAttrs.length
    result.padding = Math.max(0, Math.min(64, Math.round(avgInset)))
  }

  return result
}

function parseBulletInfo(pPr: Element | undefined): { bulletType: OoxmlParagraph['bulletType']; bulletChar?: string } {
  if (!pPr) return { bulletType: undefined }

  const buNone = getChild(pPr, 'a:buNone')
  if (buNone) return { bulletType: 'none' }

  const buChar = getChild(pPr, 'a:buChar')
  if (buChar) {
    const char = buChar.getAttribute('char') || '•'
    return { bulletType: 'bullet', bulletChar: char }
  }

  const buAutoNum = getChild(pPr, 'a:buAutoNum')
  if (buAutoNum) {
    return { bulletType: 'number' }
  }

  return { bulletType: undefined }
}

/**
 * Parse an OOXML spacing node (`a:lnSpc`, `a:spcBef`, `a:spcAft`) and return
 * both the numeric value and whether it is absolute (points) or relative
 * (multiplier). PowerPoint encodes line spacing in two different units:
 *
 *   • `<a:spcPct val="150000"/>`  → 150% of the font size   (1.5× multiplier)
 *   • `<a:spcPts val="6000"/>`    → exactly 60 points       (absolute pt)
 *
 * Historically we always returned a single number, which meant `spcPts` was
 * fed directly into CSS `lineHeight` as a unitless multiplier — turning 60 pt
 * into "60 × font size" (≈ 4800px per line for a 80px heading) and shoving
 * every word past the overflow-hidden clip. Keep the unit tagged so callers
 * can convert to a multiplier once the effective font size is known.
 */
interface ParsedSpacing {
  value: number
  unit: 'multiplier' | 'points'
}

function parseSpacingNode(node: Element | undefined): ParsedSpacing | undefined {
  if (!node) return undefined
  const spcPct = getChild(node, 'a:spcPct')
  if (spcPct) {
    const val = spcPct.getAttribute('val')
    if (val) {
      const num = parseInt(val) / 100000
      if (Number.isFinite(num)) return { value: num, unit: 'multiplier' }
    }
  }
  const spcPts = getChild(node, 'a:spcPts')
  if (spcPts) {
    const val = spcPts.getAttribute('val')
    if (val) {
      const num = parseInt(val) / 100
      if (Number.isFinite(num)) return { value: num, unit: 'points' }
    }
  }
  return undefined
}

/**
 * Convert an OOXML line-spacing directive into a CSS-compatible **unitless
 * multiplier**. When the spec emits absolute points (`a:spcPts`), divide by
 * the paragraph's effective font size so the renderer (which passes the
 * number directly to `lineHeight`) does not multiply it by fontSize a second
 * time. `paraFontSizeHpt` is hundredths of a point, matching `a:rPr/@sz`.
 */
function spacingToLineHeightMultiplier(
  spacing: ParsedSpacing | undefined,
  paraFontSizeHpt: number | undefined
): number | undefined {
  if (!spacing) return undefined
  if (spacing.unit === 'multiplier') return spacing.value
  // Absolute points. Need a font-size reference to produce a multiplier.
  const fontPt = paraFontSizeHpt ? paraFontSizeHpt / 100 : 18 // PPT default body
  if (!Number.isFinite(fontPt) || fontPt <= 0) return undefined
  return spacing.value / fontPt
}

/**
 * Convert an OOXML paragraph-gap directive (spcBef / spcAft) into a pixel
 * value suitable for CSS `marginTop` / `marginBottom`. Multipliers are
 * resolved against the current font size; absolute points are converted via
 * the standard 96 DPI mapping (1 pt = 96/72 px). Returning a pixel value also
 * matches what React already does when a bare number is assigned to a
 * `margin*` style (it appends `px`).
 */
function spacingToPixelGap(
  spacing: ParsedSpacing | undefined,
  paraFontSizeHpt: number | undefined
): number | undefined {
  if (!spacing) return undefined
  if (spacing.unit === 'multiplier') {
    const fontPt = paraFontSizeHpt ? paraFontSizeHpt / 100 : 18
    return (spacing.value * fontPt * 96) / 72
  }
  return (spacing.value * 96) / 72
}

function parseParagraphs(txBody: Element, theme?: OoxmlTheme, inheritedLevels?: InheritedLevelMap): OoxmlParagraph[] {
  const paragraphs: OoxmlParagraph[] = []
  const pElements = txBody.getElementsByTagName('a:p')

  // Honor an inline <a:lstStyle> on the txBody too — it carries defaults that
  // PowerPoint applies *after* layout/master inheritance but *before* per-
  // paragraph <a:pPr><a:defRPr>.
  const bodyLstStyle = getChild(txBody, 'a:lstStyle')
  const bodyLevelDefaults: InheritedLevelMap = new Map()
  if (bodyLstStyle) {
    for (let i = 0; i < bodyLstStyle.childNodes.length; i++) {
      const child = bodyLstStyle.childNodes[i] as Element
      if (!child.tagName) continue
      const match = /^a:lvl([1-9])pPr$/.exec(child.tagName)
      if (!match) continue
      const level = parseInt(match[1]) - 1
      const defRPr = getChild(child, 'a:defRPr')
      if (!defRPr) continue
      const defaults: InheritedLevelDefaults = {}
      const sz = defRPr.getAttribute('sz')
      if (sz) {
        const parsed = parseInt(sz)
        if (Number.isFinite(parsed)) defaults.fontSize = parsed
      }
      if (defRPr.getAttribute('b') === '1') defaults.bold = true
      if (defRPr.getAttribute('i') === '1') defaults.italic = true
      const capAttr = defRPr.getAttribute('cap')
      if (capAttr) {
        const lower = capAttr.toLowerCase()
        if (lower === 'all' || lower === 'small' || lower === 'none') {
          defaults.cap = lower as OoxmlCap
        }
      }
      const latin = getChild(defRPr, 'a:latin')
      if (latin) {
        const typeface = resolveTypeface(latin.getAttribute('typeface'), theme)
        if (typeface) defaults.fontFamily = typeface
      }
      const lstStyleFill = resolveTextFillColor(defRPr, theme)
      if (lstStyleFill) defaults.color = lstStyleFill
      bodyLevelDefaults.set(level, defaults)
    }
  }

  // Merge: slide-body lstStyle wins over inherited; both feed into per-run
  // fallback logic below.
  const mergedLevelDefaults: InheritedLevelMap = new Map()
  if (inheritedLevels) for (const [lvl, d] of inheritedLevels) mergedLevelDefaults.set(lvl, { ...d })
  for (const [lvl, d] of bodyLevelDefaults) {
    const existing = mergedLevelDefaults.get(lvl) ?? {}
    mergedLevelDefaults.set(lvl, {
      fontSize: d.fontSize ?? existing.fontSize,
      fontFamily: d.fontFamily ?? existing.fontFamily,
      color: d.color ?? existing.color,
      bold: d.bold ?? existing.bold,
      italic: d.italic ?? existing.italic,
      cap: d.cap ?? existing.cap
    })
  }

  for (let i = 0; i < pElements.length; i++) {
    const p = pElements[i]
    if (p.parentElement !== txBody) continue

    const pPr = getChild(p, 'a:pPr')
    const alignment = pPr?.getAttribute('algn') as OoxmlParagraph['alignment']
    const level = pPr?.getAttribute('lvl') ? parseInt(pPr.getAttribute('lvl')!) : undefined
    const levelDefaults = getLevelDefaults(mergedLevelDefaults, level)

    const defRPr = pPr ? getChild(pPr, 'a:defRPr') : undefined
    const defaultFontSize = defRPr?.getAttribute('sz') ? parseInt(defRPr.getAttribute('sz')!) : undefined
    const defColor = defRPr ? resolveTextFillColor(defRPr, theme) : undefined
    const defLatin = defRPr ? getChild(defRPr, 'a:latin') : undefined
    const defFontFamily = defLatin ? resolveTypeface(defLatin.getAttribute('typeface'), theme) : undefined
    const defCap = defRPr ? parseCap(defRPr.getAttribute('cap')) : undefined

    const endParaRPr = getChild(p, 'a:endParaRPr')
    const endFontSize = endParaRPr?.getAttribute('sz') ? parseInt(endParaRPr.getAttribute('sz')!) : undefined
    const endColor = endParaRPr ? resolveTextFillColor(endParaRPr, theme) : undefined
    const endLatin = endParaRPr ? getChild(endParaRPr, 'a:latin') : undefined
    const endFontFamily = endLatin ? resolveTypeface(endLatin.getAttribute('typeface'), theme) : undefined
    const endCap = endParaRPr ? parseCap(endParaRPr.getAttribute('cap')) : undefined

    // Per-level inheritance kicks in when the paragraph declared nothing of
    // its own. We check fontSize/fontFamily/color/cap independently because
    // PPTX often sets only one at the master level.
    const paraFontSize = defaultFontSize || endFontSize || levelDefaults.fontSize
    const paraColor = defColor || endColor || levelDefaults.color
    const paraFontFamily = defFontFamily || endFontFamily || levelDefaults.fontFamily
    const paraCap = defCap || endCap || levelDefaults.cap
    const paraBold = levelDefaults.bold
    const paraItalic = levelDefaults.italic

    const { bulletType, bulletChar } = parseBulletInfo(pPr)

    const lnSpcEl = pPr ? getChild(pPr, 'a:lnSpc') : undefined
    const spcBefEl = pPr ? getChild(pPr, 'a:spcBef') : undefined
    const spcAftEl = pPr ? getChild(pPr, 'a:spcAft') : undefined
    const lineHeight = spacingToLineHeightMultiplier(parseSpacingNode(lnSpcEl), paraFontSize)
    const spaceBefore = spacingToPixelGap(parseSpacingNode(spcBefEl), paraFontSize)
    const spaceAfter = spacingToPixelGap(parseSpacingNode(spcAftEl), paraFontSize)

    const runs: OoxmlTextRun[] = []
    for (let j = 0; j < p.childNodes.length; j++) {
      const child = p.childNodes[j] as Element
      if (child.tagName === 'a:r') {
        const rPr = getChild(child, 'a:rPr')
        const tEl = getChild(child, 'a:t')
        const text = tEl?.textContent || ''
        if (text) {
          const props = parseRunProperties(rPr, theme)
          if (!props.fontSize && paraFontSize) props.fontSize = paraFontSize
          if (!props.color && paraColor) props.color = paraColor
          if (!props.fontFamily && paraFontFamily) props.fontFamily = paraFontFamily
          if (!props.cap && paraCap) props.cap = paraCap
          if (props.bold === undefined && paraBold !== undefined) props.bold = paraBold
          if (props.italic === undefined && paraItalic !== undefined) props.italic = paraItalic
          runs.push({ text, ...props })
        }
      } else if (child.tagName === 'a:br') {
        runs.push({ text: '\n' })
      }
    }

    paragraphs.push({
      runs,
      alignment,
      level,
      bulletType,
      bulletChar,
      lineHeight,
      spaceBefore,
      spaceAfter,
      defaultFontSize: paraFontSize,
      defaultColor: paraColor
    })
  }

  return paragraphs
}

const ALIGNMENT_TO_RICH: Record<NonNullable<OoxmlParagraph['alignment']>, RichTextParagraph['alignment']> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'justify'
}

function runToRich(run: OoxmlTextRun, relationships: SlideRelationships, fontScale = 1): RichTextRun {
  const richRun: RichTextRun = { text: run.text }
  if (run.fontFamily) richRun.fontFamily = run.fontFamily
  if (run.fontSize) {
    const scaled = run.fontSize * fontScale
    richRun.fontSize = hundredthsPointToPixels(scaled)
  }
  if (run.bold) richRun.fontWeight = 'bold'
  if (run.italic) richRun.fontStyle = 'italic'
  if (run.strikethrough) {
    richRun.textDecoration = 'line-through'
  } else if (run.underline) {
    richRun.textDecoration = 'underline'
  }
  if (run.color) richRun.color = run.color
  if (run.hyperlinkRelId) {
    const url = relationships.hyperlinks.get(run.hyperlinkRelId)
    if (url) richRun.hyperlink = url
  }
  const transform = capToTransform(run.cap)
  if (transform) richRun.textTransform = transform
  return richRun
}

function paragraphsToRich(
  paragraphs: OoxmlParagraph[],
  relationships: SlideRelationships,
  fontScale = 1
): RichTextParagraph[] {
  const result: RichTextParagraph[] = []
  for (const p of paragraphs) {
    const runs = p.runs.filter(r => r.text.length > 0).map(r => runToRich(r, relationships, fontScale))
    if (runs.length === 0) runs.push({ text: '' })
    const rich: RichTextParagraph = { runs }
    if (p.alignment) rich.alignment = ALIGNMENT_TO_RICH[p.alignment]
    if (typeof p.level === 'number') rich.indentLevel = p.level
    if (p.bulletType) rich.bulletType = p.bulletType
    if (p.bulletChar) rich.bulletChar = p.bulletChar
    if (p.lineHeight) rich.lineHeight = p.lineHeight
    if (p.spaceBefore) rich.spaceBefore = p.spaceBefore
    if (p.spaceAfter) rich.spaceAfter = p.spaceAfter
    result.push(rich)
  }
  return result
}

function determineDominantFormatting(
  paragraphs: OoxmlParagraph[],
  theme?: OoxmlTheme,
  fontScale = 1
): {
  fontSize: number
  fontWeight: TextElement['fontWeight']
  fontStyle: TextElement['fontStyle']
  textDecoration: TextElement['textDecoration']
  fontFamily: string
  color: string
  textAlign: TextElement['textAlign']
  textTransform?: RichTextTransform
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

  const themeTextColor = theme?.colors.get('dk1') || '#1e293b'
  const defaultFont = theme?.minorFont || 'Inter'

  const firstAlignment = paragraphs[0]?.alignment

  // Promote the run's `cap` to element-level only if every non-empty run
  // agrees; otherwise leave the decision to per-run textTransform so the
  // element-level CSS won't override individually-styled runs.
  const caps = new Set<string>()
  for (const para of paragraphs) {
    for (const run of para.runs) {
      if (run.text.trim().length === 0) continue
      caps.add(run.cap ?? '__none__')
    }
  }
  const elementTransform = caps.size === 1 && !caps.has('__none__') ? capToTransform(dominant.cap) : undefined

  // OOXML spec: when no `<a:rPr sz>`, `<a:pPr>/<a:defRPr sz>`, `<a:endParaRPr sz>`,
  // or master/layout level default is present (typical for free-floating
  // `<p:sp txBox="1">` text boxes), PowerPoint resolves the font size against
  // `ppt/presentation.xml > <p:defaultTextStyle>`. That element's spec-default
  // size is `sz="1800"` (18pt), which converts to 24px at 96dpi. We use that
  // here instead of the previous arbitrary 32px fallback — the old value made
  // text boxes with `<a:spAutoFit/>` at their natural PowerPoint height (e.g.
  // 29px tall) clip the ascender of bold text.
  const DEFAULT_TEXTBOX_HUNDREDTHS_POINT = 1800
  return {
    fontSize: hundredthsPointToPixels((dominant.fontSize ?? DEFAULT_TEXTBOX_HUNDREDTHS_POINT) * fontScale),
    fontWeight: dominant.bold ? 'bold' : 'normal',
    fontStyle: dominant.italic ? 'italic' : 'normal',
    textDecoration: dominant.strikethrough ? 'line-through' : dominant.underline ? 'underline' : 'none',
    fontFamily: dominant.fontFamily || defaultFont,
    color: dominant.color || themeTextColor,
    textAlign: ALIGNMENT_MAP[firstAlignment || 'l'] || 'left',
    textTransform: elementTransform
  }
}

function resolveStyleFontColor(shape: Element, theme?: OoxmlTheme): string | undefined {
  const style = getChild(shape, 'p:style')
  if (!style) return undefined

  const fontRef = getChild(style, 'a:fontRef')
  if (!fontRef) return undefined

  return parseSolidFill(fontRef, theme) || undefined
}

function extractShapeFill(shape: Element, theme?: OoxmlTheme): { backgroundColor: string; gradient?: GradientConfig } {
  const resolved = resolveTextBackgroundFromShape(shape, theme)
  return { backgroundColor: resolved.backgroundColor, gradient: resolved.gradient }
}

/**
 * Rough text-height estimate used to stop PPTX-authored text from clipping.
 *
 * PowerPoint lets text overflow its declared text-box whenever the author has
 * not picked "Shrink text on overflow" (`<a:normAutofit>`) — the on-slide view
 * simply extends the glyphs below the box, and the recorded `cy` stays at the
 * size the author chose. The editor treats `TextElement.size.height` as a
 * hard clip, so those overflowing titles (e.g. slide 4/5/12 of the Enterprise
 * AI deck) disappear.
 *
 * We use a cheap sans-serif heuristic here because font metrics are not
 * available at parse time; the resulting height is always rounded up and then
 * max-ed with the declared height, so the estimate is allowed to be
 * conservative. An overshoot at worst gives the text box a little bit of
 * extra breathing room; an undershoot would reproduce the clipping bug.
 */
function estimateWrappedLineCount(content: string, fontSize: number, innerWidth: number): number {
  if (!content) return 0
  // Average glyph advance for the system UI sans-serif families we fall
  // back to (Segoe UI / SF / Helvetica Neue) at 100% weight. `0.55em` is
  // a good middle-ground; dense scripts would need a bigger factor but
  // our decks are Latin-heavy so this keeps estimates reasonable.
  const avgCharWidth = Math.max(1, fontSize * 0.55)
  const paragraphs = content.split(/\r?\n/)
  let total = 0
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      total += 1
      continue
    }
    // We wrap on whitespace, not inside words: HTML/CSS's default
    // `overflow-wrap: normal` lets a single long word exceed the line
    // horizontally rather than splitting mid-grapheme. Approximating
    // the other way (every character wraps) caused 6-letter labels in
    // tight boxes to report three-line heights, which broke group-
    // flattening tests and misclassified chevron captions as overflow.
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      total += 1
      continue
    }
    let lines = 1
    let currentLineWidth = 0
    for (const word of words) {
      // Include a trailing space in the advance so consecutive words
      // don't pack unrealistically tight.
      const wordAdvance = (word.length + 1) * avgCharWidth
      if (currentLineWidth === 0) {
        currentLineWidth = wordAdvance
        continue
      }
      if (currentLineWidth + wordAdvance > innerWidth) {
        lines += 1
        currentLineWidth = wordAdvance
      } else {
        currentLineWidth += wordAdvance
      }
    }
    total += lines
  }
  return total
}

function estimateRequiredTextHeight(
  content: string,
  fontSize: number,
  width: number,
  padding: number,
  lineHeight: number
): number {
  const innerWidth = Math.max(1, width - padding * 2)
  const lines = estimateWrappedLineCount(content, fontSize, innerWidth)
  if (lines === 0) return 0
  // `lineHeight` is multiplicative (1.4 matches the editor's default for
  // imported text). The trailing padding is symmetric so the ascender of the
  // first line and the descender of the last line both breathe.
  return Math.ceil(lines * fontSize * lineHeight + padding * 2)
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

/**
 * Parse in-shape text for a single {@code p:sp} autoshave. Returns null when
 * there is no non-empty text (same rules as text boxes).
 */
export function extractShapeInTextForAutoshave(
  shape: Element,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  inheritedResolver?: InheritedTextDefaultsResolver
): ShapeInText | null {
  const txBody = getChild(shape, 'p:txBody')
  if (!txBody) return null

  let inheritedLevels: InheritedLevelMap | undefined
  if (inheritedResolver) {
    const nvSpPr = getChild(shape, 'p:nvSpPr')
    const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
    const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
    if (ph) {
      inheritedLevels = inheritedResolver.resolve(
        ph.getAttribute('type') || undefined,
        ph.getAttribute('idx') || undefined
      )
    }
  }

  const paragraphs = parseParagraphs(txBody, theme, inheritedLevels)
  const allRuns = paragraphs.flatMap(p => p.runs)
  const hasText = allRuns.some(r => r.text.trim().length > 0)
  if (!hasText) return null

  const bodyPr = getChild(txBody, 'a:bodyPr')
  const autofit = parseBodyAutofit(bodyPr)
  const bodyLayout = parseBodyTextBoxLayout(bodyPr, 'middle')
  const fontScale = autofit.fontScale
  const formatting = determineDominantFormatting(paragraphs, theme, fontScale)

  if (formatting.color === (theme?.colors.get('dk1') || '#1e293b')) {
    const styleColor = resolveStyleFontColor(shape, theme)
    if (styleColor) formatting.color = styleColor
  }

  const { content, links } = buildTextAndLinks(paragraphs, relationships)
  if (!content) return null

  // In-shape labels go as small as 8px so normAutofit-shrunk PowerPoint
  // text (e.g. chevron/SmartArt captions) doesn't get silently upscaled.
  // The 12px floor used for standalone text boxes would cause labels to
  // appear larger in the editor than PowerPoint rendered them.
  const fontSize = Math.max(8, Math.min(200, Math.round(formatting.fontSize)))
  const richParagraphs = paragraphsToRich(paragraphs, relationships, fontScale)

  return {
    content,
    paragraphs: richParagraphs.length > 0 ? richParagraphs : undefined,
    links: links.length > 0 ? links : undefined,
    fontSize,
    fontWeight: formatting.fontWeight,
    fontStyle: formatting.fontStyle,
    textDecoration: formatting.textDecoration,
    fontFamily: formatting.fontFamily,
    color: formatting.color,
    textAlign: formatting.textAlign,
    verticalAlign: bodyLayout.verticalAlign,
    lineHeight: 1.4,
    letterSpacing: 0,
    padding: bodyLayout.padding,
    textTransform: formatting.textTransform
  }
}

export function extractTextElements(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  inheritedResolver?: InheritedTextDefaultsResolver
): TextElement[] {
  const elements: TextElement[] = []
  const shapes = slideXml.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]

    if (isInsideGroup(shape)) continue

    const txBody = getChild(shape, 'p:txBody')
    if (!txBody) continue

    // Resolve placeholder-aware defaults from layout + master BEFORE parsing
    // paragraphs so missing run-level attributes fall back to the right
    // values (e.g. title sz="8400" coming from master p:titleStyle).
    let inheritedLevels: InheritedLevelMap | undefined
    if (inheritedResolver) {
      const nvSpPr = getChild(shape, 'p:nvSpPr')
      const nvPr = nvSpPr ? getChild(nvSpPr, 'p:nvPr') : undefined
      const ph = nvPr ? getChild(nvPr, 'p:ph') : undefined
      if (ph) {
        inheritedLevels = inheritedResolver.resolve(
          ph.getAttribute('type') || undefined,
          ph.getAttribute('idx') || undefined
        )
      }
    }

    const paragraphs = parseParagraphs(txBody, theme, inheritedLevels)
    const allRuns = paragraphs.flatMap(p => p.runs)
    const hasText = allRuns.some(r => r.text.trim().length > 0)
    if (!hasText) continue

    const transform = extractTransform(shape)
    if (!transform) continue

    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    // PowerPoint often auto-shrinks titles to fit ("AutoFit text" → shows
    // up as <a:normAutofit fontScale="92000"/>). We honor the recorded
    // scale so imported text matches the rendered size, instead of the
    // declared 44pt that nobody actually sees.
    const bodyPr = getChild(txBody, 'a:bodyPr')
    const autofit = parseBodyAutofit(bodyPr)
    const bodyLayout = parseBodyTextBoxLayout(bodyPr, 'top')
    const fontScale = autofit.fontScale

    const formatting = determineDominantFormatting(paragraphs, theme, fontScale)

    if (formatting.color === (theme?.colors.get('dk1') || '#1e293b')) {
      const styleColor = resolveStyleFontColor(shape, theme)
      if (styleColor) formatting.color = styleColor
    }

    const { content, links } = buildTextAndLinks(paragraphs, relationships)
    const shapeFill = extractShapeFill(shape, theme)

    if (!content) continue

    const fontSize = Math.max(12, Math.min(200, Math.round(formatting.fontSize)))
    const richParagraphs = paragraphsToRich(paragraphs, relationships, fontScale)

    // When the body has no shrink-to-fit directive (`<a:normAutofit>`),
    // PowerPoint lets text overflow the declared box. The editor clips to
    // `TextElement.size.height` instead, so titles on slides 4/5/12 of the
    // Enterprise AI deck disappear. We grow the element height in the
    // `none | noAutofit | spAutoFit` modes to match PowerPoint's on-slide
    // visual. `normal` (`normAutofit`) already shrinks the font, so the
    // declared height is authoritative there.
    const finalWidth = Math.max(40, width)
    let finalHeight = Math.max(20, height)
    if (autofit.mode !== 'normal') {
      const required = estimateRequiredTextHeight(content, fontSize, finalWidth, bodyLayout.padding, 1.4)
      // Only grow when the estimated required height is meaningfully
      // larger than the declared box — a 5 % tolerance absorbs normal
      // metric jitter (line-height rounding, half-pixel padding) so
      // boxes that PowerPoint authored snug-to-text don't expand by
      // a couple of pixels on every import.
      if (required > finalHeight * 1.05) finalHeight = required
    }

    elements.push(
      createTextElement({
        id: nextImportUid('text-import'),
        content,
        paragraphs: richParagraphs.length > 0 ? richParagraphs : undefined,
        links: links.length > 0 ? links : undefined,
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: { width: finalWidth, height: finalHeight },
        fontSize,
        fontWeight: formatting.fontWeight,
        fontStyle: formatting.fontStyle,
        textDecoration: formatting.textDecoration,
        fontFamily: formatting.fontFamily,
        color: formatting.color,
        backgroundColor: shapeFill.backgroundColor,
        gradient: shapeFill.gradient,
        textAlign: formatting.textAlign,
        verticalAlign: bodyLayout.verticalAlign,
        padding: bodyLayout.padding,
        rotation: rotationToAngle(transform.rotation),
        textTransform: formatting.textTransform
      })
    )
  }

  return elements
}
