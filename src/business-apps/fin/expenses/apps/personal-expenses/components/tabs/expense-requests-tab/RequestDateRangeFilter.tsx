import React from 'react'
import { DatePicker } from 'antd'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@newwork/nw-design-system'
import dayjs, { Dayjs } from 'dayjs'
import { InfoIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const { RangePicker } = DatePicker

interface RequestDateRangeFilterProps {
  requestDateRange: [Date | null, Date | null] | null
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
  isEffectiveDateRange?: boolean
}

const RequestDateRangeFilter: React.FC<RequestDateRangeFilterProps> = ({
  requestDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ],
  isEffectiveDateRange = false
}) => {
  const handleDateChange = (dates: any) => {
    if (!dates || dates.length === 0) {
      onDateRangeChange(null)
    } else {
      onDateRangeChange([dates[0]?.toDate() || null, dates[1]?.toDate() || null])
    }
  }

  const value =
    requestDateRange && requestDateRange[0] && requestDateRange[1]
      ? [dayjs(requestDateRange[0]), dayjs(requestDateRange[1])]
      : null

  return (
    <div>
      <RangePicker
        value={value as [Dayjs | null, Dayjs | null] | null}
        onChange={handleDateChange}
        placeholder={placeholder}
        className="gba:w-full"
        data-testid="effective-date-range-filter"
      />
      {isEffectiveDateRange && (
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
      )}
    </div>
  )
}

export default RequestDateRangeFilter
