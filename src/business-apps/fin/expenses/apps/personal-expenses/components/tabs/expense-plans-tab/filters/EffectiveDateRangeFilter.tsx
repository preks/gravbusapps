import React from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseDateTupleRangeInput } from '@/business-apps/fin/expenses/common/components/filters/ExpenseDateTupleRangeInput'

interface EffectiveDateRangeFilterProps {
  effectiveDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
}

const EffectiveDateRangeFilter: React.FC<EffectiveDateRangeFilterProps> = ({
  effectiveDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ]
}) => (
  <ExpenseDateTupleRangeInput
    value={effectiveDateRange}
    onChange={onDateRangeChange}
    placeholder={placeholder}
    dataTestId="effective-date-range-filter"
    footer={
      <div className="gba:mt-2 gba:flex gba:items-center gba:gap-1" data-testid="effective-date-hint">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="gba:inline-flex gba:items-center gba:justify-center gba:rounded gba:text-muted-foreground hover:gba:text-foreground gba:focus-visible:gba:outline-none gba:focus-visible:gba:ring-2 gba:focus-visible:gba:ring-ring"
              aria-label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.effective_date',
                'Effective Date'
              )}
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
    }
  />
)

export default EffectiveDateRangeFilter
