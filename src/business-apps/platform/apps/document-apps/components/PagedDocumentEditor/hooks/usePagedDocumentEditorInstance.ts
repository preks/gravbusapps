import { useCallback, useMemo, type MutableRefObject } from 'react'
import { useEditor, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { FontFamily } from '@tiptap/extension-font-family'
import { FontSize } from '@tiptap/extension-text-style/font-size'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Typography } from '@tiptap/extension-typography'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import type { Awareness } from 'y-protocols/awareness'
import type { ActivePagesEditorState } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { Pages } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { handleTiptapTabKey } from '@/components/tiptap-extensions/tiptapTabKeyHandler'
import { Table, TableCell, TableHeader, TableRow } from '@/components/tiptap-extensions/tiptap-custom-tables'
import type { DocumentPagesFormatting } from '../../../types'
import type { PageLayoutPaginationConfig } from '../../../utils/pageLayoutUtils'
import { isAllowedHref } from '../../../utils/linkUtils'
import { isDocumentImageProtectedSrc, resolveProtectedDocumentImageSrc } from '../../../utils/documentImageBindings'
import { createYjsCursorExtension } from '../extensions/YjsCursor'
import { LineAndParagraphSpacing } from '../extensions/LineAndParagraphSpacing'
import { ParagraphIndent } from '../extensions/ParagraphIndent'
import { DocumentImage, PageBreak, SearchHighlight, Signature } from '../extensions'
import { InlineComment as InlineCommentExtension } from '../../../../shared/extensions/InlineCommentExtension'

const PAGE_GAP_PX = 24

type TranslateFn = (key: string) => string

function createSharedDocumentExtensions(accessToken: string): any[] {
  return [
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    LineAndParagraphSpacing.configure({
      types: ['heading', 'paragraph']
    }),
    ParagraphIndent,
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true
    }),
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        class: 'editor-link',
        rel: 'noopener noreferrer'
      },
      isAllowedUri: (url, ctx) => !!ctx.defaultValidate(url) && isAllowedHref(url)
    }),
    DocumentImage.configure({
      getAccessToken: () => accessToken,
      isProtectedSrc: isDocumentImageProtectedSrc,
      resolveProtectedSrc: resolveProtectedDocumentImageSrc,
      HTMLAttributes: {
        class: 'editor-image'
      }
    }),
    Signature,
    Table.configure({
      resizable: true,
      renderWrapper: false,
      HTMLAttributes: {
        class: 'editor-table'
      }
    }),
    TableRow,
    TableHeader,
    TableCell,
    FontFamily,
    FontSize.configure({ types: ['textStyle'] }),
    Subscript,
    Superscript,
    Typography,
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'editor-task-item'
      }
    })
  ]
}

function createStarterKitExtension(isCollaborationMode: boolean) {
  return StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6]
    },
    ...(isCollaborationMode ? { history: false, undoRedo: false } : {}),
    link: false,
    underline: false
  } as any)
}

export interface UsePagedDocumentEditorInstanceParams {
  accessToken: string
  documentId?: string
  documentTitle?: string
  initialTitle?: string
  editorContent: string
  editorEditable: boolean
  ydoc: import('yjs').Doc
  awareness: Awareness
  paginationConfig: PageLayoutPaginationConfig | null
  paginationDebugDisabled: boolean
  pagesFormattingConfig: DocumentPagesFormatting
  editorChromeRef: MutableRefObject<HTMLDivElement | null>
  editorRef: MutableRefObject<TiptapEditor | null>
  onEditorUpdateRef: MutableRefObject<() => void>
  onActiveEditorChange: (state: ActivePagesEditorState) => void
  onCommentClick: (commentId: string) => void
  translate: TranslateFn
  handlePaste?: (...args: any[]) => boolean | void
  handleDrop?: (...args: any[]) => boolean | void
  autocompleteSuggestionRef: MutableRefObject<string>
  autocompleteCursorPosRef: MutableRefObject<number | null>
  clearAutocompleteSuggestion: () => void
  scheduleAutocompleteRef: MutableRefObject<() => void>
}

export function usePagedDocumentEditorInstance({
  accessToken,
  documentId,
  documentTitle,
  initialTitle,
  editorContent,
  editorEditable,
  ydoc,
  awareness,
  paginationConfig,
  paginationDebugDisabled,
  pagesFormattingConfig,
  editorChromeRef,
  editorRef,
  onEditorUpdateRef,
  onActiveEditorChange,
  onCommentClick,
  translate,
  handlePaste,
  handleDrop,
  autocompleteSuggestionRef,
  autocompleteCursorPosRef,
  clearAutocompleteSuggestion,
  scheduleAutocompleteRef
}: UsePagedDocumentEditorInstanceParams): TiptapEditor | null {
  const isCollaborationMode = Boolean(documentId)

  const collaborationExtension = useMemo(
    () => (documentId ? Collaboration.configure({ document: ydoc }) : null),
    [documentId, ydoc]
  )
  const yjsCursorExtension = useMemo(
    () => (documentId ? createYjsCursorExtension(awareness) : null),
    [documentId, awareness]
  )

  const headerFooterExtensions = useMemo(
    () => [createStarterKitExtension(false), ...createSharedDocumentExtensions(accessToken)] as any[],
    [accessToken]
  )

  const handleHeaderFooterDblClickPreventClose = useCallback(
    (event: Event) =>
      event.target instanceof Element &&
      (editorChromeRef.current?.contains(event.target) ||
        event.target.closest('[data-testid^="document-header-footer-settings-sidebar"]') !== null ||
        event.target.closest('[data-testid^="document-table-settings-sidebar"]') !== null ||
        event.target.closest('[data-testid^="document-page-numbers-dialog"]') !== null),
    [editorChromeRef]
  )

  const handleInlineCommentClick = useCallback(
    (commentId: string) => {
      onCommentClick(commentId)
    },
    [onCommentClick]
  )

  const extensions = useMemo(
    () =>
      [
        createStarterKitExtension(isCollaborationMode),
        Placeholder.configure({
          placeholder: translate('editor-content-placeholder')
        }),
        ...createSharedDocumentExtensions(accessToken),
        PageBreak,
        SearchHighlight,
        ...(paginationConfig && !paginationDebugDisabled
          ? [
              Pages.configure({
                pageFormat: paginationConfig.pageFormat,
                pageGap: PAGE_GAP_PX,
                pageBreakBackground: '#f3f4f6',
                header: pagesFormattingConfig.header,
                footer: pagesFormattingConfig.footer,
                headerFirstPage: pagesFormattingConfig.headerFirstPage,
                footerFirstPage: pagesFormattingConfig.footerFirstPage,
                headerOdd: pagesFormattingConfig.headerOdd,
                headerEven: pagesFormattingConfig.headerEven,
                footerOdd: pagesFormattingConfig.footerOdd,
                footerEven: pagesFormattingConfig.footerEven,
                differentFirstPage: pagesFormattingConfig.differentFirstPage,
                differentOddEven: pagesFormattingConfig.differentOddEven,
                headerHeight: pagesFormattingConfig.headerHeight ?? 50,
                footerHeight: pagesFormattingConfig.footerHeight ?? 50,
                headerTopMargin: pagesFormattingConfig.headerTopMargin,
                footerBottomMargin: pagesFormattingConfig.footerBottomMargin,
                accentColor: pagesFormattingConfig.accentColor,
                headerAccentColor: pagesFormattingConfig.headerAccentColor,
                footerAccentColor: pagesFormattingConfig.footerAccentColor,
                headerFooterExtensions,
                uiLabels: {
                  headerLabel: translate('editor-header-footer-label-header'),
                  footerLabel: translate('editor-header-footer-label-footer'),
                  doubleClickHint: translate('editor-header-footer-double-click'),
                  doubleClickExitHint: translate('editor-header-footer-double-click-exit'),
                  doneLabel: translate('editor-header-footer-close')
                },
                onActiveEditorChange,
                onDblClickHeaderFooterPreventClose: handleHeaderFooterDblClickPreventClose,
                documentTitle: (documentTitle || initialTitle || '').trim(),
                pageNumberRegion: pagesFormattingConfig.pageNumberRegion,
                pageNumberNumeralStyle: pagesFormattingConfig.pageNumberNumeralStyle,
                pageNumberStartAt: pagesFormattingConfig.pageNumberStartAt,
                pageNumberAlignment: pagesFormattingConfig.pageNumberAlignment,
                pageNumberShowOnFirstPage: pagesFormattingConfig.pageNumberShowOnFirstPage
              })
            ]
          : []),
        InlineCommentExtension.configure({
          onCommentClick: handleInlineCommentClick
        }),
        ...(collaborationExtension ? [collaborationExtension] : []),
        ...(yjsCursorExtension ? [yjsCursorExtension] : [])
      ] as any[],
    [
      accessToken,
      collaborationExtension,
      documentTitle,
      handleHeaderFooterDblClickPreventClose,
      handleInlineCommentClick,
      headerFooterExtensions,
      initialTitle,
      isCollaborationMode,
      onActiveEditorChange,
      pagesFormattingConfig,
      paginationConfig,
      paginationDebugDisabled,
      translate,
      yjsCursorExtension
    ]
  )

  return useEditor(
    {
      extensions,
      content: editorContent,
      editable: editorEditable,
      editorProps: {
        attributes: {
          dir: 'auto'
        },
        handlePaste,
        handleDrop,
        handleKeyDown(view, event) {
          const currentSuggestion = autocompleteSuggestionRef.current
          const currentCursorPos = autocompleteCursorPosRef.current

          if (
            event.key === 'Tab' &&
            currentSuggestion &&
            currentCursorPos === view.state.selection.from &&
            view.state.selection.empty
          ) {
            event.preventDefault()
            const tr = view.state.tr.insertText(currentSuggestion, view.state.selection.from, view.state.selection.to)
            view.dispatch(tr)
            clearAutocompleteSuggestion()
            return true
          }

          if (event.key === 'Escape' && currentSuggestion) {
            event.preventDefault()
            clearAutocompleteSuggestion()
            return true
          }

          return handleTiptapTabKey(event, editorRef.current)
        }
      },
      onUpdate: () => {
        onEditorUpdateRef.current()
        scheduleAutocompleteRef.current()
      }
    },
    [
      documentId,
      editorContent,
      editorEditable,
      extensions,
      handlePaste,
      handleDrop,
      autocompleteSuggestionRef,
      autocompleteCursorPosRef,
      clearAutocompleteSuggestion,
      editorRef,
      onEditorUpdateRef,
      scheduleAutocompleteRef
    ]
  )
}
