// Word-like default sizing for newly inserted tables.

import type { Editor } from '@tiptap/core'
import { seedCurrentTableColumnsEvenlyInEditor } from '@/components/tiptap-extensions/tiptap-custom-tables/tableColumnLayoutUtils'
import type { PageLayoutPaginationConfig } from './pageLayoutUtils'
import { resolveEffectiveAvailableWidthPx } from './initialInsertedImageLayout'

interface InsertWordLikeTableOptions {
  editor: Editor
  paginationConfig: PageLayoutPaginationConfig | null
  rows: number
  cols: number
  withHeaderRow: boolean
  tableNodeName?: string
  minCellWidth?: number
}

export function insertWordLikeTable(options: InsertWordLikeTableOptions) {
  const insertPos = options.editor.state.selection.from
  const availableWidthPx = resolveEffectiveAvailableWidthPx({
    paginationConfig: options.paginationConfig,
    editor: options.editor,
    insertPos
  })

  const inserted = options.editor
    .chain()
    .focus()
    .insertTable({
      rows: options.rows,
      cols: options.cols,
      withHeaderRow: options.withHeaderRow
    })
    .run()

  if (!inserted) {
    return false
  }

  return seedCurrentTableColumnsEvenlyInEditor(
    options.editor,
    options.tableNodeName ?? 'table',
    availableWidthPx,
    options.minCellWidth ?? 25
  )
}
