import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  buildTableChildrenFromRows,
  getTableRowEntries,
  getTableRowCount,
  getTableRowGroups,
  getSerializedTableRowGroups,
  getSerializedTableRowGroupsForRows,
  parseSerializedTableRowGroups,
  resolveMergedSplitIndex,
  resolveMergedTableRows,
  resolveSplitTableRows
} from '../tablePaginationUtils'

function createMockNode(
  typeName: string,
  children: ProseMirrorNode[] = [],
  attrs: Record<string, unknown> = {},
  typeOverrides: Record<string, unknown> = {}
): ProseMirrorNode {
  return {
    type: {
      name: typeName,
      ...typeOverrides
    },
    attrs,
    childCount: children.length,
    nodeSize: Math.max(2, children.reduce((total, child) => total + child.nodeSize, 0) + 2),
    forEach: (callback: (node: ProseMirrorNode, offset: number, index: number) => void) => {
      let offset = 0
      children.forEach((child, index) => {
        callback(child, offset, index)
        offset += child.nodeSize
      })
    },
    child: (index: number) => children[index]
  } as unknown as ProseMirrorNode
}

function createCell(typeName: 'tableCell' | 'tableHeader', attrs: Record<string, unknown> = {}) {
  return createMockNode(typeName, [], attrs)
}

function createRow(cells: ProseMirrorNode[], attrs: Record<string, unknown> = {}) {
  return createMockNode('tableRow', cells, attrs)
}

function createRowGroup(rows: ProseMirrorNode[]) {
  return createMockNode('tableRowGroup', rows)
}

function createTable(children: ProseMirrorNode[], attrs: Record<string, unknown> = {}) {
  return createMockNode('table', children, attrs)
}

describe('tablePaginationUtils', () => {
  it('counts logical rows across grouped table content', () => {
    const headerRow = createRow([createCell('tableHeader'), createCell('tableHeader')])
    const bodyRowOne = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowTwo = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createTable([createRowGroup([headerRow, bodyRowOne, bodyRowTwo])])

    expect(getTableRowCount(table)).toBe(3)
  })

  it('splits logical rows and repeats the header row when requested', () => {
    const headerRow = createRow([createCell('tableHeader'), createCell('tableHeader')])
    const bodyRowOne = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowTwo = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowThree = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createTable([headerRow, bodyRowOne, bodyRowTwo, bodyRowThree])

    expect(resolveSplitTableRows(table, 2, { repeatHeaderRow: true })).toEqual({
      safeSplitIndex: 2,
      leadingRows: [headerRow, bodyRowOne],
      continuationRows: [headerRow, bodyRowTwo, bodyRowThree]
    })
  })

  it('drops the repeated second-table header when merging fragments', () => {
    const headerRow = createRow([createCell('tableHeader'), createCell('tableHeader')])
    const bodyRowOne = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowTwo = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowThree = createRow([createCell('tableCell'), createCell('tableCell')])
    const firstTable = createTable([headerRow, bodyRowOne])
    const secondTable = createTable([headerRow, bodyRowTwo, bodyRowThree])

    expect(resolveMergedTableRows(firstTable, secondTable)).toEqual([headerRow, bodyRowOne, bodyRowTwo, bodyRowThree])
  })

  it('maps a second-fragment local split index back onto the merged logical table', () => {
    const headerRow = createRow([createCell('tableHeader'), createCell('tableHeader')])
    const bodyRowOne = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowTwo = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowThree = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowFour = createRow([createCell('tableCell'), createCell('tableCell')])
    const firstTable = createTable([headerRow, bodyRowOne, bodyRowTwo])
    const secondTable = createTable([headerRow, bodyRowThree, bodyRowFour])

    expect(resolveMergedSplitIndex(firstTable, secondTable, 2)).toBe(4)
  })

  it('serializes logical row groups for runtime metadata', () => {
    const groupedRows = [
      createRow([createCell('tableCell', { rowspan: 2 }), createCell('tableCell')]),
      createRow([createCell('tableCell')]),
      createRow([createCell('tableCell')])
    ]
    const table = createTable(groupedRows)

    expect(getSerializedTableRowGroups(table)).toBe('0-1,2-2')
    expect(getSerializedTableRowGroupsForRows(groupedRows)).toBe('0-1,2-2')
  })

  it('reuses stored runtime row groups when the table metadata is present', () => {
    const firstRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const thirdRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createTable([firstRow, secondRow, thirdRow], {
      paginationRowGroups: '0-1,2-2'
    })

    expect(getTableRowGroups(table)).toEqual([
      { startIndex: 0, endIndex: 1 },
      { startIndex: 2, endIndex: 2 }
    ])
  })

  it('ignores malformed serialized row-group metadata', () => {
    expect(parseSerializedTableRowGroups('0-2,bad,4-3,5-6')).toEqual([
      { startIndex: 0, endIndex: 2 },
      { startIndex: 5, endIndex: 6 }
    ])
  })

  it('keeps split/merge table children flat even when rowspan groups exist', () => {
    const rows = [
      createRow([createCell('tableCell', { rowspan: 2 }), createCell('tableCell')]),
      createRow([createCell('tableCell')]),
      createRow([createCell('tableCell')])
    ]
    const table = createTable(rows)

    const children = buildTableChildrenFromRows(table, rows)

    expect(children).toEqual(rows)
  })

  it('resolves logical row positions across grouped content', () => {
    const headerRow = createRow([createCell('tableHeader'), createCell('tableHeader')])
    const bodyRowOne = createRow([createCell('tableCell'), createCell('tableCell')])
    const bodyRowTwo = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createTable([createRowGroup([headerRow, bodyRowOne]), bodyRowTwo])

    expect(getTableRowEntries(table, 10)).toEqual([
      {
        node: headerRow,
        rowIndex: 0,
        rowPos: 12
      },
      {
        node: bodyRowOne,
        rowIndex: 1,
        rowPos: 18
      },
      {
        node: bodyRowTwo,
        rowIndex: 2,
        rowPos: 25
      }
    ])
  })
})
