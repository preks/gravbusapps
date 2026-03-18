import { Table as TiptapTable } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { CustomTableView } from './CustomTableView'
import { duplicateCurrentColumn, duplicateCurrentRow } from './tableSelectionUtils'
import { getTableStyle, normalizeTableAlign, normalizeTableWidth, normalizeTableWidthMode } from './styleUtils'
import type { TableAlignment, CustomTableOptions, SetTableLayoutOptions, TableWidthMode } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTable: {
      setTableWidth: (width: string) => ReturnType
      setTableAlign: (align: TableAlignment) => ReturnType
      setTableWidthMode: (mode: TableWidthMode) => ReturnType
      setTableLayout: (options: SetTableLayoutOptions) => ReturnType
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
  const table = findParentTable(state, nodeName)
  if (!table) return false

  tr.setNodeMarkup(table.pos, undefined, {
    ...table.node.attrs,
    ...attrs
  })

  return true
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
          const align = normalizeTableAlign(attributes.tableAlign) ?? this.options.defaultTableAlign
          const mode = normalizeTableWidthMode(attributes.tableWidthMode) ?? this.options.defaultTableWidthMode

          return {
            'data-table-width': width,
            style: getTableStyle(width, align, mode)
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
          const width = normalizeTableWidth(attributes.tableWidth) ?? this.options.defaultTableWidth
          const align = normalizeTableAlign(attributes.tableAlign) ?? this.options.defaultTableAlign
          const mode = normalizeTableWidthMode(attributes.tableWidthMode) ?? this.options.defaultTableWidthMode

          return {
            'data-table-align': align,
            style: getTableStyle(width, align, mode)
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
          const width = normalizeTableWidth(attributes.tableWidth) ?? this.options.defaultTableWidth
          const align = normalizeTableAlign(attributes.tableAlign) ?? this.options.defaultTableAlign
          const mode = normalizeTableWidthMode(attributes.tableWidthMode) ?? this.options.defaultTableWidthMode

          return {
            'data-table-width-mode': mode,
            style: getTableStyle(width, align, mode)
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
