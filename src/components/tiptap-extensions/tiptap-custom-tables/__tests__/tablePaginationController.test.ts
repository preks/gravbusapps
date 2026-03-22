import type { EditorView } from '@tiptap/pm/view'
import { createTablePaginationController } from '../tablePaginationController'
import { findMergeableTableFragmentCandidates, findOverflowingTableSplitCandidates } from '../tablePaginationDetection'
import { mergeAdjacentPaginationTables, splitTableAtRow } from '../tableSelectionUtils'

jest.mock('../tablePaginationDetection', () => ({
  findMergeableTableFragmentCandidates: jest.fn(),
  findOverflowingTableSplitCandidates: jest.fn()
}))

jest.mock('../tableSelectionUtils', () => ({
  mergeAdjacentPaginationTables: jest.fn(),
  splitTableAtRow: jest.fn()
}))

const mockedFindMergeCandidates = jest.mocked(findMergeableTableFragmentCandidates)
const mockedFindSplitCandidates = jest.mocked(findOverflowingTableSplitCandidates)
const mockedMergeAdjacentPaginationTables = jest.mocked(mergeAdjacentPaginationTables)
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
    mockedMergeAdjacentPaginationTables.mockReset()
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
      progress: 'refresh',
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
      type: 'none',
      progress: 'none',
      reason: 'split-returned-false-twice'
    })

    const thirdResult = controller.evaluate({
      view,
      currentPageCount: 2,
      measuredPageCount: 2,
      heuristics: { allowMerge: true, allowSplit: true },
      bodyBands: []
    })

    expect(thirdResult).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-b:split:40:3',
      scheduleEvaluation: true
    })
    expect(mockedSplitTableAtRow).toHaveBeenLastCalledWith(view.state, view.state.tr, 40, 3)
  })

  it('still refreshes upward when there is no split candidate to apply yet', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()

    mockedFindSplitCandidates.mockReturnValue([])
    mockedFindMergeCandidates.mockReturnValue([])

    expect(
      controller.evaluate({
        view,
        currentPageCount: 14,
        measuredPageCount: 26,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toEqual({
      type: 'refresh',
      pageCount: 26,
      hasSplitPressure: false,
      progress: 'refresh',
      scheduleEvaluation: true
    })
  })

  it('continues with another available chain after the preferred chain disappears', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const preferredCandidate = {
      mode: 'split' as const,
      tablePos: 10,
      splitRowIndex: 2,
      paginationChainKey: 'chain-a',
      paginationSplitId: null
    }
    const fallbackCandidate = {
      mode: 'split' as const,
      tablePos: 40,
      splitRowIndex: 3,
      paginationChainKey: 'chain-b',
      paginationSplitId: null
    }

    mockedFindSplitCandidates
      .mockImplementationOnce(() => [preferredCandidate])
      .mockImplementation(() => [fallbackCandidate])
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
      hasSplitPressure: true,
      progress: 'refresh',
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
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-b:split:40:3',
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
      hasSplitPressure: true,
      progress: 'refresh',
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
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-preferred:split:22:4',
      scheduleEvaluation: true
    })
    expect(mockedSplitTableAtRow).toHaveBeenCalledWith(view.state, view.state.tr, 22, 4)
  })

  it('stops dispatching the same split candidate again on the same stable page count', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const splitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-repeat-split',
      paginationSplitId: null
    }

    mockedFindSplitCandidates.mockImplementation(() => [splitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-repeat-split:split:22:4',
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
      type: 'none',
      progress: 'none',
      reason: 'repeat-successful-split-candidate'
    })

    expect(mockedSplitTableAtRow).toHaveBeenCalledTimes(1)
  })

  it('stops dispatching the same merge candidate again on the same stable page count', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const mergeCandidate = {
      paginationChainKey: 'chain-repeat-merge',
      paginationSplitId: 'pagination-split-repeat',
      firstTablePos: 20,
      secondTablePos: 56
    }

    mockedFindSplitCandidates.mockReturnValue([])
    mockedFindMergeCandidates.mockImplementation(() => [mergeCandidate])
    mockedMergeAdjacentPaginationTables.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: []
      })
    ).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'merge',
      candidateKey: 'chain-repeat-merge:20:56',
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
      type: 'none',
      progress: 'none',
      reason: 'repeat-successful-merge-candidate'
    })

    expect(mockedMergeAdjacentPaginationTables).toHaveBeenCalledTimes(1)
  })
})
