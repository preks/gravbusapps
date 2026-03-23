import { useCallback, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentFormatting, PageNumberAlignment } from '../../../types'
import { normalizeStoredPagesFormatting } from '../../../utils/pageLayoutUtils'
import {
  mergePagesFormattingAfterPageNumbersApply,
  mergePagesFormattingAfterPageNumbersRemove,
  removePageNumberPlacement,
  type ApplyPageNumberPlacementParams
} from '../applyPageNumberPlacement'
import { readPagesFormattingFromStorage } from './usePagedDocumentFormatting'

const isDevelopmentEnvironment = process.env.NODE_ENV !== 'production'

export interface UsePagedDocumentPageNumberActionsParams {
  editor: TiptapEditor | null
  editorRef: MutableRefObject<{ storage?: { pages?: unknown } } | null>
  layoutFormattingRef: MutableRefObject<DocumentFormatting>
  buildPersistedFormatting: (
    formattingSource?: DocumentFormatting,
    pagesOverride?: DocumentFormatting['pages']
  ) => DocumentFormatting
  persistFormatting: (nextFormatting: DocumentFormatting) => void
  markUnsavedChanges: () => void
}

export interface UsePagedDocumentPageNumberActionsResult {
  handlePageSetupApply: (nextFormatting: DocumentFormatting) => void
  handlePageNumbersApply: (params: ApplyPageNumberPlacementParams) => void
  handleQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
  handlePageNumbersRemove: () => void
  persistPagesFromEditor: () => void
}

export function usePagedDocumentPageNumberActions({
  editor,
  editorRef,
  layoutFormattingRef,
  buildPersistedFormatting,
  persistFormatting,
  markUnsavedChanges
}: UsePagedDocumentPageNumberActionsParams): UsePagedDocumentPageNumberActionsResult {
  const handlePageSetupApply = useCallback(
    (nextFormatting: DocumentFormatting) => {
      const persistedFormatting = buildPersistedFormatting(nextFormatting, nextFormatting.pages)
      persistFormatting(persistedFormatting)
    },
    [buildPersistedFormatting, persistFormatting]
  )

  const handlePageNumbersApply = useCallback(
    (params: ApplyPageNumberPlacementParams) => {
      const merged = mergePagesFormattingAfterPageNumbersApply(layoutFormattingRef.current.pages, params)
      const nextFormatting: DocumentFormatting = { ...layoutFormattingRef.current, pages: merged }
      const persisted = buildPersistedFormatting(nextFormatting, merged)
      if (isDevelopmentEnvironment) {
        console.info('[document-pages-debug] Page Numbers OK', {
          params,
          mergedPagesFromMergeFn: merged,
          persistedFormattingPages: persisted.pages
        })
      }
      handlePageSetupApply(persisted)
      markUnsavedChanges()
    },
    [buildPersistedFormatting, handlePageSetupApply, layoutFormattingRef, markUnsavedChanges]
  )

  const handleQuickPageNumberPlacement = useCallback(
    (position: 'header' | 'footer', alignment: PageNumberAlignment) => {
      const pages = normalizeStoredPagesFormatting(layoutFormattingRef.current.pages) ?? {}
      handlePageNumbersApply({
        position,
        alignment,
        showOnFirstPage: pages.pageNumberShowOnFirstPage ?? true,
        numeralStyle: pages.pageNumberNumeralStyle ?? 'decimal',
        startAt: pages.pageNumberStartAt ?? 1
      })
    },
    [handlePageNumbersApply, layoutFormattingRef]
  )

  const handlePageNumbersRemove = useCallback(() => {
    if (editor) {
      removePageNumberPlacement(editor)
    }

    const merged = mergePagesFormattingAfterPageNumbersRemove(layoutFormattingRef.current.pages)
    const nextFormatting: DocumentFormatting = { ...layoutFormattingRef.current, pages: merged }
    const persisted = buildPersistedFormatting(nextFormatting, merged)
    handlePageSetupApply(persisted)
    markUnsavedChanges()
  }, [buildPersistedFormatting, editor, handlePageSetupApply, layoutFormattingRef, markUnsavedChanges])

  const persistPagesFromEditor = useCallback(() => {
    const pagesStorage = editorRef.current?.storage?.pages
    const pagesFromEditor = readPagesFormattingFromStorage(pagesStorage as never)
    if (!pagesFromEditor) return

    const mergedPages = { ...(layoutFormattingRef.current.pages ?? {}), ...pagesFromEditor }
    const mergedFormatting: DocumentFormatting = { ...layoutFormattingRef.current, pages: mergedPages }
    handlePageSetupApply(buildPersistedFormatting(mergedFormatting, mergedPages))
  }, [buildPersistedFormatting, editorRef, handlePageSetupApply, layoutFormattingRef])

  return {
    handlePageSetupApply,
    handlePageNumbersApply,
    handleQuickPageNumberPlacement,
    handlePageNumbersRemove,
    persistPagesFromEditor
  }
}
