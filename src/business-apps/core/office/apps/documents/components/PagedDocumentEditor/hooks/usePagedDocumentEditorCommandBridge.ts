import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ForwardedRef,
  type MutableRefObject
} from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import DOMPurify from 'dompurify'
import type { ActivePagesEditorState } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { DocumentPagesFormatting } from '../../../types'
import type { PageLayoutPaginationConfig } from '../../../utils/pageLayoutUtils'

export interface PagedDocumentEditorInsertHandle {
  insertAtCursor: (htmlOrText: string) => void
}

export interface UsePagedDocumentEditorCommandBridgeParams {
  editor: TiptapEditor | null
  editorRef: MutableRefObject<TiptapEditor | null>
  externalRef: ForwardedRef<PagedDocumentEditorInsertHandle>
  paginationConfig: PageLayoutPaginationConfig | null
  pagesFormattingConfig: DocumentPagesFormatting
  title: string
  documentTitle?: string
  initialTitle?: string
  isYjsSynced: boolean
  setPagesEditorState: (state: ActivePagesEditorState) => void
}

type PaginationCommandMap = TiptapEditor['commands'] & {
  closeHeaderFooterEditors?: () => boolean
  setPagesOptions?: (options: Record<string, unknown>) => boolean
  setPaginationDocumentTitle?: (title: string) => boolean
}

export function usePagedDocumentEditorCommandBridge({
  editor,
  editorRef,
  externalRef,
  paginationConfig,
  pagesFormattingConfig,
  title,
  documentTitle,
  initialTitle,
  isYjsSynced,
  setPagesEditorState
}: UsePagedDocumentEditorCommandBridgeParams): {
  closeHeaderFooterEditorsAndSidebar: () => void
} {
  const pagesOptionsSyncEditorRef = useRef<TiptapEditor | null>(null)

  const closeHeaderFooterEditorsAndSidebar = useCallback(() => {
    setPagesEditorState({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })
    ;(editorRef.current?.commands as PaginationCommandMap | undefined)?.closeHeaderFooterEditors?.()
  }, [editorRef, setPagesEditorState])

  const pagesOptions = useMemo(() => {
    if (!paginationConfig) return null

    return {
      pageFormat: paginationConfig.pageFormat,
      differentFirstPage: pagesFormattingConfig.differentFirstPage,
      differentOddEven: pagesFormattingConfig.differentOddEven,
      header: pagesFormattingConfig.header,
      footer: pagesFormattingConfig.footer,
      headerFirstPage: pagesFormattingConfig.headerFirstPage ?? '',
      footerFirstPage: pagesFormattingConfig.footerFirstPage ?? '',
      headerOdd: pagesFormattingConfig.headerOdd ?? '',
      headerEven: pagesFormattingConfig.headerEven ?? '',
      footerOdd: pagesFormattingConfig.footerOdd ?? '',
      footerEven: pagesFormattingConfig.footerEven ?? '',
      headerTopMargin: pagesFormattingConfig.headerTopMargin,
      footerBottomMargin: pagesFormattingConfig.footerBottomMargin,
      accentColor: pagesFormattingConfig.accentColor,
      headerAccentColor: pagesFormattingConfig.headerAccentColor,
      footerAccentColor: pagesFormattingConfig.footerAccentColor,
      pageNumberRegion: pagesFormattingConfig.pageNumberRegion,
      pageNumberNumeralStyle: pagesFormattingConfig.pageNumberNumeralStyle,
      pageNumberStartAt: pagesFormattingConfig.pageNumberStartAt,
      pageNumberAlignment: pagesFormattingConfig.pageNumberAlignment,
      pageNumberShowOnFirstPage: pagesFormattingConfig.pageNumberShowOnFirstPage
    }
  }, [paginationConfig, pagesFormattingConfig])

  useEffect(() => {
    if (!editor || !pagesOptions) return

    if (pagesOptionsSyncEditorRef.current !== editor) {
      pagesOptionsSyncEditorRef.current = editor
      return
    }

    ;(editor.commands as PaginationCommandMap).setPagesOptions?.(pagesOptions)
  }, [editor, pagesOptions])

  useEffect(() => {
    if (!editor) return

    const resolvedTitle = title.trim() || documentTitle?.trim() || initialTitle?.trim() || ''
    ;(editor.commands as PaginationCommandMap).setPaginationDocumentTitle?.(resolvedTitle)
  }, [editor, title, documentTitle, initialTitle, isYjsSynced])

  useImperativeHandle(
    externalRef,
    () => ({
      insertAtCursor(htmlOrText: string) {
        const editorInstance = editorRef.current
        if (!editorInstance) return
        const sanitized = DOMPurify.sanitize(htmlOrText, { USE_PROFILES: { html: true } }) || ''
        if (sanitized) {
          editorInstance.commands.insertContent(sanitized)
        }
      }
    }),
    [externalRef, editorRef]
  )

  return {
    closeHeaderFooterEditorsAndSidebar
  }
}
