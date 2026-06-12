import { useMemo, useState } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { AbsenceListDisplay } from './components/AbsenceListDisplay'
import dayjs, { Dayjs } from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import { useGetEmployeeCalendarDays, CalendarLikeAbsence } from './hooks/useGetEmployeeCalendarDays'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import calendarIcon from '@/assets/icons/calendarIcon.svg'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { getAbsenceStatusLabel, getAbsenceStatusConfig } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { useAbsenceTypeCatalog } from '../../hooks/useAbsenceTypeCatalog'
dayjs.extend(weekday)
dayjs.extend(localeData)
dayjs.extend(isSameOrAfter)

interface AbsenceCalendarProps extends BusinessAppContextProps {
  showIconTitle?: boolean
  showTabsSwitch?: boolean
  filterOptions?: string[]
  activeFilter?: string
  onFilterChange?: (filter: string) => void
}

const AbsenceCalendar: React.FC<AbsenceCalendarProps> = ({
  showIconTitle = true,
  showTabsSwitch = true,
  filterOptions,
  activeFilter,
  ...props
}) => {
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [upcomingPageSize, setUpcomingPageSize] = useState(10)
  const [pastPage, setPastPage] = useState(1)
  const [pastPageSize, setPastPageSize] = useState(10)
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs())

  const { userInfo, accessToken } = props
  const employeeId = userInfo?.employeeDetails?.employeeId

  const { absences, loading, error } = useGetEmployeeCalendarDays({
    employeeId,
    accessToken,
    month: calendarValue
  })

  // Catalog mapping for labels/colors
  const { mapType } = useAbsenceTypeCatalog(accessToken)

  const now = useMemo(() => dayjs(), [])

  const mapAbsence = (absence: CalendarLikeAbsence) => {
    // Localize label/color using catalog mapping
    const code = absence.type?.value
    const mapped = code ? mapType(code) : undefined
    let tagColor: string | undefined = mapped?.color
    const objectValue = absence.type?.objectValue
    if (!tagColor && objectValue && typeof objectValue.color === 'string') {
      tagColor = `#${objectValue.color.replace(/^#/, '')}`
    }
    const originalStatus = absence.status || ''
    return {
      id: absence.id,
      startDate: absence.startDate,
      endDate: absence.endDate,
      type: mapped?.label || absence.type.value,
      status: getAbsenceStatusLabel(originalStatus), // Translated status
      originalStatus: originalStatus, // Keep original status for color logic
      tagColor,
      description: absence.description || ''
    }
  }

  const mappedAbsences = Array.isArray(absences) ? absences.map(mapAbsence) : []

  const filteredAbsences = useMemo(() => {
    if (!Array.isArray(absences)) return []
    if (filterOptions && activeFilter && activeFilter !== 'All') {
      return mappedAbsences.filter(a => a.type === activeFilter)
    }
    return mappedAbsences
  }, [absences, mappedAbsences, filterOptions, activeFilter])

  const upcomingAbsences = useMemo(
    () =>
      filteredAbsences
        .filter(absence => absence.endDate && dayjs(absence.endDate).isSameOrAfter(now, 'day'))
        .sort((sDate, eDate) => {
          const startDate = dayjs(sDate.startDate ?? '').valueOf()
          const endDate = dayjs(eDate.endDate ?? '').valueOf()
          return startDate - endDate
        }),
    [filteredAbsences, now]
  )

  const pastAbsences = useMemo(
    () =>
      filteredAbsences
        .filter(absence => absence.endDate && dayjs(absence.endDate).isBefore(now, 'day'))
        .sort((sDate, eDate) => {
          const endDate = dayjs(eDate.endDate ?? '').valueOf()
          const startDate = dayjs(sDate.startDate ?? '').valueOf()
          return endDate - startDate
        }),
    [filteredAbsences, now]
  )

  const getAbsencesForDate = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    return filteredAbsences.filter(absence => {
      if (!absence.startDate || !absence.endDate) return false
      const startDate = dayjs(absence.startDate).format('YYYY-MM-DD')
      const endDate = dayjs(absence.endDate).format('YYYY-MM-DD')
      return dateStr >= startDate && dateStr <= endDate
    })
  }

  const renderCalendarDay = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    const items = getAbsencesForDate(date)
    const isCurrentMonth = date.isSame(calendarValue, 'month')
    const isToday = date.isSame(dayjs(), 'day')

    return (
      <div
        key={dateStr}
        className={`gba:min-h-24 gba:border gba:border-border gba:p-2 ${isCurrentMonth ? 'gba:bg-card' : 'gba:bg-muted/40'} ${isToday ? 'gba:ring-2 gba:ring-primary' : ''}`}
        data-testid={`absence-calendar-day-${dateStr}`}
      >
        <div className="gba:mb-1 gba:text-sm gba:font-medium">{date.format('D')}</div>
        {items.length > 0 && (
          <ul className="gba:flex gba:flex-col gba:gap-1" data-testid={`absence-calendar-cell-list-${dateStr}`}>
            {items.map(item => {
              const statusType = getAbsenceStatusConfig(item.originalStatus).type

              return (
                <li key={item.id} data-testid={`absence-calendar-cell-list-item-${item.id}`}>
                  <Badge
                    variant={statusType === 'rejected' ? 'destructive' : statusType === 'pending' ? 'warning' : 'secondary'}
                    className="gba:w-full gba:justify-start gba:truncate"
                  >
                    <span className="gba:absence-calendar-type">{item.type}</span>
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  const renderCalendarGrid = () => {
    const startDate = calendarValue.startOf('month').startOf('week')
    const endDate = calendarValue.endOf('month').endOf('week')
    const days: Dayjs[] = []
    let currentDate = startDate

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      days.push(currentDate)
      currentDate = currentDate.add(1, 'day')
    }

    return (
      <div className="gba:absence-calendar gba:overflow-hidden gba:rounded-lg gba:border gba:border-border">
        <div className="gba:grid gba:grid-cols-7 gba:bg-muted gba:text-center gba:text-sm gba:font-semibold">
          {dayjs.weekdaysShort().map(day => (
            <div key={day} className="gba:p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="gba:grid gba:grid-cols-7">{days.map(renderCalendarDay)}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:absence-calendar-loading" data-testid="absence-calendar-loading">
        Loading absences...
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:absence-calendar-error" data-testid="absence-calendar-error">
        Error loading absences.
      </div>
    )
  }

  const handlePrevMonth = () => setCalendarValue(prev => prev.subtract(1, 'month'))
  const handleNextMonth = () => setCalendarValue(prev => prev.add(1, 'month'))
  const handleToday = () => setCalendarValue(dayjs())

  return (
    <div className={showIconTitle ? 'gba:absence-calendar-root' : ''} data-testid="absence-calendar-root">
      {showIconTitle && (
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6" data-testid="absence-calendar-header">
          <img
            src={calendarIcon}
            alt="Calendar Icon"
            className="gba:w-8 gba:h-8"
            data-testid="absence-calendar-header-icon"
          />
          <span className="gba:text-2xl gba:font-bold" data-testid="absence-calendar-header-title">
            My Absence Calendar
          </span>
        </div>
      )}

      {showTabsSwitch ? (
        <Tabs defaultValue="calendar" className="gba:absence-calendar-tabs">
          <TabsList>
            <TabsTrigger value="calendar">Month</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Absences</TabsTrigger>
            <TabsTrigger value="past">Past Absences</TabsTrigger>
          </TabsList>
          <TabsContent value="calendar">
            <div className="gba:calendar-controls-bar">
              <div className="gba:calendar-controls-leftbar">
                <button className="gba:calendar-toggle-btn" onClick={handlePrevMonth}>
                  <CaretLeftIcon size={16} className="gba:calendar-icon-thick" />
                </button>
                <button className="gba:calendar-today-btn" onClick={handleToday}>
                  Today
                </button>
                <button className="gba:calendar-toggle-btn" onClick={handleNextMonth}>
                  <CaretRightIcon size={16} className="gba:calendar-icon-thick" />
                </button>
                <span className="gba:calendar-toggle-group-label">{calendarValue.format('MMMM YYYY')}</span>
              </div>
            </div>
            {renderCalendarGrid()}
          </TabsContent>
          <TabsContent value="upcoming">
            <p className="gba:font-semibold gba:text-lg gba:mb-6">
              These are your upcoming absences as recorded in the system.
            </p>
            <AbsenceListDisplay
              absences={upcomingAbsences}
              title={undefined}
              page={upcomingPage}
              pageSize={upcomingPageSize}
              total={upcomingAbsences.length}
              onPageChange={(page, pageSize) => {
                setUpcomingPage(page)
                setUpcomingPageSize(pageSize)
              }}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          </TabsContent>
          <TabsContent value="past">
            <p className="gba:font-semibold gba:text-lg gba:mb-6">
              These are your past absences as recorded in the system.
            </p>
            <AbsenceListDisplay
              absences={pastAbsences}
              title={undefined}
              page={pastPage}
              pageSize={pastPageSize}
              total={pastAbsences.length}
              onPageChange={(page, pageSize) => {
                setPastPage(page)
                setPastPageSize(pageSize)
              }}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="gba:calendar-controls-bar">
            <div className="gba:calendar-controls-leftbar">
              <button className="gba:calendar-toggle-btn" onClick={handlePrevMonth}>
                <CaretLeftIcon size={16} className="gba:calendar-icon-thick" />
              </button>
              <button className="gba:calendar-today-btn" onClick={handleToday}>
                Today
              </button>
              <button className="gba:calendar-toggle-btn" onClick={handleNextMonth}>
                <CaretRightIcon size={16} className="gba:calendar-icon-thick" />
              </button>
              <span className="gba:calendar-toggle-group-label">{calendarValue.format('MMMM YYYY')}</span>
            </div>
          </div>
          {renderCalendarGrid()}
        </>
      )}
    </div>
  )
}

export default AbsenceCalendar
export { AbsenceCalendar }
