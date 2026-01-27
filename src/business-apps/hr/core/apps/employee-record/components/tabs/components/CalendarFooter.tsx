import React from 'react'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface CalendarFooterProps {
  selectedStartDate: dayjs.Dayjs | null
  selectedEndDate: dayjs.Dayjs | null
}

export const CalendarFooter: React.FC<CalendarFooterProps> = ({ selectedStartDate, selectedEndDate }) => {
  return (
    <div className="gba:calendar-footer gba:p-4 gba:border-t gba:border-border gba:text-center gba:text-sm gba:text-muted-foreground">
      {selectedStartDate && selectedEndDate ? (
        <span data-testid="selected-range">
          {(() => {
            const locale = getCurrentActiveUserLocale()
            const startFormatted = selectedStartDate.locale(locale).format('MMM D, YYYY')
            const endFormatted = selectedEndDate.locale(locale).format('MMM D, YYYY')
            return `${startFormatted} - ${endFormatted}`
          })()}
        </span>
      ) : selectedStartDate ? (
        <span data-testid="select-end-prompt">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.select_end_date', 'Select an end date')}
        </span>
      ) : (
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_hub.calendar_note',
          'Click on a day to view or add absences'
        )
      )}
    </div>
  )
}
