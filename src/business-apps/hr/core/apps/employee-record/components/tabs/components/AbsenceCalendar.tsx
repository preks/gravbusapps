import React from 'react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { Button } from '@newwork/nw-design-system'
import { Spin, Tooltip } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { CalendarProps } from '../../../queries/types'

import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  getAbsenceStatusLabel,
  getAllAbsenceStatusConfigs,
  getAbsenceStatusBackgroundClass,
  getBadgeVariantBackgroundClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'

// Import dayjs locale
import 'dayjs/locale/ro'
import 'dayjs/locale/en'
import 'dayjs/locale/de'

// Extend plugins
dayjs.extend(isBetween)

// Function to generate tooltip content for absence segments
const getAbsenceTooltipContent = (absence: any, opts?: { showStatus?: boolean; showDuration?: boolean }) => {
  const startDate = dayjs(absence.startDate)
  const endDate = dayjs(absence.endDate)
  const duration = endDate.diff(startDate, 'day') + 1

  return (
    <div className="gba:max-w-xs gba:p-2">
      <div className="gba:font-semibold gba:text-sm gba:mb-2 gba:flex gba:items-center gba:gap-2">
        <div
          className="gba:w-3 gba:h-3 gba:rounded-full"
          style={{ backgroundColor: absence.statusColor || 'var(--nw-offline)' }}
        />
        {absence.type}
      </div>
      <div className="gba:space-y-1 gba:text-xs">
        {opts?.showStatus && (
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}:
            </span>
            <span className="gba:font-medium" style={{ color: absence.statusColor || 'var(--nw-offline)' }}>
              {getAbsenceStatusLabel(absence.originalStatus || absence.status)}
            </span>
          </div>
        )}
        <div className="gba:flex gba:justify-between">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_detailed_view.start', 'Start')}:
          </span>
          <span>{startDate.format('MMM DD, YYYY')}</span>
        </div>
        <div className="gba:flex gba:justify-between">
          <span className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_detailed_view.end', 'End')}:
          </span>
          <span>{endDate.format('MMM DD, YYYY')}</span>
        </div>
        {opts?.showDuration && (
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:
            </span>
            <span>
              {duration}{' '}
              {duration === 1
                ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.limited_pending_days_text.day', 'day')
                : getTranslationFromI18nKeyAndLabel('lowcoder:absence_module.limited_pending_days_text.days', 'days')}
            </span>
          </div>
        )}
        {absence.description && (
          <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-border">
            <div className="gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.document_layout.document_table.description',
                'Description'
              )}
              :
            </div>
            <div className="gba:text-muted-foreground gba:break-words">{absence.description}</div>
          </div>
        )}
      </div>
    </div>
  )
}

const AbsenceCalendar: React.FC<CalendarProps> = ({
  absenceList,
  loading,
  error,
  currentDate,
  setCurrentDate,
  selectedStartDate,
  setSelectedStartDate,
  selectedEndDate,
  setSelectedEndDate,
  showToday = true,
  showPrevNext = true,
  enableSelection = true,
  showFooter = true,
  showStatusInTooltip = true,
  showDurationInTooltip = true,
  customLegend
}) => {
  if (loading) {
    return (
      <div className="gba:loading gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:error gba:text-destructive gba:py-8 gba:text-center">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.error_loading', 'Failed to load absence data.')}
      </div>
    )
  }

  return (
    <div className="gba:calendar-content">
      <div
        className="gba:calendar-view gba:bg-card gba:rounded gba:border gba:border-border gba:shadow-sm"
        data-testid="absence-calendar-view"
      >
        <div className="gba:calendar-header gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b gba:border-border">
          <div className="gba:calendar-month-year gba:font-medium gba:text-lg">
            {(() => {
              const locale = getCurrentActiveUserLocale()
              const dayjsWithLocale = currentDate.locale(locale)
              return dayjsWithLocale.format('MMMM YYYY')
            })()}
          </div>
          <div className="gba:calendar-nav gba:flex gba:gap-2">
            {showPrevNext && (
              <Button
                variant="secondary"
                className="gba:px-3 gba:py-1"
                data-testid="calendar-prev-month"
                onClick={() => setCurrentDate(dayjs(currentDate).subtract(1, 'month'))}
              >
                <LeftOutlined className="gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.previous', 'Previous')}
              </Button>
            )}
            {showToday && (
              <Button
                variant="secondary"
                className="gba:px-3 gba:py-1"
                data-testid="calendar-today"
                onClick={() => setCurrentDate(dayjs())}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.today', 'Today')}
              </Button>
            )}
            {showPrevNext && (
              <Button
                variant="secondary"
                className="gba:px-3 gba:py-1"
                data-testid="calendar-next-month"
                onClick={() => setCurrentDate(dayjs(currentDate).add(1, 'month'))}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.next', 'Next')}
                <RightOutlined className="gba:ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="gba:calendar-grid gba:p-4">
          {/* Weekday Headers */}
          <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:mb-2">
            {(() => {
              const locale = getCurrentActiveUserLocale()
              const dayjsWithLocale = currentDate.locale(locale)
              // Get weekday names using dayjs format (Monday first)
              const weekdays = []
              for (let i = 1; i <= 7; i++) {
                weekdays.push(dayjsWithLocale.day(i).format('dddd'))
              }
              return weekdays.map((day: string, index: number) => (
                <div key={index} className="gba:text-center gba:font-medium gba:text-muted-foreground gba:py-2">
                  {day}
                </div>
              ))
            })()}
          </div>

          {/* Calendar Days */}
          <div className="gba:grid gba:grid-cols-7 gba:gap-1">
            {(() => {
              const daysInMonth = currentDate.daysInMonth()
              const firstDayOfMonth = currentDate.startOf('month')
              // Start calendar on Monday (day 1) instead of Sunday (day 0)
              const firstDayOfWeek = firstDayOfMonth.day()
              const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Convert Sunday (0) to 6, others to day-1
              const startOfCalendar = firstDayOfMonth.subtract(daysToSubtract, 'day')

              // Calculate how many days to display (either 35 or 42 depending on the month)
              const daysToDisplay = Math.ceil((daysInMonth + firstDayOfMonth.day()) / 7) * 7

              return Array.from({ length: daysToDisplay }).map((_, idx) => {
                // Create a new dayjs object for each day to avoid mutation issues
                const currentDay = dayjs(startOfCalendar).add(idx, 'day')
                const isCurrentMonth = currentDay.month() === currentDate.month()
                const isToday = currentDay.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')

                const isSelectedStart =
                  enableSelection && selectedStartDate ? currentDay.isSame(selectedStartDate, 'day') : false
                const isSelectedEnd =
                  enableSelection && selectedEndDate ? currentDay.isSame(selectedEndDate, 'day') : false
                const isInSelectedRange =
                  enableSelection && selectedStartDate && selectedEndDate
                    ? currentDay.isAfter(selectedStartDate, 'day') && currentDay.isBefore(selectedEndDate, 'day')
                    : false

                return (
                  <div
                    key={idx}
                    className={`gba:calendar-day gba:p-2 gba:h-16 gba:border gba:border-border gba:rounded 
                      ${isSelectedStart || isSelectedEnd ? 'gba:bg-info-secondary gba:border-info' : isInSelectedRange ? 'gba:bg-info-secondary/20' : isToday ? 'gba:bg-info-secondary gba:border-info' : 'gba:bg-card'} 
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
                  >
                    <div
                      className={`gba:day-number gba:text-right 
                      ${isSelectedStart || isSelectedEnd ? 'gba:font-bold gba:text-decorative' : isToday ? 'gba:font-bold gba:text-info' : ''} 
                      ${!isCurrentMonth ? 'gba:text-muted-foreground' : ''}`}
                    >
                      {currentDay.date()}
                    </div>
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
              })
            })()}
          </div>
        </div>

        {/* Legend */}
        <div className="gba:calendar-legend gba:px-4 gba:py-3 gba:border-t gba:border-border gba:bg-muted">
          {customLegend ? (
            customLegend
          ) : (
            <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap">
              {getAllAbsenceStatusConfigs()
                .filter(statusConfig => ['APPROVED', 'PENDING', 'REJECTED', 'CANCELLED'].includes(statusConfig.status))
                .map(statusConfig => (
                  <div key={statusConfig.status} className="gba:flex gba:items-center gba:gap-2">
                    <div
                      className={`gba:w-3 gba:h-3 gba:rounded-full ${getAbsenceStatusBackgroundClass(statusConfig.status)}`}
                    />
                    <span className="gba:text-xs">{statusConfig.label}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {showFooter && (
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
        )}
      </div>
    </div>
  )
}

export default AbsenceCalendar
