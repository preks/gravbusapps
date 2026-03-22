import type { EditorView } from '@tiptap/pm/view'
import { createTablePaginationController } from '../tablePaginationController'
import { findMergeableTableFragmentCandidates, findOverflowingTableSplitCandidates } from '../tablePaginationDetection'
import { splitTableAtRow } from '../tableSelectionUtils'

jest.mock('../tablePaginationDetection', () => ({
  findMergeableTableFragmentCandidates: jest.fn(),
  findOverflowingTableSplitCandidates: jest.fn()
}))

jest.mock('../tableSelectionUtils', () => ({
  splitTableAtRow: jest.fn()
}))

const mockedFindMergeCandidates = jest.mocked(findMergeableTableFragmentCandidates)
const mockedFindSplitCandidates = jest.mocked(findOverflowingTableSplitCandidates)
const mockedSplitTableAtRow = jest.mocked(splitTableAtRow)

function createView() {
  const transaction = {
    setMeta: jest.fn().mockReturnThis()
  }

  return {
    state: {
      tr: transaction
    }
  } as unknown as EditorView
}

describe('tablePaginationController', () => {
  beforeEach(() => {
    mockedFindMergeCandidates.mockReset()
    mockedFindSplitCandidates.mockReset()
    mockedSplitTableAtRow.mockReset()
  })

  it('moves on to another chain after one split candidate is rejected twice', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const splitCandidates = [
      {
        mode: 'split' as const,
        tablePos: 10,
        splitRowIndex: 2,
        paginationChainKey: 'chain-a',
        paginationSplitId: null
      },
      {
        mode: 'split' as const,
        tablePos: 40,
        splitRowIndex: 3,
        paginationChainKey: 'chain-b',
        paginationSplitId: null
      }
    ]

    mockedFindSplitCandidates.mockImplementation(() => splitCandidates)
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toEqual({
      type: 'request-refresh',
      scheduleEvaluation: true
    })

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toEqual({
      type: 'none'
    })

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toEqual({
      type: 'none'
    })

    const fourthResult = controller.evaluate({
      view,
      currentPageCount: 2,
      measuredPageCount: 2,
      heuristics: { allowMerge: true, allowSplit: true },
      bodyBands: []
    })

    expect(fourthResult).toMatchObject({
      type: 'dispatch',
      scheduleEvaluation: true
    })
    expect(mockedSplitTableAtRow).toHaveBeenLastCalledWith(view.state, view.state.tr, 40, 3)
  })

  it('remembers the preferred split chain across the refresh pass', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const splitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-preferred',
      paginationSplitId: null
    }

    mockedFindSplitCandidates.mockImplementation(() => [splitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 1,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toEqual({
      type: 'refresh',
      pageCount: 2,
      scheduleEvaluation: true
    })

    const stablePassResult = controller.evaluate({
      view,
      currentPageCount: 2,
      measuredPageCount: 2,
      heuristics: { allowMerge: true, allowSplit: true },
      bodyBands: []
    })

    expect(stablePassResult).toMatchObject({
      type: 'dispatch',
      scheduleEvaluation: true
    })
    expect(mockedSplitTableAtRow).toHaveBeenCalledWith(view.state, view.state.tr, 22, 4)
  })
})
