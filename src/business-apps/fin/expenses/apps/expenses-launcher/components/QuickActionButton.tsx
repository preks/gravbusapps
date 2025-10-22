import React from 'react'
import { Card, CardContent, IconAvatar } from '@newwork/nw-design-system'
import { QuickActionButtonProps } from '../types'

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ action, onClick }) => {
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
      className="gba:group gba:cursor-pointer gba:transition-all gba:duration-300 gba:bg-background/95 gba:backdrop-blur-md gba:border gba:border-background/20 hover:gba:shadow-xl hover:gba:shadow-black/10 hover:gba:border-background/40 hover:gba:bg-background hover:gba:scale-105 gba:rounded-xl gba:h-full"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Quick action: ${action.label}`}
      data-testid={`quick-action-${action.id}`}
    >
      <CardContent className="gba:p-6 gba:text-center gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center">
        <div className="gba:mb-4 gba:transition-all gba:duration-200 group-hover:gba:scale-110">
          <IconAvatar icon={action.icon} variant="default" size="md" data-testid={`quick-action-icon-${action.id}`} />
        </div>
        <span className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:transition-colors gba:duration-200 gba:text-center gba:leading-tight">
          {action.label}
        </span>
      </CardContent>
    </Card>
  )
}

export default QuickActionButton
