import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { SuccessEmptyState, SuccessLoadingGrid } from './SuccessStates'

export interface SuccessKpiItem {
  id: string
  label: string
  value: string
  description?: string
  icon?: React.ReactNode
}

interface SuccessKpiGridProps {
  items: SuccessKpiItem[]
  isLoading?: boolean
  emptyTitle: string
  emptyDescription: string
  variant?: 'default' | 'compact'
  'data-testid'?: string
}

export const SuccessKpiGrid: React.FC<SuccessKpiGridProps> = ({
  items,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  variant = 'default',
  'data-testid': testId = 'success-kpi-grid'
}) => {
  if (isLoading) {
    return <SuccessLoadingGrid data-testid={`${testId}-loading`} />
  }

  if (items.length === 0) {
    return <SuccessEmptyState title={emptyTitle} description={emptyDescription} data-testid={`${testId}-empty`} />
  }

  const isCompact = variant === 'compact'

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:xl:grid-cols-4" data-testid={testId}>
      {items.map(item => (
        <Card key={item.id} className={`gba:border-border gba:bg-card ${isCompact ? 'gba:h-full' : ''}`}>
          <CardContent className={`gba:flex gba:flex-col gba:p-5 ${isCompact ? 'gba:h-full gba:gap-3' : 'gba:gap-4'}`}>
            <div
              className={`gba:flex gba:justify-between gba:gap-3 ${isCompact ? 'gba:min-h-12 gba:items-start' : 'gba:items-center'}`}
            >
              <span
                className={
                  isCompact
                    ? 'gba:line-clamp-2 gba:text-xs gba:font-medium gba:leading-5 gba:text-muted-foreground'
                    : 'gba:text-sm gba:font-medium gba:text-muted-foreground'
                }
              >
                {item.label}
              </span>
              {item.icon ? (
                <div className={`gba:text-muted-foreground ${isCompact ? 'gba:mt-0.5 gba:flex-shrink-0' : ''}`}>
                  {item.icon}
                </div>
              ) : null}
            </div>
            <div
              className={
                isCompact
                  ? 'gba:text-xl gba:font-semibold gba:leading-none gba:text-foreground gba:sm:text-2xl'
                  : 'gba:text-3xl gba:font-semibold gba:text-foreground'
              }
            >
              {item.value}
            </div>
            {item.description ? (
              <p className={`gba:text-sm gba:text-muted-foreground ${isCompact ? 'gba:mt-auto' : ''}`}>
                {item.description}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
