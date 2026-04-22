import { useCallback, useState } from 'react'
import { SIDEBAR_SECTION_COLLAPSED_STORAGE_PREFIX } from './sidebarLayout.constants'

function storageKey(sectionId: string): string {
  return `${SIDEBAR_SECTION_COLLAPSED_STORAGE_PREFIX}${sectionId}`
}

function readStoredPreference(sectionId: string): boolean | null {
  if (globalThis.localStorage === undefined) return null
  try {
    const raw = globalThis.localStorage.getItem(storageKey(sectionId))
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writeStoredPreference(sectionId: string, value: boolean): void {
  if (globalThis.localStorage === undefined) return
  try {
    globalThis.localStorage.setItem(storageKey(sectionId), value ? 'true' : 'false')
  } catch {
    // ignore quota / privacy-mode failures
  }
}

export interface UseSidebarSectionCollapsedStateResult {
  isCollapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (next: boolean) => void
}

/**
 * Per-section collapsed preference for sidebar lists (Active / Recents / …).
 *
 * - First paint: prior `localStorage` choice, else `defaultCollapsed`.
 * - User toggles persist to `localStorage` under a prefixed key so sections
 *   never collide with one another or with the sidebar's own collapse state.
 */
export const useSidebarSectionCollapsedState = (
  sectionId: string,
  defaultCollapsed: boolean
): UseSidebarSectionCollapsedStateResult => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const stored = readStoredPreference(sectionId)
    return stored ?? defaultCollapsed
  })

  const setCollapsed = useCallback(
    (next: boolean) => {
      setIsCollapsed(next)
      writeStoredPreference(sectionId, next)
    },
    [sectionId]
  )

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      writeStoredPreference(sectionId, next)
      return next
    })
  }, [sectionId])

  return { isCollapsed, toggleCollapsed, setCollapsed }
}
