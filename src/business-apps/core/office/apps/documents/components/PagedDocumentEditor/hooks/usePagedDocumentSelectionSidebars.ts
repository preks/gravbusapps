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
import { type SelectedTableSidebarState } from '../TableSettingsSidebar'

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

export const DOCUMENT_EDITOR_RIGHT_SIDEBAR_WIDTH_PX = 360

interface ActiveImageUiState {
  pos: number | null
  mode: DocumentImageUiMode
}

type RightSidebar = 'closed' | 'comments' | 'ai'
type SidebarContextSubtitleKey =
  | 'table-sidebar-in-header-context'
  | 'table-sidebar-in-footer-context'
  | 'image-sidebar-in-header-context'
  | 'image-sidebar-in-footer-context'

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

export function resolveSidebarContextSubtitleKey(options: {
  sidebar: 'image' | 'table'
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

  if (options.activeHeaderFooterType === 'header') return 'image-sidebar-in-header-context'
  if (options.activeHeaderFooterType === 'footer') return 'image-sidebar-in-footer-context'
  return undefined
}

export function resolveSidebarPresentationState(options: {
  rightSidebar: RightSidebar
  selectedImageSidebar: SelectedImageSidebarState
  selectedTableSidebar: SelectedTableSidebarState
  activeHeaderFooterEditor: TiptapEditor | null
  isHeaderFooterEditing: boolean
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
  const showTableSidebar =
    options.selectedTableSidebar.open &&
    options.selectedTableSidebar.editor != null &&
    options.selectedTableSidebar.tablePos != null &&
    !(options.selectedImageSidebar.open && options.selectedImageSidebar.editor === options.selectedTableSidebar.editor)
  const showHeaderFooterSidebar =
    options.isHeaderFooterEditing &&
    options.activeHeaderFooterEditor != null &&
    !showTableSidebar &&
    !(options.selectedImageSidebar.open && options.selectedImageSidebar.editor === options.activeHeaderFooterEditor)
  const shouldReserveRightSidebarSpace =
    showHeaderFooterSidebar ||
    showTableSidebar ||
    (options.selectedImageSidebar.open &&
      options.selectedImageSidebar.pos != null &&
      options.selectedImageSidebar.attrs != null)
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
  rightSidebar: RightSidebar
}

export interface UsePagedDocumentSelectionSidebarsResult {
  replaceImagePosRef: MutableRefObject<number | null>
  selectedImageSidebar: SelectedImageSidebarState
  selectedTableSidebar: SelectedTableSidebarState
  showBodyWhileEditingHeaderFooter: boolean
  setShowBodyWhileEditingHeaderFooter: (value: boolean) => void
  documentRightPanelOffset: number
  showTableSidebar: boolean
  showHeaderFooterSidebar: boolean
  documentEditorRightReservePx: number | undefined
  imageSidebarContextSubtitleKey: SidebarContextSubtitleKey | undefined
  tableSidebarContextSubtitleKey: SidebarContextSubtitleKey | undefined
  setSelectedImageSidebarState: (next: SelectedImageSidebarState) => void
  setSelectedTableSidebarState: (next: SelectedTableSidebarState) => void
  closeImageSettingsSidebar: () => void
  closeTableSettingsSidebar: () => void
  openTableSettingsSidebar: () => void
}

export function usePagedDocumentSelectionSidebars({
  editor,
  activeEditor,
  activeHeaderFooterEditor,
  activeHeaderFooterType,
  isHeaderFooterEditing,
  rightSidebar
}: UsePagedDocumentSelectionSidebarsParams): UsePagedDocumentSelectionSidebarsResult {
  const replaceImagePosRef = useRef<number | null>(null)
  const [selectedImageSidebar, setSelectedImageSidebar] = useState<SelectedImageSidebarState>(CLOSED_IMAGE_SIDEBAR)
  const [selectedTableSidebar, setSelectedTableSidebar] = useState<SelectedTableSidebarState>(CLOSED_TABLE_SIDEBAR)
  const [showBodyWhileEditingHeaderFooter, setShowBodyWhileEditingHeaderFooter] = useState(true)
  const selectedImageSidebarRef = useRef<SelectedImageSidebarState>(CLOSED_IMAGE_SIDEBAR)
  const selectedTableSidebarRef = useRef<SelectedTableSidebarState>(CLOSED_TABLE_SIDEBAR)
  const activeImageUiStateRef = useRef<ActiveImageUiState>({
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

  useEffect(() => {
    selectedImageSidebarRef.current = selectedImageSidebar
  }, [selectedImageSidebar])

  useEffect(() => {
    selectedTableSidebarRef.current = selectedTableSidebar
  }, [selectedTableSidebar])

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
          setSelectedImageSidebarState(persisted)
          return
        }

        if (shouldKeepImageSidebarOpenForUiMode(selectedImageSidebarRef.current, activeImageUiStateRef.current)) {
          const current = selectedImageSidebarRef.current
          replaceImagePosRef.current = current.pos
          setSelectedImageSidebarState(current)
          return
        }

        replaceImagePosRef.current = null
        setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
        return
      }

      replaceImagePosRef.current = match.imageSelection.pos
      setSelectedImageSidebarState({
        open: true,
        editor: match.editor,
        pos: match.imageSelection.pos,
        nodeSize: match.imageSelection.nodeSize,
        attrs: match.imageSelection.attrs
      })
    }

    const refreshSelectedImageSidebar = (sourceEditor: TiptapEditor) => {
      const current = selectedImageSidebarRef.current
      if (current.open && current.editor && sourceEditor !== current.editor) {
        return
      }

      const persisted = getPersistedSelectedImageSidebar(sourceEditor)
      if (persisted?.editor !== sourceEditor) {
        replaceImagePosRef.current = null
        setSelectedImageSidebarState(CLOSED_IMAGE_SIDEBAR)
        return
      }

      replaceImagePosRef.current = persisted.pos
      setSelectedImageSidebarState(persisted)
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
  }, [activeEditor, editor, setSelectedImageSidebarState])

  useEffect(() => {
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
          setSelectedTableSidebarState(persisted)
          return
        }

        setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
        return
      }

      setSelectedTableSidebarState({
        open: true,
        editor: match.editor,
        tablePos: match.tableSelection.tablePos
      })
    }

    const refreshSelectedTableSidebar = (sourceEditor: TiptapEditor) => {
      const current = selectedTableSidebarRef.current
      if (current.open && current.editor && sourceEditor !== current.editor) {
        return
      }

      const persisted = getPersistedSelectedTableSidebar(sourceEditor)
      if (persisted?.editor !== sourceEditor) {
        setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
        return
      }

      setSelectedTableSidebarState(persisted)
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
  }, [activeEditor, editor, setSelectedTableSidebarState])

  useEffect(() => {
    if (!selectedImageSidebar.open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      if (target.closest('[data-testid="document-image-settings-sidebar"]')) {
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

      if (target.closest('.ProseMirror table')) {
        return
      }

      setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
    }

    globalThis.document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      globalThis.document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [selectedTableSidebar.open, setSelectedTableSidebarState])

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

  const openTableSettingsSidebar = useCallback(() => {
    if (!activeEditor) return

    const selection = getSelectedTableState(activeEditor)
    if (!selection) return

    setSelectedTableSidebarState({
      open: true,
      editor: activeEditor,
      tablePos: selection.tablePos
    })
  }, [activeEditor, setSelectedTableSidebarState])

  const presentationState = resolveSidebarPresentationState({
    rightSidebar,
    selectedImageSidebar,
    selectedTableSidebar,
    activeHeaderFooterEditor,
    isHeaderFooterEditing
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

  return {
    replaceImagePosRef,
    selectedImageSidebar,
    selectedTableSidebar,
    showBodyWhileEditingHeaderFooter,
    setShowBodyWhileEditingHeaderFooter,
    documentRightPanelOffset: presentationState.documentRightPanelOffset,
    showTableSidebar: presentationState.showTableSidebar,
    showHeaderFooterSidebar: presentationState.showHeaderFooterSidebar,
    documentEditorRightReservePx: presentationState.documentEditorRightReservePx,
    imageSidebarContextSubtitleKey,
    tableSidebarContextSubtitleKey,
    setSelectedImageSidebarState,
    setSelectedTableSidebarState,
    closeImageSettingsSidebar,
    closeTableSettingsSidebar,
    openTableSettingsSidebar
  }
}
