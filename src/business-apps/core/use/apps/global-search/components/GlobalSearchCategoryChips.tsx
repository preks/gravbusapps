import React, { useMemo } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@newwork/nw-design-system'
import type { SearchCategory, SearchCategorySelectionMode } from '../types'
import { isAllCategoryId, visibleCategoriesForChips } from '../utils'

export interface GlobalSearchCategoryChipsProps {
  categories: SearchCategory[]
  selectedCategoryIds: string[]
  categorySelectionMode: SearchCategorySelectionMode
  showCounts: boolean
  onSelectCategory: (categoryId: string) => void
  onCategorySelectionChange: (categoryIds: string[]) => void
}

const ALL_CATEGORY: SearchCategory = {
  id: 'all',
  label: 'All'
}

const resolveToggleSelection = (selectedCategoryIds: string[], includeAllToggle: boolean): string[] => {
  if (selectedCategoryIds.length === 0) {
    return includeAllToggle ? ['all'] : []
  }

  return selectedCategoryIds
}

const normalizeMultipleSelection = (values: string[], selectedCategoryIds: string[]): string[] => {
  const hasAllValue = values.some(isAllCategoryId)
  const hadAllSelected = selectedCategoryIds.length === 0 || selectedCategoryIds.some(isAllCategoryId)
  const concreteValues = values.filter(value => !isAllCategoryId(value))

  if (hasAllValue && !hadAllSelected) {
    return []
  }

  return concreteValues
}

export const GlobalSearchCategoryChips: React.FC<GlobalSearchCategoryChipsProps> = ({
  categories,
  selectedCategoryIds,
  categorySelectionMode,
  showCounts,
  onSelectCategory,
  onCategorySelectionChange
}) => {
  const visibleCategories = useMemo(() => visibleCategoriesForChips(categories), [categories])
  const concreteCategories = useMemo(
    () => visibleCategories.filter(category => !isAllCategoryId(category.id)),
    [visibleCategories]
  )
  const includeAllToggle = concreteCategories.length > 0
  const toggleCategories = useMemo(
    () => (includeAllToggle ? [ALL_CATEGORY, ...concreteCategories] : []),
    [concreteCategories, includeAllToggle]
  )
  const toggleSelection = useMemo(
    () => resolveToggleSelection(selectedCategoryIds, includeAllToggle),
    [includeAllToggle, selectedCategoryIds]
  )

  if (toggleCategories.length === 0) {
    return null
  }

  const renderCategoryLabel = (category: SearchCategory): React.ReactNode => {
    if (!showCounts || typeof category.count !== 'number') {
      return category.label
    }

    return (
      <span className="gba:inline-flex gba:items-center gba:gap-1">
        <span>{category.label}</span>
        <span className="gba:text-muted-foreground gba:tabular-nums">{category.count}</span>
      </span>
    )
  }

  const categoryItems = toggleCategories.map(category => (
    <ToggleGroupItem
      key={category.id}
      value={category.id}
      aria-label={category.label}
      className="gba:shrink-0"
      data-testid={`GlobalSearchCategory-${category.id}`}
    >
      {renderCategoryLabel(category)}
    </ToggleGroupItem>
  ))

  return (
    <div
      className="no-scrollbar gba:min-w-0 gba:w-full gba:overflow-x-auto gba:overflow-y-hidden gba:touch-pan-x"
      data-testid="GlobalSearchCategoryChipsScroll"
    >
      {categorySelectionMode === 'SINGLE' ? (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="gba:w-max"
          value={toggleSelection[0] ?? ''}
          onValueChange={value => {
            if (!value) {
              return
            }
            onSelectCategory(value)
          }}
          data-testid="GlobalSearchCategoryToggleGroup"
        >
          {categoryItems}
        </ToggleGroup>
      ) : (
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          className="gba:w-max"
          value={toggleSelection}
          onValueChange={values => onCategorySelectionChange(normalizeMultipleSelection(values, selectedCategoryIds))}
          data-testid="GlobalSearchCategoryToggleGroup"
        >
          {categoryItems}
        </ToggleGroup>
      )}
    </div>
  )
}
