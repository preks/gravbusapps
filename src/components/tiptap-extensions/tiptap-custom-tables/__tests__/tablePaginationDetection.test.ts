import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { PaginationLayoutTableFragment } from '../../tiptap-custom-pagination/layoutTableFragmentsBridge'
import {
  findAdjacentPaginationTableFragments,
  findOverflowingTableSplitCandidatesFromLayoutFragments,
  findOverflowingTableSplitCandidates,
  hasPendingTableMeasurements
} from '../tablePaginationDetection'

type DescendantsCallback = Parameters<ProseMirrorNode['descendants']>[0]
type DescendantsNode = Pick<ProseMirrorNode, 'descendants'>

function createMockNode(
  typeName: string,
  children: ProseMirrorNode[] = [],
  attrs: Record<string, unknown> = {}
): ProseMirrorNode {
  const node = {
    type: {
      name: typeName
    },
    attrs,
    childCount: children.length,
    nodeSize: Math.max(2, children.length + 2),
    child: (index: number) => children[index],
    forEach: (callback: (child: ProseMirrorNode, offset: number, index: number) => void) => {
      let offset = 0
      children.forEach((child, index) => {
        callback(child, offset, index)
        offset += child.nodeSize
      })
    },
    descendants: (callback: DescendantsCallback) => {
      let pos = 0

      children.forEach((child, index) => {
        const result = callback(child, pos, node as ProseMirrorNode, index)
        if (result !== false && typeof (child as Partial<DescendantsNode>).descendants === 'function') {
          ;(child as DescendantsNode).descendants(callback)
        }
        pos += child.nodeSize
      })
    }
  }

  return node as unknown as ProseMirrorNode
}

function createTable(splitId: string | null, nodeSize = 12, chainId = splitId ?? 'pagination-chain-single') {
  return {
    ...createMockNode(
      'table',
      [],
      splitId ? { paginationChainId: chainId, paginationSplitId: splitId } : { paginationChainId: chainId }
    ),
    nodeSize
  } as ProseMirrorNode
}

function createTableWithRows(
  rows: ProseMirrorNode[],
  splitId: string | null,
  nodeSize = 12,
  chainId = splitId ?? 'pagination-chain-single'
) {
  return {
    ...createMockNode(
      'table',
      rows,
      splitId ? { paginationChainId: chainId, paginationSplitId: splitId } : { paginationChainId: chainId }
    ),
    nodeSize
  } as ProseMirrorNode
}

function createCell(typeName: 'tableCell' | 'tableHeader', attrs: Record<string, unknown> = {}) {
  return createMockNode(typeName, [], attrs)
}

function createRow(cells: ProseMirrorNode[]) {
  return createMockNode('tableRow', cells)
}

function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left ?? 0,
      y: rect.top,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left ?? 0,
      right: rect.right ?? 100,
      width: (rect.right ?? 100) - (rect.left ?? 0),
      height: rect.bottom - rect.top,
      toJSON: () => ''
    })
  })
}

describe('tablePaginationDetection', () => {
  it('finds adjacent pagination fragments with the same split id', () => {
    const firstTable = createTable('pagination-split-1', 10)
    const secondTable = createTable('pagination-split-1', 14)
    const doc = createMockNode('doc', [firstTable, secondTable])

    expect(findAdjacentPaginationTableFragments(doc)).toEqual({
      firstTablePos: 0,
      secondTablePos: 10,
      paginationChainKey: 'pagination-split-1',
      paginationSplitId: 'pagination-split-1'
    })
  })

  it('skips non-adjacent or unrelated tables', () => {
    const firstTable = createTable('pagination-split-1', 10)
    const paragraph = {
      ...createMockNode('paragraph', []),
      nodeSize: 6
    } as ProseMirrorNode
    const secondTable = createTable('pagination-split-1', 14)
    const thirdTable = createTable('pagination-split-2', 8)
    const doc = createMockNode('doc', [firstTable, paragraph, secondTable, thirdTable])

    expect(findAdjacentPaginationTableFragments(doc)).toBeNull()
  })

  it('falls back to DOM row order when row nodeDOM lookup is unavailable', () => {
    const firstRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createMockNode('table', [firstRow, secondRow], {
      paginationChainId: 'pagination-chain-1'
    })
    const doc = createMockNode('doc', [table])

    const editorDom = document.createElement('div')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')
    const secondRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.append(firstRowDom, secondRowDom)
    editorDom.appendChild(tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(tableDom, { top: 10, bottom: 130 })
    setRect(firstRowDom, { top: 10, bottom: 40 })
    setRect(secondRowDom, { top: 60, bottom: 130 })

    const view = {
      dom: editorDom,
      state: {
        doc
      },
      nodeDOM: (pos: number) => {
        if (pos === 0) {
          return tableDom
        }

        return null
      }
    } as never

    try {
      expect(
        findOverflowingTableSplitCandidates(view, [
          {
            pageNumber: 1,
            top: 0,
            bottom: 100
          }
        ])
      ).toEqual([
        {
          mode: 'split',
          tablePos: 0,
          splitRowIndex: 1,
          paginationChainKey: 'pagination-chain-1',
          paginationSplitId: null
        }
      ])
    } finally {
      editorDom.remove()
    }
  })

  it('reads the editor frame once during fallback split detection', () => {
    const firstRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createMockNode('table', [firstRow, secondRow], {
      paginationChainId: 'pagination-chain-editor-frame'
    })
    const doc = createMockNode('doc', [table])

    const editorDom = document.createElement('div')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')
    const secondRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.append(firstRowDom, secondRowDom)
    editorDom.appendChild(tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(tableDom, { top: 10, bottom: 130 })
    setRect(firstRowDom, { top: 10, bottom: 40 })
    setRect(secondRowDom, { top: 60, bottom: 130 })

    let editorRectReadCount = 0
    Object.defineProperty(editorDom, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        editorRectReadCount += 1
        return {
          x: 0,
          y: 0,
          top: 0,
          bottom: 400,
          left: 0,
          right: 100,
          width: 100,
          height: 400,
          toJSON: () => ''
        }
      }
    })

    const view = {
      dom: editorDom,
      state: {
        doc
      },
      nodeDOM: (pos: number) => {
        if (pos === 0) {
          return tableDom
        }

        return null
      }
    } as never

    try {
      expect(
        findOverflowingTableSplitCandidates(view, [
          {
            pageNumber: 1,
            top: 0,
            bottom: 100
          }
        ])
      ).toEqual([
        {
          mode: 'split',
          tablePos: 0,
          splitRowIndex: 1,
          paginationChainKey: 'pagination-chain-editor-frame',
          paginationSplitId: null
        }
      ])
      expect(editorRectReadCount).toBe(1)
    } finally {
      editorDom.remove()
    }
  })

  it('continues scanning for the first valid safe split after an unsafe overflowing rowspan group', () => {
    const firstRow = createRow([createCell('tableCell', { rowspan: 2 }), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const thirdRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createMockNode('table', [firstRow, secondRow, thirdRow], {
      paginationChainId: 'pagination-chain-rowspan'
    })
    const doc = createMockNode('doc', [table])

    const editorDom = document.createElement('div')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')
    const secondRowDom = document.createElement('tr')
    const thirdRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.append(firstRowDom, secondRowDom, thirdRowDom)
    editorDom.appendChild(tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(tableDom, { top: 10, bottom: 180 })
    setRect(firstRowDom, { top: 10, bottom: 40 })
    setRect(secondRowDom, { top: 60, bottom: 130 })
    setRect(thirdRowDom, { top: 140, bottom: 170 })

    const view = {
      dom: editorDom,
      state: {
        doc
      },
      nodeDOM: (pos: number) => {
        if (pos === 0) return tableDom
        if (pos === 1) return firstRowDom
        if (pos === 5) return secondRowDom
        if (pos === 9) return thirdRowDom
        return null
      }
    } as never

    try {
      expect(
        findOverflowingTableSplitCandidates(view, [
          {
            pageNumber: 1,
            top: 0,
            bottom: 100
          }
        ])
      ).toEqual([
        {
          mode: 'split',
          tablePos: 0,
          splitRowIndex: 2,
          paginationChainKey: 'pagination-chain-rowspan',
          paginationSplitId: null
        }
      ])
    } finally {
      editorDom.remove()
    }
  })

  it('falls back to normal overflow scanning when pushed-table rebalance has no safe split', () => {
    const firstRow = createRow([createCell('tableCell', { rowspan: 2 }), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const thirdRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const paragraph = {
      ...createMockNode('paragraph', []),
      nodeSize: 6
    } as ProseMirrorNode
    const table = createMockNode('table', [firstRow, secondRow, thirdRow], {
      paginationChainId: 'pagination-chain-pushed'
    })
    const doc = createMockNode('doc', [paragraph, table])

    const editorDom = document.createElement('div')
    const previousContentDom = document.createElement('p')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')
    const secondRowDom = document.createElement('tr')
    const thirdRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.append(firstRowDom, secondRowDom, thirdRowDom)
    editorDom.append(previousContentDom, tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 500 })
    setRect(previousContentDom, { top: 20, bottom: 40 })
    setRect(tableDom, { top: 120, bottom: 260 })
    setRect(firstRowDom, { top: 120, bottom: 150 })
    setRect(secondRowDom, { top: 170, bottom: 230 })
    setRect(thirdRowDom, { top: 240, bottom: 260 })

    const view = {
      dom: editorDom,
      state: {
        doc
      },
      nodeDOM: (pos: number) => {
        if (pos === 6) return tableDom
        if (pos === 7) return firstRowDom
        if (pos === 11) return secondRowDom
        if (pos === 15) return thirdRowDom
        return null
      }
    } as never

    try {
      expect(
        findOverflowingTableSplitCandidates(view, [
          {
            pageNumber: 1,
            top: 0,
            bottom: 100
          },
          {
            pageNumber: 2,
            top: 110,
            bottom: 210
          }
        ])
      ).toEqual([
        {
          mode: 'split',
          tablePos: 6,
          splitRowIndex: 2,
          paginationChainKey: 'pagination-chain-pushed',
          paginationSplitId: null
        }
      ])
    } finally {
      editorDom.remove()
    }
  })

  it('reports pending table measurements when not all table rows are mounted yet', () => {
    const firstRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createMockNode('table', [firstRow, secondRow], {
      paginationChainId: 'pagination-chain-pending'
    })
    const doc = createMockNode('doc', [table])

    const editorDom = document.createElement('div')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.appendChild(firstRowDom)
    editorDom.appendChild(tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(tableDom, { top: 10, bottom: 130 })
    setRect(firstRowDom, { top: 10, bottom: 40 })

    Object.defineProperty(tableDom, 'offsetHeight', { configurable: true, value: 120 })
    Object.defineProperty(tableDom, 'clientHeight', { configurable: true, value: 120 })
    Object.defineProperty(tableDom, 'scrollHeight', { configurable: true, value: 120 })

    try {
      expect(
        hasPendingTableMeasurements({
          dom: editorDom,
          state: {
            doc
          },
          nodeDOM: (pos: number) => {
            if (pos === 0) return tableDom
            if (pos === 1) return firstRowDom
            return null
          }
        } as never)
      ).toBe(true)
    } finally {
      editorDom.remove()
    }
  })

  it('does not report pending table measurements once every table row is measurable', () => {
    const firstRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createMockNode('table', [firstRow, secondRow], {
      paginationChainId: 'pagination-chain-ready'
    })
    const doc = createMockNode('doc', [table])

    const editorDom = document.createElement('div')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')
    const secondRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.append(firstRowDom, secondRowDom)
    editorDom.appendChild(tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(tableDom, { top: 10, bottom: 130 })
    setRect(firstRowDom, { top: 10, bottom: 40 })
    setRect(secondRowDom, { top: 60, bottom: 120 })

    Object.defineProperty(tableDom, 'offsetHeight', { configurable: true, value: 120 })
    Object.defineProperty(tableDom, 'clientHeight', { configurable: true, value: 120 })
    Object.defineProperty(tableDom, 'scrollHeight', { configurable: true, value: 120 })

    try {
      expect(
        hasPendingTableMeasurements({
          dom: editorDom,
          state: {
            doc
          },
          nodeDOM: (pos: number) => {
            if (pos === 0) return tableDom
            if (pos === 1) return firstRowDom
            if (pos === 5) return secondRowDom
            return null
          }
        } as never)
      ).toBe(false)
    } finally {
      editorDom.remove()
    }
  })

  it('indexes fallback table rows once when checking pending measurements', () => {
    const firstRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const secondRow = createRow([createCell('tableCell'), createCell('tableCell')])
    const table = createMockNode('table', [firstRow, secondRow], {
      paginationChainId: 'pagination-chain-cached-rows'
    })
    const doc = createMockNode('doc', [table])

    const editorDom = document.createElement('div')
    const tableDom = document.createElement('table')
    const tbody = document.createElement('tbody')
    const firstRowDom = document.createElement('tr')
    const secondRowDom = document.createElement('tr')

    tableDom.appendChild(tbody)
    tbody.append(firstRowDom, secondRowDom)
    editorDom.appendChild(tableDom)
    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 400 })
    setRect(tableDom, { top: 10, bottom: 130 })
    setRect(firstRowDom, { top: 10, bottom: 40 })
    setRect(secondRowDom, { top: 60, bottom: 120 })

    Object.defineProperty(tableDom, 'offsetHeight', { configurable: true, value: 120 })
    Object.defineProperty(tableDom, 'clientHeight', { configurable: true, value: 120 })
    Object.defineProperty(tableDom, 'scrollHeight', { configurable: true, value: 120 })

    let rowsAccessCount = 0
    Object.defineProperty(tableDom, 'rows', {
      configurable: true,
      get: () => {
        rowsAccessCount += 1
        return [firstRowDom, secondRowDom]
      }
    })

    try {
      expect(
        hasPendingTableMeasurements({
          dom: editorDom,
          state: {
            doc
          },
          nodeDOM: (pos: number) => {
            if (pos === 0) return tableDom
            return null
          }
        } as never)
      ).toBe(false)
      expect(rowsAccessCount).toBe(1)
    } finally {
      editorDom.remove()
    }
  })

  it('narrows fragment-guided split scans to pressured fragments and immediate neighbors', () => {
    const createSimpleTable = () =>
      createTableWithRows(
        [createRow([createCell('tableCell')]), createRow([createCell('tableCell')])],
        null,
        10,
        'pagination-chain-fragment-guided'
      )

    const firstTable = createSimpleTable()
    const secondTable = createSimpleTable()
    const thirdTable = createSimpleTable()
    const fourthTable = createSimpleTable()
    const doc = createMockNode('doc', [firstTable, secondTable, thirdTable, fourthTable])

    const editorDom = document.createElement('div')
    const tableElements = Array.from({ length: 4 }, () => document.createElement('table'))
    const rowElements = tableElements.map(() => [document.createElement('tr'), document.createElement('tr')])

    tableElements.forEach((tableDom, index) => {
      const tbody = document.createElement('tbody')
      tbody.append(...rowElements[index])
      tableDom.appendChild(tbody)
      editorDom.appendChild(tableDom)
    })

    document.body.appendChild(editorDom)

    setRect(editorDom, { top: 0, bottom: 520 })
    setRect(tableElements[0], { top: 10, bottom: 80 })
    setRect(rowElements[0][0], { top: 10, bottom: 35 })
    setRect(rowElements[0][1], { top: 50, bottom: 80 })
    setRect(tableElements[1], { top: 110, bottom: 250 })
    setRect(rowElements[1][0], { top: 110, bottom: 145 })
    setRect(rowElements[1][1], { top: 180, bottom: 250 })
    setRect(tableElements[2], { top: 230, bottom: 300 })
    setRect(rowElements[2][0], { top: 230, bottom: 255 })
    setRect(rowElements[2][1], { top: 270, bottom: 300 })
    setRect(tableElements[3], { top: 330, bottom: 470 })
    setRect(rowElements[3][0], { top: 330, bottom: 365 })
    setRect(rowElements[3][1], { top: 400, bottom: 470 })

    const layoutTableFragments: PaginationLayoutTableFragment[] = [
      {
        tablePos: 0,
        pageNumbers: [1],
        rowCount: 2,
        paginationChainKey: 'pagination-chain-fragment-guided',
        paginationSplitId: null,
        fragmentIndex: 0,
        fragmentCount: 4
      },
      {
        tablePos: 10,
        pageNumbers: [2, 3],
        rowCount: 2,
        paginationChainKey: 'pagination-chain-fragment-guided',
        paginationSplitId: null,
        fragmentIndex: 1,
        fragmentCount: 4
      },
      {
        tablePos: 20,
        pageNumbers: [3],
        rowCount: 2,
        paginationChainKey: 'pagination-chain-fragment-guided',
        paginationSplitId: null,
        fragmentIndex: 2,
        fragmentCount: 4
      },
      {
        tablePos: 30,
        pageNumbers: [4],
        rowCount: 2,
        paginationChainKey: 'pagination-chain-fragment-guided',
        paginationSplitId: null,
        fragmentIndex: 3,
        fragmentCount: 4
      }
    ]

    const view = {
      dom: editorDom,
      state: {
        doc
      },
      nodeDOM: (pos: number) => {
        switch (pos) {
          case 0:
            return tableElements[0]
          case 1:
            return rowElements[0][0]
          case 5:
            return rowElements[0][1]
          case 10:
            return tableElements[1]
          case 11:
            return rowElements[1][0]
          case 15:
            return rowElements[1][1]
          case 20:
            return tableElements[2]
          case 21:
            return rowElements[2][0]
          case 25:
            return rowElements[2][1]
          case 30:
            return tableElements[3]
          case 31:
            return rowElements[3][0]
          case 35:
            return rowElements[3][1]
          default:
            return null
        }
      }
    } as never

    try {
      expect(
        findOverflowingTableSplitCandidatesFromLayoutFragments(
          view,
          [
            { pageNumber: 1, top: 0, bottom: 100 },
            { pageNumber: 2, top: 100, bottom: 200 },
            { pageNumber: 3, top: 200, bottom: 320 },
            { pageNumber: 4, top: 320, bottom: 430 }
          ],
          layoutTableFragments
        )
      ).toEqual([
        {
          mode: 'split',
          tablePos: 10,
          splitRowIndex: 1,
          paginationChainKey: 'pagination-chain-fragment-guided',
          paginationSplitId: null
        }
      ])
    } finally {
      editorDom.remove()
    }
  })
})
