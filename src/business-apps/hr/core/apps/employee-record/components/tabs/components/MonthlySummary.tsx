'use client'

import React from 'react'
import {
  Button,
  Card,
  Alert,
  Icon,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useTranslation
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../hooks/useTimeTrackingData'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  UserIcon,
  ClockIcon,
  TimerIcon,
  ListBulletsIcon,
  PencilIcon,
  MapPinIcon,
  HouseIcon,
  BuildingsIcon,
  GlobeIcon
} from '@phosphor-icons/react'
import { InterventionsTable } from './InterventionsTable'
import { LiveClock } from './LiveClock'
import timeTrackingTranslations from './_i18n'

interface MonthlySummaryProps {
  employee: any
  employeeId: string
  accessToken: string
  isSelfView: boolean
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({ employee, employeeId, accessToken, isSelfView }) => {
  const {
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    clockIn,
    clockOut,
    todaysPlannedMinutes,
    todayRecordedMinutes,
    isNearHome,
    isNearOffice,
    hasTodayAttendanceRecord,
    updateLocationSelection,
    locationBanner
  } = useTimeTrackingData({ employeeId, accessToken, workingHours: employee?.workingHours?.[0] })

  const { t } = useTranslation(timeTrackingTranslations)

  const formatHm = (minutes: number) => {
    const abs = Math.max(0, Math.floor(minutes))
    const h = Math.floor(abs / 60)
    const m = abs % 60
    return `${h}:${String(m).padStart(2, '0')}`
  }

  const employeeName =
    employee?.displayName || getTranslationFromI18nKeyAndLabel('lowcoder:common.employee', 'Employee')

  // Build header text with optional secondary line for clocked-in state
  const isClockedOutWithWork = !isClockedIn && todayRecordedMinutes > 0
  const headerPrimary = isClockedIn
    ? getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_tracking.summary.header.clock_in',
        `You're on the clock, ${employeeName} — keep up the great work!`,
        {
          employeeName
        }
      )
    : isClockedOutWithWork
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.summary.header.clock_out',
          `Clocked out! Time to recharge, ${employeeName}`,
          {
            employeeName
          }
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.summary.header.welcome',
          `Welcome ${employeeName} to the new way of working!`,
          {
            employeeName
          }
        )
  const headerSecondary = isClockedIn
    ? getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_tracking.summary.header.clock_IN_secondary',
        "Let's make this day count."
      )
    : isClockedOutWithWork
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.summary.header.clock_OUT_secondary',
          'Great work today — see you tomorrow, fresh and focused.'
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.summary.header.welcome_secondary',
          'Let’s set things in motion — your hours start with a single click.'
        )

  // "Clocked in since" formatting: 12h for English, 24h for others
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

  const welcomeText = React.useMemo(() => {
    if (locationBanner === 'office') return t('time-tracking-welcome-office')
    if (locationBanner === 'home') return t('time-tracking-welcome-home')
    if (locationBanner === 'remote') return t('time-tracking-welcome-other')
    return ''
  }, [locationBanner, t])

  const welcomeIcon = React.useMemo(() => {
    if (locationBanner === 'office') return BuildingsIcon
    if (locationBanner === 'home') return HouseIcon
    return GlobeIcon
  }, [locationBanner])

  return (
    <div data-testid="monthly-summary-container">
      {/* Top grid: Time card, Actions, Right-side info */}
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:items-stretch"
        data-testid="timeclock-top-grid"
      >
        {/* Left column: separate time/date and employee status panels */}
        <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full">
          {/* Current time/date */}
          <Card
            className="gba:p-4 gba:h-full gba:flex gba:items-center gba:justify-center"
            data-testid="timeclock-now-card"
          >
            <LiveClock className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center" />
          </Card>
        </div>

        {/* Actions */}
        <Card className="gba:p-4" data-testid="timeclock-actions-card">
          <div className="gba:text-center gba:mb-3" data-testid="timeclock-header-text">
            <div className="gba:text-xl gba:font-semibold">{headerPrimary}</div>
            {headerSecondary && <div className="gba:mt-1 gba:text-base gba:font-normal">{headerSecondary}</div>}
          </div>
          <div className="gba:space-y-2">
            <Button
              className="gba:w-full"
              variant="default"
              disabled={!isSelfView || isClockedIn || isSubmitting}
              onClick={clockIn}
              data-testid="timeclock-clock-in-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_in', 'Clock In')}
            </Button>

            <Button className="gba:w-full" variant="outline" disabled data-testid="timeclock-start-break-button">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.start_break', 'Start Break')}
            </Button>

            <Button className="gba:w-full" variant="outline" disabled data-testid="timeclock-end-break-button">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.end_break', 'End Break')}
            </Button>

            <Button
              className="gba:w-full"
              variant="default"
              disabled={!isSelfView || !isClockedIn || isSubmitting}
              onClick={clockOut}
              data-testid="timeclock-clock-out-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_out', 'Clock Out')}
            </Button>

            <AppAction
              variant="update-secondary"
              data-testid="timeclock-request-correction-button"
              className="gba:!w-full"
              contexts={[
                {
                  context: FlowContextName.employeeAttendanceCorrectionRequest,
                  contextData: { employeeId: employee?.id }
                }
              ]}
              prefixDataTestId="timeclock-request-correction"
              accessToken={accessToken}
            >
              <>
                <Icon icon={PencilIcon} />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:time_tracking.actions.request_correction',
                  'Request Correction'
                )}
              </>
            </AppAction>

            <AppAction
              variant="update-secondary"
              data-testid="timeclock-request-absence-button"
              className="gba:!w-full"
              contexts={[
                {
                  context: FlowContextName.employeeAbsenceRecord,
                  contextData: {
                    employeeId: employee?.id
                  }
                }
              ]}
              prefixDataTestId="timeclock-request-absence"
              accessToken={accessToken}
            >
              <>
                <Icon icon={PencilIcon} />
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')}
              </>
            </AppAction>
          </div>
        </Card>

        {/* Right column: Employee status */}
        <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full" data-testid="timeclock-right-column">
          <Card className="gba:p-4 gba:h-full" data-testid="timeclock-employee-card">
            {locationBanner ? (
              <div className="gba:flex gba:items-center gba:gap-3 gba:py-6 gba:justify-center">
                <Icon icon={welcomeIcon} className="gba:text-info gba:text-3xl" />
                <div className="gba:text-lg gba:font-semibold">{welcomeText}</div>
              </div>
            ) : (
              <>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
                  <Icon icon={UserIcon} />
                  {employee?.displayName || getTranslationFromI18nKeyAndLabel('lowcoder:common.employee', 'Employee')}
                </div>
                <div
                  className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:text-base"
                  data-testid="timeclock-status-text"
                >
                  <Icon icon={ClockIcon} />
                  {isClockedIn ? (
                    <div className="gba:flex gba:justify-between gba:w-full">
                      <span>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:time_tracking.status.clocked_in_since_label',
                          'Currently clocked in since'
                        )}
                      </span>
                      <span className="gba:font-semibold">{displayClockInSince}</span>
                    </div>
                  ) : isClockedOutWithWork ? (
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.status.clocked_out', 'Clocked out')}
                    </span>
                  ) : (
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.status.not_clocked_in',
                        'Not clocked in'
                      )}
                    </span>
                  )}
                </div>
                <div
                  className="gba:text-base gba:mt-2 gba:flex gba:items-center gba:gap-2"
                  data-testid="timeclock-work-hours-today"
                >
                  <Icon icon={TimerIcon} />
                  <div className="gba:flex gba:justify-between gba:w-full">
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.work_hours_today', 'Work Hours Today')}
                    </span>
                    <span className="gba:font-semibold">{formatHm(todayRecordedMinutes)}</span>
                  </div>
                </div>
                <div
                  className="gba:text-base gba:mt-2 gba:flex gba:items-center gba:gap-2"
                  data-testid="timeclock-work-hours-assigned"
                >
                  <Icon icon={ListBulletsIcon} />
                  <div className="gba:flex gba:justify-between gba:w-full">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.work_hours_assigned',
                        'Work Hours Assigned'
                      )}
                    </span>
                    <span className="gba:font-semibold">{formatHm(todaysPlannedMinutes)}</span>
                  </div>
                </div>
                {(isClockedIn || hasTodayAttendanceRecord) && (
                  <div
                    className="gba:text-base gba:mt-2 gba:flex gba:items-start gba:justify-between gba:w-full"
                    data-testid="timeclock-location-status"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Icon icon={MapPinIcon} />
                      <span>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.label', 'Location')}
                      </span>
                    </div>
                    <div className="gba:text-right gba:flex gba:flex-col gba:items-end">
                      <span className="gba:font-semibold">{locationPrimaryLabel}</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="gba:!px-0 gba:font-semibold gba:underline gba:mt-1"
                        onClick={() => setIsLocationModalOpen(true)}
                        data-testid="timeclock-location-open-modal-button"
                      >
                        {confirmLocationLabel}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
            <DialogContent data-testid="timeclock-location-modal">
              <DialogHeader>
                <DialogTitle>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.location.confirm_title',
                    'Confirm location'
                  )}
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
                  data-testid="timeclock-location-option-home"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.home', 'Home')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    updateLocationSelection('office')
                    setIsLocationModalOpen(false)
                  }}
                  data-testid="timeclock-location-option-office"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.office', 'Office')}
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    updateLocationSelection('remote')
                    setIsLocationModalOpen(false)
                  }}
                  data-testid="timeclock-location-option-other"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.location.other', 'Remote')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mt-4">
          {error}
        </Alert>
      )}

      {/* Interventions table */}
      <InterventionsTable
        employeeId={employeeId}
        accessToken={accessToken}
        workingHours={employee?.workingHours?.[0]}
      />
    </div>
  )
}

export default MonthlySummary
