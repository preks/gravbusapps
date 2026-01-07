import React from 'react'
import { ViewOptionsGridProps } from '../types/ViewSelectorTypes'

const DATA_TEST_ID_PREFIX = 'SalesActivity360-ViewSelector'

export const ViewOptionsGrid: React.FC<ViewOptionsGridProps> = ({ options, loading, onSelect }) => {
  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:justify-center gba:gap-2"
      data-testid={`${DATA_TEST_ID_PREFIX}-grid`}
    >
      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mr-2">Explore:</span>
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className="gba:group gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:border gba:border-border gba:bg-background hover:gba:bg-accent hover:gba:border-primary/40 gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary gba:focus-visible:ring-offset-2"
          data-testid={`${DATA_TEST_ID_PREFIX}-option-${option.id}`}
        >
          <span
            className={`gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-full ${option.iconBg} ${option.iconColor}`}
          >
            {option.icon}
          </span>
          <span className="gba:text-sm gba:font-medium gba:text-foreground group-hover:gba:text-primary gba:transition-colors">
            {option.title}
          </span>
          {option.count !== undefined && !loading && (
            <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded-full">
              {option.count >= 1000 ? `${(option.count / 1000).toFixed(1)}k` : option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default ViewOptionsGrid
