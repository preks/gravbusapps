import React from 'react'
import dayjs from 'dayjs'
import { Tooltip } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  getAbsenceStatusBackgroundClass,
  getBadgeVariantBackgroundClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { getAbsenceTooltipContent } from './utils/absenceTooltip'
import translations from './_i18n'

interface CalendarGridProps {
  currentDate: dayjs.Dayjs
  selectedStartDate: dayjs.Dayjs | null
  selectedEndDate: dayjs.Dayjs | null
  setSelectedStartDate: (date: dayjs.Dayjs) => void
  setSelectedEndDate: (date: dayjs.Dayjs | null) => void
  enableSelection: boolean
  holidayDates?: string[]
  absenceList: any[]
  showStatusInTooltip: boolean
  showDurationInTooltip: boolean
  onContextMenu: (e: React.MouseEvent, day: dayjs.Dayjs, isCurrentMonthDay: boolean) => void
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedStartDate,
  selectedEndDate,
  setSelectedStartDate,
  setSelectedEndDate,
  enableSelection,
  holidayDates,
  absenceList,
  showStatusInTooltip,
  showDurationInTooltip,
  onContextMenu
}) => {
  const { t } = useTranslation(translations)

  const daysInMonth = currentDate.daysInMonth()
  const firstDayOfMonth = currentDate.startOf('month')
  // Start calendar on Monday (day 1) instead of Sunday (day 0)
  const firstDayOfWeek = firstDayOfMonth.day()
  const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Convert Sunday (0) to 6, others to day-1
  const startOfCalendar = firstDayOfMonth.subtract(daysToSubtract, 'day')

  // Calculate how many days to display (either 35 or 42 depending on the month)
  const daysToDisplay = Math.ceil((daysInMonth + firstDayOfMonth.day()) / 7) * 7

  // Get weekday names
  const locale = getCurrentActiveUserLocale()
  const dayjsWithLocale = currentDate.locale(locale)
  const weekdays = []
  for (let i = 1; i <= 7; i++) {
    weekdays.push(dayjsWithLocale.day(i).format('dddd'))
  }

  return (
    <div className="gba:calendar-grid gba:p-4">
      {/* Weekday Headers */}
      <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:mb-2">
        {weekdays.map((day: string, index: number) => (
          <div key={index} className="gba:text-center gba:font-medium gba:text-muted-foreground gba:py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="gba:grid gba:grid-cols-7 gba:gap-1">
        {Array.from({ length: daysToDisplay }).map((_, idx) => {
          // Create a new dayjs object for each day to avoid mutation issues
          const currentDay = dayjs(startOfCalendar).add(idx, 'day')
          const isCurrentMonth = currentDay.month() === currentDate.month()
          const isToday = currentDay.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')

          const isSelectedStart =
            enableSelection && selectedStartDate ? currentDay.isSame(selectedStartDate, 'day') : false
          const isSelectedEnd = enableSelection && selectedEndDate ? currentDay.isSame(selectedEndDate, 'day') : false
          const isInSelectedRange =
            enableSelection && selectedStartDate && selectedEndDate
              ? currentDay.isAfter(selectedStartDate, 'day') && currentDay.isBefore(selectedEndDate, 'day')
              : false
          const isHoliday = (() => {
            try {
              if (!holidayDates || !Array.isArray(holidayDates) || holidayDates.length === 0) return false
              const key = currentDay.format('YYYY-MM-DD')
              return holidayDates.includes(key)
            } catch {
              return false
            }
          })()

          return (
            <div
              key={idx}
              className={`gba:calendar-day gba:p-2 gba:min-h-16 gba:border gba:border-border gba:rounded 
                ${isSelectedStart || isSelectedEnd ? 'gba:bg-info-secondary gba:border-info' : isInSelectedRange ? 'gba:bg-info-secondary/20' : isToday ? 'gba:bg-info-secondary/20 gba:border-info' : isHoliday ? 'gba:bg-card gba:border-warning' : 'gba:bg-card'} 
                ${!isCurrentMonth ? 'gba:opacity-40' : enableSelection ? 'gba:cursor-pointer' : ''}`}
              data-testid={`calendar-day-${currentDay.date()}`}
              onClick={() => {
                if (!enableSelection) return
                if (!isCurrentMonth) return
                if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                  setSelectedStartDate(currentDay.startOf('day'))
                  setSelectedEndDate(null)
                  return
                }
                if (currentDay.isBefore(selectedStartDate, 'day')) {
                  setSelectedStartDate(currentDay.startOf('day'))
                  setSelectedEndDate(null)
                } else if (currentDay.isSame(selectedStartDate, 'day')) {
                  setSelectedEndDate(currentDay.startOf('day'))
                } else {
                  setSelectedEndDate(currentDay.startOf('day'))
                }
              }}
              onContextMenu={e => {
                // Always prevent browser context menu on calendar days
                e.preventDefault()
                e.stopPropagation()

                // Only show our context menu for current month days with selection enabled
                if (!enableSelection || !isCurrentMonth) return

                onContextMenu(e, currentDay, isCurrentMonth)
              }}
            >
              <div
                className={`gba:day-number gba:text-right 
                ${isSelectedStart || isSelectedEnd ? 'gba:font-bold gba:text-decorative' : ''} 
                ${!isCurrentMonth ? 'gba:text-muted-foreground' : ''}`}
              >
                {currentDay.date()}
              </div>
              {isCurrentMonth && isHoliday && (
                <div className="gba:flex gba:gap-1 gba:mt-1">
                  <div className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:min-h-4 gba:px-1 gba:w-full gba:bg-warning-secondary/80">
                    <span className="gba:text-xs gba:font-medium gba:text-primary gba:truncate gba:leading-none">
                      {t('holiday')}
                    </span>
                  </div>
                </div>
              )}
              {isCurrentMonth && isToday && (
                <div className="gba:flex gba:gap-1 gba:mt-1">
                  <div className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:min-h-4 gba:px-1 gba:w-full gba:bg-info-secondary/80">
                    <span className="gba:text-xs gba:font-medium gba:text-primary gba:truncate gba:leading-none">
                      {t('today')}
                    </span>
                  </div>
                </div>
              )}
              {isCurrentMonth &&
                (() => {
                  const overlappingAbsences = absenceList.filter((absence: any) => {
                    const absenceStart = dayjs(absence.startDate)
                    const absenceEnd = dayjs(absence.endDate)
                    return currentDay.isBetween(absenceStart, absenceEnd, null, '[]')
                  })

                  if (overlappingAbsences.length === 0) return null

                  // Render small colored segments for each overlapping absence (max 3)
                  const maxSegments = 3
                  const segments = overlappingAbsences.slice(0, maxSegments)
                  const segmentWidth = `${100 / segments.length}%`

                  const resolveSegmentBgClass = (a: any): string => {
                    // When consumer provides planned/effective minutes (e.g., DailyLog)
                    if (typeof a?.plannedMinutes === 'number' && typeof a?.effectiveMinutes === 'number') {
                      if (a.effectiveMinutes >= a.plannedMinutes) {
                        return getBadgeVariantBackgroundClass('success')
                      }
                      return getBadgeVariantBackgroundClass('warning')
                    }
                    return getAbsenceStatusBackgroundClass(a.originalStatus || a.status)
                  }

                  return (
                    <div className="gba:flex gba:gap-1 gba:mt-1">
                      {segments.map((a: any, idx: number) => (
                        <Tooltip
                          key={`seg-${idx}`}
                          title={getAbsenceTooltipContent(a, {
                            showStatus: showStatusInTooltip,
                            showDuration: showDurationInTooltip
                          })}
                          placement="top"
                          mouseEnterDelay={0.3}
                          overlayStyle={{ zIndex: 9999 }}
                        >
                          <div
                            className={`gba:flex gba:items-center gba:justify-center gba:rounded-full gba:cursor-help gba:transition-all gba:duration-200 hover:gba:h-6 gba:min-h-4 gba:px-1 ${resolveSegmentBgClass(a)}`}
                            style={{
                              width: segmentWidth
                            }}
                          >
                            <span className="gba:text-xs gba:font-medium gba:text-primary gba:truncate gba:leading-none">
                              {a.type}
                            </span>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  )
                })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
