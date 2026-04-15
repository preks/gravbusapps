// Migrates legacy manual table widths into explicit column widths.

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import {
  applyTableColumnWidths,
  parseTableWidthToPx,
  readResolvedTableColumnWidths,
  seedTableColumnsEvenly,
  tableNeedsColumnWidthMigration
} from './tableColumnLayoutUtils'

const TABLE_COLUMN_WIDTH_MIGRATION_META = 'tableColumnWidthMigration'

interface TableColumnWidthMigrationPluginOptions {
  tableNodeName: string
  cellMinWidth: number
  defaultTableWidth: string
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

function resolveMeasuredWidth(tableElement: HTMLTableElement | null) {
  if (!tableElement) {
    return null
  }

  const rectWidth = tableElement.getBoundingClientRect().width
  if (Number.isFinite(rectWidth) && rectWidth > 0) {
    return Math.round(rectWidth)
  }

  const offsetWidth = tableElement.offsetWidth
  if (Number.isFinite(offsetWidth) && offsetWidth > 0) {
    return Math.round(offsetWidth)
  }

  const clientWidth = tableElement.clientWidth
  return Number.isFinite(clientWidth) && clientWidth > 0 ? Math.round(clientWidth) : null
}

function resolveRelativeWidthPx(view: EditorView, tablePos: number) {
  const wrapper = resolveTableWrapper(view, tablePos)
  const candidates = [wrapper?.parentElement, wrapper, view.dom as HTMLElement, view.dom.parentElement].filter(
    (candidate): candidate is HTMLElement => candidate instanceof HTMLElement
  )

  for (const candidate of candidates) {
    const width = candidate.clientWidth
    if (Number.isFinite(width) && width > 0) {
      return Math.round(width)
    }
  }

  return null
}

function resolveTargetTableWidthPx(
  view: EditorView,
  table: ProseMirrorNode,
  tablePos: number,
  defaultTableWidth: string
) {
  const measuredWidth = resolveMeasuredWidth(resolveTableElement(view, tablePos))
  if (measuredWidth != null) {
    return measuredWidth
  }

  const relativeWidthPx = resolveRelativeWidthPx(view, tablePos)
  return parseTableWidthToPx((table.attrs.tableWidth as string | null) ?? defaultTableWidth, relativeWidthPx)
}

class TableColumnWidthMigrationView {
  private isMigrationScheduled = false

  private isDestroyed = false

  constructor(
    private view: EditorView,
    private readonly options: TableColumnWidthMigrationPluginOptions
  ) {
    this.scheduleMigration()
  }

  update(view: EditorView) {
    this.view = view
    this.scheduleMigration()
  }

  destroy() {
    this.isDestroyed = true
  }

  private scheduleMigration() {
    if (this.isMigrationScheduled || this.isDestroyed) {
      return
    }

    this.isMigrationScheduled = true
    queueMicrotask(() => {
      this.isMigrationScheduled = false
      if (this.isDestroyed) {
        return
      }

      this.migrateLegacyLayouts()
    })
  }

  private migrateLegacyLayouts() {
    const tr = this.view.state.tr
    let changed = false

    this.view.state.doc.descendants((node, pos) => {
      if (node.type.name !== this.options.tableNodeName) {
        return true
      }

      const resolvedColumnWidths = readResolvedTableColumnWidths(node)
      if (resolvedColumnWidths) {
        changed =
          applyTableColumnWidths(tr, pos, this.options.tableNodeName, resolvedColumnWidths, {
            clearLegacyTableWidth: true
          }) || changed
        return false
      }

      if (!tableNeedsColumnWidthMigration(node)) {
        return false
      }

      const measuredWidth = resolveTargetTableWidthPx(this.view, node, pos, this.options.defaultTableWidth)
      if (measuredWidth == null || measuredWidth <= 0) {
        return false
      }

      changed =
        seedTableColumnsEvenly(tr, pos, this.options.tableNodeName, measuredWidth, this.options.cellMinWidth, {
          clearLegacyTableWidth: true
        }) || changed

      return false
    })

    if (!changed) {
      return
    }

    tr.setMeta(TABLE_COLUMN_WIDTH_MIGRATION_META, true)
    this.view.dispatch(tr)
  }
}

export function createTableColumnWidthMigrationPlugin(options: TableColumnWidthMigrationPluginOptions) {
  return new Plugin({
    view: editorView => new TableColumnWidthMigrationView(editorView, options)
  })
}
