import { useState, useCallback } from 'react'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import type { ContentDocument } from '@/common/data/content/types/contentTypes'

/**
 * Breadcrumb item for navigation
 */
export interface Breadcrumb {
  id: string
  title: string
  type: 'area' | 'folder'
}

/**
 * Hook for managing document navigation state
 *
 * Handles:
 * - Current document area (Content Entry)
 * - Current folder path
 * - Breadcrumb trail
 * - Navigation actions
 */
export const useDocumentNavigation = () => {
  const [currentArea, setCurrentArea] = useState<ContentEntry | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])

  /**
   * Select a document area (Content Entry)
   * Resets folder navigation to root
   */
  const selectArea = useCallback((area: ContentEntry) => {
    setCurrentArea(area)
    setCurrentFolderId(null)
    setBreadcrumbs([
      {
        id: area.id,
        title: area.title || 'Untitled Area',
        type: 'area'
      }
    ])
  }, [])

  /**
   * Navigate into a folder
   * Adds folder to breadcrumb trail
   */
  const navigateToFolder = useCallback((folder: ContentDocument) => {
    if (!folder.id || !folder.name) return

    setCurrentFolderId(folder.id)
    setBreadcrumbs(prev => [
      ...prev,
      {
        id: folder.id,
        title: folder.name || 'Untitled Folder',
        type: 'folder'
      }
    ])
  }, [])

  /**
   * Navigate up one level (back button)
   * If at folder level -> go to parent folder or area root
   * If at area level -> clear selection
   */
  const navigateUp = useCallback(() => {
    const newBreadcrumbs = breadcrumbs.slice(0, -1)
    setBreadcrumbs(newBreadcrumbs)

    if (newBreadcrumbs.length === 0) {
      // No breadcrumbs left -> clear everything
      setCurrentArea(null)
      setCurrentFolderId(null)
    } else {
      const lastItem = newBreadcrumbs[newBreadcrumbs.length - 1]
      if (lastItem.type === 'folder') {
        // Navigate to parent folder
        setCurrentFolderId(lastItem.id)
      } else {
        // Navigate to area root (no folder selected)
        setCurrentFolderId(null)
      }
    }
  }, [breadcrumbs])

  /**
   * Navigate to specific breadcrumb item
   * Used when clicking on breadcrumb links
   */
  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
      setBreadcrumbs(newBreadcrumbs)

      const targetItem = newBreadcrumbs[newBreadcrumbs.length - 1]
      if (targetItem.type === 'area') {
        setCurrentFolderId(null)
      } else {
        setCurrentFolderId(targetItem.id)
      }
    },
    [breadcrumbs]
  )

  /**
   * Reset navigation (go back to area selection)
   */
  const reset = useCallback(() => {
    setCurrentArea(null)
    setCurrentFolderId(null)
    setBreadcrumbs([])
  }, [])

  return {
    // State
    currentArea,
    currentFolderId,
    breadcrumbs,

    // Actions
    selectArea,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    reset
  }
}
