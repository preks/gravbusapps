import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { TableMap, columnResizingPluginKey } from '@tiptap/pm/tables'
import type { EditorView } from '@tiptap/pm/view'
import {
  getLinkedTableContext,
  getTableColumnIndex,
  type LinkedTableContext,
  type TableFragmentContext
} from './tableLinkedFragments'

const LINKED_TABLE_RESIZE_META = 'linkedTableResizeMirror'

interface LinkedTableResizePluginOptions {
  tableNodeName: string
  cellMinWidth: number
  defaultCellMinWidth: number
}

interface ResizePluginState {
  activeHandle: number
  dragging: { startX: number; startWidth: number } | false | null
}

interface LinkedTableColumnContext {
  linkedContext: LinkedTableContext
  sourceFragment: TableFragmentContext
  cellPos: number
  columnIndex: number
  columnWidthIndex: number
}

function resolveLinkedTableColumnContext(
  state: EditorState,
  tableNodeName: string,
  cellPos: number
): LinkedTableColumnContext | null {
  const $cell = state.doc.resolve(cellPos)
  const cellNode = state.doc.nodeAt(cellPos)
  if (!cellNode || (cellNode.type.name !== 'tableCell' && cellNode.type.name !== 'tableHeader')) {
    return null
  }

  for (let depth = $cell.depth; depth > 0; depth -= 1) {
    if ($cell.node(depth).type.name !== tableNodeName) continue

    const tablePos = $cell.before(depth)
    const linkedContext = getLinkedTableContext(state, tableNodeName, tablePos)
    if (!linkedContext || linkedContext.fragments.length < 2) {
      return null
    }

    const sourceFragment = linkedContext.fragments.find(fragment => fragment.tablePos === tablePos)
    if (!sourceFragment) {
      return null
    }

    const colspan = Number(cellNode.attrs.colspan ?? 1)
    const columnIndex = getTableColumnIndex(sourceFragment.map, sourceFragment.tableStart, cellPos, colspan)
    const columnWidthIndex =
      colspan === 1 ? 0 : columnIndex - sourceFragment.map.colCount(cellPos - sourceFragment.tableStart)

    return {
      linkedContext,
      sourceFragment,
      cellPos,
      columnIndex,
      columnWidthIndex
    }
  }

  return null
}

function readColumnWidth(node: ProseMirrorNode | null, widthIndex: number) {
  const width = node?.attrs?.colwidth?.[widthIndex]
  return typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null
}

function setColumnWidthOnFragment(tr: Transaction, fragment: TableFragmentContext, columnIndex: number, width: number) {
  const table = tr.doc.nodeAt(fragment.tablePos)
  if (!table) return false

  const map = TableMap.get(table)
  if (columnIndex < 0 || columnIndex >= map.width) {
    return false
  }

  const tableStart = fragment.tablePos + 1
  let changed = false

  for (let row = 0; row < map.height; row += 1) {
    const mapIndex = row * map.width + columnIndex
    if (row > 0 && map.map[mapIndex] === map.map[mapIndex - map.width]) {
      continue
    }

    const relativePos = map.map[mapIndex]
    const cellNode = table.nodeAt(relativePos)
    if (!cellNode) continue

    const colspan = Number(cellNode.attrs.colspan ?? 1)
    const widthIndex = colspan === 1 ? 0 : columnIndex - map.colCount(relativePos)
    const currentWidth = readColumnWidth(cellNode, widthIndex)
    if (currentWidth === width) {
      continue
    }

    const colwidth = Array.isArray(cellNode.attrs.colwidth)
      ? [...cellNode.attrs.colwidth]
      : Array.from({ length: colspan }, () => 0)

    colwidth[widthIndex] = width
    tr.setNodeMarkup(tableStart + relativePos, null, {
      ...cellNode.attrs,
      colwidth
    })
    changed = true
  }

  return changed
}

function mirrorColumnWidthAcrossLinkedFragments(tr: Transaction, context: LinkedTableColumnContext, width: number) {
  let changed = false

  for (const fragment of context.linkedContext.fragments) {
    if (fragment.tablePos === context.sourceFragment.tablePos) {
      continue
    }

    changed = setColumnWidthOnFragment(tr, fragment, context.columnIndex, width) || changed
  }

  return changed
}

function updateColumnsOnResize(
  node: ProseMirrorNode,
  colgroup: HTMLElement,
  table: HTMLTableElement,
  defaultCellMinWidth: number,
  overrideCol?: number,
  overrideValue?: number
) {
  let totalWidth = 0
  let fixedWidth = true
  let nextDOM: ChildNode | null = colgroup.firstChild
  const row = node.firstChild
  if (!row) return

  for (let i = 0, col = 0; i < row.childCount; i += 1) {
    const { colspan, colwidth } = row.child(i).attrs
    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth?.[j]
      const cssWidth = hasWidth ? `${hasWidth}px` : ''
      totalWidth += hasWidth || defaultCellMinWidth
      if (!hasWidth) {
        fixedWidth = false
      }

      if (!(nextDOM instanceof HTMLElement)) {
        const colElement = document.createElement('col')
        colElement.style.width = cssWidth
        colgroup.appendChild(colElement)
      } else {
        if (nextDOM.style.width !== cssWidth) {
          nextDOM.style.width = cssWidth
        }
        nextDOM = nextDOM.nextSibling
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling
    nextDOM.parentNode?.removeChild(nextDOM)
    nextDOM = after
  }

  if (fixedWidth) {
    table.style.width = `${totalWidth}px`
    table.style.minWidth = ''
    return
  }

  table.style.width = ''
  table.style.minWidth = `${totalWidth}px`
}

function resolveTableWrapper(view: EditorView, tablePos: number) {
  const nodeDom = view.nodeDOM(tablePos)
  if (!(nodeDom instanceof HTMLElement)) return null
  if (nodeDom.classList.contains('tableWrapper')) {
    return nodeDom
  }

  const wrapper = nodeDom.closest('.tableWrapper')
  return wrapper instanceof HTMLElement ? wrapper : null
}

function resolveTableElement(view: EditorView, tablePos: number) {
  return resolveTableWrapper(view, tablePos)?.querySelector('table') ?? null
}

function resolveResizeHandleCellPos(fragment: TableFragmentContext, columnIndex: number) {
  for (let row = 0; row < fragment.map.height; row += 1) {
    const mapIndex = columnIndex + row * fragment.map.width
    if (
      (columnIndex === fragment.map.width - 1 || fragment.map.map[mapIndex] !== fragment.map.map[mapIndex + 1]) &&
      (row === 0 || fragment.map.map[mapIndex] !== fragment.map.map[mapIndex - fragment.map.width])
    ) {
      return fragment.tableStart + fragment.map.map[mapIndex]
    }
  }

  return null
}

function resolveResizeHandleOffset(
  view: EditorView,
  fragment: TableFragmentContext,
  columnIndex: number,
  defaultCellMinWidth: number
) {
  const tableElement = resolveTableElement(view, fragment.tablePos)
  if (tableElement?.tagName !== 'TABLE') {
    return null
  }

  const handleCellPos = resolveResizeHandleCellPos(fragment, columnIndex)
  if (handleCellPos != null) {
    const cellDom = view.nodeDOM(handleCellPos)
    if (cellDom instanceof HTMLElement) {
      const tableRect = tableElement.getBoundingClientRect()
      const cellRect = cellDom.getBoundingClientRect()
      const handleOffset = cellRect.right - tableRect.left
      if (Number.isFinite(handleOffset) && handleOffset > 0) {
        return handleOffset
      }
    }
  }

  const colElements = Array.from(tableElement.querySelectorAll('colgroup > col'))
  let handleOffset = 0

  for (let colIndex = 0; colIndex <= columnIndex; colIndex += 1) {
    const colElement = colElements[colIndex]
    const widthValue = colElement instanceof HTMLElement ? colElement.style.width : ''
    const parsedWidth = Number.parseFloat(widthValue)
    handleOffset += Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : defaultCellMinWidth
  }

  return handleOffset > 0 ? handleOffset : null
}

class LinkedTableResizeView {
  private readonly decoratedWrappers = new Set<HTMLElement>()

  private pendingMirrorHandle: number | null = null

  constructor(
    private view: EditorView,
    private readonly options: LinkedTableResizePluginOptions
  ) {
    const ownerDocument = this.view.dom.ownerDocument
    ownerDocument.addEventListener('mousemove', this.handleDocumentMouseMove)
    ownerDocument.addEventListener('mouseup', this.handleDocumentMouseUp)
    this.syncDomState()
  }

  update(view: EditorView) {
    this.view = view
    this.syncDomState()
  }

  destroy() {
    const ownerDocument = this.view.dom.ownerDocument
    ownerDocument.removeEventListener('mousemove', this.handleDocumentMouseMove)
    ownerDocument.removeEventListener('mouseup', this.handleDocumentMouseUp)
    this.clearDomState()
  }

  private handleDocumentMouseMove = (event: MouseEvent) => {
    const resizeState = columnResizingPluginKey.getState(this.view.state) as ResizePluginState | undefined
    if (!resizeState?.dragging || resizeState.activeHandle < 0) return

    const context = resolveLinkedTableColumnContext(
      this.view.state,
      this.options.tableNodeName,
      resizeState.activeHandle
    )
    if (!context) return

    const width = Math.max(
      this.options.cellMinWidth,
      resizeState.dragging.startWidth + event.clientX - resizeState.dragging.startX
    )

    for (const fragment of context.linkedContext.fragments) {
      if (fragment.tablePos === context.sourceFragment.tablePos) {
        continue
      }

      const tableNode = this.view.state.doc.nodeAt(fragment.tablePos)
      const tableElement = resolveTableElement(this.view, fragment.tablePos)
      const colgroup = tableElement?.querySelector('colgroup')
      if (!tableNode || tableElement?.tagName !== 'TABLE' || !(colgroup instanceof Element)) {
        continue
      }

      updateColumnsOnResize(
        tableNode,
        colgroup as HTMLElement,
        tableElement as HTMLTableElement,
        this.options.defaultCellMinWidth,
        context.columnIndex,
        width
      )
    }

    this.syncDomState()
  }

  private handleDocumentMouseUp = () => {
    const resizeState = columnResizingPluginKey.getState(this.view.state) as ResizePluginState | undefined
    const activeHandle =
      resizeState?.activeHandle != null && resizeState.activeHandle > -1
        ? resizeState.activeHandle
        : (this.pendingMirrorHandle ?? -1)

    if ((resizeState?.dragging || this.pendingMirrorHandle != null) && activeHandle > -1) {
      queueMicrotask(() => {
        this.mirrorCommittedWidth(activeHandle)
      })
    }

    this.pendingMirrorHandle = null
    this.syncDomState()
  }

  private syncDomState() {
    this.clearDomState()

    const resizeState = columnResizingPluginKey.getState(this.view.state) as ResizePluginState | undefined
    const activeContext =
      resizeState?.activeHandle != null && resizeState.activeHandle > -1
        ? resolveLinkedTableColumnContext(this.view.state, this.options.tableNodeName, resizeState.activeHandle)
        : null

    if (resizeState?.dragging && resizeState.activeHandle > -1) {
      this.pendingMirrorHandle = resizeState.activeHandle
    }

    if (activeContext?.linkedContext.fragments.length) {
      this.decorateFragments(activeContext.linkedContext.fragments, {
        resizeActive: true,
        resizeDragging: Boolean(resizeState?.dragging),
        sourceTablePos: activeContext.sourceFragment.tablePos,
        columnIndex: activeContext.columnIndex
      })
    }
  }

  private decorateFragments(
    fragments: TableFragmentContext[],
    state: { resizeActive?: boolean; resizeDragging?: boolean; sourceTablePos?: number; columnIndex?: number }
  ) {
    for (const fragment of fragments) {
      const wrapper = resolveTableWrapper(this.view, fragment.tablePos)
      if (!wrapper) continue

      if (state.resizeActive) {
        wrapper.dataset.linkedTableResizeActive = 'true'
      }
      if (state.resizeDragging) {
        wrapper.dataset.linkedTableResizeDragging = 'true'
      }
      if (state.sourceTablePos === fragment.tablePos) {
        wrapper.dataset.linkedTableResizeSource = 'true'
      }
      if (typeof state.columnIndex === 'number') {
        const handleOffset = resolveResizeHandleOffset(
          this.view,
          fragment,
          state.columnIndex,
          this.options.defaultCellMinWidth
        )
        if (handleOffset != null) {
          wrapper.style.setProperty('--linked-table-resize-handle-left', `${handleOffset}px`)
        }
      }
      this.decoratedWrappers.add(wrapper)
    }
  }

  private mirrorCommittedWidth(activeHandle: number) {
    const context = resolveLinkedTableColumnContext(this.view.state, this.options.tableNodeName, activeHandle)
    if (!context) return

    const width = readColumnWidth(this.view.state.doc.nodeAt(context.cellPos), context.columnWidthIndex)
    if (width == null) return

    const tr = this.view.state.tr
    if (!mirrorColumnWidthAcrossLinkedFragments(tr, context, width)) {
      return
    }

    tr.setMeta(LINKED_TABLE_RESIZE_META, true)
    this.view.dispatch(tr)
  }

  private clearDomState() {
    for (const wrapper of this.decoratedWrappers) {
      delete wrapper.dataset.linkedTableResizeActive
      delete wrapper.dataset.linkedTableResizeDragging
      delete wrapper.dataset.linkedTableResizeSource
      wrapper.style.removeProperty('--linked-table-resize-handle-left')
    }
    this.decoratedWrappers.clear()
  }
}

export function createLinkedTableResizePlugin(options: LinkedTableResizePluginOptions) {
  return new Plugin({
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some(transaction => transaction.docChanged)) {
        return null
      }

      if (transactions.some(transaction => transaction.getMeta(LINKED_TABLE_RESIZE_META))) {
        return null
      }

      const oldResizeState = columnResizingPluginKey.getState(oldState) as ResizePluginState | undefined
      const newResizeState = columnResizingPluginKey.getState(newState) as ResizePluginState | undefined
      const activeHandle =
        newResizeState?.activeHandle != null && newResizeState.activeHandle > -1
          ? newResizeState.activeHandle
          : (oldResizeState?.activeHandle ?? -1)

      if (activeHandle < 0) {
        return null
      }

      const context = resolveLinkedTableColumnContext(newState, options.tableNodeName, activeHandle)
      if (!context) {
        return null
      }

      const previousWidth = readColumnWidth(oldState.doc.nodeAt(activeHandle), context.columnWidthIndex)
      const nextWidth = readColumnWidth(newState.doc.nodeAt(context.cellPos), context.columnWidthIndex)
      if (nextWidth == null || nextWidth === previousWidth) {
        return null
      }

      const tr = newState.tr
      if (!mirrorColumnWidthAcrossLinkedFragments(tr, context, nextWidth)) {
        return null
      }

      tr.setMeta(LINKED_TABLE_RESIZE_META, true)
      return tr
    },
    view: editorView => new LinkedTableResizeView(editorView, options)
  })
}
