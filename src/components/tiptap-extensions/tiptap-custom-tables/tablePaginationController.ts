import type { Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { PaginationLayoutTableFragmentsState } from '../tiptap-custom-pagination/layoutTableFragmentsBridge'
import {
  incrementPaginationInstrumentationCounter,
  startPaginationInstrumentationTimer
} from '../tiptap-custom-pagination/paginationInstrumentation'
import { logPaginationDebug } from '../tiptap-custom-pagination/utils'
import {
  findMergeableTableFragmentCandidates,
  findMergeableTableFragmentCandidatesFromLayoutFragments,
  findOverflowingTableSplitCandidates,
  findOverflowingTableSplitCandidatesFromLayoutFragments,
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

export type TablePaginationCandidateAuthority = 'legacy-dom' | 'layout-fragment-guided'
export type TablePaginationCandidateParityStatus = 'unavailable' | 'match' | 'mismatch'

interface ResolvedTablePaginationCandidates {
  authority: TablePaginationCandidateAuthority
  parityStatus: TablePaginationCandidateParityStatus
  splitCandidates: TableOverflowSplitCandidate[]
  mergeCandidates: MergeableTableFragmentsCandidate[]
}

interface LayoutFragmentChainSummary {
  fragmentCount: number
  tablePositions: Set<number>
  hasSplitFragments: boolean
}

export type TablePaginationControllerResult =
  | {
      type: 'refresh'
      pageCount: number
      hasSplitPressure: boolean
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
        | 'layout-fragment-pagination-satisfied'
        | 'candidate-parity-mismatch'
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

function createLayoutFragmentChainSummaries(
  layoutTableFragments: readonly PaginationLayoutTableFragmentsState['fragments']
) {
  const summaries = new Map<string, LayoutFragmentChainSummary>()

  layoutTableFragments.forEach(fragment => {
    const existingSummary = summaries.get(fragment.paginationChainKey) ?? {
      fragmentCount: 0,
      tablePositions: new Set<number>(),
      hasSplitFragments: false
    }

    existingSummary.fragmentCount = Math.max(existingSummary.fragmentCount, fragment.fragmentCount)
    existingSummary.tablePositions.add(fragment.tablePos)
    if (fragment.paginationSplitId !== null || fragment.fragmentCount > 1) {
      existingSummary.hasSplitFragments = true
    }

    summaries.set(fragment.paginationChainKey, existingSummary)
  })

  return summaries
}

function shouldUseLayoutSatisfiedOutcome(options: {
  resolvedCandidates: ResolvedTablePaginationCandidates
  layoutFragmentChains: Map<string, LayoutFragmentChainSummary>
  currentPageCount: number
  splitChainState?: TablePaginationChainState | null
  splitCandidate?: TableOverflowSplitCandidate | null
  mergeCandidate?: MergeableTableFragmentsCandidate | null
}) {
  if (
    options.resolvedCandidates.authority !== 'layout-fragment-guided' ||
    options.resolvedCandidates.parityStatus !== 'match'
  ) {
    return false
  }

  if (options.splitCandidate) {
    const summary = options.layoutFragmentChains.get(options.splitCandidate.paginationChainKey)
    if (!summary?.hasSplitFragments) {
      return false
    }

    return (
      options.splitChainState?.lastSuccessfulSplitPageCount === options.currentPageCount &&
      options.splitChainState.lastSuccessfulSplitKey !== null
    )
  }

  if (options.mergeCandidate) {
    const summary = options.layoutFragmentChains.get(options.mergeCandidate.paginationChainKey)
    return summary?.hasSplitFragments ?? false
  }

  return false
}

function haveMatchingCandidateKeys<TCandidate>(
  left: TCandidate[],
  right: TCandidate[],
  getKey: (candidate: TCandidate) => string
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((candidate, index) => {
    const matchingCandidate = right[index]
    return matchingCandidate !== undefined && getKey(candidate) === getKey(matchingCandidate)
  })
}

function buildCandidateKeysByChain<TCandidate>(
  candidates: TCandidate[],
  getKey: (candidate: TCandidate) => string,
  getChainKey: (candidate: TCandidate) => string
) {
  const candidateKeysByChain = new Map<string, Set<string>>()

  candidates.forEach(candidate => {
    const chainKey = getChainKey(candidate)
    const existingKeys = candidateKeysByChain.get(chainKey) ?? new Set<string>()
    existingKeys.add(getKey(candidate))
    candidateKeysByChain.set(chainKey, existingKeys)
  })

  return candidateKeysByChain
}

function hasSharedChainCandidateConflict<TCandidate>(
  left: TCandidate[],
  right: TCandidate[],
  getKey: (candidate: TCandidate) => string,
  getChainKey: (candidate: TCandidate) => string
) {
  const leftKeysByChain = buildCandidateKeysByChain(left, getKey, getChainKey)
  const rightKeysByChain = buildCandidateKeysByChain(right, getKey, getChainKey)

  return Array.from(leftKeysByChain.entries()).some(([chainKey, leftKeys]) => {
    const rightKeys = rightKeysByChain.get(chainKey)
    if (!rightKeys) {
      return false
    }

    if (leftKeys.size !== rightKeys.size) {
      return true
    }

    return Array.from(leftKeys).some(candidateKey => !rightKeys.has(candidateKey))
  })
}

export function resolveTablePaginationCandidateAuthority(options: {
  layoutTableFragmentsState: Pick<PaginationLayoutTableFragmentsState, 'fragments' | 'status'>
  legacySplitCandidates: TableOverflowSplitCandidate[]
  legacyMergeCandidates: MergeableTableFragmentsCandidate[]
  fragmentGuidedSplitCandidates: TableOverflowSplitCandidate[]
  fragmentGuidedMergeCandidates: MergeableTableFragmentsCandidate[]
}): ResolvedTablePaginationCandidates {
  const {
    layoutTableFragmentsState,
    legacySplitCandidates,
    legacyMergeCandidates,
    fragmentGuidedSplitCandidates,
    fragmentGuidedMergeCandidates
  } = options

  if (layoutTableFragmentsState.status !== 'ready' || layoutTableFragmentsState.fragments.length === 0) {
    return {
      authority: 'legacy-dom',
      parityStatus: 'unavailable',
      splitCandidates: legacySplitCandidates,
      mergeCandidates: legacyMergeCandidates
    }
  }

  const splitCandidatesMatch = haveMatchingCandidateKeys(
    legacySplitCandidates,
    fragmentGuidedSplitCandidates,
    getSplitCandidateKey
  )
  const mergeCandidatesMatch = haveMatchingCandidateKeys(
    legacyMergeCandidates,
    fragmentGuidedMergeCandidates,
    getMergeCandidateKey
  )

  if (!splitCandidatesMatch || !mergeCandidatesMatch) {
    return {
      authority: 'legacy-dom',
      parityStatus: 'mismatch',
      splitCandidates: legacySplitCandidates,
      mergeCandidates: legacyMergeCandidates
    }
  }

  return {
    authority: 'layout-fragment-guided',
    parityStatus: 'match',
    splitCandidates: fragmentGuidedSplitCandidates,
    mergeCandidates: fragmentGuidedMergeCandidates
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
      layoutTableFragmentsState?: PaginationLayoutTableFragmentsState
    }): TablePaginationControllerResult {
      const {
        view,
        currentPageCount,
        measuredPageCount,
        heuristics,
        bodyBands,
        layoutTableFragmentsState = {
          fragments: [],
          status: 'missing',
          documentVersion: null,
          layoutVersion: null
        }
      } = options
      incrementPaginationInstrumentationCounter('table-controller-evaluation-total')
      const finishInstrumentation = startPaginationInstrumentationTimer('table-controller-evaluation', {
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        bodyBandCount: bodyBands.length,
        currentPageCount,
        layoutTableFragmentCount: layoutTableFragmentsState.fragments.length,
        measuredPageCount
      })
      let candidateAuthority: TablePaginationCandidateAuthority | null = null
      let candidateParityStatus: TablePaginationCandidateParityStatus | null = null
      let splitCandidateCount = 0
      let mergeCandidateCount = 0
      let resultType: TablePaginationControllerResult['type'] = 'none'
      let resultReason: TablePaginationControllerResult extends { type: 'none'; reason: infer TReason }
        ? TReason | null
        : string | null = null
      let resultDispatchType: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['dispatchType'] | null =
        null
      const finalizeResult = (result: TablePaginationControllerResult): TablePaginationControllerResult => {
        resultType = result.type
        if (result.type === 'none') {
          resultReason = result.reason
          incrementPaginationInstrumentationCounter(`table-controller-outcome:none:${result.reason}`)
        } else {
          resultReason = null
        }
        if (result.type === 'dispatch') {
          resultDispatchType = result.dispatchType
          incrementPaginationInstrumentationCounter(`table-controller-outcome:dispatch:${result.dispatchType}`)
        } else {
          resultDispatchType = null
        }
        incrementPaginationInstrumentationCounter(`table-controller-outcome:${result.type}`)
        return result
      }

      try {
        const legacySplitCandidates = heuristics.allowSplit ? findOverflowingTableSplitCandidates(view, bodyBands) : []
        const legacyMergeCandidates =
          heuristics.allowMerge && legacySplitCandidates.length === 0
            ? findMergeableTableFragmentCandidates(view, bodyBands)
            : []
        const fragmentGuidedSplitCandidates =
          heuristics.allowSplit && layoutTableFragmentsState.status === 'ready'
            ? findOverflowingTableSplitCandidatesFromLayoutFragments(
                view,
                bodyBands,
                layoutTableFragmentsState.fragments
              )
            : []
        const fragmentGuidedMergeCandidates =
          heuristics.allowMerge &&
          layoutTableFragmentsState.status === 'ready' &&
          fragmentGuidedSplitCandidates.length === 0
            ? findMergeableTableFragmentCandidatesFromLayoutFragments(
                view,
                bodyBands,
                layoutTableFragmentsState.fragments
              )
            : []
        const resolvedCandidates = resolveTablePaginationCandidateAuthority({
          layoutTableFragmentsState,
          legacySplitCandidates,
          legacyMergeCandidates,
          fragmentGuidedSplitCandidates,
          fragmentGuidedMergeCandidates
        })
        const layoutFragmentChains = createLayoutFragmentChainSummaries(layoutTableFragmentsState.fragments)
        const splitCandidates = resolvedCandidates.splitCandidates
        const mergeCandidates = resolvedCandidates.mergeCandidates
        candidateAuthority = resolvedCandidates.authority
        candidateParityStatus = resolvedCandidates.parityStatus
        splitCandidateCount = splitCandidates.length
        mergeCandidateCount = mergeCandidates.length
        const hasSharedSplitChainConflict = hasSharedChainCandidateConflict(
          legacySplitCandidates,
          fragmentGuidedSplitCandidates,
          getSplitCandidateKey,
          candidate => candidate.paginationChainKey
        )
        const hasSharedMergeChainConflict = hasSharedChainCandidateConflict(
          legacyMergeCandidates,
          fragmentGuidedMergeCandidates,
          getMergeCandidateKey,
          candidate => candidate.paginationChainKey
        )

        pruneChainState(chainStateByKey, splitCandidates, mergeCandidates)

        logPaginationDebug('table-controller-evaluation', {
          currentPageCount,
          measuredPageCount,
          allowSplit: heuristics.allowSplit,
          allowMerge: heuristics.allowMerge,
          preferredSplitChainKey,
          bodyBandCount: bodyBands.length,
          layoutTableFragmentCount: layoutTableFragmentsState.fragments.length,
          layoutTableFragmentsStatus: layoutTableFragmentsState.status,
          layoutTableFragmentsLayoutVersion: layoutTableFragmentsState.layoutVersion,
          candidateAuthority: resolvedCandidates.authority,
          candidateParityStatus: resolvedCandidates.parityStatus,
          legacySplitCandidateCount: legacySplitCandidates.length,
          legacyMergeCandidateCount: legacyMergeCandidates.length,
          fragmentGuidedSplitCandidateCount: fragmentGuidedSplitCandidates.length,
          fragmentGuidedMergeCandidateCount: fragmentGuidedMergeCandidates.length,
          splitCandidateCount: splitCandidates.length,
          mergeCandidateCount: mergeCandidates.length,
          splitCandidates: splitCandidates.map(summarizeSplitCandidate),
          mergeCandidates: mergeCandidates.map(summarizeMergeCandidate)
        })

        if (
          resolvedCandidates.parityStatus === 'mismatch' &&
          (measuredPageCount !== currentPageCount || hasSharedSplitChainConflict || hasSharedMergeChainConflict)
        ) {
          preferredSplitChainKey = null
          logPaginationDebug('table-controller-outcome', {
            type: 'none',
            reason: 'candidate-parity-mismatch',
            currentPageCount,
            measuredPageCount,
            hasSharedSplitChainConflict,
            hasSharedMergeChainConflict,
            legacySplitCandidateCount: legacySplitCandidates.length,
            legacyMergeCandidateCount: legacyMergeCandidates.length,
            fragmentGuidedSplitCandidateCount: fragmentGuidedSplitCandidates.length,
            fragmentGuidedMergeCandidateCount: fragmentGuidedMergeCandidates.length
          })
          return finalizeResult({
            type: 'none',
            progress: 'none',
            reason: 'candidate-parity-mismatch'
          })
        }

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
          const hasSplitPressure = splitCandidates.length > 0
          logPaginationDebug('table-controller-outcome', {
            type: 'refresh',
            currentPageCount,
            measuredPageCount,
            preferredSplitChainKey,
            hasSplitPressure
          })
          return finalizeResult({
            type: 'refresh',
            pageCount: measuredPageCount,
            hasSplitPressure,
            progress: 'refresh',
            scheduleEvaluation: true
          })
        }

        if (outcome.type === 'split') {
          const liveCandidate =
            splitCandidates.find(candidate => matchesSplitCandidateKey(candidate, outcome.candidateKey)) ?? null
          const chainState = getChainState(chainStateByKey, outcome.candidate.paginationChainKey)

          if (!liveCandidate) {
            chainState.rejectedSplitKey = null
            chainState.retriedSplitKey = null
            logPaginationDebug('table-controller-outcome', {
              type: 'none',
              reason: 'split-candidate-disappeared',
              candidateKey: outcome.candidateKey
            })
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'split-candidate-disappeared'
            })
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
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'repeat-successful-split-candidate'
            })
          }

          if (
            shouldUseLayoutSatisfiedOutcome({
              resolvedCandidates,
              layoutFragmentChains,
              currentPageCount,
              splitChainState: chainState,
              splitCandidate: liveCandidate
            })
          ) {
            preferredSplitChainKey = null
            logPaginationDebug('table-controller-outcome', {
              type: 'none',
              reason: 'layout-fragment-pagination-satisfied',
              currentPageCount,
              measuredPageCount,
              candidate: summarizeSplitCandidate(liveCandidate)
            })
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'layout-fragment-pagination-satisfied'
            })
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
              return finalizeResult({
                type: 'request-refresh',
                progress: 'refresh',
                scheduleEvaluation: true
              })
            }

            chainState.rejectedSplitKey = outcome.candidateKey
            chainState.retriedSplitKey = null
            logPaginationDebug('table-controller-outcome', {
              type: 'none',
              reason: 'split-returned-false-twice',
              currentPageCount,
              candidate: summarizeSplitCandidate(liveCandidate)
            })
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'split-returned-false-twice'
            })
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

          return finalizeResult({
            type: 'dispatch',
            dispatchType: 'split',
            candidateKey: outcome.candidateKey,
            progress: 'structural',
            transaction: tr,
            scheduleEvaluation: true
          })
        }

        if (outcome.type === 'merge') {
          preferredSplitChainKey = null

          if (splitCandidates.length > 0) {
            logPaginationDebug('table-controller-outcome', {
              type: 'none',
              reason: 'merge-blocked-by-split-candidates',
              currentPageCount,
              measuredPageCount
            })
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'merge-blocked-by-split-candidates'
            })
          }

          const liveCandidate =
            mergeCandidates.find(candidate => matchesMergeCandidateKey(candidate, outcome.candidateKey)) ?? null
          const chainState = getChainState(chainStateByKey, outcome.candidate.paginationChainKey)

          if (!liveCandidate) {
            chainState.rejectedMergeKey = null
            logPaginationDebug('table-controller-outcome', {
              type: 'none',
              reason: 'merge-candidate-disappeared',
              candidateKey: outcome.candidateKey
            })
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'merge-candidate-disappeared'
            })
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
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'repeat-successful-merge-candidate'
            })
          }

          if (
            shouldUseLayoutSatisfiedOutcome({
              resolvedCandidates,
              layoutFragmentChains,
              currentPageCount,
              mergeCandidate: liveCandidate
            })
          ) {
            logPaginationDebug('table-controller-outcome', {
              type: 'none',
              reason: 'layout-fragment-pagination-satisfied',
              currentPageCount,
              measuredPageCount,
              candidate: summarizeMergeCandidate(liveCandidate)
            })
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'layout-fragment-pagination-satisfied'
            })
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
            return finalizeResult({
              type: 'none',
              progress: 'none',
              reason: 'merge-returned-false'
            })
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

          return finalizeResult({
            type: 'dispatch',
            dispatchType: 'merge',
            candidateKey: outcome.candidateKey,
            progress: 'structural',
            transaction: tr,
            scheduleEvaluation: true
          })
        }

        preferredSplitChainKey = outcome.preferredSplitChainKey

        logPaginationDebug('table-controller-outcome', {
          type: 'none',
          reason: 'no-eligible-candidates',
          currentPageCount,
          measuredPageCount,
          preferredSplitChainKey
        })

        return finalizeResult({
          type: 'none',
          progress: 'none',
          reason: 'no-eligible-candidates'
        })
      } finally {
        finishInstrumentation({
          candidateAuthority,
          candidateParityStatus,
          mergeCandidateCount,
          preferredSplitChainKey,
          resultDispatchType,
          resultReason,
          resultType,
          splitCandidateCount
        })
      }
    }
  }
}
