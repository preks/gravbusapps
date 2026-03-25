/**
 * Typed (rendered) signature styles using handwriting-oriented web fonts + OS fallbacks.
 *
 * Primary faces (loaded in index.html; also @import’d into exported SVG so snapshots render
 * consistently when opened online). Generic serif/sans options are avoided for “signature” rows —
 * they read as typed text, not pen strokes.
 */

export const TYPED_SIGNATURE_STYLE_IDS = [
  'normal',
  'cursive',
  'formal',
  'script',
  'elegant',
  'modern',
  'classic',
  'bold'
] as const

export type TypedSignatureStyle = (typeof TYPED_SIGNATURE_STYLE_IDS)[number]

export const TYPED_SVG_WIDTH = 400
export const TYPED_SVG_HEIGHT = 80
export const TYPED_INITIALS_WIDTH = 160
export const TYPED_INITIALS_HEIGHT = 80

/** Same URL as index.html — keep in sync for preview vs saved SVG. */
export const SIGNATURE_TYPED_FONTS_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Allura&family=Caveat:wght@400;600&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Italianno&family=Sacramento&display=swap'

function isTypedSignatureStyle(v: string): v is TypedSignatureStyle {
  return (TYPED_SIGNATURE_STYLE_IDS as readonly string[]).includes(v)
}

/** Restores saved style; unknown values fall back to normal. */
export function parseTypedSignatureStyle(v: unknown): TypedSignatureStyle {
  return typeof v === 'string' && isTypedSignatureStyle(v) ? v : 'normal'
}

function fontStackToCss(families: string[]): string {
  return families.map(f => (/\s/.test(f) ? `"${f.replace(/"/g, '\\"')}"` : f)).join(', ')
}

type StyleSpec = {
  /** CSS font-family stack */
  families: string[]
  fontSizeFull: number
  fontSizeInitials: number
  baselineYFull: number
  baselineYInitials: number
  fontWeight?: string
}

/**
 * Style presets → pen-like scripts (not body fonts).
 * - Dancing Script: natural flowing signature (default “cursive”).
 * - Great Vibes / Allura / Sacramento / Italianno: formal / script / delicate / classic flourish.
 * - Caveat: informal modern hand-print.
 */
const STYLE_SPECS: Record<TypedSignatureStyle, StyleSpec> = {
  /** Plain print-style name (not script) — closest to “typed on the line”. */
  normal: {
    families: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
    fontSizeFull: 26,
    fontSizeInitials: 30,
    baselineYFull: 48,
    baselineYInitials: 50
  },
  cursive: {
    families: ['Dancing Script', 'Segoe Script', 'Apple Chancery', 'cursive'],
    fontSizeFull: 34,
    fontSizeInitials: 38,
    baselineYFull: 52,
    baselineYInitials: 54
  },
  formal: {
    families: ['Great Vibes', 'Snell Roundhand', 'Apple Chancery', 'cursive'],
    fontSizeFull: 32,
    fontSizeInitials: 36,
    baselineYFull: 50,
    baselineYInitials: 52
  },
  script: {
    families: ['Allura', 'Segoe Script', 'Brush Script MT', 'cursive'],
    fontSizeFull: 34,
    fontSizeInitials: 38,
    baselineYFull: 52,
    baselineYInitials: 54
  },
  elegant: {
    families: ['Sacramento', 'Snell Roundhand', 'Apple Chancery', 'cursive'],
    fontSizeFull: 36,
    fontSizeInitials: 40,
    baselineYFull: 54,
    baselineYInitials: 56
  },
  modern: {
    families: ['Caveat', 'Segoe Script', 'cursive'],
    fontSizeFull: 32,
    fontSizeInitials: 36,
    baselineYFull: 50,
    baselineYInitials: 52
  },
  classic: {
    families: ['Italianno', 'Great Vibes', 'cursive'],
    fontSizeFull: 38,
    fontSizeInitials: 42,
    baselineYFull: 54,
    baselineYInitials: 56
  },
  bold: {
    families: ['Dancing Script', 'Segoe Script', 'Brush Script MT', 'cursive'],
    fontSizeFull: 32,
    fontSizeInitials: 36,
    baselineYFull: 50,
    baselineYInitials: 52,
    fontWeight: '700'
  }
}

/** Font + weight for live preview inputs (Type tab) and style dropdown rows. */
export function getTypedSignatureInputPreviewStyle(style: TypedSignatureStyle): {
  fontFamily: string
  fontWeight?: string
} {
  const spec = STYLE_SPECS[style]
  return {
    fontFamily: fontStackToCss(spec.families),
    ...(spec.fontWeight ? { fontWeight: spec.fontWeight } : {})
  }
}

function svgGoogleFontImportDefs(): string {
  const href = SIGNATURE_TYPED_FONTS_STYLESHEET_URL.replace(/&/g, '&amp;')
  return `<defs><style type="text/css">@import url("${href}");</style></defs>`
}

function escapeSvgTextContent(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeSvgStyleAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/\n/g, ' ')
}

const TYPED_SIGNATURE_STROKE_WIDTHS = [1, 2, 4, 6] as const

function normalizeTypedStrokeThickness(raw: number): (typeof TYPED_SIGNATURE_STROKE_WIDTHS)[number] {
  return (TYPED_SIGNATURE_STROKE_WIDTHS as readonly number[]).includes(raw)
    ? (raw as (typeof TYPED_SIGNATURE_STROKE_WIDTHS)[number])
    : 2
}

/** Font size multiplier per pen width — pairs with stroke outline below. */
const TYPED_THICKNESS_FONT_SCALE: Record<number, number> = {
  1: 0.86,
  2: 1,
  4: 1.12,
  6: 1.24
}

/** SVG stroke-width (px) on text; same ink as fill for a heavier “nib”. */
const TYPED_THICKNESS_STROKE_PX: Record<number, number> = {
  1: 0,
  2: 0.4,
  4: 1,
  6: 1.65
}

function buildTextStyle(spec: StyleSpec, fontSize: number, fill: string, strokeThickness: number): string {
  const pen = normalizeTypedStrokeThickness(strokeThickness)
  const fontCss = fontStackToCss(spec.families)
  const weight = spec.fontWeight ? `font-weight: ${spec.fontWeight}; ` : ''
  const scale = TYPED_THICKNESS_FONT_SCALE[pen] ?? 1
  const sized = Math.max(8, Math.round(fontSize * scale))
  const sw = TYPED_THICKNESS_STROKE_PX[pen] ?? 0
  const strokePart =
    sw > 0
      ? `paint-order: stroke fill; stroke: ${fill}; stroke-width: ${sw}px; stroke-linejoin: round; stroke-linecap: round; `
      : ''
  return `${strokePart}${weight}font-family: ${fontCss}; font-size: ${sized}px; fill: ${fill}`
}

export function typedTextToSvg(
  text: string,
  style: TypedSignatureStyle,
  fill = '#000000',
  strokeThickness = 2
): string {
  const spec = STYLE_SPECS[style]
  const escaped = escapeSvgTextContent(text)
  const pen = normalizeTypedStrokeThickness(strokeThickness)
  const styleAttr = escapeSvgStyleAttr(buildTextStyle(spec, spec.fontSizeFull, fill, pen))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TYPED_SVG_WIDTH} ${TYPED_SVG_HEIGHT}" width="${TYPED_SVG_WIDTH}" height="${TYPED_SVG_HEIGHT}">${svgGoogleFontImportDefs()}<text x="0" y="${spec.baselineYFull}" style="${styleAttr}">${escaped}</text></svg>`
}

export function typedInitialsToSvg(
  text: string,
  style: TypedSignatureStyle,
  fill = '#000000',
  strokeThickness = 2
): string {
  const spec = STYLE_SPECS[style]
  const escaped = escapeSvgTextContent(text)
  const pen = normalizeTypedStrokeThickness(strokeThickness)
  const styleAttr = escapeSvgStyleAttr(buildTextStyle(spec, spec.fontSizeInitials, fill, pen))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TYPED_INITIALS_WIDTH} ${TYPED_INITIALS_HEIGHT}" width="${TYPED_INITIALS_WIDTH}" height="${TYPED_INITIALS_HEIGHT}">${svgGoogleFontImportDefs()}<text x="0" y="${spec.baselineYInitials}" style="${styleAttr}">${escaped}</text></svg>`
}
