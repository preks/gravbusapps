import React from 'react'
import { CheckIcon } from '@phosphor-icons/react'

interface CalendarVisibilityRowProps {
  rowId: string
  title: string
  subtitle?: React.ReactNode
  checked: boolean
  onToggle: (checked: boolean) => void
  color: string
  menu?: React.ReactNode
}

export const CalendarVisibilityRow: React.FC<CalendarVisibilityRowProps> = ({
  rowId,
  title,
  subtitle,
  checked,
  onToggle,
  color,
  menu
}) => {
  return (
    <div className="gba:rounded-md gba:px-1.5 gba:py-0.5 hover:gba:bg-muted/40">
      <div className="gba:flex gba:items-center gba:gap-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={title}
          onClick={() => onToggle(!checked)}
          className="gba:flex gba:h-4.5 gba:w-4.5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-sm gba:border gba:transition-opacity focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2"
          style={{
            backgroundColor: checked ? color : 'transparent',
            borderColor: color
          }}
          data-testid={`calendar-visibility-toggle-${rowId}`}
        >
          {checked ? <CheckIcon className="gba:h-3 gba:w-3 gba:text-white" weight="bold" /> : null}
        </button>

        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:min-h-7 gba:items-center gba:justify-between gba:gap-2">
            <div className="gba:min-w-0">
              <p className="gba:text-sm gba:font-medium gba:leading-5 gba:text-foreground gba:truncate">{title}</p>
              {subtitle ? (
                <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">{menu}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
