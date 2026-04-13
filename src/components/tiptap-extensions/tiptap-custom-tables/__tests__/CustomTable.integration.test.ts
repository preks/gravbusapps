import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableMap, columnResizingPluginKey } from '@tiptap/pm/tables'
import {
  normalizeDocumentHtmlForEditor,
  sanitizePaginationRuntimeHtml
} from '@/business-apps/core/office/apps/documents/utils/documentContentUtils'
import { Table, TableCell, TableHeader, TableRow } from '..'

function waitForEditorPlugins() {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

function createEditor(
  content: string,
  options: {
    resizable?: boolean
    renderWrapper?: boolean
  } = {}
) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        undoRedo: false
      }),
      Table.configure({
        resizable: options.resizable ?? false,
        renderWrapper: options.renderWrapper ?? false
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content
  })
}

function getFirstTableCellPos(editor: Editor) {
  const firstTable = editor.state.doc.firstChild
  if (!firstTable) {
    throw new Error('Expected a table at the start of the document')
  }

  let relativeCellPos: number | null = null
  firstTable.descendants((node, pos) => {
    if (relativeCellPos != null) {
      return false
    }

    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      relativeCellPos = pos
      return false
    }

    return true
  })

  if (relativeCellPos == null) {
    throw new Error('Expected the first table to contain a cell')
  }

  return 1 + relativeCellPos
}

function setFirstTableColumnWidth(editor: Editor, width: number) {
  const firstTable = editor.state.doc.firstChild
  if (!firstTable) {
    throw new Error('Expected a table at the start of the document')
  }

  const map = TableMap.get(firstTable)
  const tr = editor.state.tr
  const tableStart = 1
  const targetColumnIndex = 0

  for (let row = 0; row < map.height; row += 1) {
    const mapIndex = row * map.width + targetColumnIndex
    if (row > 0 && map.map[mapIndex] === map.map[mapIndex - map.width]) {
      continue
    }

    const relativePos = map.map[mapIndex]
    const cellNode = firstTable.nodeAt(relativePos)
    if (!cellNode) continue

    const colspan = Number(cellNode.attrs.colspan ?? 1)
    const widthIndex = colspan === 1 ? 0 : targetColumnIndex - map.colCount(relativePos)
    const colwidth = Array.isArray(cellNode.attrs.colwidth)
      ? [...cellNode.attrs.colwidth]
      : Array.from({ length: colspan }, () => 0)

    colwidth[widthIndex] = width
    tr.setNodeMarkup(tableStart + relativePos, null, {
      ...cellNode.attrs,
      colwidth
    })
  }

  editor.view.dispatch(tr)
}

describe('CustomTable pagination structure', () => {
  it('keeps native flat table rows when loading canonical table html', async () => {
    const editor = createEditor('<p></p>')

    try {
      editor.commands.setContent(
        normalizeDocumentHtmlForEditor(
          '<table><tbody><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr><tr><td>D</td><td>E</td></tr></tbody></table>'
        ),
        { emitUpdate: false }
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

  it('highlights every fragment in a split table chain only when resize is active', async () => {
    const editor = createEditor(
      [
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody><tr><td>A1</td><td>B1</td></tr></tbody>',
        '</table>',
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody><tr><td>A2</td><td>B2</td></tr></tbody>',
        '</table>'
      ].join(''),
      { resizable: true, renderWrapper: true }
    )

    try {
      await waitForEditorPlugins()

      const wrappers = Array.from(editor.view.dom.querySelectorAll('.tableWrapper')) as HTMLElement[]
      expect(wrappers).toHaveLength(2)
      expect(wrappers.every(wrapper => wrapper.dataset.linkedTableResizeActive == null)).toBe(true)

      editor.view.dispatch(
        editor.state.tr.setMeta(columnResizingPluginKey, { setHandle: getFirstTableCellPos(editor) })
      )
      expect(wrappers.every(wrapper => wrapper.dataset.linkedTableResizeActive === 'true')).toBe(true)
      expect(wrappers[0]?.dataset.linkedTableResizeSource).toBe('true')
      expect(wrappers[1]?.dataset.linkedTableResizeSource).toBeUndefined()
      expect(wrappers[1]?.style.getPropertyValue('--linked-table-resize-handle-left')).not.toBe('')
    } finally {
      editor.destroy()
    }
  })

  it('mirrors live drag widths onto sibling table fragments', async () => {
    const editor = createEditor(
      [
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody><tr><td>A1</td><td>B1</td></tr></tbody>',
        '</table>',
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody><tr><td>A2</td><td>B2</td></tr></tbody>',
        '</table>'
      ].join(''),
      { resizable: true, renderWrapper: true }
    )

    try {
      await waitForEditorPlugins()

      const activeHandle = getFirstTableCellPos(editor)
      editor.view.dispatch(editor.state.tr.setMeta(columnResizingPluginKey, { setHandle: activeHandle }))
      editor.view.dispatch(
        editor.state.tr.setMeta(columnResizingPluginKey, {
          setDragging: {
            startX: 10,
            startWidth: 120
          }
        })
      )

      editor.view.dom.ownerDocument.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50 }))

      const renderedTables = Array.from(editor.view.dom.querySelectorAll('.tableWrapper > table'))
      expect(renderedTables).toHaveLength(2)

      const siblingCol = renderedTables[1]?.querySelector('colgroup > col')
      expect((siblingCol as HTMLElement | null)?.style.width).toBe('160px')
    } finally {
      editor.destroy()
    }
  })

  it('persists resized column widths across every fragment in the chain', async () => {
    const editor = createEditor(
      [
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody><tr><td>A1</td><td>B1</td></tr></tbody>',
        '</table>',
        '<table data-pagination-chain-id="chain-1" data-pagination-split-id="split-1">',
        '<tbody><tr><td>A2</td><td>B2</td></tr></tbody>',
        '</table>'
      ].join(''),
      { resizable: true, renderWrapper: true }
    )

    try {
      await waitForEditorPlugins()

      const activeHandle = getFirstTableCellPos(editor)
      editor.view.dispatch(editor.state.tr.setMeta(columnResizingPluginKey, { setHandle: activeHandle }))
      editor.view.dispatch(
        editor.state.tr.setMeta(columnResizingPluginKey, {
          setDragging: {
            startX: 0,
            startWidth: 120
          }
        })
      )

      setFirstTableColumnWidth(editor, 180)
      editor.view.dom.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await waitForEditorPlugins()

      const tables = editor.getJSON().content ?? []
      const leadingWidth = tables[0]?.content?.[0]?.content?.[0]?.attrs?.colwidth?.[0]
      const continuationWidth = tables[1]?.content?.[0]?.content?.[0]?.attrs?.colwidth?.[0]

      expect(leadingWidth).toBe(180)
      expect(continuationWidth).toBe(180)
    } finally {
      editor.destroy()
    }
  })
})
