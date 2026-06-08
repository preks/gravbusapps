import React from 'react'
import { Button } from '@newwork/nw-design-system'

interface NextMonthToggleProps {
  includeNextMonth: boolean
  onToggle: () => void
  nextMonthCount: number
  nextMonthName: string
  categoryLabel: string
  testIdPrefix: string
}

export const NextMonthToggle: React.FC<NextMonthToggleProps> = ({
  includeNextMonth,
  onToggle,
  nextMonthCount,
  nextMonthName,
  categoryLabel,
  testIdPrefix
}) => (
  <>
    {!includeNextMonth && (
      <div className="gba:py-4 gba:text-center">
        <Button variant="ghost" size="sm" onClick={onToggle} data-testid={`${testIdPrefix}-load-next-month`}>
          {nextMonthCount > 0
            ? `Show ${nextMonthName} ${categoryLabel} (${nextMonthCount})`
            : `Show ${nextMonthName} ${categoryLabel}`}
        </Button>
      </div>
    )}

    {includeNextMonth && nextMonthCount === 0 && (
      <div className="gba:py-4 gba:text-center gba:text-sm gba:text-muted-foreground">
        {`No ${categoryLabel} in ${nextMonthName}`}
      </div>
    )}
  </>
)
