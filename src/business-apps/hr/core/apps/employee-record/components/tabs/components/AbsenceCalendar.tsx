import React, { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { Button, Spinner, Tooltip, TooltipContent, TooltipTrigger, useTranslation } from '@newwork/nw-design-system'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { CalendarProps } from '../../../queries/types'

import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  getAbsenceStatusLabel,
  getAllAbsenceStatusConfigs,
  getAbsenceStatusBackgroundClass,
  getAbsenceStatusTextClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import translations from './_i18n'
import { calculateContextMenuPosition } from './utils/contextMenuPositioning'
import { hasHolidayInRange, isHoliday } from './utils/holidayUtils'
import { AVAILABLE_ABSENCE_TYPES } from './constants/absenceTypes'
import { startProcess } from '@/common/utils/start-process'

// Import dayjs locale
import 'dayjs/locale/ro'
import 'dayjs/locale/en'
import 'dayjs/locale/de'

// Extend plugins
dayjs.extend(isBetween)

// Function to generate tooltip content for absence segments
const getAbsenceTooltipContent = (
  absence: any,
  opts?: { showStatus?: boolean; showDuration?: boolean; computedEffectiveDays?: number | null }
) => {
  const startDate = dayjs(absence.startDate)
  const endDate = dayjs(absence.endDate)
  // Prefer business days for display
  const toFiniteNumber = (v: any): number | null => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    return null
  }
  const providedEff = toFiniteNumber(absence?.effectiveDays)
  const providedWork = toFiniteNumber(absence?.workingDays)
  const computed = toFiniteNumber(opts?.computedEffectiveDays)
  const businessDays = providedEff ?? providedWork ?? computed
  // Fallback to calendar span only if no business-days info is available
  const duration = businessDays ?? endDate.diff(startDate, 'day') + 1
  const status = absence.originalStatus || absence.status

  return (
    <div className="gba:max-w-xs gba:p-2">
      <div className="gba:font-semibold gba:text-sm gba:mb-2 gba:flex gba:items-center gba:gap-2">
        <div className={`gba:w-3 gba:h-3 gba:rounded-full ${getAbsenceStatusBackgroundClass(status)}`} />
        {absence.type}
      </div>
      <div className="gba:space-y-1 gba:text-xs">
        {opts?.showStatus && (
          <div className="gba:flex gba:justify-between">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}:
            </span>
            <span className={`gba:font-medium ${getAbsenceStatusTextClass(status)}`}>
              {getAbsenceStatusLabel(status)}
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

const AbsenceCalendar: React.FC<
  CalendarProps & {
    effectiveDates?: Set<string>
    allowWeekendPaintingInFallback?: boolean
    nonWorkingDates?: Set<string>
  }
> = ({
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
  customLegend,
  holidayDates,
  employee,
  onAbsenceTypeSelect,
  effectiveDates,
  allowWeekendPaintingInFallback,
  nonWorkingDates
}) => {
  const { t } = useTranslation(translations)
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [contextMenuDate, setContextMenuDate] = useState<dayjs.Dayjs | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)

  // Close context menu when clicking anywhere (left click)
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Close menu on any left click (button 0 is left mouse button)
      if (!contextMenuOpen || event.button !== 0) {
        return
      }

      const target = event.target as Node | null
      // Don't close if clicking inside the context menu (otherwise the click never reaches menu items)
      if (target && contextMenuRef.current?.contains(target)) {
        return
      }

      if (contextMenuOpen) {
        setContextMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenuOpen])

  const handleContextMenu = (e: React.MouseEvent, day: dayjs.Dayjs, isCurrentMonthDay: boolean) => {
    if (!enableSelection || !isCurrentMonthDay) return
    e.preventDefault()
    e.stopPropagation()

    // Determine which date range to check based on current selection
    // Calculate isInRange once to avoid duplication
    const isInRange =
      selectedStartDate && selectedEndDate ? day.isBetween(selectedStartDate, selectedEndDate, 'day', '[]') : false

    let dateRangeToCheck = { start: day, end: day }
    if (selectedStartDate && selectedEndDate) {
      if (isInRange) {
        // If clicking within the range, check the entire range for absences/holidays
        dateRangeToCheck = { start: selectedStartDate, end: selectedEndDate }
      } else {
        // Clicked day is outside range - check only this day before selecting
        dateRangeToCheck = { start: day, end: day }
      }
    } else {
      // No range selected or only start date - check only this day before selecting
      dateRangeToCheck = { start: day, end: day }
    }

    // Check if any day in the range has a holiday
    const hasHoliday = hasHolidayInRange(holidayDates, dateRangeToCheck.start, dateRangeToCheck.end)

    if (hasHoliday) {
      // Day(s) have holidays, prevent selection and context menu
      return
    }

    // Check if the day(s) have any existing absences (vacations or other absences) - if so, don't allow right-click to create new ones
    const hasExistingAbsences = absenceList.some((absence: any) => {
      const absenceStart = dayjs(absence.startDate)
      const absenceEnd = dayjs(absence.endDate)
      // Check if the absence overlaps with the date range we're checking
      return (
        dateRangeToCheck.start.isBetween(absenceStart, absenceEnd, null, '[]') ||
        dateRangeToCheck.end.isBetween(absenceStart, absenceEnd, null, '[]') ||
        absenceStart.isBetween(dateRangeToCheck.start, dateRangeToCheck.end, null, '[]') ||
        absenceEnd.isBetween(dateRangeToCheck.start, dateRangeToCheck.end, null, '[]')
      )
    })

    if (hasExistingAbsences) {
      // Day(s) already have absences booked, prevent selection and context menu
      return
    }

    // Only set selection if the day is clear (no holidays or absences)
    // If a range is already selected, check if clicked day is within the range
    // If clicked day is outside the range, deselect range and select the clicked day
    // Otherwise, preserve the range
    if (selectedStartDate && selectedEndDate) {
      if (!isInRange) {
        // Clicked day is outside range - deselect range and select this day
        setSelectedStartDate(day.startOf('day'))
        setSelectedEndDate(null)
      }
      // If in range, keep the existing selection
    } else {
      // No range selected or only start date - right-click always selects just this day (single day, no range)
      setSelectedStartDate(day.startOf('day'))
      setSelectedEndDate(null)
    }

    // Calculate menu dimensions (fixed list of 4 items)
    const menuWidth = 180 // Narrower menu width
    const menuItemHeight = 40 // 2.5rem in pixels
    const menuItemCount = 4 // Fixed list of 4 items
    const maxMenuHeight = menuItemHeight * menuItemCount // 160px for 4 items
    const padding = 8 // py-1 padding
    const totalMenuHeight = maxMenuHeight + padding * 2

    // Use utility function to calculate position
    const position = calculateContextMenuPosition(e.clientX, e.clientY, menuWidth, totalMenuHeight)

    // Store the clicked day and the calculated position for the context menu
    setContextMenuDate(day)
    setContextMenuPosition(position)
    setContextMenuOpen(true)
  }

  const handleAbsenceTypeClick = (absenceTypeId: string, flowType: string) => {
    if (!contextMenuDate || !employee) return

    // Determine start and end dates
    let startDate = contextMenuDate
    let endDate = contextMenuDate

    // If there's a selected range, use it; otherwise use the context menu date
    if (selectedStartDate && selectedEndDate) {
      startDate = selectedStartDate
      endDate = selectedEndDate
    } else if (selectedStartDate) {
      startDate = selectedStartDate
      endDate = contextMenuDate.isAfter(selectedStartDate) ? contextMenuDate : selectedStartDate
    }

    const startDateFormatted = startDate.format('YYYY-MM-DD')
    const endDateFormatted = endDate.format('YYYY-MM-DD')

    // Start the absence request process directly (reliable, immediate)
    // This avoids relying on FlowRegistry/AppAction resolution which can result in no-op.
    const absenceTypeToProcessName: Record<string, string> = {
      'AbsenceType:v1:A001': 'createEmployeeVacation',
      'AbsenceType:v1:A021': 'createEmployeeSickLeave',
      'AbsenceType:v1:A050': 'createEmployeeSpecialLeave',
      'AbsenceType:v1:A170': 'createEmployeeWorkLeave'
    }

    const processName = absenceTypeToProcessName[absenceTypeId]
    if (processName) {
      startProcess({
        domain: 'employee-time',
        processName,
        payload: {
          employeeId: employee.id,
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          absenceType: absenceTypeId,
          flowType
        },
        builderType: 'NATIVE_SCREEN'
      })
    } else if (onAbsenceTypeSelect) {
      // Fallback to legacy flow handling if we don't recognize the absence type
      onAbsenceTypeSelect(absenceTypeId, startDateFormatted, endDateFormatted, flowType)
    }

    setContextMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="gba:loading gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner size="lg" />
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
      {contextMenuOpen && (
        <div
          ref={contextMenuRef}
          className={`gba:fixed gba:bg-popover gba:border gba:border-border gba:rounded-md gba:shadow-lg gba:z-[10000] gba:w-[180px] gba:py-1 gba:left-[${contextMenuPosition.x}px] gba:top-[${contextMenuPosition.y}px]`}
          data-testid="absence-context-menu"
        >
          {AVAILABLE_ABSENCE_TYPES.map(absenceType => (
            <div
              key={absenceType.id}
              role="menuitem"
              tabIndex={0}
              className="gba:px-3 gba:py-2 gba:cursor-pointer gba:hover:bg-accent gba:text-sm gba:min-h-[2.5rem] gba:flex gba:items-center"
              onClick={() => handleAbsenceTypeClick(absenceType.id, absenceType.flowType)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleAbsenceTypeClick(absenceType.id, absenceType.flowType)
                }
              }}
              data-testid={`absence-type-${absenceType.id}`}
            >
              {absenceType.name}
            </div>
          ))}
        </div>
      )}
      <div
        className="gba:calendar-view gba:bg-card gba:rounded gba:border gba:border-border gba:shadow-sm"
        data-testid="absence-calendar-view"
        onContextMenu={e => {
          // Prevent browser context menu on calendar borders
          e.preventDefault()
          e.stopPropagation()
        }}
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
                <ChevronLeftIcon className="gba:mr-1 gba:h-4 gba:w-4" />
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
                <ChevronRightIcon className="gba:ml-1 gba:h-4 gba:w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className="gba:calendar-grid gba:p-4"
          onContextMenu={e => {
            // Prevent browser context menu on empty spaces between calendar days
            e.preventDefault()
            e.stopPropagation()
          }}
        >
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
              return weekdays.map((day: string) => (
                <div key={day} className="gba:text-center gba:font-medium gba:text-muted-foreground gba:py-2">
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

              // Calculate how many days to display for a Monday-first grid.
              // We must use the Monday-based leading offset (`daysToSubtract`),
              // not dayjs Sunday-based `day()`, otherwise months starting on Sunday
              // can lose their final week.
              const daysToDisplay = Math.ceil((daysInMonth + daysToSubtract) / 7) * 7

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
                const isHolidayDay = isHoliday(holidayDates, currentDay)
                const isWeekend = currentDay.day() === 0 || currentDay.day() === 6

                const handleDayClick = () => {
                  if (!enableSelection) return
                  if (!isCurrentMonth) return

                  // If no selection or both dates selected, start new selection
                  const hasBothDates = selectedStartDate && selectedEndDate
                  if (!selectedStartDate || hasBothDates) {
                    setSelectedStartDate(currentDay.startOf('day'))
                    setSelectedEndDate(null)
                    return
                  }

                  // Handle range selection
                  if (currentDay.isBefore(selectedStartDate, 'day')) {
                    setSelectedStartDate(currentDay.startOf('day'))
                    setSelectedEndDate(null)
                  } else if (currentDay.isSame(selectedStartDate, 'day')) {
                    setSelectedEndDate(currentDay.startOf('day'))
                  } else {
                    setSelectedEndDate(currentDay.startOf('day'))
                  }
                }

                // Calculate day styling classes
                const getDayClassName = () => {
                  const baseClasses = 'gba:calendar-day gba:p-2 gba:min-h-16 gba:border gba:border-border gba:rounded'

                  let bgClass = 'gba:bg-card'
                  if (isSelectedStart || isSelectedEnd) {
                    bgClass = 'gba:bg-info-secondary gba:border-info'
                  } else if (isInSelectedRange) {
                    bgClass = 'gba:bg-info-secondary/20'
                  } else if (isToday) {
                    bgClass = 'gba:bg-primary/05'
                  } else if (isHolidayDay) {
                    bgClass = 'gba:bg-card gba:border-warning'
                  }

                  const opacityClass = isCurrentMonth ? '' : 'gba:opacity-40'
                  const cursorClass = enableSelection ? 'gba:cursor-pointer' : ''

                  return `${baseClasses} ${bgClass} ${opacityClass} ${cursorClass}`.trim()
                }

                const dayKey = currentDay.format('YYYY-MM-DD')
                const isInteractive = enableSelection && isCurrentMonth

                // Render day content (shared between button and div)
                const renderDayContent = () => {
                  return (
                    <>
                      <div
                        className={`gba:day-number gba:text-right 
                      ${isSelectedStart || isSelectedEnd ? 'gba:font-bold gba:text-decorative' : ''} 
                      ${!isCurrentMonth ? 'gba:text-muted-foreground' : ''}`}
                      >
                        {currentDay.date()}
                      </div>
                      {isCurrentMonth && isHolidayDay && (
                        <div className="gba:flex gba:gap-1 gba:mt-1">
                          <div className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:min-h-4 gba:px-1 gba:w-full gba:bg-background">
                            <span className="gba:text-xs gba:font-medium gba:text-info-secondary-foreground gba:truncate gba:leading-none">
                              {t('holiday')}
                            </span>
                          </div>
                        </div>
                      )}
                      {isCurrentMonth && isToday && (
                        <div className="gba:flex gba:gap-1 gba:mt-1">
                          <div className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:min-h-4 gba:px-1 gba:w-full gba:bg-primary">
                            <span className="gba:text-xs gba:font-medium gba:text-primary-foreground gba:truncate gba:leading-none">
                              {t('today')}
                            </span>
                          </div>
                        </div>
                      )}
                      {isCurrentMonth &&
                        (() => {
                          // Rendering rules:
                          // - If effectiveDates present: paint only days explicitly marked effective by BE.
                          // - If no effectiveDates (fallback): do not paint holidays, dates in nonWorkingDates, and paint weekends only if parent allowed it
                          if (effectiveDates) {
                            if (!effectiveDates.has(dayKey)) return null
                          } else {
                            if (isHolidayDay) return null
                            if (nonWorkingDates && nonWorkingDates.has(dayKey)) return null
                            if (isWeekend && !allowWeekendPaintingInFallback) return null
                          }
                          const overlappingAbsences = absenceList.filter((absence: any) => {
                            const absenceStart = dayjs(absence.startDate)
                            const absenceEnd = dayjs(absence.endDate)
                            return currentDay.isBetween(absenceStart, absenceEnd, null, '[]')
                          })

                          if (overlappingAbsences.length === 0) return null

                          // Render small colored segments for each overlapping absence (max 3)
                          const maxSegments = 3
                          const segments = overlappingAbsences.slice(0, maxSegments)

                          const resolveSegmentTextClass = (a: any): string =>
                            getAbsenceStatusTextClass(a.originalStatus || a.status)

                          const segmentWidth = `${100 / segments.length}%`

                          return (
                            <div className="gba:flex gba:gap-1 gba:mt-1">
                              {segments.map((a: any) => (
                                <Tooltip
                                  key={`${a.id || a.type}-${a.startDate}-${a.endDate}-${a.originalStatus || a.status}`}
                                >
                                  <TooltipTrigger asChild>
                                    <div
                                      className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:cursor-help gba:transition-all gba:duration-200 hover:gba:h-6 gba:min-h-4 gba:px-1 gba:bg-background"
                                      style={{
                                        width: segmentWidth
                                      }}
                                    >
                                      <span
                                        className={`gba:text-xs gba:font-medium gba:truncate gba:leading-none ${resolveSegmentTextClass(a)}`}
                                      >
                                        {a.type}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="gba:max-w-xs gba:z-[9999]">
                                    {getAbsenceTooltipContent(a, {
                                      showStatus: showStatusInTooltip,
                                      showDuration: showDurationInTooltip,
                                      computedEffectiveDays: (() => {
                                        // Compute effective count for this absence when not provided by BE
                                        const s = dayjs(a.startDate)
                                        const e = dayjs(a.endDate)
                                        let count = 0
                                        let d = s
                                        while (d.isBefore(e) || d.isSame(e, 'day')) {
                                          const key = d.format('YYYY-MM-DD')
                                          if (effectiveDates) {
                                            if (effectiveDates.has(key)) count += 1
                                          } else {
                                            const isHol = isHoliday(holidayDates, d)
                                            const isWknd = d.day() === 0 || d.day() === 6
                                            const isNonWorking = !!(nonWorkingDates && nonWorkingDates.has(key))
                                            if (
                                              !isHol &&
                                              !isNonWorking &&
                                              (!isWknd || allowWeekendPaintingInFallback)
                                            ) {
                                              count += 1
                                            }
                                          }
                                          d = d.add(1, 'day')
                                        }
                                        return count
                                      })()
                                    })}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )
                        })()}
                    </>
                  )
                }

                const commonProps = {
                  'data-testid': `calendar-day-${currentDay.date()}`,
                  onContextMenu: (e: React.MouseEvent) => {
                    // Always prevent browser context menu on calendar days
                    e.preventDefault()
                    e.stopPropagation()

                    // Only show our context menu for current month days with selection enabled
                    if (!isInteractive) return

                    handleContextMenu(e, currentDay, isCurrentMonth)
                  }
                }

                if (isInteractive) {
                  return (
                    <button
                      type="button"
                      key={dayKey}
                      {...commonProps}
                      tabIndex={0}
                      onClick={handleDayClick}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleDayClick()
                        }
                      }}
                      className={`${getDayClassName()} gba:appearance-none gba:m-0 gba:font-inherit gba:text-inherit gba:w-full gba:text-left`}
                    >
                      {renderDayContent()}
                    </button>
                  )
                }

                return (
                  <div key={dayKey} {...commonProps} className={getDayClassName()}>
                    {renderDayContent()}
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
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-info-secondary" />
                <span className="gba:text-xs">{t('holiday')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-info-secondary" />
                <span className="gba:text-xs">{t('today')}</span>
              </div>
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
