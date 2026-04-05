import type { Editor } from '@tiptap/react'
import type { DocumentPagesFormatting, PageNumberAlignment, PageNumberNumeralStyle } from '../../types/document'
import { normalizeStoredPagesFormatting, sanitizeStandalonePageNumberTemplates } from '../../utils/pageLayoutUtils'
import type { PagesOptionUpdates } from '@/components/tiptap-extensions/tiptap-custom-pagination'

const isDevelopmentEnvironment = process.env.NODE_ENV !== 'production'

type PagesOptionField =
  | 'header'
  | 'footer'
  | 'headerFirstPage'
  | 'footerFirstPage'
  | 'headerOdd'
  | 'headerEven'
  | 'footerOdd'
  | 'footerEven'

const PERSISTED_PAGE_CONTENT_FIELDS: Array<
  keyof Pick<
    DocumentPagesFormatting,
    | 'header'
    | 'footer'
    | 'headerFirstPage'
    | 'footerFirstPage'
    | 'headerOdd'
    | 'headerEven'
    | 'footerOdd'
    | 'footerEven'
  >
> = ['header', 'footer', 'headerFirstPage', 'footerFirstPage', 'headerOdd', 'headerEven', 'footerOdd', 'footerEven']

const STORAGE_HTML_FIELD_BY_OPTION: Record<PagesOptionField, keyof NonNullable<Editor['storage']>['pages']> = {
  header: 'headerHTML',
  footer: 'footerHTML',
  headerFirstPage: 'headerFirstPageHTML',
  footerFirstPage: 'footerFirstPageHTML',
  headerOdd: 'headerOddHTML',
  headerEven: 'headerEvenHTML',
  footerOdd: 'footerOddHTML',
  footerEven: 'footerEvenHTML'
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/\u200B/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isStandalonePageNumberTemplate(value: string | null | undefined): boolean {
  if (!value) return false
  const t = stripHtmlToText(value)
  return t === '{page}' || t === '{page} of {total}'
}

function clearStandalonePageNumberTemplates(pages: DocumentPagesFormatting): DocumentPagesFormatting {
  const next: DocumentPagesFormatting = { ...pages }

  PERSISTED_PAGE_CONTENT_FIELDS.forEach(field => {
    if (isStandalonePageNumberTemplate(next[field])) {
      next[field] = null
    }
  })

  return next
}

function getLegacyStandaloneTemplateResetUpdates(editor: Editor): Partial<PagesOptionUpdates> {
  const updates: Partial<PagesOptionUpdates> = {}
  const pagesStorage = (editor as Editor & { storage?: { pages?: Record<string, unknown> } }).storage?.pages
  const pagesExtension = (
    editor as Editor & {
      extensionManager?: { extensions?: Array<{ name?: string; options?: Record<string, unknown> }> }
    }
  ).extensionManager?.extensions?.find(extension => extension.name === 'pages')
  const pagesOptions = pagesExtension?.options ?? {}

  ;(Object.keys(STORAGE_HTML_FIELD_BY_OPTION) as PagesOptionField[]).forEach(field => {
    const storageValue = pagesStorage?.[STORAGE_HTML_FIELD_BY_OPTION[field]]
    const optionValue = pagesOptions[field]
    let currentValue: string | null = null
    if (typeof storageValue === 'string') {
      currentValue = storageValue
    } else if (typeof optionValue === 'string') {
      currentValue = optionValue
    }
    if (isStandalonePageNumberTemplate(currentValue)) {
      updates[field] = ''
    }
  })

  return updates
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
    ...getLegacyStandaloneTemplateResetUpdates(editor),
    pageNumberRegion: position,
    pageNumberNumeralStyle: numeralStyle,
    pageNumberStartAt: Math.max(1, Math.floor(startAt) || 1),
    pageNumberAlignment: alignment,
    pageNumberShowOnFirstPage: showOnFirstPage
  }

  const ok = cmds.setPagesOptions?.(updates) ?? false
  if (isDevelopmentEnvironment) {
    console.info('[document-pages-debug] applyPageNumberPlacement → setPagesOptions', {
      updates,
      returned: ok
    })
  }
  return ok
}

export function removePageNumberPlacement(editor: Editor): boolean {
  const cmds = editor.commands as { setPagesOptions?: (u: PagesOptionUpdates) => boolean }
  const updates: PagesOptionUpdates = {
    ...getLegacyStandaloneTemplateResetUpdates(editor),
    pageNumberRegion: null,
    pageNumberAlignment: null
  }

  const ok = cmds.setPagesOptions?.(updates) ?? false
  if (isDevelopmentEnvironment) {
    console.info('[document-pages-debug] removePageNumberPlacement → setPagesOptions', {
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
    pageNumberRegion: params.position,
    pageNumberNumeralStyle: params.numeralStyle,
    pageNumberStartAt: startAt,
    pageNumberAlignment: params.alignment,
    pageNumberShowOnFirstPage: params.showOnFirstPage
  }

  return sanitizeStandalonePageNumberTemplates(normalizeStoredPagesFormatting(next)) ?? next
}

export function mergePagesFormattingAfterPageNumbersRemove(
  prev: DocumentPagesFormatting | undefined
): DocumentPagesFormatting {
  const next = clearStandalonePageNumberTemplates(normalizeStoredPagesFormatting(prev) ?? {})
  delete next.pageNumberRegion
  delete next.pageNumberAlignment

  return normalizeStoredPagesFormatting(next) ?? next
}
