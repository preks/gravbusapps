import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { NodeSelection, type Transaction as ProseMirrorTransaction } from '@tiptap/pm/state'
import type { ActivePagesEditorState } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import {
  DOCUMENT_IMAGE_UI_EVENT,
  dispatchDocumentImageUiMode,
  type CustomImageAttributes,
  type DocumentImageUiMode
} from '@/components/tiptap-extensions/tiptap-custom-image'
import { getSelectedTableRectContext } from '@/components/tiptap-extensions/tiptap-custom-tables/tableFormattingUtils'
import { type SelectedImageSidebarState } from '../ImageSettingsSidebar'
import { type SelectedSignatureSidebarState, type SignatureSidebarAttributes } from '../SignatureSettingsSidebar'
import {
  DOCUMENT_SIGNATURE_UI_EVENT,
  dispatchDocumentSignatureUiMode,
  type DocumentSignatureUiMode,
  type DocumentSignatureUiEventDetail
} from '../signatureUiEvents'
import { type SelectedTableSidebarState } from '../TableSettingsSidebar'
import type { RightSidebar } from './usePagedDocumentInteractionDialogs'

export const CLOSED_IMAGE_SIDEBAR: SelectedImageSidebarState = {
  open: false,
  editor: null,
  pos: null,
  nodeSize: null,
  attrs: null
}

export const CLOSED_TABLE_SIDEBAR: SelectedTableSidebarState = {
  open: false,
  editor: null,
  tablePos: null
}

export const CLOSED_SIGNATURE_SIDEBAR: SelectedSignatureSidebarState = {
  open: false,
  editor: null,
  pos: null,
  nodeSize: null,
  attrs: null
}

function isSameSelectedImageSidebarState(left: SelectedImageSidebarState, right: SelectedImageSidebarState): boolean {
  if (left.open !== right.open) return false
  if (left.editor !== right.editor) return false
  if (left.pos !== right.pos) return false
  if (left.nodeSize !== right.nodeSize) return false
  if (left.attrs === null && right.attrs === null) return true
  if (left.attrs === null || right.attrs === null) return false
  return JSON.stringify(left.attrs) === JSON.stringify(right.attrs)
}

function isSameSelectedTableSidebarState(left: SelectedTableSidebarState, right: SelectedTableSidebarState): boolean {
  return left.open === right.open && left.editor === right.editor && left.tablePos === right.tablePos
}

function signatureAttrsEquivalent(a: SignatureSidebarAttributes, b: SignatureSidebarAttributes): boolean {
  return (
    a.signatureId === b.signatureId &&
    a.kind === b.kind &&
    a.name === b.name &&
    a.pageNumber === b.pageNumber &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.lockAspectRatio === b.lockAspectRatio &&
    a.createdBy === b.createdBy &&
    a.snapshotSvg === b.snapshotSvg &&
    a.cropTop === b.cropTop &&
    a.cropRight === b.cropRight &&
    a.cropBottom === b.cropBottom &&
    a.cropLeft === b.cropLeft &&
    (a.rotation ?? 0) === (b.rotation ?? 0)
  )
}

function isSameSelectedSignatureSidebarState(
  left: SelectedSignatureSidebarState,
  right: SelectedSignatureSidebarState
): boolean {
  if (left.open !== right.open) return false
  if (left.editor !== right.editor) return false
  if (left.pos !== right.pos) return false
  if (left.nodeSize !== right.nodeSize) return false
  if (left.attrs === null && right.attrs === null) return true
  if (left.attrs === null || right.attrs === null) return false
  return signatureAttrsEquivalent(left.attrs, right.attrs)
}

export const DOCUMENT_EDITOR_RIGHT_SIDEBAR_WIDTH_PX = 360

interface ActiveImageUiState {
  pos: number | null
  mode: DocumentImageUiMode
}

export interface ActiveSignatureUiState {
  pos: number | null
  mode: DocumentSignatureUiMode
}

export function shouldKeepSignatureSidebarOpenForCropMode(
  signatureSidebar: Pick<SelectedSignatureSidebarState, 'open' | 'pos'>,
  signatureUiState: ActiveSignatureUiState
): boolean {
  return (
    signatureSidebar.open &&
    signatureSidebar.pos != null &&
    signatureUiState.mode === 'crop' &&
    signatureUiState.pos === signatureSidebar.pos
  )
}

type SidebarContextSubtitleKey =
  | 'table-sidebar-in-header-context'
  | 'table-sidebar-in-footer-context'
  | 'image-sidebar-in-header-context'
  | 'image-sidebar-in-footer-context'
  | 'signature-sidebar-in-header-context'
  | 'signature-sidebar-in-footer-context'

export function getSelectedImageState(editor: TiptapEditor): Omit<SelectedImageSidebarState, 'open' | 'editor'> | null {
  const { selection } = editor.state

  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    return {
      pos: selection.from,
      nodeSize: selection.node.nodeSize,
      attrs: selection.node.attrs as CustomImageAttributes
    }
  }

  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'image') {
      return {
        pos: $from.before(depth),
        nodeSize: node.nodeSize,
        attrs: node.attrs as CustomImageAttributes
      }
    }
  }

  return null
}

export function getSelectedSignatureState(
  editor: TiptapEditor
): Omit<SelectedSignatureSidebarState, 'open' | 'editor'> | null {
  const { selection } = editor.state

  if (selection instanceof NodeSelection && selection.node.type.name === 'signature') {
    return {
      pos: selection.from,
      nodeSize: selection.node.nodeSize,
      attrs: selection.node.attrs as SignatureSidebarAttributes
    }
  }

  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'signature') {
      return {
        pos: $from.before(depth),
        nodeSize: node.nodeSize,
        attrs: node.attrs as SignatureSidebarAttributes
      }
    }
  }

  return null
}

export function shouldKeepImageSidebarOpenForUiMode(
  imageSidebar: Pick<SelectedImageSidebarState, 'open' | 'pos'>,
  imageUiState: ActiveImageUiState
): boolean {
  return (
    imageSidebar.open &&
    imageSidebar.pos != null &&
    imageUiState.mode === 'crop' &&
    imageUiState.pos === imageSidebar.pos
  )
}

export function getSelectedTableState(editor: TiptapEditor): Omit<SelectedTableSidebarState, 'open' | 'editor'> | null {
  const context = getSelectedTableRectContext(editor.state, 'table')
  if (!context) return null

  return {
    tablePos: context.tablePos
  }
}

const DOCUMENT_TOC_NODE = 'documentTableOfContents'

/** When the TOC block is selected (click), drive the format sidebar like the table sidebar. */
export function getSelectedDocumentTocState(editor: TiptapEditor): { tocPos: number } | null {
  const { selection } = editor.state

  if (selection instanceof NodeSelection && selection.node.type.name === DOCUMENT_TOC_NODE) {
    return { tocPos: selection.from }
  }

  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === DOCUMENT_TOC_NODE) {
      return { tocPos: $from.before(depth) }
    }
  }

  return null
}

export function resolveSidebarContextSubtitleKey(options: {
  sidebar: 'image' | 'table' | 'signature'
  open: boolean
  mainEditor: TiptapEditor | null
  sidebarEditor: TiptapEditor | null
  activeHeaderFooterType: ActivePagesEditorState['activeEditorType']
}): SidebarContextSubtitleKey | undefined {
  if (!options.open || !options.mainEditor || !options.sidebarEditor || options.sidebarEditor === options.mainEditor) {
    return undefined
  }

  if (options.sidebar === 'table') {
    if (options.activeHeaderFooterType === 'header') return 'table-sidebar-in-header-context'
    if (options.activeHeaderFooterType === 'footer') return 'table-sidebar-in-footer-context'
    return undefined
  }

  if (options.sidebar === 'signature') {
    if (options.activeHeaderFooterType === 'header') return 'signature-sidebar-in-header-context'
    if (options.activeHeaderFooterType === 'footer') return 'signature-sidebar-in-footer-context'
    return undefined
  }

  if (options.activeHeaderFooterType === 'header') return 'image-sidebar-in-header-context'
  if (options.activeHeaderFooterType === 'footer') return 'image-sidebar-in-footer-context'
  return undefined
}

export function resolveSidebarPresentationState(options: {
  rightSidebar: RightSidebar
  selectedImageSidebar: SelectedImageSidebarState
  selectedTableSidebar: SelectedTableSidebarState
  selectedSignatureSidebar: SelectedSignatureSidebarState
  activeHeaderFooterEditor: TiptapEditor | null
  isHeaderFooterEditing: boolean
  /** True while the user has the header/footer settings panel open (until explicit close). Keeps the panel mounted when the inline overlay briefly unmounts during layout toggles or margin persist. */
  headerFooterSettingsSessionOpen: boolean
}): {
  documentRightPanelOffset: number
  showTableSidebar: boolean
  showHeaderFooterSidebar: boolean
  documentEditorRightReservePx: number | undefined
} {
  let documentRightPanelOffset = 16
  if (options.rightSidebar === 'comments') {
    documentRightPanelOffset = 412
  } else if (options.rightSidebar === 'ai') {
    documentRightPanelOffset = 496
  }
  // TOC uses the same docked offset as table/image (16). It is mutually exclusive with comments/AI in `rightSidebar`.
  const imageBlocksTable =
    options.selectedImageSidebar.open && options.selectedImageSidebar.editor === options.selectedTableSidebar.editor
  const signatureBlocksTable =
    options.selectedSignatureSidebar.open &&
    options.selectedSignatureSidebar.editor === options.selectedTableSidebar.editor
  const showTableSidebar =
    options.selectedTableSidebar.open &&
    options.selectedTableSidebar.editor != null &&
    options.selectedTableSidebar.tablePos != null &&
    !imageBlocksTable &&
    !signatureBlocksTable
  const imageBlocksHeaderFooter =
    options.selectedImageSidebar.open && options.selectedImageSidebar.editor === options.activeHeaderFooterEditor
  const signatureBlocksHeaderFooter =
    options.selectedSignatureSidebar.open &&
    options.selectedSignatureSidebar.editor === options.activeHeaderFooterEditor
  const showHeaderFooterSidebar =
    (options.headerFooterSettingsSessionOpen ||
      (options.isHeaderFooterEditing && options.activeHeaderFooterEditor != null)) &&
    !showTableSidebar &&
    !imageBlocksHeaderFooter &&
    !signatureBlocksHeaderFooter
  const shouldReserveRightSidebarSpace =
    options.rightSidebar === 'toc' ||
    showHeaderFooterSidebar ||
    showTableSidebar ||
    (options.selectedImageSidebar.open &&
      options.selectedImageSidebar.pos != null &&
      options.selectedImageSidebar.attrs != null) ||
    (options.selectedSignatureSidebar.open &&
      options.selectedSignatureSidebar.pos != null &&
      options.selectedSignatureSidebar.attrs != null)
  const documentEditorRightReservePx = shouldReserveRightSidebarSpace
    ? DOCUMENT_EDITOR_RIGHT_SIDEBAR_WIDTH_PX + documentRightPanelOffset
    : undefined

  return {
    documentRightPanelOffset,
    showTableSidebar,
    showHeaderFooterSidebar,
    documentEditorRightReservePx
  }
}

export interface UsePagedDocumentSelectionSidebarsParams {
  editor: TiptapEditor | null
  activeEditor: TiptapEditor | null
  activeHeaderFooterEditor: TiptapEditor | null
  activeHeaderFooterType: ActivePagesEditorState['activeEditorType']
  isHeaderFooterEditing: boolean
  headerFooterSettingsSessionOpen: boolean
  rightSidebar: RightSidebar
  isReviewMode?: boolean
}

export interface UsePagedDocumentSelectionSidebarsResult {
  replaceImagePosRef: MutableRefObject<number | null>
  selectedImageSidebar: SelectedImageSidebarState
  selectedTableSidebar: SelectedTableSidebarState
  selectedSignatureSidebar: SelectedSignatureSidebarState
  showBodyWhileEditingHeaderFooter: boolean
  setShowBodyWhileEditingHeaderFooter: (value: boolean) => void
  documentRightPanelOffset: number
  showTableSidebar: boolean
  showHeaderFooterSidebar: boolean
  documentEditorRightReservePx: number | undefined
  imageSidebarContextSubtitleKey: SidebarContextSubtitleKey | undefined
  tableSidebarContextSubtitleKey: SidebarContextSubtitleKey | undefined
  signatureSidebarContextSubtitleKey: SidebarContextSubtitleKey | undefined
  setSelectedImageSidebarState: (next: SelectedImageSidebarState) => void
  setSelectedTableSidebarState: (next: SelectedTableSidebarState) => void
  setSelectedSignatureSidebarState: (next: SelectedSignatureSidebarState) => void
  closeImageSettingsSidebar: () => void
  closeTableSettingsSidebar: () => void
  closeSignatureSettingsSidebar: () => void
  openTableSettingsSidebar: () => void
  activeSignatureUiState: ActiveSignatureUiState
}

export function usePagedDocumentSelectionSidebars({
  editor,
  activeEditor,
  activeHeaderFooterEditor,
  activeHeaderFooterType,
  isHeaderFooterEditing,
  headerFooterSettingsSessionOpen,
  rightSidebar,
  isReviewMode = false
}: UsePagedDocumentSelectionSidebarsParams): UsePagedDocumentSelectionSidebarsResult {
  const replaceImagePosRef = useRef<number | null>(null)
  const [selectedImageSidebar, setSelectedImageSidebar] = useState<SelectedImageSidebarState>(CLOSED_IMAGE_SIDEBAR)
  const [selectedTableSidebar, setSelectedTableSidebar] = useState<SelectedTableSidebarState>(CLOSED_TABLE_SIDEBAR)
  const [selectedSignatureSidebar, setSelectedSignatureSidebar] =
    useState<SelectedSignatureSidebarState>(CLOSED_SIGNATURE_SIDEBAR)
  const [showBodyWhileEditingHeaderFooter, setShowBodyWhileEditingHeaderFooter] = useState(true)
  const selectedImageSidebarRef = useRef<SelectedImageSidebarState>(CLOSED_IMAGE_SIDEBAR)
  const selectedTableSidebarRef = useRef<SelectedTableSidebarState>(CLOSED_TABLE_SIDEBAR)
  const selectedSignatureSidebarRef = useRef<SelectedSignatureSidebarState>(CLOSED_SIGNATURE_SIDEBAR)
  const activeImageUiStateRef = useRef<ActiveImageUiState>({
    pos: null,
    mode: 'default'
  })
  const activeSignatureUiStateRef = useRef<ActiveSignatureUiState>({
    pos: null,
    mode: 'default'
  })
  const [activeSignatureUiState, setActiveSignatureUiState] = useState<ActiveSignatureUiState>({
    pos: null,
    mode: 'default'
  })

  const setSelectedImageSidebarState = useCallback((next: SelectedImageSidebarState) => {
    selectedImageSidebarRef.current = next
    setSelectedImageSidebar(current => {
      if (
        current.open === next.open &&
        current.editor === next.editor &&
        current.pos === next.pos &&
        current.nodeSize === next.nodeSize &&
        current.attrs === next.attrs
      ) {
        return current
      }

      return next
    })
  }, [])

  const setSelectedTableSidebarState = useCallback((next: SelectedTableSidebarState) => {
    selectedTableSidebarRef.current = next
    setSelectedTableSidebar(current => {
      if (current.open === next.open && current.editor === next.editor && current.tablePos === next.tablePos) {
        return current
      }

      return next
    })
  }, [])

  const setSelectedSignatureSidebarState = useCallback((next: SelectedSignatureSidebarState) => {
    selectedSignatureSidebarRef.current = next
    setSelectedSignatureSidebar(current => {
      if (isSameSelectedSignatureSidebarState(current, next)) {
        return current
      }

      return next
    })
  }, [])

  useEffect(() => {
    selectedImageSidebarRef.current = selectedImageSidebar
  }, [selectedImageSidebar])

  useEffect(() => {
    selectedTableSidebarRef.current = selectedTableSidebar
  }, [selectedTableSidebar])

  useEffect(() => {
    selectedSignatureSidebarRef.current = selectedSignatureSidebar
  }, [selectedSignatureSidebar])

  useEffect(() => {
    const handleImageUiEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ActiveImageUiState>
      activeImageUiStateRef.current = customEvent.detail ?? {
        pos: null,
        mode: 'default'
      }
    }

    globalThis.addEventListener(DOCUMENT_IMAGE_UI_EVENT, handleImageUiEvent)
    return () => globalThis.removeEventListener(DOCUMENT_IMAGE_UI_EVENT, handleImageUiEvent)
  }, [])

  useEffect(() => {
    const handleSignatureUiEvent = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentSignatureUiEventDetail>
      const detail = customEvent.detail
      const next: ActiveSignatureUiState = {
        pos: detail?.pos ?? null,
        mode: detail?.mode ?? 'default'
      }
      activeSignatureUiStateRef.current = next
      setActiveSignatureUiState(next)
    }

    globalThis.addEventListener(DOCUMENT_SIGNATURE_UI_EVENT, handleSignatureUiEvent)
    return () => globalThis.removeEventListener(DOCUMENT_SIGNATURE_UI_EVENT, handleSignatureUiEvent)
  }, [])

  useEffect(() => {
    if (isReviewMode) {
      replaceImagePosRef.current = null
      setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
      return
    }

    if (!editor && !activeEditor) {
      replaceImagePosRef.current = null
      setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
      return
    }

    const editors: TiptapEditor[] = []
    if (activeEditor) editors.push(activeEditor)
    if (editor && editor !== activeEditor) editors.push(editor)

    const getPersistedSelectedImageSidebar = (
      sourceEditor?: TiptapEditor,
      transaction?: ProseMirrorTransaction
    ): SelectedImageSidebarState | null => {
      const current = selectedImageSidebarRef.current
      if (!current.open || !current.editor || current.pos == null) return null

      const targetEditor = sourceEditor === current.editor ? sourceEditor : current.editor
      if (!targetEditor) return null

      const mappedPos =
        transaction && sourceEditor === current.editor ? transaction.mapping.mapResult(current.pos) : null

      if (mappedPos?.deleted) {
        return null
      }

      const nextPos = mappedPos?.pos ?? current.pos
      const node = targetEditor.state.doc.nodeAt(nextPos)
      if (node?.type.name !== 'image') {
        return null
      }

      return {
        open: true,
        editor: targetEditor,
        pos: nextPos,
        nodeSize: node.nodeSize,
        attrs: node.attrs as CustomImageAttributes
      }
    }

    const syncSelectedImageSidebar = (sourceEditor?: TiptapEditor) => {
      const editorCandidates = sourceEditor ? [sourceEditor, ...editors.filter(ed => ed !== sourceEditor)] : editors
      const match = editorCandidates
        .map(ed => ({ editor: ed, imageSelection: getSelectedImageState(ed) }))
        .find(entry => entry.imageSelection !== null)

      if (!match?.imageSelection) {
        const persisted = getPersistedSelectedImageSidebar(sourceEditor)
        if (persisted) {
          replaceImagePosRef.current = persisted.pos
          if (!isSameSelectedImageSidebarState(selectedImageSidebarRef.current, persisted)) {
            setSelectedImageSidebarState(persisted)
          }
          return
        }

        if (shouldKeepImageSidebarOpenForUiMode(selectedImageSidebarRef.current, activeImageUiStateRef.current)) {
          const current = selectedImageSidebarRef.current
          replaceImagePosRef.current = current.pos
          return
        }

        replaceImagePosRef.current = null
        if (selectedImageSidebarRef.current.open) {
          setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
        }
        return
      }

      replaceImagePosRef.current = match.imageSelection.pos
      const nextImageSidebar: SelectedImageSidebarState = {
        open: true,
        editor: match.editor,
        pos: match.imageSelection.pos,
        nodeSize: match.imageSelection.nodeSize,
        attrs: match.imageSelection.attrs
      }
      if (!isSameSelectedImageSidebarState(selectedImageSidebarRef.current, nextImageSidebar)) {
        setSelectedImageSidebarState(nextImageSidebar)
      }
    }

    const refreshSelectedImageSidebar = (sourceEditor: TiptapEditor) => {
      const current = selectedImageSidebarRef.current
      if (current.open && current.editor && sourceEditor !== current.editor) {
        return
      }

      const persisted = getPersistedSelectedImageSidebar(sourceEditor)
      if (persisted?.editor !== sourceEditor) {
        replaceImagePosRef.current = null
        if (selectedImageSidebarRef.current.open) {
          setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
        }
        return
      }

      replaceImagePosRef.current = persisted.pos
      if (!isSameSelectedImageSidebarState(selectedImageSidebarRef.current, persisted)) {
        setSelectedImageSidebarState(persisted)
      }
    }

    syncSelectedImageSidebar()
    const subs: Array<{
      ed: TiptapEditor
      selectionFn: () => void
      transactionFn: (payload: { transaction: ProseMirrorTransaction }) => void
    }> = []
    for (const ed of editors) {
      const selectionFn = () => syncSelectedImageSidebar(ed)
      const transactionFn = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
        if (transaction.selectionSet) {
          syncSelectedImageSidebar(ed)
          return
        }

        refreshSelectedImageSidebar(ed)
      }

      ed.on('selectionUpdate', selectionFn)
      ed.on('transaction', transactionFn)
      subs.push({ ed, selectionFn, transactionFn })
    }

    return () => {
      for (const { ed, selectionFn, transactionFn } of subs) {
        ed.off('selectionUpdate', selectionFn)
        ed.off('transaction', transactionFn)
      }
    }
  }, [activeEditor, editor, isReviewMode, setSelectedImageSidebarState])

  useEffect(() => {
    if (isReviewMode) {
      setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
      return
    }

    if (!editor && !activeEditor) {
      setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
      return
    }

    const editors: TiptapEditor[] = []
    if (activeEditor) editors.push(activeEditor)
    if (editor && editor !== activeEditor) editors.push(editor)

    const getPersistedSelectedTableSidebar = (
      sourceEditor?: TiptapEditor,
      transaction?: ProseMirrorTransaction
    ): SelectedTableSidebarState | null => {
      const current = selectedTableSidebarRef.current
      if (!current.open || !current.editor || current.tablePos == null) return null

      const targetEditor = sourceEditor === current.editor ? sourceEditor : current.editor
      if (!targetEditor) return null

      const mappedPos =
        transaction && sourceEditor === current.editor ? transaction.mapping.mapResult(current.tablePos) : null

      if (mappedPos?.deleted) {
        return null
      }

      const nextPos = mappedPos?.pos ?? current.tablePos
      const node = targetEditor.state.doc.nodeAt(nextPos)
      if (node?.type.name !== 'table') {
        return null
      }

      return {
        open: true,
        editor: targetEditor,
        tablePos: nextPos
      }
    }

    const syncSelectedTableSidebar = (sourceEditor?: TiptapEditor) => {
      const editorCandidates = sourceEditor ? [sourceEditor, ...editors.filter(ed => ed !== sourceEditor)] : editors
      const match = editorCandidates
        .map(ed => ({ editor: ed, tableSelection: getSelectedTableState(ed) }))
        .find(entry => entry.tableSelection !== null)

      if (!match?.tableSelection) {
        const persisted = getPersistedSelectedTableSidebar(sourceEditor)
        if (persisted) {
          if (!isSameSelectedTableSidebarState(selectedTableSidebarRef.current, persisted)) {
            setSelectedTableSidebarState(persisted)
          }
          return
        }

        if (selectedTableSidebarRef.current.open) {
          setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
        }
        return
      }

      const nextTableSidebar: SelectedTableSidebarState = {
        open: true,
        editor: match.editor,
        tablePos: match.tableSelection.tablePos
      }
      if (!isSameSelectedTableSidebarState(selectedTableSidebarRef.current, nextTableSidebar)) {
        setSelectedTableSidebarState(nextTableSidebar)
      }
    }

    const refreshSelectedTableSidebar = (sourceEditor: TiptapEditor) => {
      const current = selectedTableSidebarRef.current
      if (current.open && current.editor && sourceEditor !== current.editor) {
        return
      }

      const persisted = getPersistedSelectedTableSidebar(sourceEditor)
      if (persisted?.editor !== sourceEditor) {
        if (selectedTableSidebarRef.current.open) {
          setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
        }
        return
      }

      if (!isSameSelectedTableSidebarState(selectedTableSidebarRef.current, persisted)) {
        setSelectedTableSidebarState(persisted)
      }
    }

    syncSelectedTableSidebar()
    const subs: Array<{
      ed: TiptapEditor
      selectionFn: () => void
      transactionFn: (payload: { transaction: ProseMirrorTransaction }) => void
    }> = []

    for (const ed of editors) {
      const selectionFn = () => syncSelectedTableSidebar(ed)
      const transactionFn = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
        if (transaction.selectionSet) {
          syncSelectedTableSidebar(ed)
          return
        }

        refreshSelectedTableSidebar(ed)
      }

      ed.on('selectionUpdate', selectionFn)
      ed.on('transaction', transactionFn)
      subs.push({ ed, selectionFn, transactionFn })
    }

    return () => {
      for (const { ed, selectionFn, transactionFn } of subs) {
        ed.off('selectionUpdate', selectionFn)
        ed.off('transaction', transactionFn)
      }
    }
  }, [activeEditor, editor, isReviewMode, setSelectedTableSidebarState])

  useEffect(() => {
    if (isReviewMode) {
      setSelectedSignatureSidebarState(CLOSED_SIGNATURE_SIDEBAR)
      return
    }

    if (!editor && !activeEditor) {
      setSelectedSignatureSidebarState(CLOSED_SIGNATURE_SIDEBAR)
      return
    }

    const editors: TiptapEditor[] = []
    if (activeEditor) editors.push(activeEditor)
    if (editor && editor !== activeEditor) editors.push(editor)

    const getPersistedSelectedSignatureSidebar = (
      sourceEditor?: TiptapEditor,
      transaction?: ProseMirrorTransaction
    ): SelectedSignatureSidebarState | null => {
      const current = selectedSignatureSidebarRef.current
      if (!current.open || !current.editor || current.pos == null) return null

      const targetEditor = sourceEditor === current.editor ? sourceEditor : current.editor
      if (!targetEditor) return null

      const mappedPos =
        transaction && sourceEditor === current.editor ? transaction.mapping.mapResult(current.pos) : null

      if (mappedPos?.deleted) {
        return null
      }

      const nextPos = mappedPos?.pos ?? current.pos
      const node = targetEditor.state.doc.nodeAt(nextPos)
      if (node?.type.name !== 'signature') {
        return null
      }

      return {
        open: true,
        editor: targetEditor,
        pos: nextPos,
        nodeSize: node.nodeSize,
        attrs: node.attrs as SignatureSidebarAttributes
      }
    }

    const syncSelectedSignatureSidebar = (sourceEditor?: TiptapEditor) => {
      const editorCandidates = sourceEditor ? [sourceEditor, ...editors.filter(ed => ed !== sourceEditor)] : editors
      const match = editorCandidates
        .map(ed => ({ editor: ed, signatureSelection: getSelectedSignatureState(ed) }))
        .find(entry => entry.signatureSelection !== null)

      if (!match?.signatureSelection) {
        const persisted = getPersistedSelectedSignatureSidebar(sourceEditor)
        if (persisted) {
          if (!isSameSelectedSignatureSidebarState(selectedSignatureSidebarRef.current, persisted)) {
            setSelectedSignatureSidebarState(persisted)
          }
          return
        }

        if (
          shouldKeepSignatureSidebarOpenForCropMode(
            selectedSignatureSidebarRef.current,
            activeSignatureUiStateRef.current
          )
        ) {
          return
        }

        if (selectedSignatureSidebarRef.current.open) {
          setSelectedSignatureSidebarState(CLOSED_SIGNATURE_SIDEBAR)
        }
        return
      }

      const nextSignatureSidebar: SelectedSignatureSidebarState = {
        open: true,
        editor: match.editor,
        pos: match.signatureSelection.pos,
        nodeSize: match.signatureSelection.nodeSize,
        attrs: match.signatureSelection.attrs
      }
      if (!isSameSelectedSignatureSidebarState(selectedSignatureSidebarRef.current, nextSignatureSidebar)) {
        setSelectedSignatureSidebarState(nextSignatureSidebar)
      }
    }

    const refreshSelectedSignatureSidebar = (sourceEditor: TiptapEditor) => {
      const current = selectedSignatureSidebarRef.current
      if (current.open && current.editor && sourceEditor !== current.editor) {
        return
      }

      const persisted = getPersistedSelectedSignatureSidebar(sourceEditor)
      if (persisted?.editor !== sourceEditor) {
        if (selectedSignatureSidebarRef.current.open) {
          setSelectedSignatureSidebarState(CLOSED_SIGNATURE_SIDEBAR)
        }
        return
      }

      if (!isSameSelectedSignatureSidebarState(selectedSignatureSidebarRef.current, persisted)) {
        setSelectedSignatureSidebarState(persisted)
      }
    }

    syncSelectedSignatureSidebar()
    const subs: Array<{
      ed: TiptapEditor
      selectionFn: () => void
      transactionFn: (payload: { transaction: ProseMirrorTransaction }) => void
    }> = []

    for (const ed of editors) {
      const selectionFn = () => syncSelectedSignatureSidebar(ed)
      const transactionFn = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
        if (transaction.selectionSet) {
          syncSelectedSignatureSidebar(ed)
          return
        }

        refreshSelectedSignatureSidebar(ed)
      }

      ed.on('selectionUpdate', selectionFn)
      ed.on('transaction', transactionFn)
      subs.push({ ed, selectionFn, transactionFn })
    }

    return () => {
      for (const { ed, selectionFn, transactionFn } of subs) {
        ed.off('selectionUpdate', selectionFn)
        ed.off('transaction', transactionFn)
      }
    }
  }, [activeEditor, editor, isReviewMode, setSelectedSignatureSidebarState])

  useEffect(() => {
    if (!selectedImageSidebar.open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      if (target.closest('[data-testid="document-image-settings-sidebar"]')) {
        return
      }

      // Radix DropdownMenu portals its content to document.body, outside the sidebar DOM.
      if (target.closest('[data-document-image-sidebar-dropdown="true"]')) {
        return
      }

      if (target.closest('[data-testid="document-signature-settings-sidebar"]')) {
        return
      }

      if (target.closest('[data-testid="document-header-footer-settings-sidebar"]')) {
        return
      }

      if (target.closest('[data-testid="document-editor-image-anchor"]')) {
        return
      }

      if (target.closest('[data-image-overlay-anchor="true"]')) {
        return
      }

      if (target.closest('[data-image-page-anchor="true"]')) {
        return
      }

      if (shouldKeepImageSidebarOpenForUiMode(selectedImageSidebarRef.current, activeImageUiStateRef.current)) {
        return
      }

      replaceImagePosRef.current = null
      setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
    }

    globalThis.document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      globalThis.document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [selectedImageSidebar.open, setSelectedImageSidebarState])

  useEffect(() => {
    if (!selectedTableSidebar.open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      if (target.closest('[data-testid="document-table-settings-sidebar"]')) {
        return
      }

      // Radix Select portals <SelectContent> to document.body; it is not under the sidebar DOM.
      if (target.closest('[data-document-table-sidebar-dropdown]')) {
        return
      }

      if (target.closest('.ProseMirror table')) {
        return
      }

      if (target.closest('[data-testid="document-editor-signature"]')) {
        return
      }

      if (target.closest('[data-signature-handle="true"]')) {
        return
      }

      if (target.closest('[data-testid="document-editor-signature-broken"]')) {
        return
      }

      if (target.closest('[data-testid="document-editor-signature-crop-overlay"]')) {
        return
      }

      if (target.closest('[data-signature-crop-handle="true"]')) {
        return
      }

      setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
    }

    globalThis.document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      globalThis.document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [selectedTableSidebar.open, setSelectedTableSidebarState])

  useEffect(() => {
    if (!selectedSignatureSidebar.open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      if (target.closest('[data-testid="document-signature-settings-sidebar"]')) {
        return
      }

      if (target.closest('[data-testid="document-editor-signature-crop-overlay"]')) {
        return
      }

      if (target.closest('[data-signature-crop-handle="true"]')) {
        return
      }

      if (target.closest('[data-testid="document-editor-signature"]')) {
        return
      }

      if (target.closest('[data-signature-handle="true"]')) {
        return
      }

      if (target.closest('[data-testid="document-editor-signature-broken"]')) {
        return
      }

      if (
        shouldKeepSignatureSidebarOpenForCropMode(
          selectedSignatureSidebarRef.current,
          activeSignatureUiStateRef.current
        )
      ) {
        return
      }

      setSelectedSignatureSidebarState(CLOSED_SIGNATURE_SIDEBAR)
    }

    globalThis.document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      globalThis.document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [selectedSignatureSidebar.open, setSelectedSignatureSidebarState])

  const closeImageSettingsSidebar = useCallback(() => {
    const currentPos = selectedImageSidebarRef.current.pos
    if (currentPos != null) {
      dispatchDocumentImageUiMode({ pos: currentPos, mode: 'default' })
    }
    activeImageUiStateRef.current = {
      pos: null,
      mode: 'default'
    }
    replaceImagePosRef.current = null
    setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
  }, [setSelectedImageSidebarState])

  const closeTableSettingsSidebar = useCallback(() => {
    setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
  }, [setSelectedTableSidebarState])

  const closeSignatureSettingsSidebar = useCallback(() => {
    const currentPos = selectedSignatureSidebarRef.current.pos
    if (currentPos != null) {
      dispatchDocumentSignatureUiMode({ pos: currentPos, mode: 'default' })
    }
    const cleared: ActiveSignatureUiState = {
      pos: null,
      mode: 'default'
    }
    activeSignatureUiStateRef.current = cleared
    setActiveSignatureUiState(cleared)
    setSelectedSignatureSidebarState(CLOSED_SIGNATURE_SIDEBAR)
  }, [setSelectedSignatureSidebarState])

  const openTableSettingsSidebar = useCallback(() => {
    if (isReviewMode) return
    if (!activeEditor) return

    const selection = getSelectedTableState(activeEditor)
    if (!selection) return

    setSelectedTableSidebarState({
      open: true,
      editor: activeEditor,
      tablePos: selection.tablePos
    })
  }, [activeEditor, isReviewMode, setSelectedTableSidebarState])

  const presentationState = resolveSidebarPresentationState({
    rightSidebar,
    selectedImageSidebar,
    selectedTableSidebar,
    selectedSignatureSidebar,
    activeHeaderFooterEditor,
    isHeaderFooterEditing,
    headerFooterSettingsSessionOpen
  })
  const imageSidebarContextSubtitleKey = resolveSidebarContextSubtitleKey({
    sidebar: 'image',
    open: selectedImageSidebar.open,
    mainEditor: editor,
    sidebarEditor: selectedImageSidebar.editor,
    activeHeaderFooterType
  })
  const tableSidebarContextSubtitleKey = resolveSidebarContextSubtitleKey({
    sidebar: 'table',
    open: selectedTableSidebar.open,
    mainEditor: editor,
    sidebarEditor: selectedTableSidebar.editor,
    activeHeaderFooterType
  })
  const signatureSidebarContextSubtitleKey = resolveSidebarContextSubtitleKey({
    sidebar: 'signature',
    open: selectedSignatureSidebar.open,
    mainEditor: editor,
    sidebarEditor: selectedSignatureSidebar.editor,
    activeHeaderFooterType
  })

  return {
    replaceImagePosRef,
    selectedImageSidebar,
    selectedTableSidebar,
    selectedSignatureSidebar,
    showBodyWhileEditingHeaderFooter,
    setShowBodyWhileEditingHeaderFooter,
    documentRightPanelOffset: presentationState.documentRightPanelOffset,
    showTableSidebar: presentationState.showTableSidebar,
    showHeaderFooterSidebar: presentationState.showHeaderFooterSidebar,
    documentEditorRightReservePx: presentationState.documentEditorRightReservePx,
    imageSidebarContextSubtitleKey,
    tableSidebarContextSubtitleKey,
    signatureSidebarContextSubtitleKey,
    setSelectedImageSidebarState,
    setSelectedTableSidebarState,
    setSelectedSignatureSidebarState,
    closeImageSettingsSidebar,
    closeTableSettingsSidebar,
    closeSignatureSettingsSidebar,
    openTableSettingsSidebar,
    activeSignatureUiState
  }
}
