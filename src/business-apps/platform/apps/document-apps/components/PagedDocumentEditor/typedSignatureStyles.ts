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

function buildTextStyle(spec: StyleSpec, fontSize: number, fill: string): string {
  const fontCss = fontStackToCss(spec.families)
  const weight = spec.fontWeight ? `font-weight: ${spec.fontWeight}; ` : ''
  return `${weight}font-family: ${fontCss}; font-size: ${fontSize}px; fill: ${fill}`
}

export function typedTextToSvg(text: string, style: TypedSignatureStyle, fill = '#000000'): string {
  const spec = STYLE_SPECS[style]
  const escaped = escapeSvgTextContent(text)
  const styleAttr = escapeSvgStyleAttr(buildTextStyle(spec, spec.fontSizeFull, fill))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TYPED_SVG_WIDTH} ${TYPED_SVG_HEIGHT}" width="${TYPED_SVG_WIDTH}" height="${TYPED_SVG_HEIGHT}"><text x="0" y="${spec.baselineYFull}" style="${styleAttr}">${escaped}</text></svg>`
}

export function typedInitialsToSvg(text: string, style: TypedSignatureStyle, fill = '#000000'): string {
  const spec = STYLE_SPECS[style]
  const escaped = escapeSvgTextContent(text)
  const styleAttr = escapeSvgStyleAttr(buildTextStyle(spec, spec.fontSizeInitials, fill))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TYPED_INITIALS_WIDTH} ${TYPED_INITIALS_HEIGHT}" width="${TYPED_INITIALS_WIDTH}" height="${TYPED_INITIALS_HEIGHT}"><text x="0" y="${spec.baselineYInitials}" style="${styleAttr}">${escaped}</text></svg>`
}
