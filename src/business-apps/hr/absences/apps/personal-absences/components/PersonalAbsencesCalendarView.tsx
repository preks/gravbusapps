import { PageLayout, Button } from '@newwork/nw-design-system'
import { CalendarBlankIcon, CaretLeftIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getAbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import AbsenceCalendar from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/AbsenceCalendar'
import { useAbsenceData } from '@/business-apps/hr/core/apps/employee-record/hooks/useAbsenceData'
import type { AbsenceListCardAbsence } from '@/business-apps/hr/core/apps/employee-record/queries/types'
import type dayjs from 'dayjs'
import type { AbsenceRow } from '../types/personalAbsences'

type TFunction = (key: string) => string

interface PersonalAbsencesCalendarViewProps {
  accessToken: string
  employee: { id: string } & Record<string, unknown>
  absenceEntitlements: any[]
  calendarDate: dayjs.Dayjs
  setCalendarDate: (d: dayjs.Dayjs) => void
  selectedStartDate: dayjs.Dayjs | null
  setSelectedStartDate: (d: dayjs.Dayjs | null) => void
  selectedEndDate: dayjs.Dayjs | null
  setSelectedEndDate: (d: dayjs.Dayjs | null) => void
  holidayDates: string[]
  onBackToDashboard: () => void
  t: TFunction
  /** When provided, used for calendar so PENDING/in-approval absences are shown */
  absences?: AbsenceRow[]
  loading?: boolean
  error?: string | null
  effectiveDates?: Set<string>
  allowWeekendPaintingInFallback?: boolean
  nonWorkingDates?: Set<string>
  embedded?: boolean
}

function toCalendarAbsenceList(rows: AbsenceRow[], t: TFunction): (AbsenceListCardAbsence & { id: string })[] {
  return rows.map(a => {
    const workingDays = a.workingDays ?? 0
    const dayLabel = workingDays === 1 ? t('day') : t('days')
    const duration = workingDays > 0 ? `${workingDays} ${dayLabel}` : ''
    return {
      id: a.id,
      type: a.type,
      typeId: a.typeParentEntryId || '',
      originalStatus: a.originalStatus,
      status: a.status,
      title: a.type,
      startDate: a.startDate,
      endDate: a.endDate,
      duration,
      description: a.description || '',
      icon: CalendarBlankIcon,
      typeColor: a.typeColor || 'blue',
      statusColor: getAbsenceStatusConfig(a.originalStatus).color,
      requestDate: a.createdAt
    }
  })
}

export function PersonalAbsencesCalendarView({
  accessToken,
  employee,
  absenceEntitlements,
  calendarDate,
  setCalendarDate,
  selectedStartDate,
  setSelectedStartDate,
  selectedEndDate,
  setSelectedEndDate,
  holidayDates,
  onBackToDashboard,
  t,
  absences: absencesProp,
  loading: loadingProp,
  error: errorProp,
  effectiveDates,
  allowWeekendPaintingInFallback,
  nonWorkingDates,
  embedded = false
}: Readonly<PersonalAbsencesCalendarViewProps>) {
  const fallback = useAbsenceData(employee?.id, accessToken, absenceEntitlements || [])

  const useOwnAbsences = absencesProp != null
  const calendarAbsenceList = useOwnAbsences ? toCalendarAbsenceList(absencesProp, t) : fallback.absenceList
  const calendarLoading = useOwnAbsences ? (loadingProp ?? false) : fallback.loading
  const calendarError = useOwnAbsences ? (errorProp ?? null) : fallback.error

  const startDateFmt = selectedStartDate?.format('YYYY-MM-DD') ?? ''
  const endDateFmt = selectedEndDate?.format('YYYY-MM-DD') ?? ''
  const baseRequestText = t('request-absence')
  const requestAbsenceLabel =
    startDateFmt && endDateFmt ? `${baseRequestText} (${startDateFmt} - ${endDateFmt})` : baseRequestText

  const content = (
    <div className="gba:p-4 gba:space-y-4">
      <div className="gba:flex gba:justify-between gba:items-center">
        <Button variant="outline" onClick={onBackToDashboard}>
          <CaretLeftIcon className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('back-to-dashboard')}
        </Button>
        <AppAction
          variant="update-primary"
          key={`cal-action-${startDateFmt}-${endDateFmt}`}
          data-testid="calendar-absence-request-button"
          lazyLoad
          emptyState="enable"
          contexts={[
            {
              context: FlowContextName.employeeAbsenceRecord,
              contextData: {
                employeeId: employee.id,
                absenceType: absenceEntitlements.find((e: any) => e.type?.id === 'AbsenceType:v1:A001')?.type?.id,
                flowType: 'vacation',
                startDate: startDateFmt,
                endDate: endDateFmt
              }
            }
          ]}
          prefixDataTestId="calendar-absence-request"
          accessToken={accessToken}
        >
          {requestAbsenceLabel}
        </AppAction>
      </div>
      <div className="gba:calendarContainer" data-testid="absencehub-calendar-container">
        <AbsenceCalendar
          absenceList={calendarAbsenceList}
          loading={calendarLoading}
          error={calendarError}
          currentDate={calendarDate}
          setCurrentDate={setCalendarDate}
          selectedStartDate={selectedStartDate}
          setSelectedStartDate={setSelectedStartDate}
          selectedEndDate={selectedEndDate}
          setSelectedEndDate={setSelectedEndDate}
          holidayDates={holidayDates}
          employeeAbsenceEntitlement={absenceEntitlements}
          employee={employee as any}
          accessToken={accessToken}
          effectiveDates={effectiveDates}
          allowWeekendPaintingInFallback={allowWeekendPaintingInFallback}
          nonWorkingDates={nonWorkingDates}
        />
      </div>
    </div>
  )

  return (
    <div data-testid="personal-absences-container">
      {embedded ? (
        content
      ) : (
        <PageLayout headerIcon={CalendarBlankIcon} headerTitle={t('calendar')} className="gba:min-h-screen">
          {content}
        </PageLayout>
      )}
    </div>
  )
}
