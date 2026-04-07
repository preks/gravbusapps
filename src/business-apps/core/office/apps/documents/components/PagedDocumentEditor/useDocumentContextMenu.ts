import { useCallback, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import type { CustomImageAttributes } from '@/components/tiptap-extensions/tiptap-custom-image'
import { getSelectedImageState, getSelectedTableState } from './hooks/usePagedDocumentSelectionSidebars'

export type DocumentContextMenuKind = 'default' | 'text' | 'image' | 'table'

export interface DocumentContextMenuImageSelection {
  pos: number
  nodeSize: number
  attrs: CustomImageAttributes
}

export interface DocumentContextMenuTableSelection {
  tablePos: number
}

export interface DocumentContextMenuState {
  kind: DocumentContextMenuKind
  hasTextSelection: boolean
  isLinkActive: boolean
  linkHref: string | null
  imageSelection: DocumentContextMenuImageSelection | null
  tableSelection: DocumentContextMenuTableSelection | null
}

const INITIAL_CONTEXT_MENU_STATE: DocumentContextMenuState = {
  kind: 'default',
  hasTextSelection: false,
  isLinkActive: false,
  linkHref: null,
  imageSelection: null,
  tableSelection: null
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function getContextMenuTargetElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target : null
}

function resolveImageSelectionPosition(editor: TiptapEditor, element: HTMLElement): number | null {
  const projectedPos = Number(element.dataset.imageNodePos ?? '')
  if (Number.isInteger(projectedPos) && projectedPos >= 0) {
    return projectedPos
  }

  try {
    return editor.view.posAtDOM(element, 0)
  } catch {
    return null
  }
}

export function resolveContextMenuKind(options: {
  hasTextSelection: boolean
  imageSelection: DocumentContextMenuImageSelection | null
  tableSelection: DocumentContextMenuTableSelection | null
}): DocumentContextMenuKind {
  if (options.imageSelection) {
    return 'image'
  }

  if (options.tableSelection) {
    return 'table'
  }

  if (options.hasTextSelection) {
    return 'text'
  }

  return 'default'
}

export function syncContextMenuSelection(
  editor: TiptapEditor,
  event: Pick<MouseEvent, 'clientX' | 'clientY' | 'target'>
): void {
  const target = getContextMenuTargetElement(event.target)
  if (!target) return

  const imageElement = target.closest(
    '[data-testid="document-editor-image-anchor"], [data-image-overlay-anchor="true"], [data-image-page-anchor="true"]'
  )
  if (imageElement instanceof HTMLElement) {
    const imagePos = resolveImageSelectionPosition(editor, imageElement)
    if (imagePos == null) {
      return
    }
    const imageNode = editor.state.doc.nodeAt(imagePos)
    if (imageNode?.type.name === 'image') {
      const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, imagePos))
      editor.view.dispatch(tr)
      editor.view.focus()
      return
    }
  }

  if (!target.closest('.ProseMirror')) {
    return
  }

  const { from, to } = editor.state.selection
  if (from !== to) {
    return
  }

  const coordsSelection = editor.view.posAtCoords({
    left: event.clientX,
    top: event.clientY
  })
  if (coordsSelection?.pos == null) {
    return
  }

  editor.chain().focus().setTextSelection(coordsSelection.pos).run()
}

export function buildContextMenuState(editor: TiptapEditor): DocumentContextMenuState {
  const imageSelection = getSelectedImageState(editor)
  const tableSelection = getSelectedTableState(editor)
  const { from, to } = editor.state.selection
  const hasTextSelection = from !== to

  return {
    kind: resolveContextMenuKind({
      hasTextSelection,
      imageSelection,
      tableSelection
    }),
    hasTextSelection,
    isLinkActive: editor.isActive('link'),
    linkHref: asNullableString(editor.getAttributes('link').href),
    imageSelection: imageSelection
      ? {
          pos: imageSelection.pos,
          nodeSize: imageSelection.nodeSize,
          attrs: imageSelection.attrs
        }
      : null,
    tableSelection: tableSelection
      ? {
          tablePos: tableSelection.tablePos
        }
      : null
  }
}

export interface UseDocumentContextMenuParams {
  activeEditor: TiptapEditor | null
}

export interface UseDocumentContextMenuResult {
  contextMenuState: DocumentContextMenuState
  handleContextMenuCapture: (event: ReactMouseEvent<HTMLElement>) => void
}

export function useDocumentContextMenu({ activeEditor }: UseDocumentContextMenuParams): UseDocumentContextMenuResult {
  const [contextMenuState, setContextMenuState] = useState<DocumentContextMenuState>(INITIAL_CONTEXT_MENU_STATE)

  const handleContextMenuCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!activeEditor) {
        setContextMenuState(INITIAL_CONTEXT_MENU_STATE)
        return
      }

      syncContextMenuSelection(activeEditor, event.nativeEvent)
      setContextMenuState(buildContextMenuState(activeEditor))
    },
    [activeEditor]
  )

  return {
    contextMenuState,
    handleContextMenuCapture
  }
}
