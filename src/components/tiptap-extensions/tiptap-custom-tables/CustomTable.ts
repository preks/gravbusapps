import { Table as TiptapTable } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { CustomTableView } from './CustomTableView'
import {
  applyBorderPresetToSelection,
  setSelectedColumnsWidthPx,
  setSelectedRowsHeight,
  updateSelectedTableFragments,
  type TableBorderPreset
} from './tableFormattingUtils'
import { duplicateCurrentColumn, duplicateCurrentRow } from './tableSelectionUtils'
import {
  getNormalizedTableSurfaceStyleAttributes,
  getTableStyle,
  getTableSurfaceStyle,
  normalizeCssLength,
  normalizeBorderStyle,
  normalizeColorValue,
  normalizeTableAlign,
  normalizeTableTheme,
  normalizeTableWidth,
  normalizeTableWidthMode
} from './styleUtils'
import type {
  TableAlignment,
  CustomTableOptions,
  SetTableLayoutOptions,
  SetTableStyleOptions,
  TableBorderStyle,
  TableTheme,
  TableWidthMode
} from './types'

const DEFAULT_TABLE_BACKGROUND_COLOR = '#ffffff'
const DEFAULT_TABLE_BORDER_STYLE: TableBorderStyle = 'solid'
const DEFAULT_TABLE_BORDER_WIDTH = '1pt'
const DEFAULT_TABLE_BORDER_COLOR = '#d0d0d0'
const DEFAULT_TABLE_BORDER_RADIUS = '4pt'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTable: {
      setTableWidth: (width: string) => ReturnType
      setTableAlign: (align: TableAlignment) => ReturnType
      setTableWidthMode: (mode: TableWidthMode) => ReturnType
      setTableLayout: (options: SetTableLayoutOptions) => ReturnType
      setTableTheme: (theme: TableTheme) => ReturnType
      setTableStyleOptions: (options: SetTableStyleOptions) => ReturnType
      setSelectedRowHeight: (height: string | null) => ReturnType
      setSelectedColumnWidth: (width: string | null) => ReturnType
      distributeRowsEvenly: (height: string) => ReturnType
      distributeColumnsEvenly: (width: string) => ReturnType
      applyTableBorderPreset: (options: {
        preset: TableBorderPreset
        style?: TableBorderStyle | null
        width?: string | null
        color?: string | null
      }) => ReturnType
      duplicateRow: () => ReturnType
      duplicateColumn: () => ReturnType
    }
  }
}

function findParentTable(state: EditorState, nodeName: string): { node: ProseMirrorNode; pos: number } | null {
  const { $from } = state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === nodeName) {
      return {
        node,
        pos: $from.before(depth)
      }
    }
  }

  const selectedNode = state.selection instanceof NodeSelection ? state.selection.node : null
  if (selectedNode?.type?.name === nodeName) {
    return {
      node: selectedNode,
      pos: state.selection.from
    }
  }

  return null
}

function getCurrentTableLayout(
  state: EditorState,
  nodeName: string,
  defaults: Pick<CustomTableOptions, 'defaultTableWidth' | 'defaultTableAlign' | 'defaultTableWidthMode'>
) {
  const table = findParentTable(state, nodeName)
  if (!table) return null

  return {
    table,
    tableWidth: normalizeTableWidth(table.node.attrs.tableWidth) ?? defaults.defaultTableWidth,
    tableAlign: normalizeTableAlign(table.node.attrs.tableAlign) ?? defaults.defaultTableAlign,
    tableWidthMode: normalizeTableWidthMode(table.node.attrs.tableWidthMode) ?? defaults.defaultTableWidthMode
  }
}

function updateCurrentTable(state: EditorState, tr: Transaction, nodeName: string, attrs: Record<string, unknown>) {
  return updateSelectedTableFragments(state, tr, nodeName, currentAttrs => ({
    ...currentAttrs,
    ...attrs
  }))
}

function getRenderedTableStyle(
  attributes: Record<string, unknown>,
  defaults: Pick<CustomTableOptions, 'defaultTableWidth' | 'defaultTableAlign' | 'defaultTableWidthMode'>
) {
  const width = normalizeTableWidth(attributes.tableWidth as string | null) ?? defaults.defaultTableWidth
  const align = normalizeTableAlign(attributes.tableAlign as string | null) ?? defaults.defaultTableAlign
  const mode = normalizeTableWidthMode(attributes.tableWidthMode as string | null) ?? defaults.defaultTableWidthMode
  const surfaceStyle = getTableSurfaceStyle(
    getNormalizedTableSurfaceStyleAttributes({
      tableBackgroundColor: attributes.tableBackgroundColor ?? DEFAULT_TABLE_BACKGROUND_COLOR,
      tableBorderStyle: attributes.tableBorderStyle ?? DEFAULT_TABLE_BORDER_STYLE,
      tableBorderWidth: attributes.tableBorderWidth ?? DEFAULT_TABLE_BORDER_WIDTH,
      tableBorderColor: attributes.tableBorderColor ?? DEFAULT_TABLE_BORDER_COLOR,
      tableBorderRadius: attributes.tableBorderRadius ?? DEFAULT_TABLE_BORDER_RADIUS
    })
  )

  return [getTableStyle(width, align, mode), surfaceStyle].filter(Boolean).join('; ')
}

function normalizeColumnWidthToPx(width: string | null) {
  if (width == null) return null

  const normalized = width.trim()
  if (!normalized) return null

  const numeric = Number.parseFloat(normalized.replace(',', '.'))
  if (!Number.isFinite(numeric) || numeric <= 0) return null

  if (/cm$/i.test(normalized)) return Math.round((numeric * 96) / 2.54)
  if (/mm$/i.test(normalized)) return Math.round((numeric * 96) / 25.4)
  if (/in$/i.test(normalized)) return Math.round(numeric * 96)
  if (/pt$/i.test(normalized)) return Math.round((numeric * 96) / 72)
  if (/px$/i.test(normalized) || /^\d+(\.\d+)?$/.test(normalized)) return Math.round(numeric)

  return null
}

export const CustomTable = TiptapTable.extend<CustomTableOptions>({
  addOptions(): CustomTableOptions {
    const parentOptions = this.parent?.() ?? {
      HTMLAttributes: {},
      resizable: false,
      renderWrapper: false,
      handleWidth: 5,
      cellMinWidth: 25,
      View: null,
      lastColumnResizable: true,
      allowTableNodeSelection: false
    }

    return {
      ...parentOptions,
      defaultTableWidth: '100%',
      defaultTableAlign: 'left',
      defaultTableWidthMode: 'manual',
      View: CustomTableView
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      tableWidth: {
        default: this.options.defaultTableWidth,
        parseHTML: element => {
          return (
            element.getAttribute('data-table-width') ??
            (element instanceof HTMLElement ? element.style.width : null) ??
            element.getAttribute('width') ??
            this.options.defaultTableWidth
          )
        },
        renderHTML: attributes => {
          const width = normalizeTableWidth(attributes.tableWidth) ?? this.options.defaultTableWidth

          return {
            'data-table-width': width,
            style: getRenderedTableStyle(attributes, this.options)
          }
        }
      },
      tableAlign: {
        default: this.options.defaultTableAlign,
        parseHTML: element => {
          return (
            normalizeTableAlign(element.getAttribute('data-table-align')) ??
            normalizeTableAlign(element.getAttribute('align')) ??
            this.options.defaultTableAlign
          )
        },
        renderHTML: attributes => {
          const align = normalizeTableAlign(attributes.tableAlign) ?? this.options.defaultTableAlign

          return {
            'data-table-align': align,
            style: getRenderedTableStyle(attributes, this.options)
          }
        }
      },
      tableWidthMode: {
        default: this.options.defaultTableWidthMode,
        parseHTML: element => {
          return (
            normalizeTableWidthMode(element.getAttribute('data-table-width-mode')) ?? this.options.defaultTableWidthMode
          )
        },
        renderHTML: attributes => {
          const mode = normalizeTableWidthMode(attributes.tableWidthMode) ?? this.options.defaultTableWidthMode

          return {
            'data-table-width-mode': mode,
            style: getRenderedTableStyle(attributes, this.options)
          }
        }
      },
      paginationSplitId: {
        default: null,
        parseHTML: element => element.getAttribute('data-pagination-split-id'),
        renderHTML: attributes => {
          if (typeof attributes.paginationSplitId !== 'string' || attributes.paginationSplitId.length === 0) {
            return {}
          }

          return {
            'data-pagination-split-id': attributes.paginationSplitId
          }
        }
      },
      tableBorderHidden: {
        default: false,
        parseHTML: element => element.getAttribute('data-table-border-hidden') === 'true',
        renderHTML: attributes => ({
          'data-table-border-hidden': attributes.tableBorderHidden === true ? 'true' : 'false'
        })
      },
      tableTheme: {
        default: 'blue',
        parseHTML: element => normalizeTableTheme(element.getAttribute('data-table-theme')) ?? 'blue',
        renderHTML: attributes => {
          const tableTheme = normalizeTableTheme(attributes.tableTheme) ?? 'blue'
          return {
            'data-table-theme': tableTheme
          }
        }
      },
      tableBackgroundColor: {
        default: DEFAULT_TABLE_BACKGROUND_COLOR,
        parseHTML: element =>
          normalizeColorValue(element.getAttribute('data-table-background-color')) ??
          (element instanceof HTMLElement ? normalizeColorValue(element.style.backgroundColor) : null) ??
          DEFAULT_TABLE_BACKGROUND_COLOR,
        renderHTML: attributes => ({
          'data-table-background-color':
            normalizeColorValue(attributes.tableBackgroundColor) ?? DEFAULT_TABLE_BACKGROUND_COLOR
        })
      },
      tableBorderStyle: {
        default: DEFAULT_TABLE_BORDER_STYLE,
        parseHTML: element =>
          normalizeBorderStyle(element.getAttribute('data-table-border-style')) ??
          (element instanceof HTMLElement ? normalizeBorderStyle(element.style.borderStyle) : null) ??
          DEFAULT_TABLE_BORDER_STYLE,
        renderHTML: attributes => ({
          'data-table-border-style': normalizeBorderStyle(attributes.tableBorderStyle) ?? DEFAULT_TABLE_BORDER_STYLE
        })
      },
      tableBorderWidth: {
        default: DEFAULT_TABLE_BORDER_WIDTH,
        parseHTML: element =>
          normalizeCssLength(element.getAttribute('data-table-border-width')) ??
          (element instanceof HTMLElement ? normalizeCssLength(element.style.borderWidth) : null) ??
          DEFAULT_TABLE_BORDER_WIDTH,
        renderHTML: attributes => ({
          'data-table-border-width': normalizeCssLength(attributes.tableBorderWidth) ?? DEFAULT_TABLE_BORDER_WIDTH
        })
      },
      tableBorderColor: {
        default: DEFAULT_TABLE_BORDER_COLOR,
        parseHTML: element =>
          normalizeColorValue(element.getAttribute('data-table-border-color')) ??
          (element instanceof HTMLElement ? normalizeColorValue(element.style.borderColor) : null) ??
          DEFAULT_TABLE_BORDER_COLOR,
        renderHTML: attributes => ({
          'data-table-border-color': normalizeColorValue(attributes.tableBorderColor) ?? DEFAULT_TABLE_BORDER_COLOR
        })
      },
      tableBorderRadius: {
        default: DEFAULT_TABLE_BORDER_RADIUS,
        parseHTML: element =>
          normalizeCssLength(element.getAttribute('data-table-border-radius')) ??
          (element instanceof HTMLElement ? normalizeCssLength(element.style.borderRadius) : null) ??
          DEFAULT_TABLE_BORDER_RADIUS,
        renderHTML: attributes => ({
          'data-table-border-radius': normalizeCssLength(attributes.tableBorderRadius) ?? DEFAULT_TABLE_BORDER_RADIUS
        })
      },
      styleHeaderRow: {
        default: false,
        parseHTML: element => element.getAttribute('data-table-style-header-row') === 'true',
        renderHTML: attributes => ({
          'data-table-style-header-row': attributes.styleHeaderRow === true ? 'true' : 'false'
        })
      },
      styleFirstColumn: {
        default: false,
        parseHTML: element => element.getAttribute('data-table-style-first-column') === 'true',
        renderHTML: attributes => ({
          'data-table-style-first-column': attributes.styleFirstColumn === true ? 'true' : 'false'
        })
      },
      styleLastColumn: {
        default: false,
        parseHTML: element => element.getAttribute('data-table-style-last-column') === 'true',
        renderHTML: attributes => ({
          'data-table-style-last-column': attributes.styleLastColumn === true ? 'true' : 'false'
        })
      },
      styleBandedRows: {
        default: false,
        parseHTML: element => element.getAttribute('data-table-style-banded-rows') === 'true',
        renderHTML: attributes => ({
          'data-table-style-banded-rows': attributes.styleBandedRows === true ? 'true' : 'false'
        })
      },
      styleBandedColumns: {
        default: false,
        parseHTML: element => element.getAttribute('data-table-style-banded-columns') === 'true',
        renderHTML: attributes => ({
          'data-table-style-banded-columns': attributes.styleBandedColumns === true ? 'true' : 'false'
        })
      }
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableWidth:
        width =>
        ({ state, tr, dispatch }) => {
          const normalizedWidth = normalizeTableWidth(width)
          if (!normalizedWidth) return false

          const updated = updateCurrentTable(state, tr, this.name, {
            tableWidth: normalizedWidth,
            tableWidthMode: 'manual'
          })
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setTableAlign:
        align =>
        ({ state, tr, dispatch }) => {
          const normalizedAlign = normalizeTableAlign(align)
          if (!normalizedAlign) return false

          const updated = updateCurrentTable(state, tr, this.name, { tableAlign: normalizedAlign })
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setTableWidthMode:
        mode =>
        ({ state, tr, dispatch }) => {
          const normalizedMode = normalizeTableWidthMode(mode)
          if (!normalizedMode) return false

          const currentLayout = getCurrentTableLayout(state, this.name, this.options)
          if (!currentLayout) return false

          const updated = updateCurrentTable(state, tr, this.name, {
            tableWidthMode: normalizedMode,
            tableWidth: currentLayout.tableWidth
          })
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setTableLayout:
        options =>
        ({ state, tr, dispatch }) => {
          const currentLayout = getCurrentTableLayout(state, this.name, this.options)
          if (!currentLayout) return false

          const nextAttrs: Record<string, unknown> = {}

          if (options.width != null) {
            const normalizedWidth = normalizeTableWidth(options.width)
            if (!normalizedWidth) return false
            nextAttrs.tableWidth = normalizedWidth
            nextAttrs.tableWidthMode = 'manual'
          }

          if (options.align != null) {
            const normalizedAlign = normalizeTableAlign(options.align)
            if (!normalizedAlign) return false
            nextAttrs.tableAlign = normalizedAlign
          }

          if (options.mode != null) {
            const normalizedMode = normalizeTableWidthMode(options.mode)
            if (!normalizedMode) return false
            nextAttrs.tableWidthMode = normalizedMode
          }

          if (!('tableWidth' in nextAttrs)) {
            nextAttrs.tableWidth = currentLayout.tableWidth
          }

          if (!Object.keys(nextAttrs).length) return false

          const updated = updateCurrentTable(state, tr, this.name, nextAttrs)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setTableTheme:
        theme =>
        ({ state, tr, dispatch }) => {
          const normalizedTheme = normalizeTableTheme(theme)
          if (!normalizedTheme) return false

          const updated = updateCurrentTable(state, tr, this.name, { tableTheme: normalizedTheme })
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setTableStyleOptions:
        options =>
        ({ state, tr, dispatch }) => {
          const nextAttrs: Record<string, unknown> = {}

          if (options.theme != null) {
            const normalizedTheme = normalizeTableTheme(options.theme)
            if (!normalizedTheme) return false
            nextAttrs.tableTheme = normalizedTheme
          }

          if (options.styleHeaderRow != null) nextAttrs.styleHeaderRow = options.styleHeaderRow
          if (options.styleFirstColumn != null) nextAttrs.styleFirstColumn = options.styleFirstColumn
          if (options.styleLastColumn != null) nextAttrs.styleLastColumn = options.styleLastColumn
          if (options.styleBandedRows != null) nextAttrs.styleBandedRows = options.styleBandedRows
          if (options.styleBandedColumns != null) nextAttrs.styleBandedColumns = options.styleBandedColumns
          if (options.tableBackgroundColor !== undefined) {
            const normalizedColor =
              options.tableBackgroundColor == null || options.tableBackgroundColor.trim() === ''
                ? DEFAULT_TABLE_BACKGROUND_COLOR
                : normalizeColorValue(options.tableBackgroundColor)
            if (!normalizedColor) return false
            nextAttrs.tableBackgroundColor = normalizedColor
          }
          if (options.tableBorderStyle !== undefined) {
            const normalizedStyle =
              options.tableBorderStyle == null
                ? DEFAULT_TABLE_BORDER_STYLE
                : normalizeBorderStyle(options.tableBorderStyle)
            if (!normalizedStyle) return false
            nextAttrs.tableBorderStyle = normalizedStyle
          }
          if (options.tableBorderWidth !== undefined) {
            const normalizedWidth =
              options.tableBorderWidth == null || options.tableBorderWidth.trim() === ''
                ? DEFAULT_TABLE_BORDER_WIDTH
                : normalizeCssLength(options.tableBorderWidth)
            if (!normalizedWidth) return false
            nextAttrs.tableBorderWidth = normalizedWidth
          }
          if (options.tableBorderColor !== undefined) {
            const normalizedColor =
              options.tableBorderColor == null || options.tableBorderColor.trim() === ''
                ? DEFAULT_TABLE_BORDER_COLOR
                : normalizeColorValue(options.tableBorderColor)
            if (!normalizedColor) return false
            nextAttrs.tableBorderColor = normalizedColor
          }
          if (options.tableBorderRadius !== undefined) {
            const normalizedRadius =
              options.tableBorderRadius == null || options.tableBorderRadius.trim() === ''
                ? DEFAULT_TABLE_BORDER_RADIUS
                : normalizeCssLength(options.tableBorderRadius)
            if (!normalizedRadius) return false
            nextAttrs.tableBorderRadius = normalizedRadius
          }
          if (!Object.keys(nextAttrs).length) return false

          const updated = updateCurrentTable(state, tr, this.name, nextAttrs)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setSelectedRowHeight:
        height =>
        ({ state, tr, dispatch }) => {
          const normalizedHeight = height == null ? null : normalizeCssLength(height)
          if (height != null && !normalizedHeight) return false

          const updated = setSelectedRowsHeight(state, tr, this.name, normalizedHeight)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      setSelectedColumnWidth:
        width =>
        ({ state, tr, dispatch }) => {
          const normalizedWidth = width == null ? null : normalizeColumnWidthToPx(width)
          if (width != null && normalizedWidth == null) return false

          const updated = setSelectedColumnsWidthPx(state, tr, this.name, normalizedWidth)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      distributeRowsEvenly:
        height =>
        ({ state, tr, dispatch }) => {
          const normalizedHeight = normalizeCssLength(height)
          if (!normalizedHeight) return false

          const updated = setSelectedRowsHeight(state, tr, this.name, normalizedHeight)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      distributeColumnsEvenly:
        width =>
        ({ state, tr, dispatch }) => {
          const normalizedWidth = normalizeColumnWidthToPx(width)
          if (normalizedWidth == null) return false

          const updated = setSelectedColumnsWidthPx(state, tr, this.name, normalizedWidth)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      applyTableBorderPreset:
        options =>
        ({ state, tr, dispatch }) => {
          const updated = applyBorderPresetToSelection(state, tr, this.name, options)
          if (!updated) return false

          dispatch?.(tr)
          return true
        },
      duplicateRow:
        () =>
        ({ state, tr, dispatch }) => {
          const duplicated = duplicateCurrentRow(state, tr, this.name)
          if (!duplicated) return false

          dispatch?.(tr)
          return true
        },
      duplicateColumn:
        () =>
        ({ state, tr, dispatch }) => {
          const duplicated = duplicateCurrentColumn(state, tr, this.name)
          if (!duplicated) return false

          dispatch?.(tr)
          return true
        }
    }
  }
})

export { normalizeTableAlign, normalizeTableWidth, normalizeTableWidthMode } from './styleUtils'
