import React, { useMemo } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import type { SearchCategory } from '../types'
import { isAllCategoryId, visibleCategoriesForChips } from '../utils'

export interface GlobalSearchCategoryChipsProps {
  categories: SearchCategory[]
  selectedCategoryIds: string[]
  onSelectCategory: (categoryId: string) => void
}

export const GlobalSearchCategoryChips: React.FC<GlobalSearchCategoryChipsProps> = ({
  categories,
  selectedCategoryIds,
  onSelectCategory
}) => {
  const visibleCategories = useMemo(() => visibleCategoriesForChips(categories), [categories])

  return (
    <div
      className="no-scrollbar gba:min-w-0 gba:w-full gba:overflow-x-auto gba:overflow-y-hidden gba:pb-0.5 gba:touch-pan-x"
      data-testid="GlobalSearchCategoryChipsScroll"
    >
      <div className="gba:flex gba:flex-nowrap gba:gap-2 gba:w-max gba:max-w-none gba:pr-1">
        {visibleCategories.map(category => {
          const isSelected = isAllCategoryId(category.id)
            ? selectedCategoryIds.length === 0 || selectedCategoryIds.includes(category.id)
            : selectedCategoryIds.includes(category.id)
          return (
            <Button
              key={category.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className="gba:shrink-0 gba:gap-1.5"
              onClick={() => onSelectCategory(category.id)}
              data-testid={`GlobalSearchCategory-${category.id}`}
            >
              {category.label}
              {typeof category.count === 'number' ? <Badge variant="outline">{category.count}</Badge> : null}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
