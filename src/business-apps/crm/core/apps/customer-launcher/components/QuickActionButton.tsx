import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import * as RemixIcons from '@remixicon/react'
import { QuickActionButtonProps } from '../types'

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ action, onClick }) => {
  // Get the icon component dynamically
  const IconComponent = (RemixIcons as any)[action.icon] || RemixIcons.RiQuestionLine

  // Get button color based on action type
  const getActionColor = (actionId: string) => {
    switch (actionId) {
      case 'add-lead':
      case 'create-opportunity':
        return '#10B981' // Gentle emerald for sales actions
      case 'add-contact':
      case 'add-account':
        return '#3B82F6' // Gentle blue for customer actions
      case 'import-data':
      case 'generate-report':
        return '#8B5CF6' // Gentle purple for data/intelligence actions
      default:
        return '#6B7280' // Gentle gray for other actions
    }
  }

  const actionColor = getActionColor(action.id)

  const handleClick = () => {
    onClick(action)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(action)
    }
  }

  return (
    <Card
      className="gba:group gba:cursor-pointer gba:transition-all gba:duration-300 gba:bg-hsl(var(--background))/90 gba:backdrop-blur-md gba:border gba:border-hsl(var(--background))/30 hover:gba:shadow-xl hover:gba:border-hsl(var(--background))/50 hover:gba:bg-hsl(var(--background)) hover:gba:scale-105 gba:rounded-xl gba:h-full"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Quick action: ${action.label}`}
      data-testid={`quick-action-${action.id}`}
    >
      <CardContent className="gba:p-4 gba:text-center gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center">
        <div
          className="gba:p-3 gba:rounded-xl gba:mb-3 gba:transition-all gba:duration-200 group-hover:gba:scale-110"
          style={{ backgroundColor: `${actionColor}15` }}
        >
          <IconComponent
            className="gba:h-6 gba:w-6 gba:transition-colors gba:duration-200"
            style={{ color: actionColor }}
            data-testid={`quick-action-icon-${action.id}`}
          />
        </div>
        <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:transition-colors gba:duration-200 gba:text-center gba:leading-tight">
          {action.label}
        </span>
      </CardContent>
    </Card>
  )
}

export default QuickActionButton
