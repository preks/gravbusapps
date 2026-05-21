import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isJSDOMRuntime } from './univerGridDebug'
import { patchEmbeddedSpreadsheetHostLayout } from './univerGridDomPatch'

/**
 * Grid host element, non-zero size readiness, and layout patches for embedded Univer.
 */
export function useUniverDomChrome() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [gridHostEl, setGridHostEl] = useState<HTMLDivElement | null>(null)
  const [gridHostReady, setGridHostReady] = useState(isJSDOMRuntime)
  const gridHostReadyRef = useRef(isJSDOMRuntime())

  const updateGridHostReady = useCallback((ready: boolean) => {
    gridHostReadyRef.current = ready
    setGridHostReady(ready)
  }, [])

  const setGridHostRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    gridHostReadyRef.current = isJSDOMRuntime()
    setGridHostEl(node)
  }, [])

  useLayoutEffect(() => {
    if (!gridHostEl) return undefined
    let cleanup: (() => void) | undefined
    const run = () => {
      if (!gridHostEl.isConnected) return
      cleanup?.()
      cleanup = patchEmbeddedSpreadsheetHostLayout(gridHostEl)
    }
    run()
    const t0 = window.setTimeout(run, 0)
    const t1 = window.setTimeout(run, 100)
    const raf = window.requestAnimationFrame(run)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
      window.cancelAnimationFrame(raf)
      cleanup?.()
    }
  }, [gridHostEl])

  useEffect(() => {
    if (!gridHostEl) {
      updateGridHostReady(false)
      return undefined
    }
    if (isJSDOMRuntime()) {
      updateGridHostReady(true)
      return undefined
    }

    let rafId: number | null = null

    const setReadyAfterLayout = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      rafId = requestAnimationFrame(() => {
        rafId = null
        updateGridHostReady(true)
      })
    }

    const measure = () => {
      const box = gridHostEl.getBoundingClientRect()
      const ready = box.width > 0 && box.height > 0
      if (ready) {
        setReadyAfterLayout()
        return
      }
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (!gridHostReadyRef.current) {
        updateGridHostReady(false)
      }
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      updateGridHostReady(true)
      return () => {
        if (rafId != null) cancelAnimationFrame(rafId)
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(gridHostEl)
    return () => {
      observer.disconnect()
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [gridHostEl, updateGridHostReady])

  return { containerRef, gridHostEl, gridHostReady, setGridHostRef }
}
