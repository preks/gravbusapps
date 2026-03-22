import type { Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { logPaginationDebug } from '../tiptap-custom-pagination/utils'
import {
  findMergeableTableFragmentCandidates,
  findOverflowingTableSplitCandidates,
  type MergeableTableFragmentsCandidate,
  type TableOverflowSplitCandidate,
  type TablePaginationBodyBand
} from './tablePaginationDetection'
import {
  mergeAdjacentPaginationTables,
  rebalanceAdjacentPaginationTables,
  splitTableAtRow
} from './tableSelectionUtils'

interface TablePaginationChainState {
  rejectedSplitKey: string | null
  rejectedMergeKey: string | null
  retriedSplitKey: string | null
  lastSuccessfulSplitKey: string | null
  lastSuccessfulSplitPageCount: number | null
  lastSuccessfulMergeKey: string | null
  lastSuccessfulMergePageCount: number | null
}

interface ResolveDeferredRepaginationOutcomeOptions {
  currentPageCount: number
  measuredPageCount: number
  allowMerge: boolean
  allowSplit: boolean
  preferredSplitChainKey: string | null
  splitCandidates: TableOverflowSplitCandidate[]
  mergeCandidates: MergeableTableFragmentsCandidate[]
  chainStateByKey: Map<string, TablePaginationChainState>
}

type DeferredRepaginationOutcome =
  | {
      type: 'refresh'
      preferredSplitChainKey: string | null
    }
  | {
      type: 'split'
      candidate: TableOverflowSplitCandidate
      candidateKey: string
    }
  | {
      type: 'merge'
      candidate: MergeableTableFragmentsCandidate
      candidateKey: string
    }
  | {
      type: 'none'
      preferredSplitChainKey: string | null
    }

export interface TablePaginationHeuristics {
  allowMerge: boolean
  allowSplit: boolean
}

export type TablePaginationControllerResult =
  | {
      type: 'refresh'
      pageCount: number
      progress: 'refresh'
      scheduleEvaluation: boolean
    }
  | {
      type: 'request-refresh'
      progress: 'refresh'
      scheduleEvaluation: boolean
    }
  | {
      type: 'dispatch'
      dispatchType: 'split' | 'merge'
      candidateKey: string
      progress: 'structural'
      transaction: Transaction
      scheduleEvaluation: boolean
    }
  | {
      type: 'none'
      progress: 'none'
      reason:
        | 'split-candidate-disappeared'
        | 'repeat-successful-split-candidate'
        | 'split-returned-false-twice'
        | 'merge-blocked-by-split-candidates'
        | 'merge-candidate-disappeared'
        | 'repeat-successful-merge-candidate'
        | 'merge-returned-false'
        | 'no-eligible-candidates'
    }

function summarizeSplitCandidate(candidate: TableOverflowSplitCandidate) {
  return {
    key: getSplitCandidateKey(candidate),
    paginationChainKey: candidate.paginationChainKey,
    mode: candidate.mode,
    tablePos: candidate.tablePos,
    splitRowIndex: candidate.splitRowIndex,
    paginationSplitId: candidate.paginationSplitId
  }
}

function summarizeMergeCandidate(candidate: MergeableTableFragmentsCandidate) {
  return {
    key: getMergeCandidateKey(candidate),
    paginationChainKey: candidate.paginationChainKey,
    firstTablePos: candidate.firstTablePos,
    secondTablePos: candidate.secondTablePos,
    paginationSplitId: candidate.paginationSplitId
  }
}

function getChainState(
  chainStateByKey: Map<string, TablePaginationChainState>,
  chainKey: string
): TablePaginationChainState {
  const existing = chainStateByKey.get(chainKey)
  if (existing) {
    return existing
  }

  const nextState: TablePaginationChainState = {
    rejectedSplitKey: null,
    rejectedMergeKey: null,
    retriedSplitKey: null,
    lastSuccessfulSplitKey: null,
    lastSuccessfulSplitPageCount: null,
    lastSuccessfulMergeKey: null,
    lastSuccessfulMergePageCount: null
  }
  chainStateByKey.set(chainKey, nextState)
  return nextState
}

function getSplitCandidateKey(candidate: TableOverflowSplitCandidate) {
  return `${candidate.paginationChainKey}:${candidate.mode}:${candidate.tablePos}:${candidate.splitRowIndex}`
}

function getMergeCandidateKey(candidate: MergeableTableFragmentsCandidate) {
  return `${candidate.paginationChainKey}:${candidate.firstTablePos}:${candidate.secondTablePos}`
}

function pickSplitCandidate(
  splitCandidates: TableOverflowSplitCandidate[],
  chainStateByKey: Map<string, TablePaginationChainState>,
  preferredSplitChainKey: string | null
) {
  const preferredCandidate =
    preferredSplitChainKey == null
      ? null
      : (splitCandidates.find(candidate => {
          if (candidate.paginationChainKey !== preferredSplitChainKey) {
            return false
          }

          const chainState = getChainState(chainStateByKey, candidate.paginationChainKey)
          return getSplitCandidateKey(candidate) !== chainState.rejectedSplitKey
        }) ?? null)

  if (preferredCandidate) {
    return preferredCandidate
  }

  return (
    splitCandidates.find(candidate => {
      const chainState = getChainState(chainStateByKey, candidate.paginationChainKey)
      return getSplitCandidateKey(candidate) !== chainState.rejectedSplitKey
    }) ?? null
  )
}

function pickMergeCandidate(
  mergeCandidates: MergeableTableFragmentsCandidate[],
  chainStateByKey: Map<string, TablePaginationChainState>
) {
  return (
    mergeCandidates.find(candidate => {
      const chainState = getChainState(chainStateByKey, candidate.paginationChainKey)
      return getMergeCandidateKey(candidate) !== chainState.rejectedMergeKey
    }) ?? null
  )
}

function resolveDeferredRepaginationOutcome(
  options: ResolveDeferredRepaginationOutcomeOptions
): DeferredRepaginationOutcome {
  const {
    currentPageCount,
    measuredPageCount,
    allowMerge,
    allowSplit,
    preferredSplitChainKey,
    splitCandidates,
    mergeCandidates,
    chainStateByKey
  } = options

  const splitCandidate = allowSplit
    ? pickSplitCandidate(splitCandidates, chainStateByKey, preferredSplitChainKey)
    : null
  const mergeCandidate = allowMerge ? pickMergeCandidate(mergeCandidates, chainStateByKey) : null

  if (measuredPageCount < currentPageCount && mergeCandidate && splitCandidates.length === 0) {
    return {
      type: 'merge',
      candidate: mergeCandidate,
      candidateKey: getMergeCandidateKey(mergeCandidate)
    }
  }

  if (measuredPageCount !== currentPageCount) {
    return {
      type: 'refresh',
      preferredSplitChainKey: measuredPageCount > currentPageCount ? (splitCandidate?.paginationChainKey ?? null) : null
    }
  }

  if (preferredSplitChainKey) {
    if (splitCandidate) {
      return {
        type: 'split',
        candidate: splitCandidate,
        candidateKey: getSplitCandidateKey(splitCandidate)
      }
    }

    if (mergeCandidate && splitCandidates.length === 0) {
      return {
        type: 'merge',
        candidate: mergeCandidate,
        candidateKey: getMergeCandidateKey(mergeCandidate)
      }
    }

    return {
      type: 'none',
      preferredSplitChainKey: null
    }
  }

  if (mergeCandidate && splitCandidates.length === 0) {
    return {
      type: 'merge',
      candidate: mergeCandidate,
      candidateKey: getMergeCandidateKey(mergeCandidate)
    }
  }

  if (splitCandidate) {
    return {
      type: 'split',
      candidate: splitCandidate,
      candidateKey: getSplitCandidateKey(splitCandidate)
    }
  }

  return {
    type: 'none',
    preferredSplitChainKey: null
  }
}

function matchesSplitCandidateKey(candidate: TableOverflowSplitCandidate, candidateKey: string) {
  return getSplitCandidateKey(candidate) === candidateKey
}

function matchesMergeCandidateKey(candidate: MergeableTableFragmentsCandidate, candidateKey: string) {
  return getMergeCandidateKey(candidate) === candidateKey
}

function pruneChainState(
  chainStateByKey: Map<string, TablePaginationChainState>,
  splitCandidates: TableOverflowSplitCandidate[],
  mergeCandidates: MergeableTableFragmentsCandidate[]
) {
  const activeSplitChains = new Set(splitCandidates.map(candidate => candidate.paginationChainKey))
  const activeMergeChains = new Set(mergeCandidates.map(candidate => candidate.paginationChainKey))
  const activeChains = new Set([...activeSplitChains, ...activeMergeChains])

  Array.from(chainStateByKey.keys()).forEach(chainKey => {
    if (!activeChains.has(chainKey)) {
      chainStateByKey.delete(chainKey)
      return
    }

    const chainState = getChainState(chainStateByKey, chainKey)
    if (!activeSplitChains.has(chainKey)) {
      chainState.rejectedSplitKey = null
      chainState.retriedSplitKey = null
      chainState.lastSuccessfulSplitKey = null
      chainState.lastSuccessfulSplitPageCount = null
    }
    if (!activeMergeChains.has(chainKey)) {
      chainState.rejectedMergeKey = null
      chainState.lastSuccessfulMergeKey = null
      chainState.lastSuccessfulMergePageCount = null
    }
  })
}

export function createTablePaginationController(paginationOwnedDocChangeMeta: string) {
  const chainStateByKey = new Map<string, TablePaginationChainState>()
  let preferredSplitChainKey: string | null = null

  return {
    reset() {
      chainStateByKey.clear()
      preferredSplitChainKey = null
    },

    evaluate(options: {
      view: EditorView
      currentPageCount: number
      measuredPageCount: number
      heuristics: TablePaginationHeuristics
      bodyBands: TablePaginationBodyBand[]
    }): TablePaginationControllerResult {
      const { view, currentPageCount, measuredPageCount, heuristics, bodyBands } = options
      const splitCandidates = heuristics.allowSplit ? findOverflowingTableSplitCandidates(view, bodyBands) : []
      const mergeCandidates =
        heuristics.allowMerge && splitCandidates.length === 0
          ? findMergeableTableFragmentCandidates(view, bodyBands)
          : []

      pruneChainState(chainStateByKey, splitCandidates, mergeCandidates)

      logPaginationDebug('table-controller-evaluation', {
        currentPageCount,
        measuredPageCount,
        allowSplit: heuristics.allowSplit,
        allowMerge: heuristics.allowMerge,
        preferredSplitChainKey,
        bodyBandCount: bodyBands.length,
        splitCandidateCount: splitCandidates.length,
        mergeCandidateCount: mergeCandidates.length,
        splitCandidates: splitCandidates.map(summarizeSplitCandidate),
        mergeCandidates: mergeCandidates.map(summarizeMergeCandidate)
      })

      const outcome = resolveDeferredRepaginationOutcome({
        currentPageCount,
        measuredPageCount,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferredSplitChainKey,
        splitCandidates,
        mergeCandidates,
        chainStateByKey
      })

      if (outcome.type === 'refresh') {
        preferredSplitChainKey = outcome.preferredSplitChainKey
        logPaginationDebug('table-controller-outcome', {
          type: 'refresh',
          currentPageCount,
          measuredPageCount,
          preferredSplitChainKey
        })
        return {
          type: 'refresh',
          pageCount: measuredPageCount,
          progress: 'refresh',
          scheduleEvaluation: true
        }
      }

      if (outcome.type === 'split') {
        const liveCandidate =
          findOverflowingTableSplitCandidates(view, bodyBands).find(candidate =>
            matchesSplitCandidateKey(candidate, outcome.candidateKey)
          ) ?? null
        const chainState = getChainState(chainStateByKey, outcome.candidate.paginationChainKey)

        if (!liveCandidate) {
          chainState.rejectedSplitKey = null
          chainState.retriedSplitKey = null
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'split-candidate-disappeared',
            candidateKey: outcome.candidateKey
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'split-candidate-disappeared'
          }
        }

        if (
          chainState.lastSuccessfulSplitKey === outcome.candidateKey &&
          chainState.lastSuccessfulSplitPageCount === currentPageCount
        ) {
          chainState.rejectedSplitKey = outcome.candidateKey
          chainState.retriedSplitKey = null
          preferredSplitChainKey = null
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'repeat-successful-split-candidate',
            currentPageCount,
            candidate: summarizeSplitCandidate(liveCandidate)
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'repeat-successful-split-candidate'
          }
        }

        const tr = view.state.tr.setMeta(paginationOwnedDocChangeMeta, true)
        const didSplit =
          liveCandidate.mode === 'rebalance'
            ? rebalanceAdjacentPaginationTables(view.state, tr, liveCandidate.tablePos, liveCandidate.splitRowIndex)
            : splitTableAtRow(view.state, tr, liveCandidate.tablePos, liveCandidate.splitRowIndex)

        if (!didSplit) {
          if (chainState.retriedSplitKey !== outcome.candidateKey) {
            chainState.retriedSplitKey = outcome.candidateKey
            preferredSplitChainKey = liveCandidate.paginationChainKey
            logPaginationDebug('table-controller-outcome', {
              type: 'request-refresh',
              reason: 'split-returned-false-first-time',
              currentPageCount,
              candidate: summarizeSplitCandidate(liveCandidate)
            })
            return {
              type: 'request-refresh',
              progress: 'refresh',
              scheduleEvaluation: true
            }
          }

          chainState.rejectedSplitKey = outcome.candidateKey
          chainState.retriedSplitKey = null
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'split-returned-false-twice',
            currentPageCount,
            candidate: summarizeSplitCandidate(liveCandidate)
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'split-returned-false-twice'
          }
        }

        chainState.rejectedSplitKey = null
        chainState.rejectedMergeKey = null
        chainState.retriedSplitKey = null
        chainState.lastSuccessfulSplitKey = outcome.candidateKey
        chainState.lastSuccessfulSplitPageCount = currentPageCount
        chainState.lastSuccessfulMergeKey = null
        chainState.lastSuccessfulMergePageCount = null
        preferredSplitChainKey = liveCandidate.paginationChainKey

        logPaginationDebug('table-controller-outcome', {
          type: 'dispatch',
          dispatchType: 'split',
          currentPageCount,
          measuredPageCount,
          candidate: summarizeSplitCandidate(liveCandidate),
          transactionStepCount: (tr as Transaction & { steps?: unknown[] }).steps?.length ?? 0
        })

        return {
          type: 'dispatch',
          dispatchType: 'split',
          candidateKey: outcome.candidateKey,
          progress: 'structural',
          transaction: tr,
          scheduleEvaluation: true
        }
      }

      if (outcome.type === 'merge') {
        preferredSplitChainKey = null

        if (findOverflowingTableSplitCandidates(view, bodyBands).length > 0) {
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'merge-blocked-by-split-candidates',
            currentPageCount,
            measuredPageCount
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'merge-blocked-by-split-candidates'
          }
        }

        const liveCandidate =
          findMergeableTableFragmentCandidates(view, bodyBands).find(candidate =>
            matchesMergeCandidateKey(candidate, outcome.candidateKey)
          ) ?? null
        const chainState = getChainState(chainStateByKey, outcome.candidate.paginationChainKey)

        if (!liveCandidate) {
          chainState.rejectedMergeKey = null
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'merge-candidate-disappeared',
            candidateKey: outcome.candidateKey
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'merge-candidate-disappeared'
          }
        }

        if (
          chainState.lastSuccessfulMergeKey === outcome.candidateKey &&
          chainState.lastSuccessfulMergePageCount === currentPageCount
        ) {
          chainState.rejectedMergeKey = outcome.candidateKey
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'repeat-successful-merge-candidate',
            currentPageCount,
            candidate: summarizeMergeCandidate(liveCandidate)
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'repeat-successful-merge-candidate'
          }
        }

        const tr = view.state.tr.setMeta(paginationOwnedDocChangeMeta, true)
        const didMerge = mergeAdjacentPaginationTables(view.state, tr, liveCandidate.firstTablePos)

        if (!didMerge) {
          chainState.rejectedMergeKey = outcome.candidateKey
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'merge-returned-false',
            currentPageCount,
            candidate: summarizeMergeCandidate(liveCandidate)
          })
          return {
            type: 'none',
            progress: 'none',
            reason: 'merge-returned-false'
          }
        }

        chainState.rejectedMergeKey = null
        chainState.rejectedSplitKey = null
        chainState.retriedSplitKey = null
        chainState.lastSuccessfulMergeKey = outcome.candidateKey
        chainState.lastSuccessfulMergePageCount = currentPageCount
        chainState.lastSuccessfulSplitKey = null
        chainState.lastSuccessfulSplitPageCount = null

        logPaginationDebug('table-controller-outcome', {
          type: 'dispatch',
          dispatchType: 'merge',
          currentPageCount,
          measuredPageCount,
          candidate: summarizeMergeCandidate(liveCandidate),
          transactionStepCount: (tr as Transaction & { steps?: unknown[] }).steps?.length ?? 0
        })

        return {
          type: 'dispatch',
          dispatchType: 'merge',
          candidateKey: outcome.candidateKey,
          progress: 'structural',
          transaction: tr,
          scheduleEvaluation: true
        }
      }

      preferredSplitChainKey = outcome.preferredSplitChainKey

      logPaginationDebug('table-controller-outcome', {
        type: 'none',
        reason: 'no-eligible-candidates',
        currentPageCount,
        measuredPageCount,
        preferredSplitChainKey
      })

      return {
        type: 'none',
        progress: 'none',
        reason: 'no-eligible-candidates'
      }
    }
  }
}
