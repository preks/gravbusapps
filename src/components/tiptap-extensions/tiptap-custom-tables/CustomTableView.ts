import { TableView as TiptapTableView } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  getTableStyle,
  getTableWrapperStyle,
  normalizeTableAlign,
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
