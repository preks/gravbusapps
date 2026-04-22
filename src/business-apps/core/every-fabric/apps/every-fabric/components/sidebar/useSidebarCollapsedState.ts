import { useCallback, useEffect, useState } from 'react'
import { SIDEBAR_AUTO_COLLAPSE_BREAKPOINT_PX, SIDEBAR_COLLAPSED_STORAGE_KEY } from './sidebarLayout.constants'

function readStoredPreference(): boolean | null {
  if (globalThis.localStorage === undefined) return null
  try {
    const raw = globalThis.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writeStoredPreference(value: boolean): void {
  if (globalThis.localStorage === undefined) return
  try {
    globalThis.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? 'true' : 'false')
  } catch {
    // ignore quota / privacy-mode failures
  }
}

function resolveInitialCollapsed(): boolean {
  const stored = readStoredPreference()
  if (stored !== null) return stored
  if (typeof globalThis.innerWidth !== 'number') return false
  return globalThis.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT_PX
}

export interface UseSidebarCollapsedStateResult {
  isCollapsed: boolean
  setCollapsed: (next: boolean) => void
  toggleCollapsed: () => void
}

/**
 * Persisted sidebar expand/collapse preference.
 *
 * - First paint: prior `localStorage` choice, else auto-collapsed below the
 *   responsive breakpoint.
 * - User toggles persist to `localStorage` and win over responsive defaults.
 * - Viewport resizes do NOT overwrite an explicit user preference.
 */
export const useSidebarCollapsedState = (): UseSidebarCollapsedStateResult => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => resolveInitialCollapsed())
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(() => readStoredPreference() !== null)

  useEffect(() => {
    if (hasUserPreference) return undefined
    if (typeof globalThis.addEventListener !== 'function') return undefined

    const sync = () => {
      if (typeof globalThis.innerWidth !== 'number') return
      setIsCollapsed(globalThis.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT_PX)
    }
    globalThis.addEventListener('resize', sync)
    return () => globalThis.removeEventListener('resize', sync)
  }, [hasUserPreference])

  const setCollapsed = useCallback((next: boolean) => {
    setIsCollapsed(next)
    setHasUserPreference(true)
    writeStoredPreference(next)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      writeStoredPreference(next)
      return next
    })
    setHasUserPreference(true)
  }, [])

  return { isCollapsed, setCollapsed, toggleCollapsed }
}
