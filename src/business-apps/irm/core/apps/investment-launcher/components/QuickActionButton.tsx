import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { QuestionIcon } from '@phosphor-icons/react'
import { InvestmentQuickActionButtonProps } from '../types'

const InvestmentQuickActionButton: React.FC<InvestmentQuickActionButtonProps> = ({ action, onClick }) => {
  // Get the icon component dynamically
  const IconComponent = action.icon ?? QuestionIcon

  // Get button color based on action type
  const getActionColor = (actionId: string) => {
    switch (actionId) {
      case 'add-lead':
      case 'create-opportunity':
        return '#10B981' // Green for sales actions
      case 'add-contact':
      case 'add-account':
        return '#3B82F6' // Blue for customer actions
      case 'add-investment':
        return '#F59E0B' // Amber/gold for investment actions
      case 'generate-report':
        return '#8B5CF6' // Purple for analytics actions
      default:
        return '#6B7280' // Gray for other actions
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
      className="gba:group gba:cursor-pointer gba:transition-all gba:duration-300 gba:bg-white/90 gba:backdrop-blur-md gba:border gba:border-white/30 hover:gba:shadow-xl hover:gba:border-white/50 hover:gba:bg-white hover:gba:scale-105 gba:rounded-xl gba:h-full"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Quick action: ${action.label}`}
      data-testid={`investment-quick-action-${action.id}`}
    >
      <CardContent className="gba:p-4 gba:text-center gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center">
        <div
          className="gba:p-3 gba:rounded-xl gba:mb-3 gba:transition-all gba:duration-200 group-hover:gba:scale-110"
          style={{ backgroundColor: `${actionColor}15` }}
        >
          <IconComponent
            className="gba:h-6 gba:w-6 gba:transition-colors gba:duration-200"
            style={{ color: actionColor }}
            data-testid={`investment-quick-action-icon-${action.id}`}
          />
        </div>
        <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:transition-colors gba:duration-200 gba:text-center gba:leading-tight">
          {action.label}
        </span>
      </CardContent>
    </Card>
  )
}

export default InvestmentQuickActionButton
