import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  getTableRowCount,
  resolveMergedSplitIndex,
  resolveMergedTableRows,
  resolveSplitTableRows
} from '../tablePaginationUtils'

function createMockNode(
  typeName: string,
  children: ProseMirrorNode[] = [],
  attrs: Record<string, unknown> = {}
): ProseMirrorNode {
  return {
    type: {
      name: typeName
    },
    attrs,
    childCount: children.length,
    forEach: (callback: (node: ProseMirrorNode, offset: number, index: number) => void) => {
      children.forEach((child, index) => {
        callback(child, index, index)
      })
    }
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
    const table = createTable([createRowGroup([headerRow, bodyRowOne, bodyRowTwo, bodyRowThree])])

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
})
