import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '..'

function createEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Table.configure({ resizable: false, renderWrapper: true }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content
  })
}

function getTableWrapper(editor: Editor): HTMLElement | null {
  const wrappers = Array.from(editor.view.dom.querySelectorAll('.tableWrapper')) as HTMLElement[]
  if (!wrappers.length) return null
  const withId = wrappers.find(w => w.dataset.tableId || w.querySelector('table[data-table-id]'))
  return withId ?? wrappers[wrappers.length - 1]
}

describe('CustomTableView wrapper identity', () => {
  it('adds data-table-id to wrapper and table and keeps a single wrapper', () => {
    const editor = createEditor('<table><tbody><tr><td>A</td></tr></tbody></table>')
    try {
      editor.view.dispatch(editor.state.tr) // allow identity plugin to backfill IDs

      const tableWrapper = getTableWrapper(editor)
      expect(tableWrapper).not.toBeNull()
      expect(tableWrapper?.classList.contains('tableWrapper')).toBe(true)
      const tableId =
        tableWrapper?.dataset.tableId ?? tableWrapper?.querySelector('table')?.getAttribute('data-table-id')
      expect(tableId).toBeTruthy()

      const nestedWrappers = tableWrapper?.querySelectorAll('.tableWrapper') ?? []
      expect(nestedWrappers.length).toBe(0)

      const tableEl = tableWrapper?.querySelector('table') as HTMLElement | null
      if (tableWrapper?.dataset.tableId) {
        expect(tableEl?.dataset.tableId).toBe(tableWrapper.dataset.tableId)
      } else {
        expect(tableEl?.dataset.tableId).toBeTruthy()
      }
    } finally {
      editor.destroy()
    }
  })

  it('preserves wrapper identity after a transaction', () => {
    const editor = createEditor('<table><tbody><tr><td>A</td></tr></tbody></table>')
    try {
      editor.view.dispatch(editor.state.tr)

      const initialWrapper = getTableWrapper(editor)
      const initialId =
        initialWrapper?.dataset.tableId ?? initialWrapper?.querySelector('table')?.getAttribute('data-table-id')

      editor.chain().focus().addRowAfter().run()

      const nextWrapper = getTableWrapper(editor)
      const nextId = nextWrapper?.dataset.tableId ?? nextWrapper?.querySelector('table')?.getAttribute('data-table-id')
      expect(nextId).toBe(initialId)
      const nestedWrappers = nextWrapper?.querySelectorAll('.tableWrapper') ?? []
      expect(nestedWrappers.length).toBe(0)
    } finally {
      editor.destroy()
    }
  })
})
