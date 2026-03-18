import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { NodeView, ViewMutationRecord } from '@tiptap/pm/view'
import {
  getColStyleDeclaration,
  getTableStyle,
  normalizeTableAlign,
  normalizeTableWidth,
  normalizeTableWidthMode
} from './styleUtils'

function updateColumns(
  node: ProseMirrorNode,
  colgroup: HTMLTableColGroupElement,
  table: HTMLTableElement,
  cellMinWidth: number
) {
  let totalWidth = 0
  let fixedWidth = true
  let nextDOM = colgroup.firstChild
  const row = node.firstChild

  if (row !== null) {
    for (let cellIndex = 0, colIndex = 0; cellIndex < row.childCount; cellIndex += 1) {
      const { colspan, colwidth } = row.child(cellIndex).attrs

      for (let spanIndex = 0; spanIndex < colspan; spanIndex += 1, colIndex += 1) {
        const rawColWidth = colwidth?.[spanIndex]
        const width = typeof rawColWidth === 'number' ? rawColWidth : undefined
        const cssWidth = width ? `${width}px` : ''

        totalWidth += width || cellMinWidth

        if (!width) {
          fixedWidth = false
        }

        if (nextDOM) {
          if ((nextDOM as HTMLTableColElement).style.width !== cssWidth) {
            const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, width)
            ;(nextDOM as HTMLTableColElement).style.setProperty(propertyKey, propertyValue)
          }

          nextDOM = nextDOM.nextSibling
        } else {
          const colElement = document.createElement('col')
          const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, width)
          colElement.style.setProperty(propertyKey, propertyValue)
          colgroup.appendChild(colElement)
        }
      }
    }
  }

  while (nextDOM) {
    const nextSibling = nextDOM.nextSibling
    nextDOM.remove()
    nextDOM = nextSibling
  }

  if (fixedWidth) {
    table.style.width = `${totalWidth}px`
    table.style.minWidth = ''
  } else {
    table.style.width = ''
    table.style.minWidth = `${totalWidth}px`
  }
}

export class CustomTableView implements NodeView {
  node: ProseMirrorNode

  cellMinWidth: number

  dom: HTMLTableElement

  table: HTMLTableElement

  colgroup: HTMLTableColGroupElement

  contentDOM: HTMLTableSectionElement

  applyLayout(node: ProseMirrorNode) {
    const width = normalizeTableWidth(node.attrs.tableWidth) ?? '100%'
    const align = normalizeTableAlign(node.attrs.tableAlign) ?? 'left'
    const mode = normalizeTableWidthMode(node.attrs.tableWidthMode) ?? 'manual'

    const tableStyle = getTableStyle(width, align, mode)
    this.dom.style.cssText = tableStyle
    this.dom.dataset.tableWidth = width
    this.dom.dataset.tableAlign = align
    this.dom.dataset.tableWidthMode = mode
  }

  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    this.node = node
    this.cellMinWidth = cellMinWidth
    this.dom = document.createElement('table')
    this.dom.className = 'editor-table'
    this.table = this.dom
    this.colgroup = this.table.appendChild(document.createElement('colgroup'))
    this.contentDOM = this.table.appendChild(document.createElement('tbody'))
    updateColumns(node, this.colgroup, this.table, cellMinWidth)
    this.applyLayout(node)
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false

    this.node = node
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth)
    this.applyLayout(node)
    return true
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    const { target } = mutation
    const isInsideTable = this.dom.contains(target)
    const isInsideContent = this.contentDOM.contains(target)

    if (isInsideTable && !isInsideContent) {
      if (mutation.type === 'attributes' || mutation.type === 'childList' || mutation.type === 'characterData') {
        return true
      }
    }

    return false
  }
}
