import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from './index'
import { mergeAdjacentPaginationTables, splitTableAtRow } from './tableSelectionUtils'

function createEditor(content = '<p>Hello</p>') {
  const element = document.createElement('div')
  document.body.appendChild(element)

  const editor = new Editor({
    element,
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
        renderWrapper: true,
        HTMLAttributes: {
          class: 'editor-table'
        }
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content
  })

  return { editor, element }
}

function findFirstTablePos(editor: Editor) {
  let tablePos: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (tablePos != null) return false
    if (node.type.name === 'table') {
      tablePos = pos
      return false
    }
    return true
  })

  return tablePos
}

describe('CustomTable', () => {
  it('serializes default width and alignment attributes on inserted tables', () => {
    const { editor, element } = createEditor()

    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })).toBe(true)

    const html = editor.getHTML()

    expect(html).toContain('data-table-width="100%"')
    expect(html).toContain('data-table-align="left"')
    expect(html).toContain('style="width: 100%; margin-left: 0px; margin-right: 0px;"')

    editor.destroy()
    element.remove()
  })

  it('updates table layout through the custom commands', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })

    expect(
      (
        editor.commands as typeof editor.commands & {
          setTableLayout: (options: { width: string; align: 'center' }) => boolean
        }
      ).setTableLayout({ width: '14cm', align: 'center' })
    ).toBe(true)

    const html = editor.getHTML()

    expect(html).toContain('data-table-width="14cm"')
    expect(html).toContain('data-table-align="center"')
    expect(html).toContain('style="width: 14cm; margin-left: auto; margin-right: auto;"')

    editor.destroy()
    element.remove()
  })

  it('supports width modes beyond raw widths', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })

    expect(
      (
        editor.commands as typeof editor.commands & {
          setTableWidthMode: (mode: 'auto-fit-window' | 'auto-fit-content') => boolean
        }
      ).setTableWidthMode('auto-fit-content')
    ).toBe(true)

    const html = editor.getHTML()

    expect(html).toContain('data-table-width-mode="auto-fit-content"')
    expect(html).toContain('data-table-width-mode="auto-fit-content"')
    expect(html).toContain('max-width: 100%')

    editor.destroy()
    element.remove()
  })

  it('applies width and alignment styles to the editable table element', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })
    ;(
      editor.commands as typeof editor.commands & {
        setTableLayout: (options: { width: string; align: 'right'; mode: 'manual' }) => boolean
      }
    ).setTableLayout({ width: '320pt', align: 'right', mode: 'manual' })

    const wrapper = element.querySelector('.tableWrapper') as HTMLDivElement | null
    const table = element.querySelector('table') as HTMLTableElement | null

    expect(wrapper).toBeNull()
    expect(table?.dataset.tableWidth).toBe('320pt')
    expect(table?.dataset.tableAlign).toBe('right')
    expect(table?.style.width).toBe('320pt')
    expect(table?.style.marginLeft).toBe('auto')
    expect(table?.style.marginRight).toBe('0px')

    editor.destroy()
    element.remove()
  })

  it('duplicates the current row for simple tables', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
    editor.commands.duplicateRow()

    expect(editor.getJSON().content?.[0].content).toHaveLength(3)

    editor.destroy()
    element.remove()
  })

  it('splits overflowing tables into continuation tables without duplicating the header row', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 4, cols: 2, withHeaderRow: true })
    ;(
      editor.commands as typeof editor.commands & {
        setTableLayout: (options: { width: string; align: 'center' }) => boolean
      }
    ).setTableLayout({ width: '14cm', align: 'center' })

    const tablePos = findFirstTablePos(editor)
    expect(tablePos).not.toBeNull()

    const tr = editor.state.tr
    expect(splitTableAtRow(editor.state, tr, tablePos as number, 2)).toBe(true)
    editor.view.dispatch(tr)

    const json = editor.getJSON()
    const tables = json.content?.filter(node => node.type === 'table') ?? []

    expect(tables).toHaveLength(2)
    expect(tables[0].attrs).toMatchObject({
      tableWidth: '14cm',
      tableAlign: 'center'
    })
    expect(tables[1].attrs).toMatchObject({
      tableWidth: '14cm',
      tableAlign: 'center'
    })
    expect(tables[0].attrs.paginationSplitId).toBeTruthy()
    expect(tables[1].attrs.paginationSplitId).toBe(tables[0].attrs.paginationSplitId)
    expect(tables[0].content).toHaveLength(2)
    expect(tables[1].content).toHaveLength(2)
    expect(tables[1].content?.[0].content?.every(cell => cell.type === 'tableCell')).toBe(true)

    editor.destroy()
    element.remove()
  })

  it('merges adjacent pagination table fragments back into a single table', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 4, cols: 2, withHeaderRow: true })

    const tablePos = findFirstTablePos(editor)
    expect(tablePos).not.toBeNull()

    const splitTr = editor.state.tr
    expect(splitTableAtRow(editor.state, splitTr, tablePos as number, 2)).toBe(true)
    editor.view.dispatch(splitTr)

    const mergedTr = editor.state.tr
    expect(mergeAdjacentPaginationTables(editor.state, mergedTr, tablePos as number)).toBe(true)
    editor.view.dispatch(mergedTr)

    const tables = editor.getJSON().content?.filter(node => node.type === 'table') ?? []

    expect(tables).toHaveLength(1)
    expect(tables[0].content).toHaveLength(4)

    editor.destroy()
    element.remove()
  })

  it('generates a fresh pagination split id for orphaned table fragments', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: {
            tableWidth: '100%',
            tableAlign: 'left',
            tableWidthMode: 'manual',
            paginationSplitId: 'stale-split-id'
          },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            }
          ]
        }
      ]
    }
    const { editor, element } = createEditor(content as any)

    const tablePos = findFirstTablePos(editor)
    expect(tablePos).not.toBeNull()

    const tr = editor.state.tr
    expect(splitTableAtRow(editor.state, tr, tablePos as number, 2)).toBe(true)
    editor.view.dispatch(tr)

    const tables = editor.getJSON().content?.filter(node => node.type === 'table') ?? []
    expect(tables).toHaveLength(2)
    expect(tables[0].attrs.paginationSplitId).not.toBe('stale-split-id')
    expect(tables[1].attrs.paginationSplitId).toBe(tables[0].attrs.paginationSplitId)

    editor.destroy()
    element.remove()
  })

  it('allows splitting tables with colspan-only cells', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: {
            tableWidth: '100%',
            tableAlign: 'left',
            tableWidthMode: 'manual'
          },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { colspan: 2, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            }
          ]
        }
      ]
    }
    const { editor, element } = createEditor(content as any)

    const tablePos = findFirstTablePos(editor)
    expect(tablePos).not.toBeNull()

    const tr = editor.state.tr
    expect(splitTableAtRow(editor.state, tr, tablePos as number, 1)).toBe(true)

    editor.destroy()
    element.remove()
  })

  it('refuses to split tables across a rowspan', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: {
            tableWidth: '100%',
            tableAlign: 'left',
            tableWidthMode: 'manual'
          },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { colspan: 1, rowspan: 2, colwidth: null },
                  content: [{ type: 'paragraph' }]
                },
                {
                  type: 'tableHeader',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph' }]
                }
              ]
            }
          ]
        }
      ]
    }
    const { editor, element } = createEditor(content as any)

    const tablePos = findFirstTablePos(editor)
    expect(tablePos).not.toBeNull()

    const tr = editor.state.tr
    expect(splitTableAtRow(editor.state, tr, tablePos as number, 1)).toBe(false)

    editor.destroy()
    element.remove()
  })

  it('rejects invalid table widths', () => {
    const { editor, element } = createEditor()

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })

    expect(
      (editor.commands as typeof editor.commands & { setTableWidth: (width: string) => boolean }).setTableWidth('wide')
    ).toBe(false)

    expect(editor.getHTML()).toContain('data-table-width="100%"')

    editor.destroy()
    element.remove()
  })
})
