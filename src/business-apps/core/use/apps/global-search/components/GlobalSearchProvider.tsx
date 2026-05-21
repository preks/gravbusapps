import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import type { GlobalSearchAdapter } from '../adapters'
import { useGlobalSearch } from '../hooks'
import type { SearchCategorySelectionMode, SearchItem, SearchSection, SearchTarget } from '../types'
import {
  dispatchSearchTarget,
  expandResultsSectionsByCategory,
  flattenSelectableResults,
  mergeTopMatchIntoResultsSections
} from '../utils'

const DISCOVERY_SECTION_KINDS_SKIP_CATEGORY_FILTER = new Set<SearchSection['kind']>([
  'RECENT',
  'SUGGESTIONS',
  'ACTIONS'
])

const itemMatchesSelectedCategories = (
  item: SearchItem,
  selectedSet: Set<string>,
  includeAllCategories: boolean
): boolean => includeAllCategories || item.categoryIds.some(categoryId => selectedSet.has(categoryId))

const filterSectionByCategory = (
  section: SearchSection,
  selectedSet: Set<string>,
  includeAllCategories: boolean
): SearchSection => {
  if (DISCOVERY_SECTION_KINDS_SKIP_CATEGORY_FILTER.has(section.kind)) {
    return section
  }
  return {
    ...section,
    items: section.items.filter(item => itemMatchesSelectedCategories(item, selectedSet, includeAllCategories))
  }
}

interface GlobalSearchContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken?: string
  query: string
  setQuery: (query: string) => void
  isDiscoveryMode: boolean
  isLoading: boolean
  errorMessage?: string
  categories: ReturnType<typeof useGlobalSearch>['categories']
  sections: ReturnType<typeof useGlobalSearch>['sections']
  suggestions: string[]
  selectedCategoryIds: string[]
  categorySelectionMode: SearchCategorySelectionMode
  setSelectedCategories: (categoryId: string) => void
  applyCategorySelection: (categoryIds: string[]) => void
  selectableResults: ReturnType<typeof useGlobalSearch>['selectableResults']
  executeItemTarget: (item: SearchItem) => Promise<void>
  executeTarget: (target: SearchTarget) => void
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

export interface GlobalSearchProviderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken?: string
  adapter?: GlobalSearchAdapter
  enableKeyboardShortcut?: boolean
  children: React.ReactNode
}

export const GlobalSearchProvider: React.FC<GlobalSearchProviderProps> = ({
  open,
  onOpenChange,
  accessToken,
  adapter,
  enableKeyboardShortcut = true,
  children
}) => {
  if (!adapter) {
    throw new Error('GlobalSearchProvider requires a GlobalSearchAdapter')
  }

  const {
    query,
    setQuery,
    isDiscoveryMode,
    isLoading,
    errorMessage,
    categories,
    sections,
    suggestions,
    selectedCategoryIds,
    categorySelectionMode,
    setSelectedCategories,
    applyCategorySelection,
    runTarget
  } = useGlobalSearch({
    open,
    onOpenChange,
    adapter
  })

  const expandedSections = useMemo(() => {
    const withoutTopMatchSection = mergeTopMatchIntoResultsSections(sections)
    return expandResultsSectionsByCategory(withoutTopMatchSection, categories)
  }, [sections, categories])

  const resolvedSections = useMemo<SearchSection[]>(() => {
    const selectedSet = new Set(selectedCategoryIds)
    const includeAllCategories = selectedSet.has('all') || selectedSet.size === 0
    return expandedSections
      .map(section => filterSectionByCategory(section, selectedSet, includeAllCategories))
      .filter(section => section.items.length > 0)
      .map(section =>
        isDiscoveryMode
          ? section
          : {
              ...section,
              total: section.items.length
            }
      )
  }, [expandedSections, isDiscoveryMode, selectedCategoryIds])

  const resolvedSelectableResults = useMemo(() => flattenSelectableResults(resolvedSections), [resolvedSections])

  useEffect(() => {
    if (!enableKeyboardShortcut) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey
      if (!isModifier || event.key.toLowerCase() !== 'k') {
        return
      }

      event.preventDefault()
      onOpenChange(!open)
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [enableKeyboardShortcut, onOpenChange, open])

  const executeTarget = useCallback(
    (target: SearchTarget) => {
      if (target.kind !== 'APP_ACTION') {
        dispatchSearchTarget(target)
        onOpenChange(false)
      }
    },
    [onOpenChange]
  )

  const executeItemTarget = useCallback(
    async (item: SearchItem) => {
      if (item.type === 'QUERY' || item.id.startsWith('query:')) {
        setQuery(item.name.trim())
        return
      }
      if (!item.primaryTarget) {
        return
      }

      executeTarget(item.primaryTarget)
      await runTarget(item)
    },
    [executeTarget, runTarget, setQuery]
  )

  const contextValue = useMemo<GlobalSearchContextValue>(
    () => ({
      open,
      onOpenChange,
      accessToken,
      query,
      setQuery,
      isDiscoveryMode,
      isLoading,
      errorMessage,
      categories,
      sections: resolvedSections,
      suggestions,
      selectedCategoryIds,
      categorySelectionMode,
      setSelectedCategories,
      applyCategorySelection,
      selectableResults: resolvedSelectableResults,
      executeItemTarget,
      executeTarget
    }),
    [
      open,
      onOpenChange,
      accessToken,
      query,
      setQuery,
      isDiscoveryMode,
      isLoading,
      errorMessage,
      categories,
      resolvedSections,
      suggestions,
      selectedCategoryIds,
      categorySelectionMode,
      setSelectedCategories,
      applyCategorySelection,
      resolvedSelectableResults,
      executeItemTarget,
      executeTarget
    ]
  )

  return <GlobalSearchContext.Provider value={contextValue}>{children}</GlobalSearchContext.Provider>
}

export const useGlobalSearchContext = (): GlobalSearchContextValue => {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    throw new Error('useGlobalSearchContext must be used inside GlobalSearchProvider')
  }

  return context
}
