import type { PageNumberAlignment, PageNumberNumeralStyle } from '../../types/document'

export const PAGE_NUMBERS_ALIGN_OPTIONS: { value: PageNumberAlignment; labelKey: string }[] = [
  { value: 'left', labelKey: 'page-numbers-align-left' },
  { value: 'center', labelKey: 'page-numbers-align-center' },
  { value: 'right', labelKey: 'page-numbers-align-right' },
  { value: 'inside', labelKey: 'page-numbers-align-inside' },
  { value: 'outside', labelKey: 'page-numbers-align-outside' }
]

export const PAGE_NUMERAL_STYLE_OPTIONS: { value: PageNumberNumeralStyle; labelKey: string }[] = [
  { value: 'decimal', labelKey: 'page-numbers-format-style-decimal' },
  { value: 'lowerRoman', labelKey: 'page-numbers-format-style-lower-roman' },
  { value: 'upperRoman', labelKey: 'page-numbers-format-style-upper-roman' },
  { value: 'lowerAlpha', labelKey: 'page-numbers-format-style-lower-alpha' },
  { value: 'upperAlpha', labelKey: 'page-numbers-format-style-upper-alpha' }
]
