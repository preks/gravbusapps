import { useMemo, useState } from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Calendar, Tag, Typography, Tabs } from 'antd'
import { AbsenceListDisplay } from './components/AbsenceListDisplay'
import dayjs, { Dayjs } from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import { useGetEmployeeAbsences, EmployeeAbsence } from './hooks/useGetEmployeeAbsences'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import calendarIcon from '@/assets/icons/calendarIcon.svg'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
dayjs.extend(weekday)
dayjs.extend(localeData)
dayjs.extend(isSameOrAfter)

const { Paragraph } = Typography
const { TabPane } = Tabs

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
  onFilterChange,
  ...props
}) => {
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [upcomingPageSize, setUpcomingPageSize] = useState(10)
  const [pastPage, setPastPage] = useState(1)
  const [pastPageSize, setPastPageSize] = useState(10)
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs())

  const { userInfo, accessToken } = props
  const employeeId = userInfo?.employeeDetails?.employeeId

  const { absences, loading, error } = useGetEmployeeAbsences({
    employeeId,
    accessToken
  })

  const now = useMemo(() => dayjs(), [])

  const mapAbsence = (absence: EmployeeAbsence) => {
    let tagColor: string | undefined = undefined
    const objectValue =
      absence.type && typeof absence.type === 'object' && 'objectValue' in absence.type
        ? (absence.type as any).objectValue
        : undefined
    if (objectValue && typeof objectValue.color === 'string') {
      tagColor = `#${objectValue.color.replace(/^#/, '')}`
    }
    return {
      id: absence.id,
      startDate: absence.startDate,
      endDate: absence.endDate,
      type: absence.type.value,
      status: absence.status || '',
      tagColor,
      description: absence.description || ''
    }
  }

  const mappedAbsences = Array.isArray(absences) ? absences.map(mapAbsence) : []

  const filteredAbsences =
    Array.isArray(absences) && filterOptions && activeFilter && activeFilter !== 'All'
      ? mappedAbsences.filter(a => a.type === activeFilter)
      : mappedAbsences

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

  const dateCellRender = (value: any) => {
    const dateStr = value.format('YYYY-MM-DD')
    const items = filteredAbsences.filter(
      absence => absence.startDate && absence.endDate && dateStr >= absence.startDate && dateStr <= absence.endDate
    )
    return items.length ? (
      <ul data-testid={`absence-calendar-cell-list-${dateStr}`}>
        {items.map(item => (
          <li key={item.id} data-testid={`absence-calendar-cell-list-item-${item.id}`}>
            <Tag
              color={item.tagColor || (item.status === 'Approved' ? 'green' : 'orange')}
              className={`gba:absence-calendar-tag${item.status === 'PENDING' ? ' gba:absence-pending' : ''}`}
            >
              <div className="gba:absence-calendar-type">{item.type}</div>
            </Tag>
          </li>
        ))}
      </ul>
    ) : null
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
        <Tabs defaultActiveKey="calendar" className="gba:absence-calendar-tabs">
          <TabPane tab="Month" key="calendar">
            <div className="gba:calendar-controls-bar">
              <div className="gba:calendar-controls-leftbar">
                <button className="gba:calendar-toggle-btn" onClick={handlePrevMonth}>
                  <LeftOutlined className="gba:calendar-icon-thick" />
                </button>
                <button className="gba:calendar-today-btn" onClick={handleToday}>
                  Today
                </button>
                <button className="gba:calendar-toggle-btn" onClick={handleNextMonth}>
                  <RightOutlined className="gba:calendar-icon-thick" />
                </button>
                <span className="gba:calendar-toggle-group-label">{calendarValue.format('MMMM YYYY')}</span>
              </div>
            </div>
            <Calendar
              className="gba:absence-calendar"
              cellRender={dateCellRender}
              fullscreen={true}
              value={calendarValue}
              onPanelChange={setCalendarValue}
              onChange={setCalendarValue}
              headerRender={() => null}
            />
          </TabPane>
          <TabPane tab="Upcoming Absences" key="upcoming">
            <Paragraph className="gba:font-semibold gba:text-lg gba:mb-6">
              These are your upcoming absences as recorded in the system.
            </Paragraph>
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
          </TabPane>
          <TabPane tab="Past Absences" key="past">
            <Paragraph className="gba:font-semibold gba:text-lg gba:mb-6">
              These are your past absences as recorded in the system.
            </Paragraph>
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
          </TabPane>
        </Tabs>
      ) : (
        <>
          <div className="gba:calendar-controls-bar">
            <div className="gba:calendar-controls-leftbar">
              <button className="gba:calendar-toggle-btn" onClick={handlePrevMonth}>
                <LeftOutlined className="gba:calendar-icon-thick" />
              </button>
              <button className="gba:calendar-today-btn" onClick={handleToday}>
                Today
              </button>
              <button className="gba:calendar-toggle-btn" onClick={handleNextMonth}>
                <RightOutlined className="gba:calendar-icon-thick" />
              </button>
              <span className="gba:calendar-toggle-group-label">{calendarValue.format('MMMM YYYY')}</span>
            </div>
          </div>
          <Calendar
            className="gba:absence-calendar"
            cellRender={dateCellRender}
            fullscreen={true}
            value={calendarValue}
            onPanelChange={setCalendarValue}
            onChange={setCalendarValue}
            headerRender={() => null}
          />
        </>
      )}
    </div>
  )
}

export default AbsenceCalendar
export { AbsenceCalendar }
