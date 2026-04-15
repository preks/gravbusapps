// Column-driven table layout helpers for Word-like sizing behavior.

import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { normalizeTableWidth, normalizeTableWidthMode } from './styleUtils'

const PX_PER_CM = 96 / 2.54
const PX_PER_MM = 96 / 25.4
const PX_PER_IN = 96
const PX_PER_PT = 96 / 72

function normalizePositivePixelWidth(width: number, minCellWidth: number) {
  return Math.max(1, Math.max(minCellWidth, Math.round(width)))
}

function areWidthArraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return false
  }

  return a.every((width, index) => width === b[index])
}

export function findParentTable(
  state: EditorState,
  tableNodeName: string
): { node: ProseMirrorNode; pos: number } | null {
  const { $from } = state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === tableNodeName) {
      return {
        node,
        pos: $from.before(depth)
      }
    }
  }

  return null
}

export function isManualTableWidthMode(table: ProseMirrorNode) {
  return (normalizeTableWidthMode(table.attrs.tableWidthMode as string | null) ?? 'manual') === 'manual'
}

export function parseTableWidthToPx(width: string | null | undefined, relativeWidthPx?: number | null): number | null {
  const normalized = normalizeTableWidth(width)
  if (!normalized) {
    return null
  }

  const numeric = Number.parseFloat(normalized.replace(',', '.'))
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }

  if (/cm$/i.test(normalized)) return Math.round(numeric * PX_PER_CM)
  if (/mm$/i.test(normalized)) return Math.round(numeric * PX_PER_MM)
  if (/in$/i.test(normalized)) return Math.round(numeric * PX_PER_IN)
  if (/pt$/i.test(normalized)) return Math.round(numeric * PX_PER_PT)
  if (/px$/i.test(normalized)) return Math.round(numeric)
  if (/^\d+(\.\d+)?%$/i.test(normalized)) {
    if (relativeWidthPx == null || !Number.isFinite(relativeWidthPx) || relativeWidthPx <= 0) {
      return null
    }

    return Math.round((relativeWidthPx * numeric) / 100)
  }

  return null
}

export function distributeColumnWidthsEvenly(
  totalWidthPx: number,
  columnCount: number,
  minCellWidth: number
): number[] {
  if (!Number.isFinite(totalWidthPx) || columnCount <= 0) {
    return []
  }

  const normalizedMinWidth = normalizePositivePixelWidth(minCellWidth, 1)
  const minimumTotalWidth = normalizedMinWidth * columnCount
  const targetTotalWidth = Math.max(minimumTotalWidth, Math.round(totalWidthPx))
  const baseWidth = Math.floor(targetTotalWidth / columnCount)
  const widths = Array.from({ length: columnCount }, () => Math.max(normalizedMinWidth, baseWidth))

  let remainingWidth = targetTotalWidth - widths.reduce((sum, width) => sum + width, 0)
  let index = 0

  while (remainingWidth > 0) {
    widths[index % columnCount] += 1
    remainingWidth -= 1
    index += 1
  }

  return widths
}

export function readResolvedTableColumnWidths(table: ProseMirrorNode): number[] | null {
  const map = TableMap.get(table)
  const resolvedWidths: Array<number | null> = Array.from({ length: map.width }, () => null)
  const visitedCells = new Set<number>()

  for (const relativePos of map.map) {
    if (visitedCells.has(relativePos)) {
      continue
    }

    visitedCells.add(relativePos)

    const cellNode = table.nodeAt(relativePos)
    if (!cellNode) {
      continue
    }

    const colspan = Number(cellNode.attrs.colspan ?? 1)
    const startColumnIndex = map.colCount(relativePos)
    const colwidth = Array.isArray(cellNode.attrs.colwidth) ? cellNode.attrs.colwidth : null

    if (!colwidth) {
      continue
    }

    for (let index = 0; index < colspan; index += 1) {
      const width = colwidth[index]
      if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
        continue
      }

      if (resolvedWidths[startColumnIndex + index] == null) {
        resolvedWidths[startColumnIndex + index] = Math.round(width)
      }
    }
  }

  return resolvedWidths.every((width): width is number => width != null && width > 0) ? resolvedWidths : null
}

export function tableNeedsColumnWidthMigration(table: ProseMirrorNode) {
  return isManualTableWidthMode(table) && readResolvedTableColumnWidths(table) == null
}

export function applyTableColumnWidths(
  tr: Transaction,
  tablePos: number,
  tableNodeName: string,
  widths: number[],
  options: { clearLegacyTableWidth?: boolean } = {}
) {
  const table = tr.doc.nodeAt(tablePos)
  if (table?.type.name !== tableNodeName) {
    return false
  }

  const map = TableMap.get(table)
  if (map.width !== widths.length) {
    return false
  }

  let changed = false
  const tableStart = tablePos + 1
  const normalizedWidths = widths.map(width => normalizePositivePixelWidth(width, 1))

  if (options.clearLegacyTableWidth && normalizeTableWidth(table.attrs.tableWidth as string | null)) {
    tr.setNodeMarkup(tablePos, table.type, {
      ...table.attrs,
      tableWidth: null
    })
    changed = true
  }

  const visitedCells = new Set<number>()

  for (const relativePos of map.map) {
    if (visitedCells.has(relativePos)) {
      continue
    }

    visitedCells.add(relativePos)

    const cellNode = table.nodeAt(relativePos)
    if (!cellNode) {
      continue
    }

    const colspan = Number(cellNode.attrs.colspan ?? 1)
    const startColumnIndex = map.colCount(relativePos)
    const nextColwidth = normalizedWidths.slice(startColumnIndex, startColumnIndex + colspan)
    const currentColwidth = Array.isArray(cellNode.attrs.colwidth)
      ? cellNode.attrs.colwidth.filter((width): width is number => typeof width === 'number')
      : []

    if (areWidthArraysEqual(currentColwidth, nextColwidth)) {
      continue
    }

    tr.setNodeMarkup(tableStart + relativePos, null, {
      ...cellNode.attrs,
      colwidth: nextColwidth
    })
    changed = true
  }

  return changed
}

export function seedTableColumnsEvenly(
  tr: Transaction,
  tablePos: number,
  tableNodeName: string,
  totalWidthPx: number,
  minCellWidth: number,
  options: { clearLegacyTableWidth?: boolean } = {}
) {
  const table = tr.doc.nodeAt(tablePos)
  if (table?.type.name !== tableNodeName) {
    return false
  }

  const map = TableMap.get(table)
  const widths = distributeColumnWidthsEvenly(totalWidthPx, map.width, minCellWidth)
  if (!widths.length) {
    return false
  }

  return applyTableColumnWidths(tr, tablePos, tableNodeName, widths, options)
}

export function seedCurrentTableColumnsEvenlyInEditor(
  editor: Editor,
  tableNodeName: string,
  totalWidthPx: number,
  minCellWidth: number
) {
  const currentTable = findParentTable(editor.state, tableNodeName)
  if (!currentTable) {
    return false
  }

  const tr = editor.state.tr
  const changed = seedTableColumnsEvenly(tr, currentTable.pos, tableNodeName, totalWidthPx, minCellWidth, {
    clearLegacyTableWidth: true
  })

  if (!changed) {
    return false
  }

  editor.view.dispatch(tr)
  return true
}
