import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  normalizeDocumentHtmlForEditor,
  sanitizePaginationRuntimeHtml
} from '@/business-apps/platform/apps/document-apps/utils/documentContentUtils'
import { Table, TableCell, TableHeader, TableRow } from '..'

function waitForEditorPlugins() {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

describe('CustomTable pagination structure', () => {
  it('keeps native flat table rows when loading canonical table html', async () => {
    const editor = new Editor({
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
      content: '<p></p>'
    })

    try {
      editor.commands.setContent(
        normalizeDocumentHtmlForEditor(
          '<table><tbody><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td><td>E</td></tr></tbody></table>'
        ),
        false
      )
      await waitForEditorPlugins()

      const documentJson = editor.getJSON()
      const tableNode = documentJson.content?.[0]
      const tableChildren = tableNode?.content ?? []

      expect(tableNode?.type).toBe('table')
      expect(tableChildren).toHaveLength(3)
      expect(tableChildren.every(child => child.type === 'tableRow')).toBe(true)

      const persistedHtml = sanitizePaginationRuntimeHtml(editor.getHTML())
      expect(persistedHtml).toMatch(/<table\b/)
      expect(persistedHtml).not.toContain('data-pagination-chain-id')
      expect(persistedHtml).not.toContain('data-pagination-row-groups')
      expect((persistedHtml.match(/<table\b/g) ?? []).length).toBe(1)
    } finally {
      editor.destroy()
    }
  })
})
