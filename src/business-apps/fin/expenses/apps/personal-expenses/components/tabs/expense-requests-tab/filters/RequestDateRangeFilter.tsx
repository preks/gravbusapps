import React from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseDateTupleRangeInput } from '@/business-apps/fin/expenses/common/components/filters/ExpenseDateTupleRangeInput'

interface RequestDateRangeFilterProps {
  requestDateRange: [Date | null, Date | null] | null
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
  isEffectiveDateRange?: boolean
}

const effectiveDateHintFooter = (
  <div className="gba:mt-2 gba:flex gba:items-center gba:gap-1" data-testid="effective-date-hint">
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="gba:inline-flex gba:items-center gba:justify-center gba:rounded gba:text-muted-foreground hover:gba:text-foreground gba:focus-visible:gba:outline-none gba:focus-visible:gba:ring-2 gba:focus-visible:gba:ring-ring"
          aria-label={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date')}
          data-testid="effective-date-info"
        >
          <InfoIcon size={16} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="gba:w-80" align="start" sideOffset={8}>
        <div className="gba:space-y-2">
          <h4 className="gba:text-sm gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date')}
          </h4>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.effective_date_info',
              'For type TRIP, the start date is used. For type EXPENSE, the item expense date is used.'
            )}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  </div>
)

const RequestDateRangeFilter: React.FC<RequestDateRangeFilterProps> = ({
  requestDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ],
  isEffectiveDateRange = false
}) => (
  <ExpenseDateTupleRangeInput
    value={requestDateRange}
    onChange={onDateRangeChange}
    placeholder={placeholder}
    dataTestId={isEffectiveDateRange ? 'effective-date-range-filter' : 'request-date-range-filter'}
    footer={isEffectiveDateRange ? effectiveDateHintFooter : undefined}
  />
)

export default RequestDateRangeFilter
