import type {
  DocumentLayoutInvalidationReason,
  DocumentLayoutMeasurementRequest,
  DocumentLayoutInvalidationScope,
  DocumentLayoutPageRange,
  DocumentLayoutRuntimeState,
  DocumentLayoutSource
} from '../../types'

interface RequestLayoutOptions {
  immediate?: boolean
  reason: DocumentLayoutInvalidationReason
  scope: DocumentLayoutInvalidationScope
  pageRange?: DocumentLayoutPageRange | null
}

interface CreateDocumentLayoutSchedulerParams {
  source: DocumentLayoutSource
  debounceMs?: number
  runMeasurement: (request: DocumentLayoutMeasurementRequest) => void | Promise<void>
  onStateChange?: (state: DocumentLayoutRuntimeState) => void
}

export interface DocumentLayoutScheduler {
  getState: () => DocumentLayoutRuntimeState
  requestLayout: (options: RequestLayoutOptions) => void
  dispose: () => void
}

interface ScheduledInvalidation {
  reason: DocumentLayoutInvalidationReason
  scope: DocumentLayoutInvalidationScope
  pageRange: DocumentLayoutPageRange | null
}

const INVALIDATION_SCOPE_PRIORITY: Record<DocumentLayoutInvalidationScope, number> = {
  viewport: 1,
  structure: 2,
  formatting: 3,
  'full-document': 4
}

function mergeInvalidationScope(
  left: DocumentLayoutInvalidationScope | null,
  right: DocumentLayoutInvalidationScope | null
): DocumentLayoutInvalidationScope | null {
  if (!left) return right
  if (!right) return left
  return INVALIDATION_SCOPE_PRIORITY[left] >= INVALIDATION_SCOPE_PRIORITY[right] ? left : right
}

function mergeInvalidationRange(
  left: DocumentLayoutPageRange | null,
  right: DocumentLayoutPageRange | null
): DocumentLayoutPageRange | null {
  if (!left || !right) return null

  return {
    startPage: Math.min(left.startPage, right.startPage),
    endPage: Math.max(left.endPage, right.endPage)
  }
}

function createMeasurementRequest(
  generation: number,
  reason: DocumentLayoutInvalidationReason,
  scope: DocumentLayoutInvalidationScope,
  pageRange: DocumentLayoutPageRange | null
): DocumentLayoutMeasurementRequest {
  return {
    generation,
    reason,
    scope,
    pageRange
  }
}

function createRuntimeState(source: DocumentLayoutSource): DocumentLayoutRuntimeState {
  return {
    source,
    requestedGeneration: 0,
    resolvedGeneration: 0,
    status: 'idle',
    pendingScope: null,
    pendingRange: null,
    lastRequestedReason: null,
    lastRequestedScope: null,
    lastRequestedRange: null,
    lastResolvedReason: null,
    lastResolvedScope: null,
    lastResolvedRange: null
  }
}

export function createDocumentLayoutScheduler({
  source,
  debounceMs = 150,
  runMeasurement,
  onStateChange
}: CreateDocumentLayoutSchedulerParams): DocumentLayoutScheduler {
  let state = createRuntimeState(source)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let animationFrameId: number | null = null
  let disposed = false
  let measuring = false
  const generationInvalidations = new Map<number, ScheduledInvalidation>()

  const emitState = () => {
    onStateChange?.({ ...state })
  }

  const resolvePendingScope = (upToGeneration = state.requestedGeneration): DocumentLayoutInvalidationScope | null => {
    let pendingScope: DocumentLayoutInvalidationScope | null = null
    for (const [generation, invalidation] of generationInvalidations.entries()) {
      if (generation <= upToGeneration) {
        pendingScope = mergeInvalidationScope(pendingScope, invalidation.scope)
      }
    }
    return pendingScope
  }

  const resolvePendingRange = (upToGeneration = state.requestedGeneration): DocumentLayoutPageRange | null => {
    let hasInvalidation = false
    let pendingRange: DocumentLayoutPageRange | null = null
    for (const [generation, invalidation] of generationInvalidations.entries()) {
      if (generation <= upToGeneration) {
        pendingRange = hasInvalidation
          ? mergeInvalidationRange(pendingRange, invalidation.pageRange)
          : invalidation.pageRange
        hasInvalidation = true
      }
    }
    return pendingRange
  }

  const clearPendingWork = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const scheduleRun = (immediate: boolean) => {
    if (disposed || measuring || animationFrameId !== null) return

    state = {
      ...state,
      status: 'scheduled'
    }
    emitState()

    if (immediate) {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null
        void run()
      })
      return
    }

    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (disposed || measuring || animationFrameId !== null) return
      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null
        void run()
      })
    }, debounceMs)
  }

  const run = async () => {
    if (disposed || measuring || state.requestedGeneration <= state.resolvedGeneration) {
      if (!disposed && !measuring && state.requestedGeneration <= state.resolvedGeneration && state.status !== 'idle') {
        state = {
          ...state,
          status: 'idle'
        }
        emitState()
      }
      return
    }

    measuring = true
    const generation = state.requestedGeneration
    let resolvedReason = state.lastRequestedReason
    let resolvedScope = state.lastRequestedScope
    let resolvedRange = state.lastRequestedRange
    let hasResolvedInvalidation = false

    for (const [pendingGeneration, invalidation] of generationInvalidations.entries()) {
      if (pendingGeneration <= generation) {
        resolvedReason = invalidation.reason
        resolvedScope = mergeInvalidationScope(resolvedScope, invalidation.scope)
        resolvedRange = hasResolvedInvalidation
          ? mergeInvalidationRange(resolvedRange, invalidation.pageRange)
          : invalidation.pageRange
        hasResolvedInvalidation = true
      }
    }

    state = {
      ...state,
      status: 'measuring',
      pendingScope: resolvePendingScope(generation),
      pendingRange: resolvePendingRange(generation)
    }
    emitState()

    const measurementRequest =
      resolvedReason && resolvedScope
        ? createMeasurementRequest(generation, resolvedReason, resolvedScope, resolvedRange)
        : null

    try {
      if (measurementRequest) {
        await runMeasurement(measurementRequest)
      }
      state = {
        ...state,
        resolvedGeneration: Math.max(state.resolvedGeneration, generation),
        lastResolvedReason: resolvedReason ?? state.lastResolvedReason,
        lastResolvedScope: resolvedScope ?? state.lastResolvedScope,
        lastResolvedRange: resolvedRange ?? state.lastResolvedRange
      }
    } catch (error) {
      console.error('[DocumentLayoutScheduler] Measurement failed:', error)
      state = {
        ...state,
        resolvedGeneration: Math.max(state.resolvedGeneration, generation),
        lastResolvedReason: resolvedReason ?? state.lastResolvedReason,
        lastResolvedScope: resolvedScope ?? state.lastResolvedScope,
        lastResolvedRange: resolvedRange ?? state.lastResolvedRange
      }
    } finally {
      measuring = false
      if (disposed) return

      for (const pendingGeneration of generationInvalidations.keys()) {
        if (pendingGeneration <= generation) {
          generationInvalidations.delete(pendingGeneration)
        }
      }

      if (state.requestedGeneration > state.resolvedGeneration) {
        state = {
          ...state,
          pendingScope: resolvePendingScope(),
          pendingRange: resolvePendingRange()
        }
        scheduleRun(true)
      } else {
        state = {
          ...state,
          status: 'idle',
          pendingScope: null,
          pendingRange: null
        }
        emitState()
      }
    }
  }

  return {
    getState() {
      return { ...state }
    },
    requestLayout(options) {
      if (disposed) return

      const nextGeneration = state.requestedGeneration + 1
      generationInvalidations.set(nextGeneration, {
        reason: options.reason,
        scope: options.scope,
        pageRange: options.pageRange ?? null
      })
      state = {
        ...state,
        requestedGeneration: nextGeneration,
        pendingScope: resolvePendingScope(nextGeneration),
        pendingRange: resolvePendingRange(nextGeneration),
        lastRequestedReason: options.reason,
        lastRequestedScope: options.scope,
        lastRequestedRange: options.pageRange ?? null
      }
      emitState()

      if (measuring) {
        state = {
          ...state,
          status: 'scheduled'
        }
        emitState()
        return
      }

      scheduleRun(options.immediate ?? false)
    },
    dispose() {
      disposed = true
      clearPendingWork()
    }
  }
}
