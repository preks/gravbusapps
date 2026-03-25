import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '..'
import { rebalanceAdjacentPaginationTables, splitTableAtRow } from '../tableSelectionUtils'

function createEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        history: false
      }),
      Table.configure({
        resizable: false,
        renderWrapper: false
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content
  })
}

function getTopLevelTables(editor: Editor) {
  return editor.getJSON().content?.filter(node => node.type === 'table') ?? []
}

function getTableRowCountFromJson(tableNode: { content?: Array<{ type?: string }> } | undefined) {
  return tableNode?.content?.filter(node => node.type === 'tableRow').length ?? 0
}

describe('tableSelectionUtils integration', () => {
  it('splits a multi-page table into two non-empty fragments', () => {
    const editor = createEditor(
      [
        '<table>',
        '<tbody>',
        '<tr><th>Header A</th><th>Header B</th></tr>',
        '<tr><td>Row 1A</td><td>Row 1B</td></tr>',
        '<tr><td>Row 2A</td><td>Row 2B</td></tr>',
        '<tr><td>Row 3A</td><td>Row 3B</td></tr>',
        '</tbody>',
        '</table>'
      ].join('')
    )

    try {
      const transaction = editor.state.tr
      const didSplit = splitTableAtRow(editor.state, transaction, 0, 2, {
        repeatHeaderRow: true
      })

      expect(didSplit).toBe(true)

      editor.view.dispatch(transaction)

      const tables = getTopLevelTables(editor)
      expect(tables).toHaveLength(2)
      expect(getTableRowCountFromJson(tables[0])).toBe(2)
      expect(getTableRowCountFromJson(tables[1])).toBe(3)

      const leadingAttrs = tables[0]?.attrs ?? {}
      const continuationAttrs = tables[1]?.attrs ?? {}
      expect(leadingAttrs.paginationSplitId).toBeTruthy()
      expect(continuationAttrs.paginationSplitId).toBe(leadingAttrs.paginationSplitId)
    } finally {
      editor.destroy()
    }
  })

  it('rebalances an existing split chain without producing an empty continuation table', () => {
    const editor = createEditor(
      [
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody>',
        '<tr><th>Header A</th><th>Header B</th></tr>',
        '<tr><td>Row 1A</td><td>Row 1B</td></tr>',
        '<tr><td>Row 2A</td><td>Row 2B</td></tr>',
        '</tbody>',
        '</table>',
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody>',
        '<tr><th>Header A</th><th>Header B</th></tr>',
        '<tr><td>Row 3A</td><td>Row 3B</td></tr>',
        '</tbody>',
        '</table>'
      ].join('')
    )

    try {
      const transaction = editor.state.tr
      const didRebalance = rebalanceAdjacentPaginationTables(editor.state, transaction, 0, 2, {
        repeatHeaderRow: true
      })

      expect(didRebalance).toBe(true)

      editor.view.dispatch(transaction)

      const tables = getTopLevelTables(editor)
      expect(tables).toHaveLength(2)
      expect(getTableRowCountFromJson(tables[0])).toBe(2)
      expect(getTableRowCountFromJson(tables[1])).toBe(3)
      expect(getTableRowCountFromJson(tables[1])).toBeGreaterThan(1)
    } finally {
      editor.destroy()
    }
  })
})
