import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ServiceCategory } from '@/business-apps/ser/hooks/useServicePortalCategories'
import { getCategoryIcon } from '@/business-apps/ser/utils/iconMapping'

export interface FlowLibraryCategoryTileProps extends Partial<BusinessAppContextProps> {
  category: ServiceCategory
  templateCount: number
  onClick: () => void
  testId: string
}

export const FlowLibraryCategoryTile: React.FC<FlowLibraryCategoryTileProps> = ({
  category,
  templateCount,
  onClick,
  testId
}) => {
  const Icon = getCategoryIcon(category.icon || category.id)

  return (
    <button
      type="button"
      onClick={onClick}
      className="gba:block gba:w-full gba:text-left gba:!cursor-pointer gba:rounded-lg gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring"
      data-testid={testId}
    >
      <Card className="gba:bg-background gba:border gba:border-border gba:hover:bg-accent/10 gba:transition-colors gba:!cursor-pointer">
        <CardContent className="gba:p-4 gba:flex gba:items-start gba:gap-3 gba:!cursor-pointer">
          <div className="gba:shrink-0 gba:mt-0.5" aria-hidden>
            <Icon size={20} />
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
              <div className="gba:font-medium gba:truncate">{category.name}</div>
              <div className="gba:text-sm gba:text-muted-foreground gba:shrink-0">{templateCount}</div>
            </div>
            {category.description ? (
              <div className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-2">
                {category.description}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

export default FlowLibraryCategoryTile
