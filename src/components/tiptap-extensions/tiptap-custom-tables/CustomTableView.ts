import { TableView as TiptapTableView } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  getTableStyle,
  getTableWrapperStyle,
  normalizeTableAlign,
  normalizeTableTheme,
  normalizeTableWidth,
  normalizeTableWidthMode
} from './styleUtils'

export class CustomTableView extends TiptapTableView {
  applyLayout(node: ProseMirrorNode) {
    const width = normalizeTableWidth(node.attrs.tableWidth) ?? '100%'
    const align = normalizeTableAlign(node.attrs.tableAlign) ?? 'left'
    const mode = normalizeTableWidthMode(node.attrs.tableWidthMode) ?? 'manual'

    this.dom.style.cssText = getTableWrapperStyle(width, align, mode)
    this.dom.dataset.tableWidth = width
    this.dom.dataset.tableAlign = align
    this.dom.dataset.tableWidthMode = mode

    const tableStyle = getTableStyle(width, align, mode)
    this.table.style.cssText = tableStyle
    this.table.dataset.tableWidth = width
    this.table.dataset.tableAlign = align
    this.table.dataset.tableWidthMode = mode
    this.table.dataset.tableBorderHidden = node.attrs.tableBorderHidden === true ? 'true' : 'false'
    this.table.dataset.tableTheme = normalizeTableTheme(node.attrs.tableTheme) ?? 'blue'
    this.table.dataset.tableStyleHeaderRow = node.attrs.styleHeaderRow === false ? 'false' : 'true'
    this.table.dataset.tableStyleFirstColumn = node.attrs.styleFirstColumn === true ? 'true' : 'false'
    this.table.dataset.tableStyleLastColumn = node.attrs.styleLastColumn === true ? 'true' : 'false'
    this.table.dataset.tableStyleBandedRows = node.attrs.styleBandedRows === true ? 'true' : 'false'
    this.table.dataset.tableStyleBandedColumns = node.attrs.styleBandedColumns === true ? 'true' : 'false'
  }

  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth)
    this.applyLayout(node)
  }

  update(node: ProseMirrorNode) {
    const updated = super.update(node)
    if (!updated) return false

    this.applyLayout(node)
    return true
  }
}
