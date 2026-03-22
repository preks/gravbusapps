import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { findAdjacentPaginationTableFragments, findOverflowingTableSplitCandidates } from '../tablePaginationDetection'

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
    descendants: (callback: (child: ProseMirrorNode, pos: number) => boolean | void) => {
      let pos = 0

      children.forEach(child => {
        const result = callback(child, pos)
        if (result !== false && typeof (child as { descendants?: typeof callback }).descendants === 'function') {
          ;(child as { descendants: typeof callback }).descendants(callback)
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
})
