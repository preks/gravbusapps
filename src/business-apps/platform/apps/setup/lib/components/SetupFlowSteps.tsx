import React from 'react'
import { cn } from '@newwork/nw-design-system'

export type SetupFlowStepItem = { title: string }

/** Horizontal step labels aligned with the business-app shell (replaces legacy Steps). */
export function SetupFlowSteps({
  current,
  items,
  className,
  'data-testid': dataTestId
}: {
  current: number
  items: SetupFlowStepItem[]
  className?: string
  'data-testid'?: string
}) {
  if (!items.length) return null
  return (
    <nav aria-label="Progress" className={cn('gba:flex gba:flex-wrap gba:items-center gba:justify-center gba:gap-x-3 gba:gap-y-2', className)} data-testid={dataTestId}>
      {items.map((item, index) => {
        const isActive = index === current
        const isDone = index < current
        return (
          <span
            key={`${item.title}-${index}`}
            className={cn(
              'gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors',
              isActive && 'gba:border-primary gba:bg-primary/10 gba:text-primary',
              isDone && !isActive && 'gba:border-muted-foreground/30 gba:text-muted-foreground',
              !isActive && !isDone && 'gba:border-transparent gba:text-muted-foreground/70'
            )}
          >
            <span className="gba:tabular-nums gba:text-[10px] gba:opacity-70">{index + 1}</span>
            <span>{item.title}</span>
          </span>
        )
      })}
    </nav>
  )
}
