'use client'

import React, { useMemo } from 'react'
import {
  Button,
  Card,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Info, SignIn, SignOut } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import HeroLiveClock from './HeroLiveClock'
import { minutesToHHMM, parseDurationToMinutes } from '../utils/duration'
import timeTrackingTranslations from '../_i18n'

interface HeroClockCardProps {
  readonly firstName?: string
  readonly isClockedIn: boolean
  readonly isSelfView: boolean
  readonly isSubmitting: boolean
  readonly clockIn: () => void
  readonly clockOut: () => void
  readonly isClockInDisabled?: boolean
  readonly clockInDisabledReason?: string
  readonly todayRecordedMinutes: number
  readonly todaysPlannedMinutes: number
  readonly allMonthEntries: TimeEntry[]
  readonly monthlyWorkedMinutes: number
  readonly monthlyRequiredMinutes: number
  readonly workingHours?: {
    sundayHours?: number
    mondayHours?: number
    tuesdayHours?: number
    wednesdayHours?: number
    thursdayHours?: number
    fridayHours?: number
    saturdayHours?: number
  }
}

const DAY_KEYS = [
  'sundayHours',
  'mondayHours',
  'tuesdayHours',
  'wednesdayHours',
  'thursdayHours',
  'fridayHours',
  'saturdayHours'
] as const

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'greeting_morning'
  if (hour < 18) return 'greeting_afternoon'
  return 'greeting_evening'
}

function getWeeklyWorkedMinutes(entries: TimeEntry[], todayLiveMinutes: number): number {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  let weekTotal = 0
  for (const entry of entries) {
    const d = new Date(entry.attendanceDateISO)
    if (d < monday || d > sunday) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (key === todayKey) continue
    weekTotal += entry.totalMinutes ?? 0
  }
  return weekTotal + todayLiveMinutes
}

function getWeeklyPlannedHours(workingHours?: HeroClockCardProps['workingHours']): number {
  if (!workingHours) return 40
  return DAY_KEYS.reduce((sum, key) => sum + (workingHours[key] ?? 0), 0)
}

const fmt = (minutes: number) => minutesToHHMM(Math.max(0, Math.floor(minutes)))
const DEFAULT_DAILY_BREAK_MINUTES = 60

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTodayBreakMinutes(entries: TimeEntry[], plannedMinutes: number): number {
  if (plannedMinutes <= 0) {
    return 0
  }

  const todayKey = toLocalDateKey(new Date())
  const todayEntry = entries.find(entry => toLocalDateKey(new Date(entry.attendanceDateISO)) === todayKey)
  const breakMinutes = parseDurationToMinutes(todayEntry?.breakTime)

  return breakMinutes > 0 ? breakMinutes : DEFAULT_DAILY_BREAK_MINUTES
}

function minutesToDecimal(minutes: number): string {
  return (Math.max(0, minutes) / 60).toFixed(1)
}

function InlineInfoTooltip({
  label,
  tooltip,
  testId
}: {
  readonly label: string
  readonly tooltip: string
  readonly testId: string
}) {
  return (
    <span className="gba:inline-flex gba:items-center gba:gap-1">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="gba:inline-flex gba:items-center gba:justify-center gba:text-inverse-muted-foreground hover:gba:text-inverse-secondary-foreground"
              aria-label={tooltip}
              data-testid={testId}
            >
              <Info size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="gba:max-w-[240px]">
            <p className="gba:text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  )
}

export const HeroClockCard: React.FC<HeroClockCardProps> = ({
  firstName,
  isClockedIn,
  isSelfView,
  isSubmitting,
  clockIn,
  clockOut,
  isClockInDisabled = false,
  clockInDisabledReason,
  todayRecordedMinutes,
  todaysPlannedMinutes,
  allMonthEntries,
  monthlyWorkedMinutes,
  monthlyRequiredMinutes,
  workingHours
}) => {
  const { t } = useTranslation(timeTrackingTranslations)
  const todayBreakMinutes = useMemo(
    () => getTodayBreakMinutes(allMonthEntries, todaysPlannedMinutes),
    [allMonthEntries, todaysPlannedMinutes]
  )
  const todaysDisplayTargetMinutes = todaysPlannedMinutes + todayBreakMinutes

  const progressPct = useMemo(() => {
    if (todaysDisplayTargetMinutes <= 0) return 0
    return Math.min(100, Math.round((todayRecordedMinutes / todaysDisplayTargetMinutes) * 100))
  }, [todayRecordedMinutes, todaysDisplayTargetMinutes])

  const remainingMinutes = Math.max(0, todaysDisplayTargetMinutes - todayRecordedMinutes)
  const weeklyWorked = useMemo(
    () => getWeeklyWorkedMinutes(allMonthEntries, todayRecordedMinutes),
    [allMonthEntries, todayRecordedMinutes]
  )
  const weeklyPlanned = useMemo(() => getWeeklyPlannedHours(workingHours), [workingHours])

  const circumference = 2 * Math.PI * 54
  const strokeOffset = circumference - (progressPct / 100) * circumference

  return (
    <Card variant="decorative" className="gba:p-8 gba:h-full gba:md:col-span-2" data-testid="timeclock-hero-card">
      <div className="gba:flex gba:gap-6 gba:h-full">
        {/* Left: date, clock, greeting, stats */}
        <div className="gba:flex gba:flex-col gba:justify-center gba:flex-1">
          <HeroLiveClock
            className="gba:flex gba:flex-col"
            timeClassName="gba:text-inverse-secondary-foreground gba:text-6xl"
            dateClassName="gba:text-inverse-muted-foreground"
            greetingClassName="gba:text-inverse-muted-foreground"
            greeting={t(getGreetingKey(), { name: firstName ?? '' })}
          />

          {/* Stats row */}
          <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mt-6">
            <div>
              <div className="gba:text-xl gba:font-bold gba:text-inverse-secondary-foreground">
                {fmt(todayRecordedMinutes)}
              </div>
              <div className="gba:text-xs gba:text-inverse-muted-foreground">
                <InlineInfoTooltip
                  label={t('worked_today_stat')}
                  tooltip={t('worked_today_tooltip')}
                  testId="timeclock-worked-today-tooltip-trigger"
                />
              </div>
            </div>
            <div>
              <div className="gba:text-xl gba:font-bold gba:text-inverse-secondary-foreground">
                {fmt(remainingMinutes)}
              </div>
              <div className="gba:text-xs gba:text-inverse-muted-foreground">
                <InlineInfoTooltip
                  label={t('remaining_stat')}
                  tooltip={t('remaining_tooltip', { breakTime: fmt(todayBreakMinutes) })}
                  testId="timeclock-remaining-tooltip-trigger"
                />
              </div>
            </div>
            <div>
              <div className="gba:text-xl gba:font-bold gba:text-inverse-secondary-foreground">
                {minutesToDecimal(weeklyWorked)}{' '}
                <span className="gba:text-sm gba:font-normal gba:text-inverse-muted-foreground">
                  / {weeklyPlanned}h
                </span>
              </div>
              <div className="gba:text-xs gba:text-inverse-muted-foreground">{t('this_week_stat')}</div>
            </div>
            <div>
              <div className="gba:text-xl gba:font-bold gba:text-inverse-secondary-foreground">
                {minutesToDecimal(monthlyWorkedMinutes)}{' '}
                <span className="gba:text-sm gba:font-normal gba:text-inverse-muted-foreground">
                  / {Math.round(monthlyRequiredMinutes / 60)}h
                </span>
              </div>
              <div className="gba:text-xs gba:text-inverse-muted-foreground">{t('this_month_stat')}</div>
            </div>
          </div>
        </div>

        {/* Right: circular progress + Clock In/Out button */}
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-4">
          <div className="gba:relative gba:w-36 gba:h-36">
            <svg viewBox="0 0 120 120" className="gba:w-full gba:h-full gba:-rotate-90">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="gba:text-inverse-muted-foreground/20"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="gba:text-inverse-secondary-foreground"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center">
              <span className="gba:text-lg gba:font-bold gba:text-inverse-secondary-foreground">
                {fmt(todayRecordedMinutes)}
              </span>
              <span className="gba:text-xs gba:text-inverse-muted-foreground">
                <InlineInfoTooltip
                  label={t('of_planned', { planned: fmt(todaysDisplayTargetMinutes) })}
                  tooltip={t('break_included_tooltip', { breakTime: fmt(todayBreakMinutes) })}
                  testId="timeclock-break-included-tooltip-trigger"
                />
              </span>
            </div>
          </div>
          {isClockedIn ? (
            <Button
              variant="default"
              tone="inverse"
              disabled={!isSelfView || isSubmitting}
              onClick={clockOut}
              data-testid="timeclock-hero-clock-out-button"
            >
              <span className="gba:inline-flex gba:items-center gba:gap-2">
                <Icon icon={SignOut} />
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_out', 'Clock Out')}
              </span>
            </Button>
          ) : (
            <Button
              variant="default"
              tone="inverse"
              disabled={!isSelfView || isSubmitting || isClockInDisabled}
              onClick={clockIn}
              data-testid="timeclock-hero-clock-in-button"
            >
              <span className="gba:inline-flex gba:items-center gba:gap-2">
                <Icon icon={SignIn} />
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_in', 'Clock In')}
              </span>
            </Button>
          )}
          {!isClockedIn && isClockInDisabled && clockInDisabledReason ? (
            <p className="gba:max-w-48 gba:text-center gba:text-xs gba:text-inverse-muted-foreground">
              {clockInDisabledReason}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
