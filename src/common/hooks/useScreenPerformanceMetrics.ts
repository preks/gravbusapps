import { useSyncExternalStore } from 'react'

const SLOW_RENDER_THRESHOLD_MS = 16
const VERY_SLOW_RENDER_THRESHOLD_MS = 50
const RECENT_LONG_TASK_WINDOW_MS = 30_000
const SUBSCRIBER_NOTIFY_INTERVAL_MS = 250
const PERFORMANCE_METRICS_STORAGE_KEY = 'gba:screen-performance-metrics'

export type ScreenProfilerPhase = 'mount' | 'update' | 'nested-update'

export interface ScreenPerformanceMetrics {
  screenKey: string
  commitCount: number
  mountCount: number
  updateCount: number
  nestedUpdateCount: number
  avgRenderDurationMs: number
  lastRenderDurationMs: number
  maxRenderDurationMs: number
  avgBaseDurationMs: number
  lastBaseDurationMs: number
  maxBaseDurationMs: number
  slowRenderCount: number
  verySlowRenderCount: number
  totalLongTaskCount: number
  recentLongTaskCount: number
  lastPhase: ScreenProfilerPhase | null
  lastCommitAt: number | null
}

export interface ScreenPerformanceSnapshot {
  activeScreenKey: string | null
  collectedAt: number
  screens: ScreenPerformanceMetrics[]
}

interface MutableScreenPerformanceMetrics {
  screenKey: string
  commitCount: number
  mountCount: number
  updateCount: number
  nestedUpdateCount: number
  totalRenderDurationMs: number
  lastRenderDurationMs: number
  maxRenderDurationMs: number
  totalBaseDurationMs: number
  lastBaseDurationMs: number
  maxBaseDurationMs: number
  slowRenderCount: number
  verySlowRenderCount: number
  totalLongTaskCount: number
  recentLongTaskTimestamps: number[]
  lastPhase: ScreenProfilerPhase | null
  lastCommitAt: number | null
}

interface PersistedScreenPerformanceState {
  activeScreenKey: string | null
  screens: MutableScreenPerformanceMetrics[]
}

const emptySnapshot: ScreenPerformanceSnapshot = {
  activeScreenKey: null,
  collectedAt: 0,
  screens: []
}

const screenMetrics = new Map<string, MutableScreenPerformanceMetrics>()
const subscribers = new Set<() => void>()

let activeScreenKey: string | null = null
let cachedSnapshot: ScreenPerformanceSnapshot = emptySnapshot
let snapshotDirty = true
let notifyTimer: ReturnType<typeof setTimeout> | null = null
let longTaskObserverStarted = false
let longTaskObserver: PerformanceObserver | null = null
let pageLifecyclePersistenceBound = false

function roundMilliseconds(value: number): number {
  return Math.round(value * 100) / 100
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readNonNegativeCount(value: unknown): number {
  return isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : 0
}

function readNonNegativeDuration(value: unknown): number {
  return isFiniteNumber(value) ? Math.max(0, value) : 0
}

function readNullableTimestamp(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null
}

function readProfilerPhase(value: unknown): ScreenProfilerPhase | null {
  return value === 'mount' || value === 'update' || value === 'nested-update' ? value : null
}

function readRecentLongTaskTimestamps(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  const cutoff = Date.now() - RECENT_LONG_TASK_WINDOW_MS

  return value
    .filter(isFiniteNumber)
    .filter(timestamp => timestamp >= cutoff)
    .sort((leftTimestamp, rightTimestamp) => leftTimestamp - rightTimestamp)
}

function persistMetricsState(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const persistedState: PersistedScreenPerformanceState = {
      activeScreenKey,
      screens: Array.from(screenMetrics.values()).map(metrics => ({
        ...metrics,
        recentLongTaskTimestamps: [...metrics.recentLongTaskTimestamps]
      }))
    }

    window.sessionStorage.setItem(PERFORMANCE_METRICS_STORAGE_KEY, JSON.stringify(persistedState))
  } catch {
    // Ignore storage errors to keep the profiler passive.
  }
}

function refreshCachedSnapshot(): void {
  cachedSnapshot = buildSnapshot()
  snapshotDirty = false
  persistMetricsState()
}

function flushSnapshotUpdate(shouldNotifySubscribers: boolean): void {
  if (notifyTimer !== null) {
    clearTimeout(notifyTimer)
    notifyTimer = null
  }

  if (snapshotDirty) {
    refreshCachedSnapshot()
  } else {
    persistMetricsState()
  }

  if (!shouldNotifySubscribers) {
    return
  }

  subscribers.forEach(listener => listener())
}

function pruneRecentLongTasks(metrics: MutableScreenPerformanceMetrics, now = Date.now()): void {
  const cutoff = now - RECENT_LONG_TASK_WINDOW_MS
  metrics.recentLongTaskTimestamps = metrics.recentLongTaskTimestamps.filter(timestamp => timestamp >= cutoff)
}

function getOrCreateScreenMetrics(screenKey: string): MutableScreenPerformanceMetrics {
  const existingMetrics = screenMetrics.get(screenKey)
  if (existingMetrics) {
    return existingMetrics
  }

  const nextMetrics: MutableScreenPerformanceMetrics = {
    screenKey,
    commitCount: 0,
    mountCount: 0,
    updateCount: 0,
    nestedUpdateCount: 0,
    totalRenderDurationMs: 0,
    lastRenderDurationMs: 0,
    maxRenderDurationMs: 0,
    totalBaseDurationMs: 0,
    lastBaseDurationMs: 0,
    maxBaseDurationMs: 0,
    slowRenderCount: 0,
    verySlowRenderCount: 0,
    totalLongTaskCount: 0,
    recentLongTaskTimestamps: [],
    lastPhase: null,
    lastCommitAt: null
  }

  screenMetrics.set(screenKey, nextMetrics)
  return nextMetrics
}

function buildSnapshot(): ScreenPerformanceSnapshot {
  const collectedAt = Date.now()
  const screens = Array.from(screenMetrics.values())
    .map(metrics => {
      pruneRecentLongTasks(metrics, collectedAt)

      return {
        screenKey: metrics.screenKey,
        commitCount: metrics.commitCount,
        mountCount: metrics.mountCount,
        updateCount: metrics.updateCount,
        nestedUpdateCount: metrics.nestedUpdateCount,
        avgRenderDurationMs: metrics.commitCount
          ? roundMilliseconds(metrics.totalRenderDurationMs / metrics.commitCount)
          : 0,
        lastRenderDurationMs: metrics.lastRenderDurationMs,
        maxRenderDurationMs: metrics.maxRenderDurationMs,
        avgBaseDurationMs: metrics.commitCount
          ? roundMilliseconds(metrics.totalBaseDurationMs / metrics.commitCount)
          : 0,
        lastBaseDurationMs: metrics.lastBaseDurationMs,
        maxBaseDurationMs: metrics.maxBaseDurationMs,
        slowRenderCount: metrics.slowRenderCount,
        verySlowRenderCount: metrics.verySlowRenderCount,
        totalLongTaskCount: metrics.totalLongTaskCount,
        recentLongTaskCount: metrics.recentLongTaskTimestamps.length,
        lastPhase: metrics.lastPhase,
        lastCommitAt: metrics.lastCommitAt
      } satisfies ScreenPerformanceMetrics
    })
    .sort((leftMetrics, rightMetrics) => {
      if (leftMetrics.screenKey === activeScreenKey) return -1
      if (rightMetrics.screenKey === activeScreenKey) return 1
      if (rightMetrics.maxRenderDurationMs !== leftMetrics.maxRenderDurationMs) {
        return rightMetrics.maxRenderDurationMs - leftMetrics.maxRenderDurationMs
      }
      if (rightMetrics.avgRenderDurationMs !== leftMetrics.avgRenderDurationMs) {
        return rightMetrics.avgRenderDurationMs - leftMetrics.avgRenderDurationMs
      }
      return leftMetrics.screenKey.localeCompare(rightMetrics.screenKey)
    })

  return {
    activeScreenKey,
    collectedAt,
    screens
  }
}

function restorePersistedMetricsState(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const persistedStateJson = window.sessionStorage.getItem(PERFORMANCE_METRICS_STORAGE_KEY)
    if (!persistedStateJson) {
      return
    }

    const persistedState = JSON.parse(persistedStateJson) as Partial<PersistedScreenPerformanceState>
    activeScreenKey = typeof persistedState.activeScreenKey === 'string' ? persistedState.activeScreenKey : null

    screenMetrics.clear()

    if (Array.isArray(persistedState.screens)) {
      persistedState.screens.forEach(persistedScreenMetrics => {
        if (!persistedScreenMetrics || typeof persistedScreenMetrics !== 'object') {
          return
        }

        const screenKey =
          typeof persistedScreenMetrics.screenKey === 'string' && persistedScreenMetrics.screenKey.length > 0
            ? persistedScreenMetrics.screenKey
            : null

        if (!screenKey) {
          return
        }

        screenMetrics.set(screenKey, {
          screenKey,
          commitCount: readNonNegativeCount(persistedScreenMetrics.commitCount),
          mountCount: readNonNegativeCount(persistedScreenMetrics.mountCount),
          updateCount: readNonNegativeCount(persistedScreenMetrics.updateCount),
          nestedUpdateCount: readNonNegativeCount(persistedScreenMetrics.nestedUpdateCount),
          totalRenderDurationMs: readNonNegativeDuration(persistedScreenMetrics.totalRenderDurationMs),
          lastRenderDurationMs: readNonNegativeDuration(persistedScreenMetrics.lastRenderDurationMs),
          maxRenderDurationMs: readNonNegativeDuration(persistedScreenMetrics.maxRenderDurationMs),
          totalBaseDurationMs: readNonNegativeDuration(persistedScreenMetrics.totalBaseDurationMs),
          lastBaseDurationMs: readNonNegativeDuration(persistedScreenMetrics.lastBaseDurationMs),
          maxBaseDurationMs: readNonNegativeDuration(persistedScreenMetrics.maxBaseDurationMs),
          slowRenderCount: readNonNegativeCount(persistedScreenMetrics.slowRenderCount),
          verySlowRenderCount: readNonNegativeCount(persistedScreenMetrics.verySlowRenderCount),
          totalLongTaskCount: readNonNegativeCount(persistedScreenMetrics.totalLongTaskCount),
          recentLongTaskTimestamps: readRecentLongTaskTimestamps(persistedScreenMetrics.recentLongTaskTimestamps),
          lastPhase: readProfilerPhase(persistedScreenMetrics.lastPhase),
          lastCommitAt: readNullableTimestamp(persistedScreenMetrics.lastCommitAt)
        })
      })
    }
  } catch {
    activeScreenKey = null
    screenMetrics.clear()
  }

  refreshCachedSnapshot()
}

function scheduleSnapshotUpdate(): void {
  snapshotDirty = true

  if (notifyTimer !== null) {
    return
  }

  notifyTimer = setTimeout(() => {
    notifyTimer = null

    if (!snapshotDirty) {
      return
    }

    refreshCachedSnapshot()
    subscribers.forEach(listener => listener())
  }, SUBSCRIBER_NOTIFY_INTERVAL_MS)
}

function ensurePageLifecyclePersistence(): void {
  if (pageLifecyclePersistenceBound || typeof window === 'undefined') {
    return
  }

  pageLifecyclePersistenceBound = true

  const handlePageLifecycleChange = () => {
    flushSnapshotUpdate(false)
  }

  window.addEventListener('pagehide', handlePageLifecycleChange)
  window.addEventListener('beforeunload', handlePageLifecycleChange)
}

function ensureLongTaskObserver(): void {
  ensurePageLifecyclePersistence()

  if (longTaskObserverStarted) {
    return
  }

  longTaskObserverStarted = true

  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return
  }

  longTaskObserver = new PerformanceObserver(list => {
    if (!activeScreenKey) {
      return
    }

    const metrics = getOrCreateScreenMetrics(activeScreenKey)
    const now = Date.now()
    let hasRecordedLongTask = false

    for (const entry of list.getEntries()) {
      if (entry.duration < VERY_SLOW_RENDER_THRESHOLD_MS) {
        continue
      }

      metrics.totalLongTaskCount += 1
      metrics.recentLongTaskTimestamps.push(now)
      hasRecordedLongTask = true
    }

    if (!hasRecordedLongTask) {
      return
    }

    pruneRecentLongTasks(metrics, now)
    scheduleSnapshotUpdate()
  })

  try {
    longTaskObserver.observe({ type: 'longtask', buffered: true })
  } catch {
    longTaskObserver.disconnect()
    longTaskObserver = null
  }
}

function subscribe(listener: () => void): () => void {
  ensureLongTaskObserver()
  subscribers.add(listener)

  return () => {
    subscribers.delete(listener)
  }
}

function getSnapshot(): ScreenPerformanceSnapshot {
  ensureLongTaskObserver()

  if (snapshotDirty) {
    refreshCachedSnapshot()
  }

  return cachedSnapshot
}

function getServerSnapshot(): ScreenPerformanceSnapshot {
  return emptySnapshot
}

export function setActiveProfiledScreen(screenKey: string | null): void {
  ensureLongTaskObserver()

  if (activeScreenKey === screenKey) {
    return
  }

  activeScreenKey = screenKey
  scheduleSnapshotUpdate()
}

export function recordScreenRender(
  screenKey: string,
  phase: ScreenProfilerPhase,
  actualDuration: number,
  baseDuration: number
): void {
  if (!screenKey) {
    return
  }

  ensureLongTaskObserver()

  const metrics = getOrCreateScreenMetrics(screenKey)
  metrics.commitCount += 1

  if (phase === 'mount') {
    metrics.mountCount += 1
  } else if (phase === 'nested-update') {
    metrics.nestedUpdateCount += 1
  } else {
    metrics.updateCount += 1
  }

  const roundedActualDuration = roundMilliseconds(actualDuration)
  const roundedBaseDuration = roundMilliseconds(baseDuration)

  metrics.totalRenderDurationMs += actualDuration
  metrics.lastRenderDurationMs = roundedActualDuration
  metrics.maxRenderDurationMs = Math.max(metrics.maxRenderDurationMs, roundedActualDuration)
  metrics.totalBaseDurationMs += baseDuration
  metrics.lastBaseDurationMs = roundedBaseDuration
  metrics.maxBaseDurationMs = Math.max(metrics.maxBaseDurationMs, roundedBaseDuration)
  metrics.lastPhase = phase
  metrics.lastCommitAt = Date.now()

  if (actualDuration >= SLOW_RENDER_THRESHOLD_MS) {
    metrics.slowRenderCount += 1
  }
  if (actualDuration >= VERY_SLOW_RENDER_THRESHOLD_MS) {
    metrics.verySlowRenderCount += 1
  }

  activeScreenKey = screenKey
  scheduleSnapshotUpdate()
}

export function resetScreenPerformanceMetrics(): void {
  screenMetrics.clear()
  snapshotDirty = true
  flushSnapshotUpdate(true)
}

export function useScreenPerformanceSnapshot(): ScreenPerformanceSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

restorePersistedMetricsState()
