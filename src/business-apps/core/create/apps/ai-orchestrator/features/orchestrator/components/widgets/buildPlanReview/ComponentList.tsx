/**
 * ComponentList - Displays components in flat or grouped layout
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Edit2 } from 'lucide-react'
import type { BuildPlan, ComponentType } from '../../../types'
import { ComponentItem } from './ComponentItem'
import { typeIcons, typeLabels, getComponentDescription } from './buildPlanReview.utils'

interface ComponentListProps {
  components: BuildPlan['components']
  skippedComponents: Set<string>
  onToggle: (componentId: string) => void
  onEdit?: () => void
  isLoading?: boolean
  variant?: 'flat' | 'grouped'
}

export const ComponentList: React.FC<ComponentListProps> = ({
  components,
  skippedComponents,
  onToggle,
  onEdit,
  isLoading = false,
  variant = 'flat'
}) => {
  if (variant === 'flat') {
    return (
      <div className="gba:space-y-2.5">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
            What We'll Build ({components.length} {components.length === 1 ? 'item' : 'items'})
          </h3>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} disabled={isLoading} className="gba:text-xs">
              <Edit2 className="gba:w-3 gba:h-3 gba:mr-1.5" />
              Customize Components
            </Button>
          )}
        </div>
        <div className="gba:space-y-1.5">
          {components.map(comp => (
            <ComponentItem
              key={comp.id}
              component={comp}
              description={getComponentDescription(comp)}
              isSkipped={skippedComponents.has(comp.id)}
              onToggle={onToggle}
              variant="flat"
            />
          ))}
        </div>
      </div>
    )
  }

  // Grouped variant
  const componentsByType = components.reduce(
    (acc, comp) => {
      if (!acc[comp.type]) acc[comp.type] = []
      acc[comp.type].push(comp)
      return acc
    },
    {} as Record<ComponentType, BuildPlan['components']>
  )

  return (
    <div className="gba:space-y-5 gba:pt-2">
      <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:leading-none">
        Components ({components.length})
      </h3>
      <div className="gba:space-y-8">
        {(Object.keys(componentsByType) as ComponentType[]).map(type => (
          <div key={type} className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
              {React.createElement(typeIcons[type], {
                className: 'gba:w-4 gba:h-4'
              })}
              <span className="gba:text-sm gba:font-medium">{typeLabels[type]}s</span>
              <span className="gba:text-xs">({componentsByType[type].length})</span>
            </div>
            <div className="gba:space-y-1 gba:pl-6">
              {componentsByType[type].map(comp => (
                <ComponentItem
                  key={comp.id}
                  component={comp}
                  description={comp.description}
                  isSkipped={skippedComponents.has(comp.id)}
                  onToggle={onToggle}
                  variant="grouped"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
