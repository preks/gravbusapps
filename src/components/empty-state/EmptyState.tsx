import React from 'react'
import { Empty } from 'antd'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data',
  description = 'No data available to display',
  icon
}) => {
  return (
    <div data-testid="empty-state" className="gba:flex gba:items-center gba:justify-center gba:py-8">
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <div className="gba:text-gray-500 gba:text-lg gba:mb-2">{title}</div>
            <div className="gba:text-gray-400 gba:text-sm">{description}</div>
          </div>
        }
      />
    </div>
  )
}

export default EmptyState
