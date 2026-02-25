import { PageLayout, Button } from '@newwork/nw-design-system'
import { CalendarBlankIcon, CaretLeftIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import AbsenceCalendar from '@/business-apps/hr/core/apps/employee-record/components/tabs/components/AbsenceCalendar'
import { useAbsenceData } from '@/business-apps/hr/core/apps/employee-record/hooks/useAbsenceData'
import type dayjs from 'dayjs'

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
  t
}: PersonalAbsencesCalendarViewProps) {
  const {
    absenceList: calendarAbsenceList,
    loading: calendarLoading,
    error: calendarError
  } = useAbsenceData(employee?.id, accessToken, absenceEntitlements || [])

  const startDateFmt = selectedStartDate?.format('YYYY-MM-DD') ?? ''
  const endDateFmt = selectedEndDate?.format('YYYY-MM-DD') ?? ''
  const baseRequestText = t('request-absence')
  const requestAbsenceLabel =
    startDateFmt && endDateFmt ? `${baseRequestText} (${startDateFmt} - ${endDateFmt})` : baseRequestText

  return (
    <div data-testid="personal-absences-container">
      <PageLayout headerIcon={CalendarBlankIcon} headerTitle={t('calendar')} className="gba:min-h-screen">
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
          />
        </div>
      </PageLayout>
    </div>
  )
}
