/**
 * ComponentItem - Individual component display with checkbox
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'
import { CheckCircle2 } from 'lucide-react'
import type { BuildPlan } from '../../../types'

interface ComponentItemProps {
  component: BuildPlan['components'][0]
  description: string
  isSkipped: boolean
  onToggle: (componentId: string) => void
  variant?: 'flat' | 'grouped'
}

export const ComponentItem: React.FC<ComponentItemProps> = ({
  component,
  description,
  isSkipped,
  onToggle,
  variant = 'flat'
}) => {
  if (variant === 'flat') {
    return (
      <div
        className={cn(
          'gba:flex gba:items-start gba:gap-2.5 gba:py-2 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:cursor-pointer gba:transition-all hover:gba:bg-muted/30',
          isSkipped && 'gba:opacity-40 gba:bg-muted/10'
        )}
        onClick={() => onToggle(component.id)}
      >
        <div className="gba:mt-0.5 gba:shrink-0">
          <CheckCircle2
            className={cn(
              'gba:w-[18px] gba:h-[18px] gba:transition-all',
              isSkipped ? 'gba:text-muted-foreground gba:opacity-30' : 'gba:text-foreground'
            )}
          />
        </div>
        <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-baseline gba:gap-2">
          <div
            className={cn(
              'gba:text-sm gba:font-medium gba:text-foreground gba:leading-tight gba:shrink-0',
              isSkipped && 'gba:line-through'
            )}
          >
            {component.name}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:leading-tight gba:flex-1">{description}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'gba:flex gba:items-start gba:gap-3 gba:py-3 gba:px-2 gba:rounded-md gba:group gba:relative gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/50',
        isSkipped && 'gba:opacity-40'
      )}
      onClick={() => onToggle(component.id)}
    >
      <div className="gba:mt-0.5 gba:shrink-0">
        <CheckCircle2
          className={cn(
            'gba:w-[18px] gba:h-[18px] gba:transition-all',
            isSkipped ? 'gba:text-muted-foreground gba:opacity-30' : 'gba:text-foreground'
          )}
        />
      </div>
      <div className="gba:flex-1 gba:min-w-0 gba:pr-20">
        <div
          className={cn(
            'gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:leading-snug',
            isSkipped && 'gba:line-through'
          )}
        >
          {component.name}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:leading-[1.5]">{description}</div>
      </div>
    </div>
  )
}
