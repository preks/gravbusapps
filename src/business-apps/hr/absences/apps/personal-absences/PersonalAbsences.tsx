import { useState, useEffect } from 'react'
import { useTranslation, Dialog, DialogContent } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'
import { fetchHolidayDates } from '@/business-apps/hr/core/apps/employee-record/components/tabs/utils/fetchHolidayDates'
import { useAbsenceEffectiveDates } from '@/business-apps/hr/core/apps/employee-record/hooks/useAbsenceEffectiveDates'
import { useEmployeeWeeklySchedule } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeWeeklySchedule'

import personalAbsencesTranslations from './_i18n'
import { usePersonalAbsencesData } from './hooks/usePersonalAbsencesData'
import { useWellnessInsight } from './hooks/useWellnessInsight'
import { PersonalAbsencesCalendarView } from './components/PersonalAbsencesCalendarView'
import { PersonalAbsencesDashboardView } from './components/PersonalAbsencesDashboardView'
import UpdateEmployeeEntitlements from '@/business-apps/hr/core/forms/update-employee-entitlements'
import {
  cancelEmployeeAbsence,
  type CancelEmployeeAbsenceSnapshot
} from '@/business-apps/hr/absences/utils/cancelEmployeeAbsence'
import { isApprovedAbsenceStatus } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

type PersonalAbsencesProps = BusinessAppContextProps & {
  employeeIdOverride?: string
  embedded?: boolean
}

export const PersonalAbsences = (props: PersonalAbsencesProps) => {
  const { t } = useTranslation(personalAbsencesTranslations)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(dayjs())
  const [selectedStartDate, setSelectedStartDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<dayjs.Dayjs | null>(null)
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [isEntitlementsModalOpen, setIsEntitlementsModalOpen] = useState(false)
  const [hasHrBackoffice, setHasHrBackoffice] = useState(false)
  const [isFetchingGroups, setIsFetchingGroups] = useState(true)
  const [cancellingAbsenceId, setCancellingAbsenceId] = useState<string | null>(null)

  const { accessToken, userInfo } = props
  const employeeId = props.employeeIdOverride ?? userInfo?.employeeDetails?.employeeId
  const client = useGraphQLClient(accessToken)
  const userManagementClient = useRestClient(env('NEXT_PUBLIC_USER_MANAGEMENT_API') || '')

  const data = usePersonalAbsencesData(accessToken, employeeId)
  const {
    employee,
    absenceEntitlements,
    absences,
    displayEntitlements,
    ytdAbsentDays,
    ytdTotalWorkingDays,
    loading,
    error,
    employeeLoading,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    pendingRequests,
    upcomingAbsences,
    nextHoliday,
    typeOptions,
    filteredAbsences,
    paginatedAbsences,
    totalPages,
    refetchEntitlements,
    refetchAbsences,
    markAbsenceCancelled,
    markAbsenceInCancellation
  } = data
  const { effectiveDates, allowWeekendPaintingInFallback } = useAbsenceEffectiveDates(
    client,
    employee?.id,
    calendarDate
  )
  const nonWorkingDates = useEmployeeWeeklySchedule(accessToken, employee?.id, calendarDate)

  const wellness = useWellnessInsight(absences, displayEntitlements, ytdAbsentDays, ytdTotalWorkingDays, accessToken)
  const { wellnessDataSummary, wellnessInsight, wellnessLoading, wellnessRequested, requestWellnessAnalysis } = wellness
  const isSelfView = !!(
    employeeId &&
    userInfo?.employeeDetails?.employeeId &&
    employeeId === userInfo.employeeDetails.employeeId
  )
  const canAddEntitlements = !isFetchingGroups && hasHrBackoffice && !isSelfView

  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        if (!userInfo?.id || !accessToken) return
        const json = await userManagementClient.get<any>(`/users/${userInfo.id}/groups`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        const arr = Array.isArray(json?.data) ? json.data : []
        setHasHrBackoffice(arr.some((g: any) => String(g?.name || '').toLowerCase() === 'all-hr-backoffice'))
      } catch {
      } finally {
        setIsFetchingGroups(false)
      }
    }
    fetchUserGroups()
  }, [userInfo?.id, accessToken, userManagementClient])

  useEffect(() => {
    if (!employee?.id || !accessToken) return
    fetchHolidayDates(client, employee.id, calendarDate.year(), calendarDate.month(), getCurrentActiveUserLocale())
      .then(dates => setHolidayDates(dates))
      .catch(() => {})
  }, [employee?.id, accessToken, calendarDate, client])

  const handleCancelAbsence = async (employeeAbsence: CancelEmployeeAbsenceSnapshot): Promise<boolean> => {
    setCancellingAbsenceId(employeeAbsence.id)
    const requiresManagerApproval = isApprovedAbsenceStatus(employeeAbsence.status)
    const managerId =
      employee?.employeePosition?.supervisor?.id || employee?.employeePosition?.supervisorEmployeeId || null
    const payload = {
      ...employeeAbsence,
      employeeId: employeeAbsence.employeeId || employee?.id || '',
      approverId: employeeAbsence.approverId || managerId
    }

    try {
      if (requiresManagerApproval && !payload.approverId) {
        toast.error(t('request-cancellation-no-manager'))
        return false
      }

      await cancelEmployeeAbsence(accessToken, payload)

      if (requiresManagerApproval) {
        markAbsenceInCancellation(employeeAbsence.id)
        toast.success(t('request-cancellation-success'))
        refetchAbsences()
        globalThis.setTimeout(refetchAbsences, 3000)
        return true
      }

      markAbsenceCancelled(employeeAbsence.id)
      toast.success(t('cancel-request-success'))
      globalThis.setTimeout(refetchAbsences, 3000)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : t('cancel-request-error')
      toast.error(message)
      return false
    } finally {
      setCancellingAbsenceId(null)
    }
  }

  if (showCalendar && employee && absenceEntitlements) {
    return (
      <>
        <PersonalAbsencesCalendarView
          accessToken={accessToken || ''}
          employee={employee}
          absenceEntitlements={absenceEntitlements}
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          selectedStartDate={selectedStartDate}
          setSelectedStartDate={setSelectedStartDate}
          selectedEndDate={selectedEndDate}
          setSelectedEndDate={setSelectedEndDate}
          holidayDates={holidayDates}
          onBackToDashboard={() => setShowCalendar(false)}
          t={t}
          absences={absences}
          loading={loading}
          error={error}
          effectiveDates={effectiveDates ?? undefined}
          allowWeekendPaintingInFallback={allowWeekendPaintingInFallback}
          nonWorkingDates={!effectiveDates ? (nonWorkingDates ?? undefined) : undefined}
          embedded={props.embedded}
        />
        <Dialog open={isEntitlementsModalOpen} onOpenChange={open => setIsEntitlementsModalOpen(open)}>
          <DialogContent
            className="gba:h-screen gba:max-h-screen gba:!rounded-none gba:!bg-card"
            data-testid="employee-entitlements-update-modal"
          >
            <UpdateEmployeeEntitlements
              accessToken={accessToken}
              additionalData={{ employeeId: employee?.id }}
              onCancel={() => setIsEntitlementsModalOpen(false)}
              onSubmit={() => {
                setIsEntitlementsModalOpen(false)
                refetchEntitlements?.()
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  const isLoading = loading || employeeLoading

  return (
    <>
      <PersonalAbsencesDashboardView
        onShowCalendar={() => setShowCalendar(true)}
        employeeId={employee?.id}
        isLoading={isLoading}
        displayEntitlements={displayEntitlements}
        otherEntitlements={data.otherEntitlements}
        ytdAbsentDays={ytdAbsentDays}
        ytdTotalWorkingDays={ytdTotalWorkingDays}
        wellnessInsight={wellnessInsight}
        wellnessLoading={wellnessLoading}
        wellnessDataSummary={wellnessDataSummary}
        wellnessRequested={wellnessRequested}
        onRequestWellnessAnalysis={requestWellnessAnalysis}
        pendingRequests={pendingRequests}
        upcomingAbsences={upcomingAbsences}
        nextHoliday={nextHoliday}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        typeOptions={typeOptions}
        filteredAbsences={filteredAbsences}
        paginatedAbsences={paginatedAbsences}
        totalPages={totalPages}
        error={error}
        t={t}
        embedded={props.embedded}
        canAddEntitlements={canAddEntitlements}
        onAddEntitlement={() => setIsEntitlementsModalOpen(true)}
        onCancelAbsence={handleCancelAbsence}
        cancellingAbsenceId={cancellingAbsenceId}
        accessToken={accessToken}
      />
      <Dialog open={isEntitlementsModalOpen} onOpenChange={open => setIsEntitlementsModalOpen(open)}>
        <DialogContent
          className="gba:h-screen gba:max-h-screen gba:!rounded-none gba:!bg-card"
          data-testid="employee-entitlements-update-modal"
        >
          <UpdateEmployeeEntitlements
            accessToken={accessToken}
            additionalData={{ employeeId: employee?.id }}
            onCancel={() => setIsEntitlementsModalOpen(false)}
            onSubmit={() => {
              setIsEntitlementsModalOpen(false)
              refetchEntitlements?.()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PersonalAbsences
