'use client'

import React from 'react'
import {
  Button,
  Card,
  Alert,
  Badge,
  Icon,
  useTranslation,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import {
  ClockIcon,
  MapPinIcon,
  SignIn,
  SignOut
  // other icons reserved for future
} from '@phosphor-icons/react'
import { InterventionsTable } from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/InterventionsTable'
import HeroLiveClock from './HeroLiveClock'
import timeTrackingTranslations from '../_i18n'
import { useEmployeeWorkingHours } from '../utils/useEmployeeWorkingHours'

interface TimeTrackingProps {
  employee: any
  employeeId: string
  accessToken: string
  isSelfView: boolean
}

const TimeTracking: React.FC<TimeTrackingProps> = ({ employee, employeeId, accessToken, isSelfView }) => {
  const workingHours = useEmployeeWorkingHours(employee)

  const {
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    clockIn,
    clockOut,
    todaysWorkedMinutes,
    todaysPlannedMinutes,
    todayRecordedMinutes,
    hasTodayAttendanceRecord,
    entries,
    isNearHome,
    isNearOffice,
    updateLocationSelection
  } = useTimeTrackingData({ employeeId, accessToken, workingHours })

  const { t } = useTranslation(timeTrackingTranslations)

  const formatHm = (minutes: number) => {
    const abs = Math.max(0, Math.floor(minutes))
    const h = Math.floor(abs / 60)
    const m = abs % 60
    return `${h}:${String(m).padStart(2, '0')}`
  }

  const workedHm = `${formatHm(todayRecordedMinutes)}h`
  const plannedHm = `${formatHm(todaysPlannedMinutes)}h`
  const workProgressPct = React.useMemo(() => {
    if (!todaysPlannedMinutes || todaysPlannedMinutes <= 0) return 0
    const pct = (todaysWorkedMinutes / todaysPlannedMinutes) * 100
    return Math.max(0, Math.min(100, Math.round(pct)))
  }, [todaysWorkedMinutes, todaysPlannedMinutes])

  // "Clocked in since" formatting (aligned with MonthlySummary)
  const displayClockInSince = React.useMemo(() => {
    if (!clockInSince) return ''
    const raw = String(clockInSince)
    if (raw.includes('T')) {
      try {
        const locale =
          (typeof globalThis !== 'undefined' && (globalThis as any)?.lowcoder?.i18n?.selectedLocale) || 'en-US'
        const use12h = String(locale).toLowerCase().startsWith('en')
        return new Date(raw).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: use12h })
      } catch {
        return raw
      }
    }
    const m = raw.match(/^(\d{1,2}:\d{2})/)
    return m ? m[1] : raw
  }, [clockInSince])

  const formatIsoToTime = (iso?: string) => {
    if (!iso) return ''
    try {
      const locale =
        (typeof globalThis !== 'undefined' && (globalThis as any)?.lowcoder?.i18n?.selectedLocale) || 'en-US'
      const use12h = String(locale).toLowerCase().startsWith('en')
      return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: use12h })
    } catch {
      return ''
    }
  }

  const locationPrimaryLabel = React.useMemo(() => {
    if (isNearOffice) return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.office', 'Office')
    if (isNearHome) return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.home', 'Home')
    return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.remote', 'Remote')
  }, [isNearHome, isNearOffice])
  const confirmLocationLabel = React.useMemo(() => {
    const label = `Not working from ${locationPrimaryLabel}?`
    return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.you_are_working_from_question', label, {
      location: locationPrimaryLabel
    })
  }, [locationPrimaryLabel])
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false)

  const getTodayTimes = () => {
    try {
      const now = new Date()
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const todayEntry = entries.find(e => {
        const d = new Date(e.attendanceDateISO)
        const entryKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        return entryKey === key
      })
      return {
        start: formatIsoToTime(todayEntry?.startTimeISO),
        end: formatIsoToTime(todayEntry?.endTimeISO)
      }
    } catch {
      return { start: '', end: '' }
    }
  }

  return (
    <div data-testid="monthly-summary-container">
      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mt-4">
          {error}
        </Alert>
      )}

      {/* Main row: Hero, Timeline and Today at a Glance */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:mt-4" data-testid="timeclock-main-row">
        {/* Hero time card */}
        <Card variant="decorative" className="gba:p-10 gba:min-h-96" data-testid="timeclock-hero-card">
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:gap-4 gba:h-full">
            <div className="gba:bg-info-secondary gba:rounded-full gba:p-5 gba:inline-flex">
              <Icon icon={ClockIcon} className="gba:text-5xl" />
            </div>
            <HeroLiveClock
              className="gba:flex gba:flex-col gba:items-center gba:justify-center"
              timeClassName="gba:text-inverse-secondary-foreground"
              dateClassName="gba:text-inverse-muted-foreground"
            />
            <div className="gba:w-full">
              {isClockedIn ? (
                <Button
                  className="gba:w-full"
                  variant="default"
                  tone="inverse"
                  disabled={!isSelfView || !isClockedIn || isSubmitting}
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
                  className="gba:w-full"
                  variant="default"
                  tone="inverse"
                  disabled={!isSelfView || isClockedIn || isSubmitting}
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

        {/* Today's Timeline */}
        <Card className="gba:p-8 gba:min-h-96" data-testid="timeclock-timeline-card">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
            <div className="gba:text-lg gba:font-semibold">{t('today_timeline')}</div>
          </div>
          {isClockedIn && (
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <Icon icon={ClockIcon} />
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.status.clocked_in_since_label',
                    'Currently clocked in since'
                  )}
                </span>
              </div>
              <div className="gba:text-sm gba:font-semibold">{displayClockInSince}</div>
            </div>
          )}
          {!isClockedIn && hasTodayAttendanceRecord && (
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Icon icon={ClockIcon} />
                <div className="gba:flex gba:flex-col">
                  <div className="gba:text-sm gba:text-muted-foreground">{t('worked_today')}</div>
                  <div className="gba:text-base gba:font-medium">
                    {formatHm(todaysWorkedMinutes)} ({t('recorded')} {formatHm(todayRecordedMinutes)})
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    {(() => {
                      const t = getTodayTimes()
                      const start = t.start || '—'
                      const end = t.end || '—'
                      return `${getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_in', 'Clock In')} ${start} • ${getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_out', 'Clock Out')} ${end}`
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!isClockedIn && !hasTodayAttendanceRecord && (
            <div className="gba:text-muted-foreground gba:text-sm gba:py-8 gba:text-center">
              {t('no_time_entries_for_today')}
            </div>
          )}

          {/* Geolocation (moved into middle card) */}
          {(isClockedIn || hasTodayAttendanceRecord) && (
            <div className="gba:mt-6" data-testid="timeclock-location-block">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Icon icon={MapPinIcon} />
                  <div className="gba:flex gba:flex-col gba:pt-3">
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.label', 'Location')}
                    </div>
                    <div className="gba:text-base gba:font-medium">{locationPrimaryLabel}</div>
                    <Button
                      variant="link"
                      size="sm"
                      className="gba:!px-0 gba:text-sm gba:underline"
                      onClick={() => setIsLocationModalOpen(true)}
                      data-testid="timeclock-location-open-modal-button-mid"
                    >
                      {confirmLocationLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Today at a Glance */}
        <Card className="gba:p-8 gba:min-h-96" data-testid="timeclock-glance-card">
          <div className="gba:text-lg gba:font-semibold gba:mb-3">{t('today_at_a_glance')}</div>

          {/* Work Hours */}
          <div className="gba:border gba:border-muted gba:rounded-md gba:p-3 gba:mb-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.work_hours_today', 'Work Hours Today')}
              </div>
              <Icon icon={ClockIcon} />
            </div>
            <div className="gba:mt-2 gba:text-xl gba:font-semibold">
              {workedHm}{' '}
              <span className="gba:text-muted-foreground gba:text-base">
                / {plannedHm} {t('planned')}
              </span>
            </div>
            <div className="gba:mt-2 gba:h-2 gba:bg-muted gba:rounded-full">
              <div className="gba:h-2 gba:bg-primary gba:rounded-full" style={{ width: `${workProgressPct}%` }} />
            </div>
          </div>

          {/* Status */}
          <div className="gba:border gba:border-muted gba:rounded-md gba:p-3">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('status')}</div>
            <Badge variant="info" className="gba:animate-pulse" data-testid="timeclock-status-badge">
              <Icon icon={ClockIcon} />
              {isClockedIn
                ? t('in_progress')
                : getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.status.clocked_out', 'Clocked out')}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Location confirm modal for middle card */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent data-testid="timeclock-location-modal-mid">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.confirm_title', 'Confirm location')}
            </DialogTitle>
            <DialogDescription>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.location.question',
                'Right now, the location you are working from is ... ?'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gba:flex gba:gap-2 gba:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                updateLocationSelection('home')
                setIsLocationModalOpen(false)
              }}
              data-testid="timeclock-location-option-home-mid"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.home', 'Home')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                updateLocationSelection('office')
                setIsLocationModalOpen(false)
              }}
              data-testid="timeclock-location-option-office-mid"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.office', 'Office')}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                updateLocationSelection('remote')
                setIsLocationModalOpen(false)
              }}
              data-testid="timeclock-location-option-other-mid"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.other', 'Remote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interventions table */}
      <InterventionsTable
        employeeId={employeeId}
        accessToken={accessToken}
        workingHours={employee?.workingHours?.[0]}
      />
    </div>
  )
}

export default TimeTracking
