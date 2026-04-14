// Shared style helpers for the generated document table of contents.

export interface DocumentTocTextStyle {
  fontFamily: string
  fontSizePt: number | null
  bold: boolean
  italic: boolean
  color: string | null
}

export interface DocumentTocStyles {
  title: DocumentTocTextStyle
  entries: DocumentTocTextStyle
}

type PartialDocumentTocTextStyle = Partial<DocumentTocTextStyle> | null | undefined
type PartialDocumentTocStyles = Partial<DocumentTocStyles> | null | undefined

const MIN_FONT_SIZE_PT = 5
const MAX_FONT_SIZE_PT = 72

export const DEFAULT_DOCUMENT_TOC_TEXT_STYLE: DocumentTocTextStyle = {
  fontFamily: '',
  fontSizePt: null,
  bold: false,
  italic: false,
  color: null
}

export const DEFAULT_DOCUMENT_TOC_STYLES: DocumentTocStyles = {
  title: {
    ...DEFAULT_DOCUMENT_TOC_TEXT_STYLE,
    bold: true
  },
  entries: {
    ...DEFAULT_DOCUMENT_TOC_TEXT_STYLE
  }
}

function normalizeFontFamily(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeFontSizePt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.max(MIN_FONT_SIZE_PT, Math.min(MAX_FONT_SIZE_PT, Math.round(parsed * 100) / 100))
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const rawHex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(rawHex)) {
    return null
  }

  const expanded =
    rawHex.length === 3
      ? rawHex
          .split('')
          .map(char => `${char}${char}`)
          .join('')
      : rawHex

  return `#${expanded.toUpperCase()}`
}

export function normalizeDocumentTocTextStyle(
  value: PartialDocumentTocTextStyle,
  fallback: DocumentTocTextStyle = DEFAULT_DOCUMENT_TOC_TEXT_STYLE
): DocumentTocTextStyle {
  return {
    fontFamily: normalizeFontFamily(value?.fontFamily ?? fallback.fontFamily),
    fontSizePt: normalizeFontSizePt(value?.fontSizePt ?? fallback.fontSizePt),
    bold: value?.bold === undefined ? fallback.bold : value.bold === true,
    italic: value?.italic === undefined ? fallback.italic : value.italic === true,
    color: normalizeColor(value?.color ?? fallback.color)
  }
}

export function normalizeDocumentTocStyles(value: PartialDocumentTocStyles): DocumentTocStyles {
  return {
    title: normalizeDocumentTocTextStyle(value?.title, DEFAULT_DOCUMENT_TOC_STYLES.title),
    entries: normalizeDocumentTocTextStyle(value?.entries, DEFAULT_DOCUMENT_TOC_STYLES.entries)
  }
}

export function parseDocumentTocStyles(stylesJson: string | null | undefined): DocumentTocStyles {
  if (!stylesJson) {
    return DEFAULT_DOCUMENT_TOC_STYLES
  }

  try {
    const parsed = JSON.parse(stylesJson) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_DOCUMENT_TOC_STYLES
    }

    return normalizeDocumentTocStyles(parsed as PartialDocumentTocStyles)
  } catch {
    return DEFAULT_DOCUMENT_TOC_STYLES
  }
}

export function stringifyDocumentTocStyles(styles: PartialDocumentTocStyles): string {
  return JSON.stringify(normalizeDocumentTocStyles(styles))
}

export function buildDocumentTocTextStyleObject(style: DocumentTocTextStyle): Record<string, string> {
  const out: Record<string, string> = {
    fontWeight: style.bold ? '700' : '400',
    fontStyle: style.italic ? 'italic' : 'normal'
  }

  if (style.fontFamily) {
    out.fontFamily = style.fontFamily
  }
  if (style.fontSizePt !== null) {
    out.fontSize = `${style.fontSizePt}pt`
  }
  if (style.color) {
    out.color = style.color
  }

  return out
}

export function buildDocumentTocTextStyleCss(style: DocumentTocTextStyle): string {
  return Object.entries(buildDocumentTocTextStyleObject(style))
    .map(([property, value]) => `${property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}: ${value}`)
    .join('; ')
}
