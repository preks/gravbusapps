import type { RichParagraphNumberingStyle, RichTextParagraph } from '../components/slideElements'

export const DEFAULT_BULLET_GLYPH = '•'
export const DEFAULT_LIST_MARKER_WIDTH = 18
export const DEFAULT_LIST_LEVEL_OFFSET = 18

export const BULLET_PRESET_OPTIONS = [
  { char: '•', labelKey: 'editor-list-bullet-filled-circle', fallbackLabel: 'Filled circle' },
  { char: '○', labelKey: 'editor-list-bullet-open-circle', fallbackLabel: 'Open circle' },
  { char: '■', labelKey: 'editor-list-bullet-filled-square', fallbackLabel: 'Filled square' },
  { char: '□', labelKey: 'editor-list-bullet-open-square', fallbackLabel: 'Open square' },
  { char: '◆', labelKey: 'editor-list-bullet-diamond', fallbackLabel: 'Diamond' },
  { char: '➢', labelKey: 'editor-list-bullet-arrow', fallbackLabel: 'Arrow' },
  { char: '✓', labelKey: 'editor-list-bullet-checkmark', fallbackLabel: 'Checkmark' }
] as const

export const NUMBERING_STYLE_PRESETS: RichParagraphNumberingStyle[] = [
  'arabicPeriod',
  'alphaLcPeriod',
  'romanLcPeriod',
  'alphaUcPeriod',
  'romanUcPeriod',
  'arabicParenR',
  'alphaLcParenR',
  'romanLcParenR',
  'alphaUcParenR',
  'romanUcParenR'
]

const SUPPORTED_NUMBERING_STYLES = new Set<RichParagraphNumberingStyle>([
  'alphaLcParenBoth',
  'alphaLcParenR',
  'alphaLcPeriod',
  'alphaUcParenBoth',
  'alphaUcParenR',
  'alphaUcPeriod',
  'arabicParenBoth',
  'arabicParenR',
  'arabicPeriod',
  'arabicPlain',
  'romanLcParenBoth',
  'romanLcParenR',
  'romanLcPeriod',
  'romanUcParenBoth',
  'romanUcParenR',
  'romanUcPeriod'
])

export interface RichTextListGeometry {
  leftMargin: number
  indent: number
  markerOffset: number
  markerWidth: number
  textOffset: number
}

function toAlpha(value: number): string {
  let current = Math.max(1, Math.floor(value))
  let result = ''

  while (current > 0) {
    current -= 1
    result = String.fromCharCode(97 + (current % 26)) + result
    current = Math.floor(current / 26)
  }

  return result || 'a'
}

function toRoman(value: number): string {
  const safeValue = Math.max(1, Math.floor(value))
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ]

  let remaining = safeValue
  let result = ''

  for (const [threshold, numeral] of numerals) {
    while (remaining >= threshold) {
      result += numeral
      remaining -= threshold
    }
  }

  return result || 'I'
}

function applyNumberPunctuation(label: string, style: RichParagraphNumberingStyle): string {
  switch (style) {
    case 'alphaLcParenBoth':
    case 'alphaUcParenBoth':
    case 'arabicParenBoth':
    case 'romanLcParenBoth':
    case 'romanUcParenBoth':
      return `(${label})`
    case 'alphaLcParenR':
    case 'alphaUcParenR':
    case 'arabicParenR':
    case 'romanLcParenR':
    case 'romanUcParenR':
      return `${label})`
    case 'arabicPlain':
      return label
    default:
      return `${label}.`
  }
}

export function normalizeNumberingStyle(rawStyle: string | null | undefined): RichParagraphNumberingStyle | undefined {
  if (!rawStyle) return undefined
  return SUPPORTED_NUMBERING_STYLES.has(rawStyle as RichParagraphNumberingStyle)
    ? (rawStyle as RichParagraphNumberingStyle)
    : undefined
}

export function formatNumberingLabel(value: number, style: RichParagraphNumberingStyle = 'arabicPeriod'): string {
  const safeValue = Math.max(1, Math.floor(value))

  switch (style) {
    case 'alphaLcParenBoth':
    case 'alphaLcParenR':
    case 'alphaLcPeriod':
      return applyNumberPunctuation(toAlpha(safeValue), style)
    case 'alphaUcParenBoth':
    case 'alphaUcParenR':
    case 'alphaUcPeriod':
      return applyNumberPunctuation(toAlpha(safeValue).toUpperCase(), style)
    case 'romanLcParenBoth':
    case 'romanLcParenR':
    case 'romanLcPeriod':
      return applyNumberPunctuation(toRoman(safeValue).toLowerCase(), style)
    case 'romanUcParenBoth':
    case 'romanUcParenR':
    case 'romanUcPeriod':
      return applyNumberPunctuation(toRoman(safeValue), style)
    case 'arabicParenBoth':
    case 'arabicParenR':
    case 'arabicPlain':
    case 'arabicPeriod':
    default:
      return applyNumberPunctuation(String(safeValue), style)
  }
}

export function getListGeometryForLevel(indentLevel = 0): Pick<RichTextParagraph, 'listLeftMargin' | 'listIndent'> {
  const safeLevel = Math.max(0, indentLevel)
  return {
    listLeftMargin: DEFAULT_LIST_MARKER_WIDTH + safeLevel * DEFAULT_LIST_LEVEL_OFFSET,
    listIndent: -DEFAULT_LIST_MARKER_WIDTH
  }
}

export function resolveRichTextListGeometry(paragraph: RichTextParagraph): RichTextListGeometry {
  const bulletType = paragraph.bulletType ?? 'none'
  const fallbackGeometry =
    bulletType === 'none' ? { listLeftMargin: 0, listIndent: 0 } : getListGeometryForLevel(paragraph.indentLevel)
  const leftMargin = Math.max(0, paragraph.listLeftMargin ?? fallbackGeometry.listLeftMargin ?? 0)
  const indent = paragraph.listIndent ?? fallbackGeometry.listIndent ?? 0
  const markerOffset = Math.max(0, leftMargin + indent)
  const markerWidth = bulletType === 'none' ? 0 : Math.max(0, leftMargin - markerOffset) || DEFAULT_LIST_MARKER_WIDTH

  return {
    leftMargin,
    indent,
    markerOffset,
    markerWidth,
    textOffset: leftMargin
  }
}

export function numberingStylePreview(style: RichParagraphNumberingStyle): string {
  return [1, 2, 3].map(value => formatNumberingLabel(value, style)).join(' ')
}
