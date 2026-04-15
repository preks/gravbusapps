import React, { useState, useCallback } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  Badge,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarIcon, XIcon } from 'lucide-react'
import { useAbsenceCalendarData } from '../hooks/useAbsenceCalendarData'
import type { PrevalidateResult } from '@/business-apps/hr/core/hooks/useAbsencePrevalidate'
import { getPrevalidateErrorPresentation } from '@/business-apps/hr/core/utils/absencePrevalidateLabels'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import formsTranslations from '../../_i18n'

interface AbsenceDateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onChange: (startDate: Date | undefined, endDate: Date | undefined) => void
  accessToken: string | undefined
  employeeId: string
  selectedTypeRef?: string
  prevalidate?: PrevalidateResult
  disabled?: boolean
  'data-testid'?: string
}

const formatDate = (d: Date): string =>
  d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const formatSnapshotValue = (value: number): string => value.toFixed(2)

const IDLE_PREVALIDATE: PrevalidateResult = {
  effectiveDays: null,
  workingDays: null,
  errorCode: null,
  errorTitle: null,
  errorDetail: null,
  isLoading: false
}

/**
 * Absence date range picker built on Calendar + Popover.
 * Shows approved absences as disabled days, pending absences with an
 * orange indicator, and bank holidays with a blue indicator — all fetched
 * proactively for the currently visible calendar months.
 */
export const AbsenceDateRangePicker: React.FC<AbsenceDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  accessToken,
  employeeId,
  selectedTypeRef,
  prevalidate = IDLE_PREVALIDATE,
  disabled = false,
  'data-testid': testId = 'absence-date-range-input'
}) => {
  const { t } = useTranslation(formsTranslations)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startDate ?? new Date())

  const { approvedDates, pendingDates, blockedRequestDates, bankHolidayDates, entitlementSnapshot } =
    useAbsenceCalendarData(accessToken, employeeId, visibleMonth, selectedTypeRef)

  const blockedDateSet = new Set([...blockedRequestDates, ...bankHolidayDates].map(toLocalDateStr))

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      onChange(range?.from, range?.to)
      // Keep the picker open while selecting/changing dates.
      // It should only close on explicit outside click / Escape.
      if (!disabled) setOpen(true)
    },
    [onChange, disabled]
  )

  const handleMonthChange = useCallback((month: Date) => {
    setVisibleMonth(month)
  }, [])

  const placeholderStart = getTranslationFromI18nKeyAndLabel(
    'lowcoder:absence_form.select_start_date',
    'Select start date'
  )
  const placeholderEnd = getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.select_end_date', 'Select end date')

  let displayValue: string | null = null
  if (startDate && endDate) {
    displayValue = `${formatDate(startDate)} – ${formatDate(endDate)}`
  } else if (startDate) {
    displayValue = `${formatDate(startDate)} – ${placeholderEnd}`
  }

  const hasValue = !!startDate || !!endDate
  const hasDisplayValue = displayValue !== null

  const renderPrevalidateContent = () => {
    if (prevalidate.isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <Spinner size="sm" />
          <span>
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.validation_checking', 'Checking availability...')}
          </span>
        </div>
      )
    }

    if (prevalidate.errorCode) {
      const errorPresentation = getPrevalidateErrorPresentation(prevalidate.errorCode, prevalidate.errorDetail)
      return (
        <div className="gba:flex gba:max-w-md gba:flex-col gba:items-start gba:gap-1.5" data-testid="prevalidate-error">
          <Badge
            variant="destructive"
            className="gba:h-auto gba:max-w-full gba:whitespace-normal gba:break-words gba:py-1 gba:text-left"
            data-testid="prevalidate-error-badge"
          >
            <span className="gba:block gba:max-w-full gba:whitespace-normal gba:break-words">
              {t(errorPresentation.messageKey) || errorPresentation.messageFallback}
            </span>
          </Badge>
          <p
            className="gba:max-w-md gba:text-xs gba:text-muted-foreground gba:whitespace-normal gba:break-words"
            data-testid="prevalidate-error-detail"
          >
            {t(errorPresentation.detailKey) || errorPresentation.detailFallback}
          </p>
        </div>
      )
    }

    return (
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="prevalidate-success">
        {prevalidate.effectiveDays !== null && (
          <Badge variant="info">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.effective_days', 'Effective days')}:{' '}
            {prevalidate.effectiveDays}
          </Badge>
        )}
        {prevalidate.workingDays !== null && (
          <Badge variant="secondary">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.working_days', 'Working days')}:{' '}
            {prevalidate.workingDays}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-testid={testId}
          className={`gba:w-full gba:justify-start gba:text-left gba:font-normal gba:h-10 gba:px-3 ${
            hasDisplayValue ? '' : 'gba:text-muted-foreground'
          }`}
        >
          <CalendarIcon className="gba:w-4 gba:h-4 gba:mr-2 gba:shrink-0 gba:text-muted-foreground" />
          <span className="gba:truncate gba:flex-1">{displayValue ?? `${placeholderStart} / ${placeholderEnd}`}</span>
          {hasValue && !disabled ? (
            <button
              type="button"
              aria-label={getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.clear_dates', 'Clear dates')}
              className="gba:inline-flex gba:items-center gba:justify-center gba:w-5 gba:h-5 gba:rounded gba:hover:bg-muted gba:text-muted-foreground"
              onMouseDown={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onChange(undefined, undefined)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange(undefined, undefined)
                }
              }}
            >
              <XIcon className="gba:w-3.5 gba:h-3.5" />
            </button>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="gba:w-auto gba:min-w-fit gba:p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={{ from: startDate, to: endDate }}
          onSelect={(range: unknown) => handleSelect(range as DateRange | undefined)}
          onMonthChange={handleMonthChange}
          defaultMonth={visibleMonth}
          disabled={date => blockedDateSet.has(toLocalDateStr(date))}
          modifiers={{
            approved: approvedDates,
            pending: pendingDates,
            holiday: bankHolidayDates
          }}
          modifiersStyles={{
            today: {
              background: 'transparent',
              color: 'inherit',
              border: '1px solid rgba(148, 163, 184, 0.8)',
              borderRadius: '4px'
            },
            approved: {
              background: 'rgba(15, 23, 42, 0.14)',
              borderRadius: '4px'
            },
            pending: {
              background: 'rgba(245, 158, 11, 0.25)',
              borderRadius: '4px'
            },
            holiday: {
              background: 'rgba(59, 130, 246, 0.18)',
              border: '1px solid rgba(59, 130, 246, 0.7)',
              color: 'inherit',
              borderRadius: '4px'
            }
          }}
          captionLayout="dropdown"
        />
        {entitlementSnapshot && (
          <div className="gba:px-4 gba:py-2 gba:border-t gba:border-border gba:bg-muted/20 gba:text-xs gba:text-foreground">
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.balance_remaining', 'Remaining')}:{' '}
                <strong>{formatSnapshotValue(entitlementSnapshot.remaining)}</strong>
              </span>
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.balance_used_approved', 'Used approved')}:{' '}
                {formatSnapshotValue(entitlementSnapshot.usedApproved)}
              </span>
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.balance_used_pending', 'Used pending')}:{' '}
                {formatSnapshotValue(entitlementSnapshot.usedPending)}
              </span>
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.balance_total', 'Total')}:{' '}
                {formatSnapshotValue(entitlementSnapshot.totalEntitlement)}
              </span>
            </div>
            <div className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.balance_snapshot_at', 'Snapshot at')}:{' '}
              {new Date(entitlementSnapshot.snapshotAt).toLocaleString()}
            </div>
          </div>
        )}
        {startDate && endDate && selectedTypeRef && (
          <div className="gba:px-4 gba:py-2 gba:border-t gba:border-border gba:bg-muted/20">
            {renderPrevalidateContent()}
          </div>
        )}
        <div className="gba:flex gba:gap-4 gba:px-4 gba:py-2 gba:border-t gba:border-border gba:text-xs gba:text-muted-foreground">
          <span className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-warning/20 gba:border gba:border-warning/40" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.legend_pending', 'Pending absence')}
          </span>
          <span className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-info/20 gba:border gba:border-info/40" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.legend_holiday', 'Bank holiday')}
          </span>
          <span className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:opacity-40 gba:bg-muted gba:border gba:border-border" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_form.legend_approved', 'Approved absence')}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
