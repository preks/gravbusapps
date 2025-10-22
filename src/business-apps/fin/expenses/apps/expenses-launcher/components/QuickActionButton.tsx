import React from 'react'
import { Card, CardContent, IconAvatar } from '@newwork/nw-design-system'
import { QuickActionButtonProps } from '../types'

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ action, onClick }) => {
  const handleClick = () => {
    onClick(action)
  }

  return (
    <button
      type="button"
      className="gba:w-full gba:h-full gba:p-0 gba:border-0 gba:bg-transparent gba:cursor-pointer"
      onClick={handleClick}
      aria-label={`Quick action: ${action.label}`}
      data-testid={`quick-action-${action.id}`}
    >
      <Card className="gba:group gba:transition-all gba:duration-300 gba:bg-background/95 gba:backdrop-blur-md gba:border gba:border-background/20 gba:hover:shadow-xl gba:hover:shadow-black/10 gba:hover:border-background/40 gba:hover:bg-background gba:hover:scale-105 gba:rounded-xl gba:h-full">
        <CardContent className="gba:p-6 gba:text-center gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center">
          <div className="gba:mb-4 gba:transition-all gba:duration-200 gba:group-hover:scale-110">
            <IconAvatar icon={action.icon} variant="default" size="md" data-testid={`quick-action-icon-${action.id}`} />
          </div>
          <span className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:transition-colors gba:duration-200 gba:text-center gba:leading-tight">
            {action.label}
          </span>
        </CardContent>
      </Card>
    </button>
  )
}

export default QuickActionButton
