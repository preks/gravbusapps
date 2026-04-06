import { useCallback, useMemo } from 'react'
import type { Editor } from '@tiptap/react'
import { TableMap } from '@tiptap/pm/tables'
import {
  normalizeBorderStyle,
  normalizeColorValue,
  normalizeCssLength,
  normalizeTableTheme,
  normalizeTableWidth,
  normalizeTableWidthMode
} from '@/components/tiptap-extensions/tiptap-custom-tables/styleUtils'
import {
  DEFAULT_TABLE_CELL_BORDER_COLOR,
  type SetTableStyleOptions,
  type TableBorderStyle,
  type TableTheme,
  type TableWidthMode
} from '@/components/tiptap-extensions/tiptap-custom-tables/types'
import {
  getSelectedTableRectContext,
  type TableBorderPreset
} from '@/components/tiptap-extensions/tiptap-custom-tables/tableFormattingUtils'

interface UseTableSidebarActionsProps {
  editor: Editor | null
  tablePos: number | null
}

type TableSidebarCanCommands = ReturnType<Editor['can']> & {
  duplicateRow: () => boolean
  duplicateColumn: () => boolean
  setTableLayout: (options: { width?: string; align?: 'left' | 'center' | 'right'; mode?: TableWidthMode }) => boolean
  setTableTheme: (theme: TableTheme) => boolean
  setTableStyleOptions: (options: SetTableStyleOptions) => boolean
  setSelectedRowHeight: (height: string | null) => boolean
  setSelectedColumnWidth: (width: string | null) => boolean
  distributeRowsEvenly: (height: string) => boolean
  distributeColumnsEvenly: (width: string) => boolean
  applyTableBorderPreset: (options: {
    preset: TableBorderPreset
    style?: TableBorderStyle | null
    width?: string | null
    color?: string | null
  }) => boolean
}

type TableSidebarChain = ReturnType<Editor['chain']> & {
  duplicateRow: () => TableSidebarChain
  duplicateColumn: () => TableSidebarChain
  setTableWidthMode: (mode: TableWidthMode) => TableSidebarChain
  setTableLayout: (options: {
    width?: string
    align?: 'left' | 'center' | 'right'
    mode?: TableWidthMode
  }) => TableSidebarChain
  setTableAlign: (align: 'left' | 'center' | 'right') => TableSidebarChain
  setTableTheme: (theme: TableTheme) => TableSidebarChain
  setTableStyleOptions: (options: SetTableStyleOptions) => TableSidebarChain
  setSelectedRowHeight: (height: string | null) => TableSidebarChain
  setSelectedColumnWidth: (width: string | null) => TableSidebarChain
  distributeRowsEvenly: (height: string) => TableSidebarChain
  distributeColumnsEvenly: (width: string) => TableSidebarChain
  applyTableBorderPreset: (options: {
    preset: TableBorderPreset
    style?: TableBorderStyle | null
    width?: string | null
    color?: string | null
  }) => TableSidebarChain
}

function getCurrentCellAttributes(editor: Editor) {
  const tableCellAttrs = editor.getAttributes('tableCell')
  const tableHeaderAttrs = editor.getAttributes('tableHeader')

  return {
    ...tableHeaderAttrs,
    ...tableCellAttrs
  }
}

export function useTableSidebarActions({ editor, tablePos }: Readonly<UseTableSidebarActionsProps>) {
  const canCommands = (editor?.can() as TableSidebarCanCommands | undefined) ?? null
  const runTableChain = useCallback(() => {
    if (!editor) return null
    return editor.chain().focus() as TableSidebarChain
  }, [editor])

  const tableAttrs = editor?.getAttributes('table') ?? {}
  const rowAttrs = editor?.getAttributes('tableRow') ?? {}
  const cellAttrs = editor ? getCurrentCellAttributes(editor) : {}

  const selectedRect = useMemo(
    () => (editor ? getSelectedTableRectContext(editor.state, 'table') : null),
    [editor, tablePos, editor?.state]
  )
  const tableNode = useMemo(
    () => (editor && tablePos != null ? editor.state.doc.nodeAt(tablePos) : null),
    [editor, tablePos, editor?.state]
  )
  const tableMap = useMemo(() => (tableNode?.type.name === 'table' ? TableMap.get(tableNode) : null), [tableNode])

  const selectionMetrics = useMemo(
    () => ({
      rowCount: selectedRect ? selectedRect.rect.bottom - selectedRect.rect.top : 0,
      columnCount: selectedRect ? selectedRect.rect.right - selectedRect.rect.left : 0,
      totalRows: tableMap?.height ?? 0,
      totalColumns: tableMap?.width ?? 0
    }),
    [selectedRect, tableMap]
  )
  const hasSelectedTable = selectedRect != null && editor != null && tablePos != null

  const values = useMemo(() => {
    const colwidth = Array.isArray(cellAttrs.colwidth) ? cellAttrs.colwidth[0] : null
    const borderColor =
      normalizeColorValue(cellAttrs.borderTopColor as string | null) ??
      normalizeColorValue(cellAttrs.borderRightColor as string | null) ??
      normalizeColorValue(cellAttrs.borderBottomColor as string | null) ??
      normalizeColorValue(cellAttrs.borderLeftColor as string | null) ??
      normalizeColorValue(cellAttrs.borderColor as string | null) ??
      DEFAULT_TABLE_CELL_BORDER_COLOR

    const borderStyle =
      normalizeBorderStyle(cellAttrs.borderTopStyle as string | null) ??
      normalizeBorderStyle(cellAttrs.borderRightStyle as string | null) ??
      normalizeBorderStyle(cellAttrs.borderBottomStyle as string | null) ??
      normalizeBorderStyle(cellAttrs.borderLeftStyle as string | null) ??
      'solid'

    const borderWidth =
      normalizeCssLength(cellAttrs.borderTopWidth as string | null) ??
      normalizeCssLength(cellAttrs.borderRightWidth as string | null) ??
      normalizeCssLength(cellAttrs.borderBottomWidth as string | null) ??
      normalizeCssLength(cellAttrs.borderLeftWidth as string | null) ??
      '1pt'

    return {
      tableWidth: normalizeTableWidth(tableAttrs.tableWidth as string | null) ?? '100%',
      tableWidthMode: normalizeTableWidthMode(tableAttrs.tableWidthMode as string | null) ?? 'manual',
      tableAlign: (tableAttrs.tableAlign as 'left' | 'center' | 'right' | undefined) ?? 'left',
      tableTheme: normalizeTableTheme(tableAttrs.tableTheme as string | null) ?? 'blue',
      tableBackgroundColor: normalizeColorValue(tableAttrs.tableBackgroundColor as string | null) ?? '#ffffff',
      tableBorderStyle: normalizeBorderStyle(tableAttrs.tableBorderStyle as string | null) ?? 'solid',
      tableBorderWidth: normalizeCssLength(tableAttrs.tableBorderWidth as string | null) ?? '1pt',
      tableBorderColor: normalizeColorValue(tableAttrs.tableBorderColor as string | null) ?? '#d0d0d0',
      tableBorderRadius: normalizeCssLength(tableAttrs.tableBorderRadius as string | null) ?? '4pt',
      styleHeaderRow: tableAttrs.styleHeaderRow === true,
      styleFirstColumn: tableAttrs.styleFirstColumn === true,
      styleLastColumn: tableAttrs.styleLastColumn === true,
      styleBandedRows: tableAttrs.styleBandedRows === true,
      styleBandedColumns: tableAttrs.styleBandedColumns === true,
      cellTextAlign: (cellAttrs.cellTextAlign as 'left' | 'center' | 'right' | 'justify' | undefined) ?? 'left',
      cellVerticalAlign: (cellAttrs.cellVerticalAlign as 'top' | 'middle' | 'bottom' | undefined) ?? 'top',
      backgroundColor: normalizeColorValue(cellAttrs.backgroundColor as string | null) ?? '',
      borderColor,
      borderStyle,
      borderWidth,
      rowHeight: normalizeCssLength(rowAttrs.rowHeight as string | null) ?? '',
      columnWidthPx: typeof colwidth === 'number' && Number.isFinite(colwidth) ? colwidth : null
    }
  }, [cellAttrs, rowAttrs.rowHeight, tableAttrs])

  const actions = useMemo(
    () => ({
      addRowBefore: () => editor?.chain().focus().addRowBefore().run() ?? false,
      addRowAfter: () => editor?.chain().focus().addRowAfter().run() ?? false,
      deleteRow: () => editor?.chain().focus().deleteRow().run() ?? false,
      duplicateRow: () => runTableChain()?.duplicateRow().run() ?? false,
      addColumnBefore: () => editor?.chain().focus().addColumnBefore().run() ?? false,
      addColumnAfter: () => editor?.chain().focus().addColumnAfter().run() ?? false,
      deleteColumn: () => editor?.chain().focus().deleteColumn().run() ?? false,
      duplicateColumn: () => runTableChain()?.duplicateColumn().run() ?? false,
      deleteTable: () => editor?.chain().focus().deleteTable().run() ?? false,
      mergeCells: () => editor?.chain().focus().mergeCells().run() ?? false,
      splitCell: () => editor?.chain().focus().splitCell().run() ?? false,
      toggleHeaderRow: () => editor?.chain().focus().toggleHeaderRow().run() ?? false,
      toggleHeaderColumn: () => editor?.chain().focus().toggleHeaderColumn().run() ?? false,
      toggleHeaderCell: () => editor?.chain().focus().toggleHeaderCell().run() ?? false,
      setTableWidthMode: (mode: TableWidthMode) => runTableChain()?.setTableWidthMode(mode).run() ?? false,
      setTableWidth: (width: string) => runTableChain()?.setTableLayout({ width, mode: 'manual' }).run() ?? false,
      setTableAlign: (align: 'left' | 'center' | 'right') => runTableChain()?.setTableAlign(align).run() ?? false,
      setTableTheme: (theme: TableTheme) => runTableChain()?.setTableTheme(theme).run() ?? false,
      setTableStyleOptions: (options: SetTableStyleOptions) =>
        runTableChain()?.setTableStyleOptions(options).run() ?? false,
      setCellTextAlign: (align: 'left' | 'center' | 'right' | 'justify') =>
        editor?.chain().focus().setCellAttribute('cellTextAlign', align).run() ?? false,
      setCellVerticalAlign: (align: 'top' | 'middle' | 'bottom') =>
        editor?.chain().focus().setCellAttribute('cellVerticalAlign', align).run() ?? false,
      setCellBackground: (color: string | null) =>
        editor?.chain().focus().setCellAttribute('backgroundColor', color).run() ?? false,
      setSelectedRowHeight: (height: string | null) => runTableChain()?.setSelectedRowHeight(height).run() ?? false,
      setSelectedColumnWidth: (width: string | null) => runTableChain()?.setSelectedColumnWidth(width).run() ?? false,
      distributeRowsEvenly: (height: string) => runTableChain()?.distributeRowsEvenly(height).run() ?? false,
      distributeColumnsEvenly: (width: string) => runTableChain()?.distributeColumnsEvenly(width).run() ?? false,
      applyBorderPreset: (options: {
        preset: TableBorderPreset
        style?: TableBorderStyle | null
        width?: string | null
        color?: string | null
      }) => runTableChain()?.applyTableBorderPreset(options).run() ?? false
    }),
    [editor, runTableChain]
  )

  const capability = {
    canMergeCells: canCommands?.mergeCells() ?? false,
    canSplitCell: canCommands?.splitCell() ?? false,
    canDeleteRow: canCommands?.deleteRow() ?? false,
    canDeleteColumn: canCommands?.deleteColumn() ?? false,
    canDeleteTable: canCommands?.deleteTable() ?? false,
    canDuplicateRow: hasSelectedTable,
    canDuplicateColumn: hasSelectedTable,
    canAddRowBefore: canCommands?.addRowBefore() ?? false,
    canAddRowAfter: canCommands?.addRowAfter() ?? false,
    canAddColumnBefore: canCommands?.addColumnBefore() ?? false,
    canAddColumnAfter: canCommands?.addColumnAfter() ?? false,
    canSetCellTextAlign: canCommands?.setCellAttribute('cellTextAlign', 'center') ?? false,
    canSetCellVerticalAlign: canCommands?.setCellAttribute('cellVerticalAlign', 'middle') ?? false,
    canSetCellBackground: canCommands?.setCellAttribute('backgroundColor', '#E0F2FE') ?? false,
    canApplyBorders: hasSelectedTable,
    canSetTableLayout: hasSelectedTable,
    canSetRowHeight: hasSelectedTable,
    canSetColumnWidth: hasSelectedTable,
    canDistributeRows: hasSelectedTable,
    canDistributeColumns: hasSelectedTable
  }

  return {
    values,
    actions,
    capability,
    selectionMetrics
  }
}
