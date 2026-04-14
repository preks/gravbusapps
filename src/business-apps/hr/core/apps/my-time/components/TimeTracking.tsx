'use client'

import React from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '@/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData'
import { InterventionsTable } from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/InterventionsTable'
import { useEmployeeWorkingHours } from '../utils/useEmployeeWorkingHours'
import { HeroClockCard } from './HeroClockCard'
import { LocationCard } from './LocationCard'
import { ThisWeekCard } from './ThisWeekCard'
import { TodaysLogCard } from './TodaysLogCard'
import { QuickActionsCard } from './QuickActionsCard'

interface TimeTrackingProps {
  employee: any
  employeeId: string
  accessToken: string
  isSelfView: boolean
  onNavigateToEveryAI?: () => void
}

const TimeTracking: React.FC<TimeTrackingProps> = ({
  employee,
  employeeId,
  accessToken,
  isSelfView,
  onNavigateToEveryAI
}) => {
  const workingHours = useEmployeeWorkingHours(employee)

  const {
    isClockedIn,
    isSubmitting,
    error,
    clockIn,
    clockOut,
    todayRecordedMinutes,
    todaysPlannedMinutes,
    hasTodayAttendanceRecord,
    entries,
    allMonthEntries,
    monthlyWorkedUntilYesterdayMinutes,
    monthlyRequiredMinutes,
    isNearHome,
    isNearOffice,
    updateLocationSelection
  } = useTimeTrackingData({ employeeId, accessToken, workingHours })

  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false)

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

  const monthlyWorkedMinutes = monthlyWorkedUntilYesterdayMinutes + todayRecordedMinutes

  return (
    <div data-testid="monthly-summary-container">
      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-4">
          {error}
        </Alert>
      )}

      {/* Top row: Hero card + right stack */}
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:items-stretch gba:gap-4"
        data-testid="timeclock-main-row"
      >
        <HeroClockCard
          firstName={employee?.firstName}
          isClockedIn={isClockedIn}
          isSelfView={isSelfView}
          isSubmitting={isSubmitting}
          clockIn={clockIn}
          clockOut={clockOut}
          todayRecordedMinutes={todayRecordedMinutes}
          todaysPlannedMinutes={todaysPlannedMinutes}
          allMonthEntries={allMonthEntries}
          monthlyWorkedMinutes={monthlyWorkedMinutes}
          monthlyRequiredMinutes={monthlyRequiredMinutes}
          workingHours={workingHours}
        />

        <div className="gba:flex gba:flex-col gba:gap-4">
          <div className="[&>*]:!gba:mt-0">
            <InterventionsTable
              employeeId={employeeId}
              accessToken={accessToken}
              workingHours={employee?.workingHours?.[0]}
              onReviewClick={onNavigateToEveryAI}
            />
          </div>
          <LocationCard
            isActive={isClockedIn || hasTodayAttendanceRecord}
            locationLabel={locationPrimaryLabel}
            confirmLocationLabel={confirmLocationLabel}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
          />
        </div>
      </div>

      {/* Bottom row: This Week + Today's Log + Quick Actions */}
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:items-stretch gba:gap-4 gba:mt-4"
        data-testid="timeclock-bottom-row"
      >
        <ThisWeekCard
          allMonthEntries={allMonthEntries}
          workingHours={workingHours}
          todayRecordedMinutes={todayRecordedMinutes}
        />
        <TodaysLogCard entries={entries} />
        <QuickActionsCard />
      </div>

      {/* Location confirm modal */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent data-testid="timeclock-location-modal">
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
  )
}

export default TimeTracking
