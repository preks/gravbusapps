'use client'

import React from 'react'
import { Button, Card, Alert } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from './hooks/useTimeTrackingData'
import { TimeEntriesTable } from './components/TimeEntriesTable'
import AppActionMenu from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PiPencilSimple } from 'react-icons/pi'

interface TimeTrackingTabProps extends BusinessAppContextProps {
  employee: any
  employeeId: string
  isSelfView: boolean
}

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ employee, accessToken, employeeId, isSelfView }) => {
  // Request Correction uses a Flow via AppActionMenu

  const locale = getCurrentActiveUserLocale()
  const {
    currentMonth,
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    entries,
    prevMonth,
    nextMonth,
    clockIn,
    clockOut
  } = useTimeTrackingData({ employeeId })

  // Build daily working-hour requirements (minutes) from employee working hours
  const dailyRequirementsMins: number[] = React.useMemo(() => {
    const wh = employee?.workingHours?.[0]
    if (!wh) return [0, 0, 0, 0, 0, 0, 0]
    const toMin = (h?: number) => (typeof h === 'number' ? Math.max(0, Math.round(h * 60)) : 0)
    // JS getDay(): 0=Sun ... 6=Sat
    return [
      toMin(wh?.sundayHours),
      toMin(wh?.mondayHours),
      toMin(wh?.tuesdayHours),
      toMin(wh?.wednesdayHours),
      toMin(wh?.thursdayHours),
      toMin(wh?.fridayHours),
      toMin(wh?.saturdayHours)
    ]
  }, [employee?.workingHours])

  // Not displayed, but used for deficit computation

  // Compare visible entries against requirements and collect deficits
  const deficits = React.useMemo(() => {
    return (entries || []).reduce<{ date: string; workedMins: number; requiredMins: number }[]>((acc, e) => {
      const date = new Date(e.dateISO)
      const req = dailyRequirementsMins[date.getDay()] || 0
      const worked = e.totalMinutes || 0
      if (req > 0 && worked < req) {
        acc.push({
          date: date.toLocaleDateString(locale),
          workedMins: worked,
          requiredMins: req
        })
      }
      return acc
    }, [])
  }, [entries, dailyRequirementsMins, locale])

  const [showDeficits, setShowDeficits] = React.useState(false)

  return (
    <div className="gba:time-tracking-tab gba:space-y-6" data-testid="time-tracking-tab-container">
      <div className="gba:flex gba:items-start gba:justify-between" data-testid="time-tracking-header">
        <div>
          <div className="gba:font-bold gba:text-2xl" data-testid="time-tracking-title">
            Time Tracking
          </div>
          <div className="gba:text-muted-foreground gba:text-lg">Manage attendance and monthly timesheet</div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mt-2" data-testid="time-tracking-status-text">
            {isClockedIn ? `Currently clocked in since ${clockInSince ?? ''}` : 'Not clocked in'}
          </div>
        </div>
        <div className="gba:flex gba:gap-2 gba:items-center">
          <Button
            variant="default"
            disabled={!isSelfView || isClockedIn || isSubmitting}
            onClick={clockIn}
            data-testid="time-tracking-clock-in-button"
          >
            Clock In
          </Button>
          <Button
            variant="default"
            disabled={!isSelfView || !isClockedIn || isSubmitting}
            onClick={clockOut}
            data-testid="time-tracking-clock-out-button"
          >
            Clock Out
          </Button>
          <AppActionMenu
            data-testid="employee-goal-add-button"
            contextsArray={[FlowContextName.employeePerformanceGoal]}
            externalContextData={{
              employeeId: employeeId
            }}
            prefixDataTestId="employee-goal-add"
            accessToken={accessToken}
            autoExecuteSingleAction={true}
            deferMainContextRequestsUntilClick={true}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
              <PiPencilSimple />
              Request Correction
            </div>
          </AppActionMenu>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {/* Working hours guideline */}
      {/* Working hours breakdown removed per request */}
      {deficits.length > 0 && (
        <Card className="gba:p-6 gba:cursor-pointer" onClick={() => setShowDeficits(v => !v)}>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:mt-2 gba:text-2xl gba:font-semibold">You have less worked time</div>
            <div className="gba:bg-warning-secondary gba:text-warning gba:text-sm gba:px-3 gba:py-1 gba:rounded-full">
              {deficits.length} {deficits.length === 1 ? 'day' : 'days'}
            </div>
          </div>
          <div className="gba:text-muted-foreground">Days with worked time below required hours (visible range)</div>
          {showDeficits && (
            <div className="gba:mt-3 gba:space-y-2" style={{ maxWidth: 300 }}>
              {deficits.map(d => {
                const fmt = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
                const pct = d.requiredMins > 0 ? Math.round((d.workedMins / d.requiredMins) * 1000) / 10 : 0
                return (
                  <div key={d.date} className="gba:grid gba:grid-cols-3 gba:items-center">
                    <div className="gba:text-foreground gba:text-sm">{d.date}</div>
                    <div className="gba:text-base gba:font-semibold gba:text-center">{fmt(d.workedMins)}</div>
                    <div className="gba:text-muted-foreground gba:text-xs gba:text-right">{pct}%</div>
                  </div>
                )
              })}
            </div>
          )}
          {!showDeficits && <div className="gba:text-xs gba:text-muted-foreground gba:mt-2">Click to view details</div>}
        </Card>
      )}

      <Card className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-start gba:mb-3">
          <div className="gba:flex gba:gap-2" data-testid="time-tracking-month-selector">
            <Button variant="outline" onClick={prevMonth} data-testid="time-tracking-month-selector-prev">
              Prev
            </Button>
            <div className="gba:self-center">
              {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" onClick={nextMonth} data-testid="time-tracking-month-selector-next">
              Next
            </Button>
          </div>
        </div>

        <TimeEntriesTable
          entries={entries}
          locale={locale}
          page={1}
          pageSize={10}
          totalCount={entries.length}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      </Card>

      {/* Request Correction handled by AppActionMenu flow */}
    </div>
  )
}

export default TimeTrackingTab
