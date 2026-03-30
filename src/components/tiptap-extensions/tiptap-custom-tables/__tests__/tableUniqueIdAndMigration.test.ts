import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { DocumentUniqueID } from '@/components/tiptap-extensions/documentUniqueId'
import { legacyTableIdMigrationExtension } from '@/components/tiptap-extensions/legacyTableIdMigration'
import { Table, TableCell, TableHeader, TableRow } from '..'
import { splitTableAtRow } from '../tableSelectionUtils'

function createEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      DocumentUniqueID,
      legacyTableIdMigrationExtension,
      Table.configure({ resizable: false, renderWrapper: false }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content
  })
}

function getTables(editor: Editor) {
  return editor.getJSON().content?.filter(node => node.type === 'table') ?? []
}

describe('table UniqueID and legacy migration', () => {
  it('assigns id on table and each row', () => {
    const editor = createEditor('<table><tbody><tr><td>A</td></tr><tr><td>B</td></tr></tbody></table>')

    try {
      editor.view.dispatch(editor.state.tr)

      const [table] = getTables(editor)
      expect(table?.attrs?.id).toBeTruthy()

      const rowIds = (table?.content ?? []).filter(node => node.type === 'tableRow').map(row => row.attrs?.id)
      expect(rowIds).toHaveLength(2)
      expect(new Set(rowIds).size).toBe(2)
    } finally {
      editor.destroy()
    }
  })

  it('keeps paginationChainId across split while row ids stay unique', () => {
    const editor = createEditor(
      [
        '<table>',
        '<tbody>',
        '<tr><th>H1</th><th>H2</th></tr>',
        '<tr><td>R1A</td><td>R1B</td></tr>',
        '<tr><td>R2A</td><td>R2B</td></tr>',
        '</tbody>',
        '</table>'
      ].join('')
    )

    try {
      const splitTr = editor.state.tr
      const didSplit = splitTableAtRow(editor.state, splitTr, 0, 2, { repeatHeaderRow: true })
      expect(didSplit).toBe(true)
      editor.view.dispatch(splitTr)

      const tables = getTables(editor)
      expect(tables).toHaveLength(2)
      const chainIds = tables.map(t => t.attrs?.paginationChainId).filter(Boolean)
      expect(new Set(chainIds).size).toBe(1)

      const firstRowIds = (tables[0]?.content ?? []).filter(node => node.type === 'tableRow').map(row => row.attrs?.id)
      const secondRowIds = (tables[1]?.content ?? []).filter(node => node.type === 'tableRow').map(row => row.attrs?.id)

      expect(new Set([...firstRowIds, ...secondRowIds]).size).toBe(firstRowIds.length + secondRowIds.length)
    } finally {
      editor.destroy()
    }
  })
})
