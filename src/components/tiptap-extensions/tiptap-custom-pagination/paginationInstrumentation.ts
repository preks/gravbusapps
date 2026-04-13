type PaginationInstrumentationPayload = Record<string, unknown>

export interface PaginationInstrumentationDurationSummary {
  count: number
  totalDurationMs: number
  maxDurationMs: number
  lastDurationMs: number
}

export interface PaginationInstrumentationEventRecord {
  sequence: number
  event: string
  timestampMs: number
  payload: PaginationInstrumentationPayload
}

export interface PaginationInstrumentationSnapshot {
  counters: Record<string, number>
  durations: Record<string, PaginationInstrumentationDurationSummary>
  recentEvents: PaginationInstrumentationEventRecord[]
}

interface PaginationInstrumentationStore extends PaginationInstrumentationSnapshot {
  sequence: number
  reset: () => void
  snapshot: () => PaginationInstrumentationSnapshot
}

const PAGINATION_DEBUG_FLAG = '__RM_PAGINATION_DEBUG'
const PAGINATION_METRICS_KEY = '__RM_PAGINATION_METRICS'
const MAX_RECENT_EVENTS = 200

type PaginationInstrumentationGlobal = typeof globalThis & {
  [PAGINATION_DEBUG_FLAG]?: boolean
  [PAGINATION_METRICS_KEY]?: PaginationInstrumentationStore
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

function cloneSnapshot(store: PaginationInstrumentationStore): PaginationInstrumentationSnapshot {
  return {
    counters: { ...store.counters },
    durations: Object.fromEntries(
      Object.entries(store.durations).map(([key, value]) => [
        key,
        {
          count: value.count,
          totalDurationMs: value.totalDurationMs,
          maxDurationMs: value.maxDurationMs,
          lastDurationMs: value.lastDurationMs
        }
      ])
    ),
    recentEvents: store.recentEvents.map(event => ({
      sequence: event.sequence,
      event: event.event,
      timestampMs: event.timestampMs,
      payload: { ...event.payload }
    }))
  }
}

function createPaginationInstrumentationStore(): PaginationInstrumentationStore {
  const store: PaginationInstrumentationStore = {
    sequence: 0,
    counters: {},
    durations: {},
    recentEvents: [],
    reset() {
      store.sequence = 0
      store.counters = {}
      store.durations = {}
      store.recentEvents = []
    },
    snapshot() {
      return cloneSnapshot(store)
    }
  }

  return store
}

export function isPaginationDebugEnabled(): boolean {
  return Boolean((globalThis as PaginationInstrumentationGlobal)[PAGINATION_DEBUG_FLAG])
}

function getPaginationInstrumentationStore(): PaginationInstrumentationStore | null {
  if (!isPaginationDebugEnabled()) {
    return null
  }

  const globalState = globalThis as PaginationInstrumentationGlobal
  if (!globalState[PAGINATION_METRICS_KEY]) {
    globalState[PAGINATION_METRICS_KEY] = createPaginationInstrumentationStore()
  }

  return globalState[PAGINATION_METRICS_KEY] ?? null
}

function emitPaginationInstrumentationEvent(event: string, payload: PaginationInstrumentationPayload): void {
  const store = getPaginationInstrumentationStore()
  if (!store) {
    return
  }

  store.sequence += 1
  store.recentEvents.push({
    sequence: store.sequence,
    event,
    timestampMs: Date.now(),
    payload
  })
  if (store.recentEvents.length > MAX_RECENT_EVENTS) {
    store.recentEvents.splice(0, store.recentEvents.length - MAX_RECENT_EVENTS)
  }

  console.log(`[pagination-metrics:${store.sequence}] ${event}`, payload)
}

export function incrementPaginationInstrumentationCounter(counter: string, delta = 1): void {
  const store = getPaginationInstrumentationStore()
  if (!store) {
    return
  }

  store.counters[counter] = (store.counters[counter] ?? 0) + delta
}

export function recordPaginationInstrumentationEvent(
  event: string,
  payload: PaginationInstrumentationPayload = {}
): void {
  emitPaginationInstrumentationEvent(event, payload)
}

export function recordPaginationInstrumentationDuration(
  event: string,
  durationMs: number,
  payload: PaginationInstrumentationPayload = {}
): void {
  const store = getPaginationInstrumentationStore()
  if (!store) {
    return
  }

  const nextDurationMs = Number.isFinite(durationMs) ? durationMs : 0
  const summary = store.durations[event] ?? {
    count: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: 0
  }

  store.durations[event] = {
    count: summary.count + 1,
    totalDurationMs: summary.totalDurationMs + nextDurationMs,
    maxDurationMs: Math.max(summary.maxDurationMs, nextDurationMs),
    lastDurationMs: nextDurationMs
  }

  emitPaginationInstrumentationEvent(event, {
    ...payload,
    durationMs: Number(nextDurationMs.toFixed(3))
  })
}

export function startPaginationInstrumentationTimer(
  event: string,
  initialPayload: PaginationInstrumentationPayload = {}
): (finalPayload?: PaginationInstrumentationPayload) => void {
  if (!isPaginationDebugEnabled()) {
    return () => {}
  }

  const startedAtMs = nowMs()

  return (finalPayload: PaginationInstrumentationPayload = {}) => {
    recordPaginationInstrumentationDuration(event, nowMs() - startedAtMs, {
      ...initialPayload,
      ...finalPayload
    })
  }
}

export function resetPaginationInstrumentation(): void {
  getPaginationInstrumentationStore()?.reset()
}

export function getPaginationInstrumentationSnapshot(): PaginationInstrumentationSnapshot | null {
  return getPaginationInstrumentationStore()?.snapshot() ?? null
}
