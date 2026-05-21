import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { Chip, Spinner } from '@newwork/nw-design-system'
import { useGlobalSearchContext } from './GlobalSearchProvider'
import { GlobalSearchInput } from './GlobalSearchInput'
import { GlobalSearchCategoryChips } from './GlobalSearchCategoryChips'
import { GlobalSearchSectionRenderer } from './GlobalSearchSectionRenderer'
import { GlobalSearchEmptyState } from './GlobalSearchEmptyState'
import { GlobalSearchLoadingState } from './GlobalSearchLoadingState'
import { GlobalSearchErrorState } from './GlobalSearchErrorState'
import { useKeyboardNavigation } from '../hooks'
import type { SearchItem, SearchSection, SearchTarget } from '../types'
import { isHorizontalSwimlaneSection } from '../utils'
import { GLOBAL_SEARCH_UI_DEFAULTS } from '../utils/globalSearchUiDefaults'

interface ResultsAreaProps {
  errorMessage?: string
  isLoading: boolean
  hasSections: boolean
  query: string
  sections: SearchSection[]
  showSectionCounts: boolean
  activeItemId: string | undefined
  accessToken?: string
  executeItemTarget: (item: SearchItem) => Promise<void>
  executeTarget: (target: SearchTarget) => void
  closeSearch: () => void
}

interface SuggestionsProps {
  suggestions: string[]
  onSelectSuggestion: (suggestion: string) => void
}

const renderSuggestions = ({ suggestions, onSelectSuggestion }: SuggestionsProps): React.ReactNode => {
  if (suggestions.length === 0) {
    return null
  }

  return (
    <div
      className="no-scrollbar gba:flex gba:min-w-0 gba:w-full gba:gap-1.5 gba:overflow-x-auto gba:overflow-y-hidden gba:touch-pan-x"
      data-testid="GlobalSearchSuggestions"
    >
      {suggestions.map(suggestion => (
        <Chip
          key={suggestion}
          size="sm"
          variant="default"
          onClick={() => onSelectSuggestion(suggestion)}
          data-testid={`GlobalSearchSuggestion-${suggestion}`}
        >
          <span className="gba:max-w-40 gba:truncate" title={suggestion}>
            {suggestion}
          </span>
        </Chip>
      ))}
    </div>
  )
}

const renderResultsArea = ({
  errorMessage,
  isLoading,
  hasSections,
  query,
  sections,
  showSectionCounts,
  activeItemId,
  accessToken,
  executeItemTarget,
  executeTarget,
  closeSearch
}: ResultsAreaProps): React.ReactNode => {
  if (errorMessage) {
    return <GlobalSearchErrorState message={errorMessage} />
  }
  if (isLoading && !hasSections) {
    return <GlobalSearchLoadingState />
  }
  if (!hasSections) {
    return <GlobalSearchEmptyState query={query} />
  }
  return (
    <>
      <GlobalSearchSectionRenderer
        sections={sections}
        showSectionCounts={showSectionCounts}
        activeItemId={activeItemId}
        accessToken={accessToken}
        onSelectItem={item => {
          executeItemTarget(item).catch(() => undefined)
        }}
        onSelectTarget={executeTarget}
        onActionExecute={closeSearch}
      />
      {isLoading ? (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-start gba:justify-center gba:bg-background/70 gba:pt-6">
          <Spinner size="sm" />
        </div>
      ) : null}
    </>
  )
}

const scrollElementIntoContainer = (container: HTMLElement, element: HTMLElement) => {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()

  if (elementRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - elementRect.top
  } else if (elementRect.bottom > containerRect.bottom) {
    container.scrollTop += elementRect.bottom - containerRect.bottom
  }

  const horizontalContainer = element.closest('[data-global-search-horizontal-scroll="true"]')
  if (!(horizontalContainer instanceof HTMLElement)) {
    return
  }

  const horizontalContainerRect = horizontalContainer.getBoundingClientRect()
  if (elementRect.left < horizontalContainerRect.left) {
    horizontalContainer.scrollLeft -= horizontalContainerRect.left - elementRect.left
  } else if (elementRect.right > horizontalContainerRect.right) {
    horizontalContainer.scrollLeft += elementRect.right - horizontalContainerRect.right
  }
}

export const GlobalSearchContent: React.FC = () => {
  const {
    open,
    onOpenChange,
    accessToken,
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
    selectableResults,
    setSelectedCategories,
    applyCategorySelection,
    executeItemTarget,
    executeTarget
  } = useGlobalSearchContext()

  const showCounts = !isDiscoveryMode

  const closeSearch = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const navigationSections = useMemo(
    () =>
      sections.map(section => ({
        itemCount: section.items.length,
        isHorizontal: isHorizontalSwimlaneSection(section)
      })),
    [sections]
  )

  const { activePositionIndex, positions } = useKeyboardNavigation({
    enabled: open,
    sections: navigationSections,
    onEnter: (sectionIndex, itemIndex) => {
      const item = sections[sectionIndex]?.items[itemIndex]
      if (item) {
        void executeItemTarget(item)
      }
    },
    onEscape: () => onOpenChange(false)
  })

  const activeItemId = useMemo(() => {
    const pos = positions[activePositionIndex]
    if (!pos) return undefined
    return sections[pos.sectionIndex]?.items[pos.itemIndex]?.id
  }, [positions, activePositionIndex, sections])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasSections = sections.length > 0

  useEffect(() => {
    if (!scrollContainerRef.current) return

    const pos = positions[activePositionIndex]
    if (!pos) return

    const container = scrollContainerRef.current

    if (pos.itemIndex === 0 && !pos.isHorizontal) {
      const sectionId = sections[pos.sectionIndex]?.id
      if (sectionId) {
        const sectionEl = container.querySelector(`[data-testid="GlobalSearchSection-${sectionId}"]`)
        if (sectionEl instanceof HTMLElement) {
          scrollElementIntoContainer(container, sectionEl)
        }
        return
      }
    }

    if (!activeItemId) return
    const activeElement = container.querySelector(`[data-search-item-id="${activeItemId}"]`)
    if (activeElement instanceof HTMLElement) {
      scrollElementIntoContainer(container, activeElement)
    }
  }, [activeItemId, activePositionIndex, positions, sections])

  return (
    <div
      className="gba:flex gba:h-full gba:min-h-0 gba:flex-col gba:min-w-0 gba:w-full gba:gap-0"
      data-testid="GlobalSearchContent"
    >
      <div className="gba:min-w-0 gba:w-full gba:p-4 gba:border-b gba:border-border gba:space-y-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:pr-10">
          <h2 className="gba:text-base gba:font-semibold">Search in NEWWORK</h2>
          <kbd className="gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted">Ctrl/Cmd + K</kbd>
        </div>
        <GlobalSearchInput
          value={query}
          onChange={setQuery}
          placeholder={GLOBAL_SEARCH_UI_DEFAULTS.placeholder}
          isLoading={isLoading}
        />
        <div className="gba:flex gba:flex-col gba:gap-3">
          {renderSuggestions({
            suggestions,
            onSelectSuggestion: setQuery
          })}
          <GlobalSearchCategoryChips
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            categorySelectionMode={categorySelectionMode}
            showCounts={showCounts}
            onSelectCategory={setSelectedCategories}
            onCategorySelectionChange={applyCategorySelection}
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="gba:flex-1 gba:min-h-0 gba:min-w-0 gba:w-full gba:max-h-[540px] gba:overflow-y-auto"
        data-testid="GlobalSearchResultsScroll"
      >
        <div className="gba:relative gba:min-w-0 gba:w-full gba:max-w-full gba:p-4 gba:pb-5">
          {renderResultsArea({
            errorMessage,
            isLoading,
            hasSections,
            query,
            sections,
            showSectionCounts: showCounts,
            activeItemId,
            accessToken,
            executeItemTarget,
            executeTarget,
            closeSearch
          })}
        </div>
      </div>

      <div className="gba:border-t gba:border-border gba:px-4 gba:py-2 gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
        <span>{showCounts ? `${selectableResults.length} results` : '\u00a0'}</span>
        <div className="gba:flex gba:items-center gba:gap-3">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
