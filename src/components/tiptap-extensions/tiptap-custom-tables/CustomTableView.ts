import { TableView as TiptapTableView } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { v4 as uuid } from 'uuid'
import {
  getNormalizedTableSurfaceStyleAttributes,
  getTableStyle,
  getTableSurfaceStyle,
  getTableWrapperStyle,
  normalizeTableAlign,
  normalizeTableTheme,
  normalizeTableWidth,
  normalizeTableWidthMode
} from './styleUtils'
import { readResolvedTableColumnWidths } from './tableColumnLayoutUtils'

function resolveTableDomId(node: ProseMirrorNode): string {
  const fromId = typeof node.attrs.id === 'string' && node.attrs.id.length > 0 ? node.attrs.id : null
  const legacy = typeof node.attrs.tableId === 'string' && node.attrs.tableId.length > 0 ? node.attrs.tableId : null
  return fromId ?? legacy ?? uuid()
}

export class CustomTableView extends TiptapTableView {
  private applyIdentity(node: ProseMirrorNode) {
    const tableId = resolveTableDomId(node)

    this.dom.dataset.tableId = tableId
    this.table.dataset.tableId = tableId
    this.dom.setAttribute('data-id', tableId)
    this.table.setAttribute('data-id', tableId)
    this.dom.setAttribute('data-table-id', tableId)
    this.table.setAttribute('data-table-id', tableId)
  }

  applyLayout(node: ProseMirrorNode) {
    this.applyIdentity(node)

    const explicitWidth = normalizeTableWidth(node.attrs.tableWidth)
    const align = normalizeTableAlign(node.attrs.tableAlign) ?? 'left'
    const mode = normalizeTableWidthMode(node.attrs.tableWidthMode) ?? 'manual'
    const surfaceStyle = getTableSurfaceStyle(getNormalizedTableSurfaceStyleAttributes(node.attrs))
    const usesDerivedColumnWidth = mode === 'manual' && readResolvedTableColumnWidths(node) != null
    const renderedWidth = usesDerivedColumnWidth ? null : (explicitWidth ?? '100%')

    this.dom.style.cssText = getTableWrapperStyle(renderedWidth, align, mode)
    this.dom.dataset.tableWidth = explicitWidth ?? ''
    this.dom.dataset.tableAlign = align
    this.dom.dataset.tableWidthMode = mode

    const tableStyle = [getTableStyle(renderedWidth, align, mode), surfaceStyle].filter(Boolean).join('; ')
    this.table.style.cssText = tableStyle
    this.table.dataset.tableWidth = explicitWidth ?? ''
    this.table.dataset.tableAlign = align
    this.table.dataset.tableWidthMode = mode
    this.table.dataset.tableBorderHidden = node.attrs.tableBorderHidden === true ? 'true' : 'false'
    this.table.dataset.tableBackgroundColor =
      typeof node.attrs.tableBackgroundColor === 'string' ? node.attrs.tableBackgroundColor : ''
    this.table.dataset.tableBorderStyle =
      typeof node.attrs.tableBorderStyle === 'string' ? node.attrs.tableBorderStyle : ''
    this.table.dataset.tableBorderWidth =
      typeof node.attrs.tableBorderWidth === 'string' ? node.attrs.tableBorderWidth : ''
    this.table.dataset.tableBorderColor =
      typeof node.attrs.tableBorderColor === 'string' ? node.attrs.tableBorderColor : ''
    this.table.dataset.tableBorderRadius =
      typeof node.attrs.tableBorderRadius === 'string' ? node.attrs.tableBorderRadius : ''
    this.table.dataset.tableTheme = normalizeTableTheme(node.attrs.tableTheme) ?? 'blue'
    this.table.dataset.tableStyleHeaderRow = node.attrs.styleHeaderRow === false ? 'false' : 'true'
    this.table.dataset.tableStyleFirstColumn = node.attrs.styleFirstColumn === true ? 'true' : 'false'
    this.table.dataset.tableStyleLastColumn = node.attrs.styleLastColumn === true ? 'true' : 'false'
    this.table.dataset.tableStyleBandedRows = node.attrs.styleBandedRows === true ? 'true' : 'false'
    this.table.dataset.tableStyleBandedColumns = node.attrs.styleBandedColumns === true ? 'true' : 'false'
  }

  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth)
    this.dedupeNestedWrappers()
    this.applyLayout(node)
  }

  update(node: ProseMirrorNode) {
    const updated = super.update(node)
    if (!updated) return false

    this.applyLayout(node)
    return true
  }

  private dedupeNestedWrappers() {
    // If pasted content already contained a wrapper, avoid nested wrappers by hoisting the table up.
    const nestedWrapper = this.dom.querySelector(':scope > .tableWrapper')
    if (nestedWrapper instanceof HTMLElement) {
      while (nestedWrapper.firstChild) {
        this.dom.appendChild(nestedWrapper.firstChild)
      }
      nestedWrapper.remove()
    }
  }
}
