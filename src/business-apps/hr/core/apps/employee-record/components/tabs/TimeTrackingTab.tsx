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

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ accessToken, employeeId, isSelfView }) => {
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
