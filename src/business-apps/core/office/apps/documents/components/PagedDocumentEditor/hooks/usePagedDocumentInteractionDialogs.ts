import { DOMSerializer } from '@tiptap/pm/model'
import type { Transaction as ProseMirrorTransaction } from '@tiptap/pm/state'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from 'react'
import { getMarkRange } from '@tiptap/core'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { buildDocumentEditAdditionInfo } from '@/common/utils/buildDocumentEditPrompt'
import { openEveryAI } from '@/common/utils/openEveryAI'
import { navigateTo } from '@/common/utils/navigationUtils'
import { isAllowedHref, escapeHtmlAttr, escapeHtmlText } from '../../../utils/linkUtils'
import { truncateHtmlForAiContext } from '../../../utils/documentContentUtils'
import type { LinkDialogInitialValues, LinkDialogMode } from '../LinkDialog'
import { requestEditorSelectionAnchorPosition } from '../commentSidebarNavigation'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

export interface PendingInlineSelection {
  from: number
  to: number
  text: string
  html: string
}

export type ImageDialogMode = 'insert' | 'replace'
export type RightSidebar = 'closed' | 'comments' | 'ai'

export interface UsePagedDocumentInteractionDialogsParams {
  editor: TiptapEditor | null
  activeEditor: TiptapEditor | null
  layoutViewportModel?: Pick<
    DocumentLayoutViewportModel,
    'pageBounds' | 'mountedPageBodyBounds' | 'pagePositionRanges' | 'pageSpans' | 'retainedPageSpans' | 'windowKey'
  >
  documentId?: string
  title: string
  rightSidebar: RightSidebar
  setRightSidebar: Dispatch<SetStateAction<RightSidebar>>
  replaceImagePosRef: MutableRefObject<number | null>
}

type InlineCommentAnchorMode = 'context-menu' | 'selection' | null

export interface UsePagedDocumentInteractionDialogsResult {
  showInsertImageDialog: boolean
  setShowInsertImageDialog: Dispatch<SetStateAction<boolean>>
  imageDialogMode: ImageDialogMode
  showLinkDialog: boolean
  setShowLinkDialog: Dispatch<SetStateAction<boolean>>
  linkDialogMode: LinkDialogMode
  linkDialogInitialValues: LinkDialogInitialValues | undefined
  showInlineCommentPopover: boolean
  setShowInlineCommentPopover: Dispatch<SetStateAction<boolean>>
  inlineCommentPosition: { top: number; left: number } | null
  pendingSelection: PendingInlineSelection | null
  setPendingSelection: Dispatch<SetStateAction<PendingInlineSelection | null>>
  showAiInstructionDialog: boolean
  setShowAiInstructionDialog: Dispatch<SetStateAction<boolean>>
  aiInstruction: string
  setAiInstruction: Dispatch<SetStateAction<string>>
  aiSelectionSnapshot: string
  aiSelectionSnapshotHtml: string
  aiSelectionPreviewText: string
  hasLongAiSelectionPreview: boolean
  isAiSelectionPreviewExpanded: boolean
  setIsAiSelectionPreviewExpanded: Dispatch<SetStateAction<boolean>>
  openLinkDialog: () => void
  openLinkDialogForEditor: (editor: TiptapEditor | null) => void
  openInsertImageDialog: () => void
  openReplaceImageDialog: (imagePos: number | null) => void
  handleReplaceSelectedImage: (src: string) => void
  handleLinkApply: (values: { href: string; displayText?: string; openInNewTab: boolean }) => void
  handleLinkRemove: () => void
  handleAddInlineComment: (
    contextMenuPosition?: { x: number; y: number },
    selectionRange?: { from: number; to: number }
  ) => void
  openAiEditSidebar: () => void
  handleAiEditClick: () => void
  handleConfirmAiInstruction: () => void
  closeAiInstructionDialog: () => void
  openAiFromPendingSelection: () => void
}

export interface ResolvedLinkDialogRequest {
  mode: LinkDialogMode
  initialValues: LinkDialogInitialValues
  insertWithNoSelection: boolean
}

export function resolveLinkDialogRequest(options: {
  isLinkActive: boolean
  selectionText: string
  href?: string
  target?: string
  isEmptySelection: boolean
}): ResolvedLinkDialogRequest {
  if (options.isLinkActive) {
    return {
      mode: 'edit',
      initialValues: {
        href: options.href || '',
        displayText: options.selectionText,
        openInNewTab: options.target === '_blank'
      },
      insertWithNoSelection: false
    }
  }

  if (options.isEmptySelection) {
    return {
      mode: 'insert',
      initialValues: {
        href: '',
        displayText: '',
        openInNewTab: false
      },
      insertWithNoSelection: true
    }
  }

  return {
    mode: 'insert',
    initialValues: {
      href: '',
      displayText: options.selectionText,
      openInNewTab: false
    },
    insertWithNoSelection: false
  }
}

function resolveLinkDialogSelectionText(editor: TiptapEditor): string {
  const { selection, doc } = editor.state
  const selectionText = doc.textBetween(selection.from, selection.to)

  if (selection.from !== selection.to || !editor.isActive('link')) {
    return selectionText
  }

  const linkMark = editor.schema.marks.link
  if (!linkMark || !selection.$from) {
    return selectionText
  }

  const linkRange = getMarkRange(selection.$from, linkMark)
  if (!linkRange) {
    return selectionText
  }

  return doc.textBetween(linkRange.from, linkRange.to)
}

function stripHtmlTagsLinear(value: string): string {
  return value.replace(/<[^>]*>/g, ' ')
}

function collapseWhitespaceLinear(value: string): string {
  return value.split(/\s+/).join(' ').trim()
}

function createSelectionContext(editor: TiptapEditor): { text: string; html: string } {
  const { from, to } = editor.state.selection
  const pendingSelection = createPendingInlineSelection(editor, from, to)
  if (!pendingSelection) {
    return { text: '', html: '' }
  }

  return {
    text: pendingSelection.text,
    html: pendingSelection.html
  }
}

export function createPendingInlineSelection(
  editor: TiptapEditor,
  from: number,
  to: number
): PendingInlineSelection | null {
  const docSize = editor.state.doc.content.size
  const normalizedFrom = Math.max(0, Math.min(from, docSize))
  const normalizedTo = Math.max(normalizedFrom, Math.min(to, docSize))
  if (normalizedFrom === normalizedTo) {
    return null
  }

  const text = editor.state.doc.textBetween(normalizedFrom, normalizedTo, '\n\n', '\n').trim()
  const slice = editor.state.doc.slice(normalizedFrom, normalizedTo)
  const div = globalThis.document.createElement('div')
  const serializer = DOMSerializer.fromSchema(editor.schema)
  const domFragment = serializer.serializeFragment(slice.content)
  div.appendChild(domFragment)
  const selectedHtml = div.innerHTML.trim()
  return {
    from: normalizedFrom,
    to: normalizedTo,
    text,
    html: selectedHtml
  }
}

export function mapPendingInlineSelectionThroughTransaction(
  selection: PendingInlineSelection | null,
  editor: TiptapEditor,
  transaction: Pick<ProseMirrorTransaction, 'mapping'>
): PendingInlineSelection | null {
  if (!selection) {
    return null
  }

  const mappedFrom = transaction.mapping.mapResult(selection.from)
  const mappedTo = transaction.mapping.mapResult(selection.to)
  if (mappedFrom.deleted && mappedTo.deleted) {
    return null
  }

  return createPendingInlineSelection(editor, mappedFrom.pos, mappedTo.pos)
}

export function mapImageReplacementPosThroughTransaction(
  imagePos: number | null,
  editor: TiptapEditor,
  transaction: Pick<ProseMirrorTransaction, 'mapping'>
): number | null {
  if (imagePos == null) {
    return null
  }

  const mappedPos = transaction.mapping.mapResult(imagePos)
  if (mappedPos.deleted) {
    return null
  }

  const node = editor.state.doc.nodeAt(mappedPos.pos)
  return node?.type.name === 'image' ? mappedPos.pos : null
}

export function usePagedDocumentInteractionDialogs({
  editor,
  activeEditor,
  layoutViewportModel,
  documentId,
  title,
  setRightSidebar,
  replaceImagePosRef
}: UsePagedDocumentInteractionDialogsParams): UsePagedDocumentInteractionDialogsResult {
  const [showInsertImageDialog, setShowInsertImageDialog] = useState(false)
  const [imageDialogMode, setImageDialogMode] = useState<ImageDialogMode>('insert')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkDialogMode, setLinkDialogMode] = useState<LinkDialogMode>('insert')
  const [linkDialogInitialValues, setLinkDialogInitialValues] = useState<LinkDialogInitialValues | undefined>()
  const [linkDialogInsertWithNoSelection, setLinkDialogInsertWithNoSelection] = useState(false)
  const [showInlineCommentPopover, setShowInlineCommentPopover] = useState(false)
  const [inlineCommentAnchorMode, setInlineCommentAnchorMode] = useState<InlineCommentAnchorMode>(null)
  const [inlineCommentPosition, setInlineCommentPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingSelection, setPendingSelection] = useState<PendingInlineSelection | null>(null)
  const [showAiInstructionDialog, setShowAiInstructionDialog] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiSelectionSnapshot, setAiSelectionSnapshot] = useState('')
  const [aiSelectionSnapshotHtml, setAiSelectionSnapshotHtml] = useState('')
  const [isAiSelectionPreviewExpanded, setIsAiSelectionPreviewExpanded] = useState(false)

  const aiSelectionPreviewText = useMemo(() => {
    const directText = aiSelectionSnapshot.trim()
    if (directText) return directText

    const html = aiSelectionSnapshotHtml.trim()
    if (!html) return ''

    if (globalThis.window === undefined) {
      return collapseWhitespaceLinear(stripHtmlTagsLinear(html))
    }

    const parsed = new globalThis.DOMParser().parseFromString(html, 'text/html')
    return collapseWhitespaceLinear(parsed.body.textContent || '')
  }, [aiSelectionSnapshot, aiSelectionSnapshotHtml])
  const hasLongAiSelectionPreview = aiSelectionPreviewText.length > 220

  const getCurrentEditorSelectionContext = useCallback(() => {
    if (!editor) return { text: '', html: '' }
    return createSelectionContext(editor)
  }, [editor])

  const layoutHintState = useMemo(
    () => ({
      pageBounds: layoutViewportModel?.pageBounds ?? layoutViewportModel?.mountedPageBodyBounds ?? [],
      pageSpans: layoutViewportModel?.pageSpans ?? [],
      retainedPageSpans: layoutViewportModel?.retainedPageSpans ?? [],
      mountedPageBodyBounds: layoutViewportModel?.mountedPageBodyBounds ?? [],
      pagePositionRanges: layoutViewportModel?.pagePositionRanges ?? []
    }),
    [
      layoutViewportModel?.mountedPageBodyBounds,
      layoutViewportModel?.pageBounds,
      layoutViewportModel?.pagePositionRanges,
      layoutViewportModel?.pageSpans,
      layoutViewportModel?.retainedPageSpans
    ]
  )

  useEffect(() => {
    if (!editor || !showAiInstructionDialog) return
    if (typeof editor.on !== 'function' || typeof editor.off !== 'function') {
      return
    }

    const syncSelectionSnapshot = () => {
      const selectionContext = getCurrentEditorSelectionContext()
      setAiSelectionSnapshot(selectionContext.text)
      setAiSelectionSnapshotHtml(selectionContext.html)
    }
    const handleTransaction = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
      if (!transaction.docChanged && !transaction.selectionSet) {
        return
      }

      syncSelectionSnapshot()
    }

    syncSelectionSnapshot()
    editor.on('selectionUpdate', syncSelectionSnapshot)
    editor.on('transaction', handleTransaction)
    return () => {
      editor.off('selectionUpdate', syncSelectionSnapshot)
      editor.off('transaction', handleTransaction)
    }
  }, [editor, getCurrentEditorSelectionContext, showAiInstructionDialog])

  useEffect(() => {
    if (!editor || !pendingSelection) return
    if (typeof editor.on !== 'function' || typeof editor.off !== 'function') {
      return
    }

    const handleTransaction = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
      if (!transaction.docChanged) {
        return
      }

      setPendingSelection(previous => mapPendingInlineSelectionThroughTransaction(previous, editor, transaction))
    }

    editor.on('transaction', handleTransaction)
    return () => {
      editor.off('transaction', handleTransaction)
    }
  }, [editor, pendingSelection])

  useEffect(() => {
    if (!activeEditor || !showInsertImageDialog || imageDialogMode !== 'replace') return
    if (typeof activeEditor.on !== 'function' || typeof activeEditor.off !== 'function') {
      return
    }

    const handleTransaction = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
      if (!transaction.docChanged) {
        return
      }

      const nextImagePos = mapImageReplacementPosThroughTransaction(
        replaceImagePosRef.current,
        activeEditor,
        transaction
      )
      replaceImagePosRef.current = nextImagePos

      if (nextImagePos === null) {
        setShowInsertImageDialog(false)
      }
    }

    activeEditor.on('transaction', handleTransaction)
    return () => {
      activeEditor.off('transaction', handleTransaction)
    }
  }, [activeEditor, imageDialogMode, replaceImagePosRef, showInsertImageDialog])

  useEffect(() => {
    if (
      !editor ||
      !showInlineCommentPopover ||
      inlineCommentAnchorMode !== 'selection' ||
      !pendingSelection ||
      pendingSelection.from >= pendingSelection.to
    ) {
      return
    }

    requestEditorSelectionAnchorPosition(
      {
        view: editor.view,
        commands: editor.commands,
        layoutHints: layoutHintState
      },
      pendingSelection.from,
      pendingSelection.to,
      position => {
        setInlineCommentPosition({
          top: position.top + 30,
          left: position.left
        })
      }
    )
  }, [
    editor,
    inlineCommentAnchorMode,
    layoutHintState,
    layoutViewportModel?.windowKey,
    pendingSelection,
    showInlineCommentPopover
  ])

  const openLinkDialogForEditor = useCallback((dialogEditor: TiptapEditor | null) => {
    if (!dialogEditor) return
    const { from, to } = dialogEditor.state.selection
    const resolved = resolveLinkDialogRequest({
      isLinkActive: dialogEditor.isActive('link'),
      selectionText: resolveLinkDialogSelectionText(dialogEditor),
      href: dialogEditor.getAttributes('link').href,
      target: dialogEditor.getAttributes('link').target,
      isEmptySelection: from === to
    })

    setLinkDialogMode(resolved.mode)
    setLinkDialogInitialValues(resolved.initialValues)
    setLinkDialogInsertWithNoSelection(resolved.insertWithNoSelection)
    setShowLinkDialog(true)
  }, [])

  const openLinkDialog = useCallback(() => {
    openLinkDialogForEditor(activeEditor)
  }, [activeEditor, openLinkDialogForEditor])

  const openInsertImageDialog = useCallback(() => {
    replaceImagePosRef.current = null
    setImageDialogMode('insert')
    setShowInsertImageDialog(true)
  }, [replaceImagePosRef])

  const openReplaceImageDialog = useCallback(
    (imagePos: number | null) => {
      replaceImagePosRef.current = imagePos
      setImageDialogMode('replace')
      setShowInsertImageDialog(true)
    },
    [replaceImagePosRef]
  )

  const handleReplaceSelectedImage = useCallback(
    (src: string) => {
      if (!activeEditor) return
      const imagePos = replaceImagePosRef.current
      if (imagePos == null) return

      const node = activeEditor.state.doc.nodeAt(imagePos)
      if (node?.type.name !== 'image') return

      const tr = activeEditor.state.tr.setNodeMarkup(imagePos, undefined, {
        ...node.attrs,
        src
      })
      activeEditor.view.dispatch(tr)
      activeEditor.view.focus()
    },
    [activeEditor, replaceImagePosRef]
  )

  const handleLinkApply = useCallback(
    (values: { href: string; displayText?: string; openInNewTab: boolean }) => {
      if (!activeEditor) return
      const { href, displayText: displayTextVal, openInNewTab } = values
      if (!isAllowedHref(href)) return
      const target = openInNewTab ? '_blank' : undefined
      if (linkDialogMode === 'edit') {
        activeEditor.chain().focus().extendMarkRange('link').setLink({ href, target }).run()
        return
      }
      if (linkDialogInsertWithNoSelection) {
        const text = displayTextVal?.trim() || href
        const rel = 'noopener noreferrer'
        const targetAttr = openInNewTab ? ' target="_blank"' : ''
        const html = `<a href="${escapeHtmlAttr(href)}"${targetAttr} rel="${rel}">${escapeHtmlText(text)}</a>`
        activeEditor.chain().focus().insertContent(html).run()
        return
      }
      activeEditor.chain().focus().setLink({ href, target }).run()
    },
    [activeEditor, linkDialogInsertWithNoSelection, linkDialogMode]
  )

  const handleLinkRemove = useCallback(() => {
    if (!activeEditor) return
    activeEditor.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [activeEditor])

  const handleAddInlineComment = useCallback(
    (contextMenuPosition?: { x: number; y: number }, selectionRange?: { from: number; to: number }) => {
      if (!editor) return

      const from = selectionRange?.from ?? editor.state.selection.from
      const to = selectionRange?.to ?? editor.state.selection.to
      if (from === to) return

      const nextPendingSelection = createPendingInlineSelection(editor, from, to)
      if (!nextPendingSelection) return

      setPendingSelection(nextPendingSelection)
      if (contextMenuPosition?.x != null && contextMenuPosition?.y != null) {
        setInlineCommentAnchorMode('context-menu')
        setInlineCommentPosition({
          top: contextMenuPosition.y + 8,
          left: contextMenuPosition.x + 8
        })
        setShowInlineCommentPopover(true)
        return
      }

      setInlineCommentAnchorMode('selection')
      requestEditorSelectionAnchorPosition(
        {
          view: editor.view,
          commands: editor.commands,
          layoutHints: layoutHintState
        },
        from,
        to,
        position => {
          setInlineCommentPosition({
            top: position.top + 30,
            left: position.left
          })
          setShowInlineCommentPopover(true)
        }
      )
    },
    [editor, layoutHintState]
  )

  const openAiEditSidebar = useCallback(() => {
    if (!documentId) return

    setShowAiInstructionDialog(false)
    setAiInstruction('')
    setAiSelectionSnapshot('')
    setAiSelectionSnapshotHtml('')
    setRightSidebar(prev => (prev === 'ai' ? 'closed' : 'ai'))
  }, [documentId, setRightSidebar])

  const handleAiEditClick = useCallback(() => {
    if (!documentId) return

    const useDialogEntrypoint =
      globalThis.window !== undefined && globalThis.localStorage.getItem('document-ai-edit-entrypoint') === 'dialog'
    if (!useDialogEntrypoint) {
      setRightSidebar(prev => (prev === 'ai' ? 'closed' : 'ai'))
      return
    }

    if (showAiInstructionDialog) {
      setShowAiInstructionDialog(false)
      setAiInstruction('')
      setAiSelectionSnapshot('')
      setAiSelectionSnapshotHtml('')
      return
    }

    const selectionContext = getCurrentEditorSelectionContext()
    setAiSelectionSnapshot(selectionContext.text)
    setAiSelectionSnapshotHtml(selectionContext.html)
    setAiInstruction('')
    setShowAiInstructionDialog(true)
  }, [documentId, getCurrentEditorSelectionContext, setRightSidebar, showAiInstructionDialog])

  const closeAiInstructionDialog = useCallback(() => {
    setShowAiInstructionDialog(false)
    setAiInstruction('')
    setAiSelectionSnapshot('')
    setAiSelectionSnapshotHtml('')
  }, [])

  const handleConfirmAiInstruction = useCallback(() => {
    if (!documentId) return
    const trimmedInstruction = aiInstruction.trim()
    if (!trimmedInstruction) return

    const prompt = trimmedInstruction
    const additionInfo = buildDocumentEditAdditionInfo({
      documentId,
      documentTitle: title,
      selectedText: aiSelectionSnapshot,
      selectedHtml: aiSelectionSnapshotHtml,
      fullDocumentHtml: truncateHtmlForAiContext(editor?.getHTML() || '')
    })

    setShowAiInstructionDialog(false)
    setAiInstruction('')
    setAiSelectionSnapshot('')
    setAiSelectionSnapshotHtml('')

    openEveryAI({ prompt, additionInfo, skills: ['Documents'] })

    globalThis.setTimeout(() => {
      const everyAiMounted = Boolean(globalThis.document.querySelector('[data-testid="every-ai-app"]'))
      if (!everyAiMounted) {
        navigateTo('/platform/every-ai')
      }
    }, 800)
  }, [aiInstruction, aiSelectionSnapshot, aiSelectionSnapshotHtml, documentId, editor, title])

  const openAiFromPendingSelection = useCallback(() => {
    if (!pendingSelection) return
    setAiSelectionSnapshot(pendingSelection.text)
    setAiSelectionSnapshotHtml(pendingSelection.html)
    setAiInstruction('')
    setShowAiInstructionDialog(true)
    setShowInlineCommentPopover(false)
    setInlineCommentAnchorMode(null)
    setPendingSelection(null)
  }, [pendingSelection])

  return {
    showInsertImageDialog,
    setShowInsertImageDialog,
    imageDialogMode,
    showLinkDialog,
    setShowLinkDialog,
    linkDialogMode,
    linkDialogInitialValues,
    showInlineCommentPopover,
    setShowInlineCommentPopover,
    inlineCommentPosition,
    pendingSelection,
    setPendingSelection,
    showAiInstructionDialog,
    setShowAiInstructionDialog,
    aiInstruction,
    setAiInstruction,
    aiSelectionSnapshot,
    aiSelectionSnapshotHtml,
    aiSelectionPreviewText,
    hasLongAiSelectionPreview,
    isAiSelectionPreviewExpanded,
    setIsAiSelectionPreviewExpanded,
    openLinkDialog,
    openLinkDialogForEditor,
    openInsertImageDialog,
    openReplaceImageDialog,
    handleReplaceSelectedImage,
    handleLinkApply,
    handleLinkRemove,
    handleAddInlineComment,
    openAiEditSidebar,
    handleAiEditClick,
    handleConfirmAiInstruction,
    closeAiInstructionDialog,
    openAiFromPendingSelection
  }
}
