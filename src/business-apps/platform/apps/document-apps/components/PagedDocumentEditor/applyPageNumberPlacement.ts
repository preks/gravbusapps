import type { Editor } from '@tiptap/react'
import type { DocumentPagesFormatting, PageNumberAlignment, PageNumberNumeralStyle } from '../../types/document'
import { normalizeStoredPagesFormatting } from '../../utils/pageLayoutUtils'
import type { PagesOptionUpdates } from '@/components/tiptap-extensions/tiptap-custom-pagination'

function paragraph(align: string): string {
  return `<p style="text-align: ${align}">{page}</p>`
}

/** Outside = flush on outer margin; Inside = toward gutter (inset). Footer only. */
function paragraphInsideOutsideFooter(kind: 'inside' | 'outside', oddPage: boolean): string {
  if (kind === 'outside') {
    if (oddPage) {
      return '<p style="text-align:right;margin:0">{page}</p>'
    }
    return '<p style="text-align:left;margin:0">{page}</p>'
  }
  if (oddPage) {
    return '<p style="text-align:left;margin:0;padding-left:18%;box-sizing:border-box">{page}</p>'
  }
  return '<p style="text-align:right;margin:0;padding-right:18%;box-sizing:border-box">{page}</p>'
}

function headerTextAlign(alignment: PageNumberAlignment, oddPage: boolean): string {
  switch (alignment) {
    case 'left':
      return 'left'
    case 'right':
      return 'right'
    case 'center':
      return 'center'
    case 'outside':
      return oddPage ? 'right' : 'left'
    case 'inside':
      return oddPage ? 'left' : 'right'
    default:
      return 'center'
  }
}

/**
 * Page number on its own paragraph above a blank line for header body (TipTap-safe: no div).
 */
function headerPageNumberBand(alignment: PageNumberAlignment, oddPage: boolean): string {
  const ta = headerTextAlign(alignment, oddPage)
  const pad =
    alignment === 'inside' && oddPage
      ? 'padding-left:18%;'
      : alignment === 'inside' && !oddPage
        ? 'padding-right:18%;'
        : ''
  return `<p style="text-align:${ta};margin:0;padding-bottom:8px;${pad}box-sizing:border-box">{page}</p><p><br></p>`
}

export interface ApplyPageNumberPlacementParams {
  position: 'header' | 'footer'
  alignment: PageNumberAlignment
  showOnFirstPage: boolean
  numeralStyle: PageNumberNumeralStyle
  startAt: number
}

export function applyPageNumberPlacement(editor: Editor, params: ApplyPageNumberPlacementParams): boolean {
  const cmds = editor.commands as { setPagesOptions?: (u: PagesOptionUpdates) => boolean }
  const { position, alignment, showOnFirstPage, numeralStyle, startAt } = params

  const updates: PagesOptionUpdates = {
    pageNumberNumeralStyle: numeralStyle,
    pageNumberStartAt: Math.max(1, Math.floor(startAt) || 1),
    pageNumberAlignment: alignment
  }

  if (position === 'header') {
    if (alignment === 'inside' || alignment === 'outside') {
      updates.differentOddEven = true
      updates.headerOdd = headerPageNumberBand(alignment, true)
      updates.headerEven = headerPageNumberBand(alignment, false)
      updates.header = '<p></p>'
    } else {
      updates.differentOddEven = false
      updates.header = headerPageNumberBand(alignment, true)
      updates.headerOdd = '<p></p>'
      updates.headerEven = '<p></p>'
    }
  } else {
    if (alignment === 'inside' || alignment === 'outside') {
      updates.differentOddEven = true
      const kind = alignment === 'outside' ? 'outside' : 'inside'
      updates.footerOdd = paragraphInsideOutsideFooter(kind, true)
      updates.footerEven = paragraphInsideOutsideFooter(kind, false)
      updates.footer = '<p></p>'
    } else {
      updates.differentOddEven = false
      updates.footer = paragraph(alignment)
      updates.footerOdd = '<p></p>'
      updates.footerEven = '<p></p>'
    }
  }

  if (!showOnFirstPage) {
    updates.differentFirstPage = true
    if (position === 'header') {
      updates.headerFirstPage = '<p></p>'
    } else {
      updates.footerFirstPage = '<p></p>'
    }
  } else {
    updates.differentFirstPage = false
    if (position === 'header') {
      updates.headerFirstPage = '<p></p>'
    } else {
      updates.footerFirstPage = '<p></p>'
    }
  }

  const ok = cmds.setPagesOptions?.(updates) ?? false
  if (import.meta.env.DEV) {
    console.info('[document-pages-debug] applyPageNumberPlacement → setPagesOptions', {
      updates,
      returned: ok
    })
  }
  return ok
}

/** Builds persisted pages formatting matching {@link applyPageNumberPlacement} (for layout / Yjs after OK). */
export function mergePagesFormattingAfterPageNumbersApply(
  prev: DocumentPagesFormatting | undefined,
  params: ApplyPageNumberPlacementParams
): DocumentPagesFormatting {
  const base = normalizeStoredPagesFormatting(prev) ?? {}
  const startAt = Math.max(1, Math.floor(params.startAt) || 1)
  const next: DocumentPagesFormatting = {
    ...base,
    pageNumberNumeralStyle: params.numeralStyle,
    pageNumberStartAt: startAt,
    pageNumberAlignment: params.alignment,
    pageNumberRegion: params.position
  }

  if (params.position === 'header') {
    if (params.alignment === 'inside' || params.alignment === 'outside') {
      next.differentOddEven = true
      next.headerOdd = headerPageNumberBand(params.alignment, true)
      next.headerEven = headerPageNumberBand(params.alignment, false)
      next.header = '<p></p>'
    } else {
      next.differentOddEven = false
      next.header = headerPageNumberBand(params.alignment, true)
      next.headerOdd = '<p></p>'
      next.headerEven = '<p></p>'
    }
    if (!params.showOnFirstPage) {
      next.differentFirstPage = true
      next.headerFirstPage = '<p></p>'
    } else {
      next.differentFirstPage = false
      next.headerFirstPage = '<p></p>'
    }
  } else {
    if (params.alignment === 'inside' || params.alignment === 'outside') {
      const kind = params.alignment === 'outside' ? 'outside' : 'inside'
      next.differentOddEven = true
      next.footerOdd = paragraphInsideOutsideFooter(kind, true)
      next.footerEven = paragraphInsideOutsideFooter(kind, false)
      next.footer = '<p></p>'
    } else {
      next.differentOddEven = false
      next.footer = paragraph(params.alignment)
      next.footerOdd = '<p></p>'
      next.footerEven = '<p></p>'
    }
    if (!params.showOnFirstPage) {
      next.differentFirstPage = true
      next.footerFirstPage = '<p></p>'
    } else {
      next.differentFirstPage = false
      next.footerFirstPage = '<p></p>'
    }
  }

  return normalizeStoredPagesFormatting(next) ?? next
}
