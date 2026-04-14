import type { EditorView } from '@tiptap/pm/view'
import { createTablePaginationController, resolveTablePaginationCandidateAuthority } from '../tablePaginationController'
import {
  findMergeableTableFragmentCandidates,
  findMergeableTableFragmentCandidatesFromLayoutFragments,
  findOverflowingTableSplitCandidates,
  findOverflowingTableSplitCandidatesFromLayoutFragments
} from '../tablePaginationDetection'
import {
  mergeAdjacentPaginationTables,
  rebalanceAdjacentPaginationTables,
  splitTableAtRow
} from '../tableSelectionUtils'

jest.mock('../tablePaginationDetection', () => ({
  findMergeableTableFragmentCandidates: jest.fn(),
  findMergeableTableFragmentCandidatesFromLayoutFragments: jest.fn(),
  findOverflowingTableSplitCandidatesFromLayoutFragments: jest.fn(),
  findOverflowingTableSplitCandidates: jest.fn()
}))

jest.mock('../tableSelectionUtils', () => ({
  mergeAdjacentPaginationTables: jest.fn(),
  rebalanceAdjacentPaginationTables: jest.fn(),
  splitTableAtRow: jest.fn()
}))

const mockedFindMergeCandidates = jest.mocked(findMergeableTableFragmentCandidates)
const mockedFindFragmentMergeCandidates = jest.mocked(findMergeableTableFragmentCandidatesFromLayoutFragments)
const mockedFindSplitCandidates = jest.mocked(findOverflowingTableSplitCandidates)
const mockedFindFragmentSplitCandidates = jest.mocked(findOverflowingTableSplitCandidatesFromLayoutFragments)
const mockedMergeAdjacentPaginationTables = jest.mocked(mergeAdjacentPaginationTables)
const mockedRebalanceAdjacentPaginationTables = jest.mocked(rebalanceAdjacentPaginationTables)
const mockedSplitTableAtRow = jest.mocked(splitTableAtRow)

function createLayoutTableFragmentsState(
  fragments: Array<{
    tablePos: number
    pageNumbers: number[]
    rowCount: number
    paginationChainKey: string
    paginationSplitId: string | null
    fragmentIndex: number
    fragmentCount: number
  }>,
  status: 'missing' | 'stale-doc' | 'stale-layout' | 'ready' = 'ready'
) {
  return {
    fragments,
    status,
    documentVersion: 3,
    layoutVersion: 7
  }
}

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
    mockedFindFragmentMergeCandidates.mockReset().mockReturnValue([])
    mockedFindSplitCandidates.mockReset()
    mockedFindFragmentSplitCandidates.mockReset().mockReturnValue([])
    mockedMergeAdjacentPaginationTables.mockReset()
    mockedRebalanceAdjacentPaginationTables.mockReset()
    mockedSplitTableAtRow.mockReset()
  })

  it('prefers legacy candidates when layout fragment parity is unavailable', () => {
    const splitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-a',
      paginationSplitId: null
    }

    expect(
      resolveTablePaginationCandidateAuthority({
        layoutTableFragmentsState: createLayoutTableFragmentsState([], 'missing'),
        legacySplitCandidates: [splitCandidate],
        legacyMergeCandidates: [],
        fragmentGuidedSplitCandidates: [],
        fragmentGuidedMergeCandidates: []
      })
    ).toMatchObject({
      authority: 'legacy-dom',
      parityStatus: 'unavailable',
      splitCandidates: [splitCandidate],
      mergeCandidates: []
    })
  })

  it('falls back to legacy candidates when fragment-guided candidates do not match parity', () => {
    const legacySplitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-a',
      paginationSplitId: null
    }
    const fragmentSplitCandidate = {
      mode: 'split' as const,
      tablePos: 40,
      splitRowIndex: 3,
      paginationChainKey: 'chain-b',
      paginationSplitId: null
    }

    expect(
      resolveTablePaginationCandidateAuthority({
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1, 2],
            rowCount: 8,
            paginationChainKey: 'chain-a',
            paginationSplitId: null,
            fragmentIndex: 0,
            fragmentCount: 1
          }
        ]),
        legacySplitCandidates: [legacySplitCandidate],
        legacyMergeCandidates: [],
        fragmentGuidedSplitCandidates: [fragmentSplitCandidate],
        fragmentGuidedMergeCandidates: []
      })
    ).toMatchObject({
      authority: 'legacy-dom',
      parityStatus: 'mismatch',
      splitCandidates: [legacySplitCandidate],
      mergeCandidates: []
    })
  })

  it('allows fragment-guided authority when candidate keys match exactly', () => {
    const splitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-a',
      paginationSplitId: null
    }

    expect(
      resolveTablePaginationCandidateAuthority({
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1, 2],
            rowCount: 8,
            paginationChainKey: 'chain-a',
            paginationSplitId: null,
            fragmentIndex: 0,
            fragmentCount: 1
          }
        ]),
        legacySplitCandidates: [splitCandidate],
        legacyMergeCandidates: [],
        fragmentGuidedSplitCandidates: [splitCandidate],
        fragmentGuidedMergeCandidates: []
      })
    ).toMatchObject({
      authority: 'layout-fragment-guided',
      parityStatus: 'match',
      splitCandidates: [splitCandidate],
      mergeCandidates: []
    })
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

  it('reuses the initial split candidate scan within a single evaluation', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const splitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-single-scan-split',
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
      candidateKey: 'chain-single-scan-split:split:22:4',
      scheduleEvaluation: true
    })

    expect(mockedFindSplitCandidates).toHaveBeenCalledTimes(1)
    expect(mockedFindMergeCandidates).not.toHaveBeenCalled()
  })

  it('does not suppress split dispatch for a single fragment table that only spans multiple pages', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const splitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-fragment-stable',
      paginationSplitId: null
    }

    mockedFindSplitCandidates.mockReturnValue([splitCandidate])
    mockedFindFragmentSplitCandidates.mockReturnValue([splitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1, 2],
            rowCount: 8,
            paginationChainKey: 'chain-fragment-stable',
            paginationSplitId: null,
            fragmentIndex: 0,
            fragmentCount: 1
          }
        ])
      })
    ).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-fragment-stable:split:22:4',
      scheduleEvaluation: true
    })

    expect(mockedSplitTableAtRow).toHaveBeenCalledWith(view.state, view.state.tr, 22, 4)
  })

  it('settles a parity-matched split chain after one successful structural pass even if the candidate key shifts', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const initialSplitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-fragment-split',
      paginationSplitId: 'pagination-split-fragment'
    }
    const followUpSplitCandidate = {
      mode: 'split' as const,
      tablePos: 40,
      splitRowIndex: 3,
      paginationChainKey: 'chain-fragment-split',
      paginationSplitId: 'pagination-split-fragment'
    }

    mockedFindSplitCandidates.mockReturnValueOnce([initialSplitCandidate]).mockReturnValue([followUpSplitCandidate])
    mockedFindFragmentSplitCandidates
      .mockReturnValueOnce([initialSplitCandidate])
      .mockReturnValue([followUpSplitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-split',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 40,
            pageNumbers: [2],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-split',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-fragment-split:split:22:4',
      scheduleEvaluation: true
    })

    expect(mockedSplitTableAtRow).toHaveBeenCalledWith(view.state, view.state.tr, 22, 4)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-split',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 40,
            pageNumbers: [2],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-split',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toEqual({
      type: 'none',
      progress: 'none',
      reason: 'layout-fragment-pagination-satisfied'
    })

    expect(mockedSplitTableAtRow).toHaveBeenCalledTimes(1)
  })

  it('contains already split chains when fragment parity mismatches', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const legacySplitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-fragment-split-mismatch',
      paginationSplitId: 'pagination-split-fragment'
    }
    const fragmentSplitCandidate = {
      mode: 'split' as const,
      tablePos: 40,
      splitRowIndex: 3,
      paginationChainKey: 'chain-fragment-split-mismatch',
      paginationSplitId: 'pagination-split-fragment'
    }

    mockedFindSplitCandidates.mockReturnValue([legacySplitCandidate])
    mockedFindFragmentSplitCandidates.mockReturnValue([fragmentSplitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-split-mismatch',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 40,
            pageNumbers: [2],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-split-mismatch',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toEqual({
      type: 'none',
      progress: 'none',
      reason: 'candidate-parity-mismatch'
    })

    expect(mockedSplitTableAtRow).not.toHaveBeenCalled()
  })

  it('does not accept page-count refreshes while fragment parity mismatches', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const legacySplitCandidate = {
      mode: 'split' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-fragment-refresh-mismatch',
      paginationSplitId: 'pagination-split-fragment'
    }
    const fragmentSplitCandidate = {
      mode: 'split' as const,
      tablePos: 40,
      splitRowIndex: 3,
      paginationChainKey: 'chain-fragment-refresh-mismatch',
      paginationSplitId: 'pagination-split-fragment'
    }

    mockedFindSplitCandidates.mockReturnValue([legacySplitCandidate])
    mockedFindFragmentSplitCandidates.mockReturnValue([fragmentSplitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])

    expect(
      controller.evaluate({
        view,
        currentPageCount: 41,
        measuredPageCount: 21,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [20],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-refresh-mismatch',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 40,
            pageNumbers: [21],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-refresh-mismatch',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toEqual({
      type: 'none',
      progress: 'none',
      reason: 'candidate-parity-mismatch'
    })

    expect(mockedSplitTableAtRow).not.toHaveBeenCalled()
  })

  it('settles a parity-matched rebalance chain after one successful structural pass even if the candidate key shifts', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const initialSplitCandidate = {
      mode: 'rebalance' as const,
      tablePos: 22,
      splitRowIndex: 4,
      paginationChainKey: 'chain-fragment-rebalance',
      paginationSplitId: 'pagination-split-fragment'
    }
    const followUpSplitCandidate = {
      mode: 'rebalance' as const,
      tablePos: 40,
      splitRowIndex: 3,
      paginationChainKey: 'chain-fragment-rebalance',
      paginationSplitId: 'pagination-split-fragment'
    }

    mockedFindSplitCandidates.mockReturnValueOnce([initialSplitCandidate]).mockReturnValue([followUpSplitCandidate])
    mockedFindFragmentSplitCandidates
      .mockReturnValueOnce([initialSplitCandidate])
      .mockReturnValue([followUpSplitCandidate])
    mockedFindMergeCandidates.mockReturnValue([])
    mockedRebalanceAdjacentPaginationTables.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-rebalance',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 40,
            pageNumbers: [2],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-rebalance',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-fragment-rebalance:rebalance:22:4',
      scheduleEvaluation: true
    })

    expect(mockedSplitTableAtRow).not.toHaveBeenCalled()
    expect(mockedRebalanceAdjacentPaginationTables).toHaveBeenCalledWith(view.state, view.state.tr, 22, 4)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-rebalance',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 40,
            pageNumbers: [2],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-rebalance',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toEqual({
      type: 'none',
      progress: 'none',
      reason: 'layout-fragment-pagination-satisfied'
    })

    expect(mockedRebalanceAdjacentPaginationTables).toHaveBeenCalledTimes(1)
  })

  it('does not let layout fragments change split candidate priority across chains', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const splitCandidates = [
      {
        mode: 'split' as const,
        tablePos: 22,
        splitRowIndex: 4,
        paginationChainKey: 'chain-fragment-stable',
        paginationSplitId: null
      },
      {
        mode: 'split' as const,
        tablePos: 40,
        splitRowIndex: 3,
        paginationChainKey: 'chain-fallback',
        paginationSplitId: null
      }
    ]

    mockedFindSplitCandidates.mockReturnValue(splitCandidates)
    mockedFindMergeCandidates.mockReturnValue([])
    mockedSplitTableAtRow.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 22,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-stable',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 30,
            pageNumbers: [2],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-stable',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toMatchObject({
      type: 'dispatch',
      progress: 'structural',
      dispatchType: 'split',
      candidateKey: 'chain-fragment-stable:split:22:4',
      scheduleEvaluation: true
    })

    expect(mockedSplitTableAtRow).toHaveBeenCalledWith(view.state, view.state.tr, 22, 4)
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

  it('suppresses merge dispatch when an existing split chain can fit again and fragment parity matches', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const mergeCandidate = {
      paginationChainKey: 'chain-fragment-merge',
      paginationSplitId: 'pagination-split-fragment',
      firstTablePos: 20,
      secondTablePos: 56
    }

    mockedFindSplitCandidates.mockReturnValue([])
    mockedFindMergeCandidates.mockReturnValue([mergeCandidate])
    mockedFindFragmentMergeCandidates.mockReturnValue([mergeCandidate])
    mockedMergeAdjacentPaginationTables.mockReturnValue(true)

    expect(
      controller.evaluate({
        view,
        currentPageCount: 2,
        measuredPageCount: 2,
        heuristics: { allowMerge: true, allowSplit: true },
        bodyBands: [],
        layoutTableFragmentsState: createLayoutTableFragmentsState([
          {
            tablePos: 20,
            pageNumbers: [1],
            rowCount: 4,
            paginationChainKey: 'chain-fragment-merge',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 0,
            fragmentCount: 2
          },
          {
            tablePos: 56,
            pageNumbers: [2],
            rowCount: 3,
            paginationChainKey: 'chain-fragment-merge',
            paginationSplitId: 'pagination-split-fragment',
            fragmentIndex: 1,
            fragmentCount: 2
          }
        ])
      })
    ).toMatchObject({
      type: 'none',
      progress: 'none',
      reason: 'layout-fragment-pagination-satisfied'
    })

    expect(mockedMergeAdjacentPaginationTables).not.toHaveBeenCalled()
  })

  it('reuses the initial merge candidate scan within a single evaluation', () => {
    const controller = createTablePaginationController('owned')
    const view = createView()
    const mergeCandidate = {
      paginationChainKey: 'chain-single-scan-merge',
      paginationSplitId: 'pagination-split-single-scan',
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
      candidateKey: 'chain-single-scan-merge:20:56',
      scheduleEvaluation: true
    })

    expect(mockedFindSplitCandidates).toHaveBeenCalledTimes(1)
    expect(mockedFindMergeCandidates).toHaveBeenCalledTimes(1)
  })
})
