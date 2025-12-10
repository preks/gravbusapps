import { useState, useCallback } from 'react'
import type { ContentEntry, ContentDocument } from '@/common/data/content/types/contentTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

/**
 * Breadcrumb item for navigation
 */
export interface Breadcrumb {
  id: string
  title: string
  type: 'type' | 'category' | 'area' | 'folder'
}

/**
 * Hook for managing document navigation state
 *
 * Hierarchy:
 * 1. ContentType (e.g., "Contracts", "Policies")
 * 2. Categories (optional filtering, multiple per area)
 * 3. ContentEntries (Document Areas)
 * 4. ContentDocuments (Folders & Files)
 */
export const useDocumentNavigation = () => {
  const [currentType, setCurrentType] = useState<CatalogEntry | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [currentArea, setCurrentArea] = useState<ContentEntry | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])

  /**
   * Select a content type (top level)
   * Resets all lower levels
   */
  const selectType = useCallback((type: CatalogEntry) => {
    setCurrentType(type)
    setSelectedCategories([])
    setCurrentArea(null)
    setCurrentFolderId(null)
    setBreadcrumbs([
      {
        id: type.id,
        title: type.value || 'Untitled Type',
        type: 'type'
      }
    ])
  }, [])

  /**
   * Toggle category filter
   * Multiple categories can be selected
   */
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(categoryId)
      return isSelected ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    })
    // Note: Categories are filters, not breadcrumb items
  }, [])

  /**
   * Clear all category filters
   */
  const clearCategories = useCallback(() => {
    setSelectedCategories([])
  }, [])

  /**
   * Select a document area (Content Entry)
   * Resets folder navigation to root
   */
  const selectArea = useCallback(
    (area: ContentEntry | null) => {
      setCurrentArea(area)
      setCurrentFolderId(null)

      if (!area) {
        setBreadcrumbs([])
        return
      }

      // Build breadcrumbs: type + area
      const newBreadcrumbs: Breadcrumb[] = []
      if (currentType) {
        newBreadcrumbs.push({
          id: currentType.id,
          title: currentType.value || 'Untitled Type',
          type: 'type'
        })
      }
      newBreadcrumbs.push({
        id: area.id,
        title: area.title || 'Untitled Area',
        type: 'area'
      })

      setBreadcrumbs(newBreadcrumbs)
    },
    [currentType]
  )

  /**
   * Navigate into a folder
   * Adds folder to breadcrumb trail
   */
  const navigateToFolder = useCallback((folder: ContentDocument) => {
    if (!folder.id) return

    setCurrentFolderId(folder.id)
    setBreadcrumbs(prev => [
      ...prev,
      {
        id: folder.id,
        title: folder.name || 'Unnamed Folder',
        type: 'folder'
      }
    ])
  }, [])

  /**
   * Navigate up one level (back button)
   */
  const navigateUp = useCallback(() => {
    const newBreadcrumbs = breadcrumbs.slice(0, -1)
    setBreadcrumbs(newBreadcrumbs)

    if (newBreadcrumbs.length === 0) {
      // No breadcrumbs left -> clear everything
      setCurrentType(null)
      setCurrentArea(null)
      setCurrentFolderId(null)
      setSelectedCategories([])
    } else {
      const lastItem = newBreadcrumbs[newBreadcrumbs.length - 1]
      if (lastItem.type === 'folder') {
        setCurrentFolderId(lastItem.id)
      } else if (lastItem.type === 'area') {
        setCurrentFolderId(null)
      } else if (lastItem.type === 'type') {
        setCurrentArea(null)
        setCurrentFolderId(null)
      }
    }
  }, [breadcrumbs])

  /**
   * Navigate to specific breadcrumb item
   */
  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
      setBreadcrumbs(newBreadcrumbs)

      const targetItem = newBreadcrumbs[newBreadcrumbs.length - 1]

      if (targetItem.type === 'type') {
        setCurrentArea(null)
        setCurrentFolderId(null)
      } else if (targetItem.type === 'area') {
        setCurrentFolderId(null)
      } else if (targetItem.type === 'folder') {
        setCurrentFolderId(targetItem.id)
      }
    },
    [breadcrumbs]
  )

  /**
   * Reset navigation (go back to type selection)
   */
  const reset = useCallback(() => {
    setCurrentType(null)
    setSelectedCategories([])
    setCurrentArea(null)
    setCurrentFolderId(null)
    setBreadcrumbs([])
  }, [])

  return {
    // State
    currentType,
    selectedCategories,
    currentArea,
    currentFolderId,
    breadcrumbs,

    // Actions
    selectType,
    toggleCategory,
    clearCategories,
    selectArea,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    reset
  }
}
