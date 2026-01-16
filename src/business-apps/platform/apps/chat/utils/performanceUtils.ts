/**
 * Simple performance measurement utilities for comparing V1 vs V2 implementations
 *
 * Usage:
 * ```typescript
 * // Start measuring
 * const perf = startPerformanceTimer('messages-load')
 *
 * // ... do work ...
 *
 * // End and log
 * perf.end() // Logs to console
 * ```
 */

interface PerformanceTimer {
  name: string
  startTime: number
  end: () => number
  endAndLog: () => void
}

/**
 * Start a performance timer
 */
export function startPerformanceTimer(name: string): PerformanceTimer {
  const startTime = performance.now()

  return {
    name,
    startTime,
    end() {
      const endTime = performance.now()
      const duration = endTime - startTime
      return duration
    },
    endAndLog() {
      const duration = this.end()
      return duration
    }
  }
}

/**
 * Measure component render time
 *
 * Usage:
 * ```typescript
 * useEffect(() => {
 *   measureRender('MessageList', renderCount)
 * }, [messages])
 * ```
 */
const renderCounts = new Map<string, number>()

export function measureRender(componentName: string) {
  const key = componentName
  const count = (renderCounts.get(key) || 0) + 1
  renderCounts.set(key, count)

  return count
}

/**
 * Reset render counts (useful when switching conversations)
 */
export function resetRenderCounts() {
  renderCounts.clear()
}

/**
 * Get current render count for a component
 */
export function getRenderCount(componentName: string): number {
  return renderCounts.get(componentName) || 0
}

/**
 * Log all render counts
 */
export function logRenderCounts() {
  // Logging disabled for production
}

/**
 * Measure memory usage (approximate)
 */
export function measureMemory(): number | null {
  if ('memory' in performance) {
    // @ts-expect-error - Chrome-specific API
    return performance.memory.usedJSHeapSize / 1024 / 1024 // MB
  }
  return null
}

/**
 * Performance comparison result
 */
export interface PerformanceComparison {
  v1: number
  v2: number
  improvement: number
  improvementPercent: string
}

/**
 * Compare two performance measurements
 */
export function comparePerformance(v1Time: number, v2Time: number): PerformanceComparison {
  const improvement = v1Time - v2Time
  const improvementPercent = ((improvement / v1Time) * 100).toFixed(1)

  return {
    v1: v1Time,
    v2: v2Time,
    improvement,
    improvementPercent: `${improvementPercent}%`
  }
}

/**
 * Development-only performance tracking
 * Only runs in development mode
 */
export function devPerf(fn: () => void) {
  if (process.env.NODE_ENV === 'development') {
    fn()
  }
}
