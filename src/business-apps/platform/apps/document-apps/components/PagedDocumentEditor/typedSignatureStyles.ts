/**
 * Typed (rendered) signature font styles — system font stacks similar to common e-sign products.
 */

export const TYPED_SIGNATURE_STYLE_IDS = [
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

function isTypedSignatureStyle(v: string): v is TypedSignatureStyle {
  return (TYPED_SIGNATURE_STYLE_IDS as readonly string[]).includes(v)
}

/** Restores saved style; unknown or legacy values fall back to cursive. */
export function parseTypedSignatureStyle(v: unknown): TypedSignatureStyle {
  return typeof v === 'string' && isTypedSignatureStyle(v) ? v : 'cursive'
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

const STYLE_SPECS: Record<TypedSignatureStyle, StyleSpec> = {
  cursive: {
    families: ['cursive'],
    fontSizeFull: 32,
    fontSizeInitials: 36,
    baselineYFull: 50,
    baselineYInitials: 52
  },
  formal: {
    families: ['Georgia', 'Times New Roman', 'Times', 'serif'],
    fontSizeFull: 32,
    fontSizeInitials: 36,
    baselineYFull: 50,
    baselineYInitials: 52
  },
  script: {
    families: ['Segoe Script', 'Apple Chancery', 'Snell Roundhand', 'Brush Script MT', 'cursive'],
    fontSizeFull: 34,
    fontSizeInitials: 38,
    baselineYFull: 52,
    baselineYInitials: 54
  },
  elegant: {
    families: ['Palatino Linotype', 'Palatino', 'Book Antiqua', 'serif'],
    fontSizeFull: 30,
    fontSizeInitials: 34,
    baselineYFull: 48,
    baselineYInitials: 50
  },
  modern: {
    families: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
    fontSizeFull: 28,
    fontSizeInitials: 32,
    baselineYFull: 46,
    baselineYInitials: 48
  },
  classic: {
    families: ['Times New Roman', 'Times', 'Liberation Serif', 'serif'],
    fontSizeFull: 32,
    fontSizeInitials: 36,
    baselineYFull: 50,
    baselineYInitials: 52
  },
  bold: {
    families: ['Arial Black', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
    fontSizeFull: 28,
    fontSizeInitials: 32,
    baselineYFull: 46,
    baselineYInitials: 48,
    fontWeight: '700'
  }
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TYPED_SVG_WIDTH} ${TYPED_SVG_HEIGHT}" width="${TYPED_SVG_WIDTH}" height="${TYPED_SVG_HEIGHT}"><text x="0" y="${spec.baselineYFull}" style="${styleAttr}">${escaped}</text></svg>`
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TYPED_INITIALS_WIDTH} ${TYPED_INITIALS_HEIGHT}" width="${TYPED_INITIALS_WIDTH}" height="${TYPED_INITIALS_HEIGHT}"><text x="0" y="${spec.baselineYInitials}" style="${styleAttr}">${escaped}</text></svg>`
}
