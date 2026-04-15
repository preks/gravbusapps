'use client'

import React, { useMemo } from 'react'
import { Button, Card, Icon, useTranslation } from '@newwork/nw-design-system'
import { SignIn, SignOut } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { TimeEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import HeroLiveClock from './HeroLiveClock'
import { minutesToHHMM } from '../utils/duration'
import timeTrackingTranslations from '../_i18n'

interface HeroClockCardProps {
  readonly firstName?: string
  readonly isClockedIn: boolean
  readonly isSelfView: boolean
  readonly isSubmitting: boolean
  readonly clockIn: () => void
  readonly clockOut: () => void
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

function minutesToDecimal(minutes: number): string {
  return (Math.max(0, minutes) / 60).toFixed(1)
}

export const HeroClockCard: React.FC<HeroClockCardProps> = ({
  firstName,
  isClockedIn,
  isSelfView,
  isSubmitting,
  clockIn,
  clockOut,
  todayRecordedMinutes,
  todaysPlannedMinutes,
  allMonthEntries,
  monthlyWorkedMinutes,
  monthlyRequiredMinutes,
  workingHours
}) => {
  const { t } = useTranslation(timeTrackingTranslations)

  const progressPct = useMemo(() => {
    if (todaysPlannedMinutes <= 0) return 0
    return Math.min(100, Math.round((todayRecordedMinutes / todaysPlannedMinutes) * 100))
  }, [todayRecordedMinutes, todaysPlannedMinutes])

  const remainingMinutes = Math.max(0, todaysPlannedMinutes - todayRecordedMinutes)
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
              <div className="gba:text-xs gba:text-inverse-muted-foreground">{t('worked_today_stat')}</div>
            </div>
            <div>
              <div className="gba:text-xl gba:font-bold gba:text-inverse-secondary-foreground">
                {fmt(remainingMinutes)}
              </div>
              <div className="gba:text-xs gba:text-inverse-muted-foreground">{t('remaining_stat')}</div>
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
                {t('of_planned', { planned: fmt(todaysPlannedMinutes) })}
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
              disabled={!isSelfView || isSubmitting}
              onClick={clockIn}
              data-testid="timeclock-hero-clock-in-button"
            >
              <span className="gba:inline-flex gba:items-center gba:gap-2">
                <Icon icon={SignIn} />
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_in', 'Clock In')}
              </span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
