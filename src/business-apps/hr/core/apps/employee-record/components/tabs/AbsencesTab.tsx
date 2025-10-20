import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Tabs } from 'antd'
import { CalendarOutlined, UnorderedListOutlined, PaperClipOutlined } from '@ant-design/icons'
import isBetween from 'dayjs/plugin/isBetween'
import weekday from 'dayjs/plugin/weekday'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import updateLocale from 'dayjs/plugin/updateLocale'

// Register dayjs plugins
dayjs.extend(isBetween)
dayjs.extend(weekday)
dayjs.extend(weekOfYear)
dayjs.extend(customParseFormat)
dayjs.extend(updateLocale)

import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionMenu } from '@/components/app-action-menu'
import { PiPencilSimple } from 'react-icons/pi'

// Import extracted components and utilities
import { AbsencesTabProps } from '../../queries/types'
import { useAbsenceData } from '../../hooks/useAbsenceData'
import AbsenceCalendar from './components/AbsenceCalendar'
import AbsenceList from './components/AbsenceList'
import Entitlements from './components/Entitlements'
import AbsenceCharts from './components/AbsenceCharts'

/**
 * Absences Tab Component
 * Displays absence entitlements, history, and calendar for the employee
 */
const AbsencesTab: React.FC<AbsencesTabProps> = ({ employee, employeeAbsenceEntitlement, accessToken, shownTab }) => {
  const [activeTab, setActiveTab] = useState<string>(shownTab ?? 'calendar')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  // Calendar state
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [selectedStartDate, setSelectedStartDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<dayjs.Dayjs | null>(null)

  // Use custom hook for data fetching
  const { absenceList, entitlements, loading, error, refetch } = useAbsenceData(
    employee?.id,
    accessToken,
    employeeAbsenceEntitlement
  )

  // Check for locale changes periodically
  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    const interval = setInterval(checkLocale, 1000) // Check every second
    return () => clearInterval(interval)
  }, [currentLocale])

  // Handle tab change
  const onTabChange = (key: string) => {
    setActiveTab(key)
  }

  useEffect(() => {
    if (shownTab) {
      setActiveTab(shownTab)
    }
  }, [shownTab])

  // Refresh absence data (and thus charts) after process completion events
  useEffect(() => {
    const lastRefetchAt = { current: 0 } as { current: number }

    const handler = (event: any) => {
      try {
        const resolution = event?.detail?.resolution || event?.detail?.response?.detail?.resolution
        const isSuccess = resolution === 'success'
        const hasAbsencePayload = !!(
          event?.detail?.response?.employeeAbsence || event?.detail?.payload?.employeeAbsence
        )
        if (isSuccess || hasAbsencePayload) {
          const now = Date.now()
          if (now - lastRefetchAt.current < 2000) {
            return
          }
          lastRefetchAt.current = now
          refetch?.()
        }
      } catch {
        // no-op
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(name => window.addEventListener(name, handler))
    return () => {
      eventNames.forEach(name => window.removeEventListener(name, handler))
    }
  }, [refetch])

  const tabsItems = [
    {
      key: 'calendar',
      label: (
        <span className="gba:tabLabel">
          <CalendarOutlined className="gba:tabIcon" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar', 'Calendar')}
        </span>
      ),
      children: (
        <div className="gba:calendarContainer" data-testid="absencehub-calendar-container">
          <AbsenceCalendar
            absenceList={absenceList}
            loading={loading}
            error={error}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedStartDate={selectedStartDate}
            setSelectedStartDate={setSelectedStartDate}
            selectedEndDate={selectedEndDate}
            setSelectedEndDate={setSelectedEndDate}
          />
        </div>
      )
    },
    {
      key: 'absence-list',
      label: (
        <span className="gba:tabLabel">
          <UnorderedListOutlined className="gba:tabIcon" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absence_list', 'Absence List')}
        </span>
      ),
      children: (
        <div className="gba:absenceList" data-testid="absencehub-absence-list">
          <AbsenceList
            absenceList={absenceList}
            loading={loading}
            error={error}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        </div>
      )
    },
    {
      key: 'entitlements',
      label: (
        <span className="gba:tabLabel">
          <PaperClipOutlined className="gba:tabIcon" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.entitlements', 'Entitlements')}
        </span>
      ),
      children: (
        <div className="gba:entitlements-content">
          <Entitlements entitlements={entitlements} loading={loading} error={error} />
        </div>
      )
    }
  ].filter(item => (shownTab ? item.key === shownTab : true))

  // tabsItems prepared above based on shownTab

  // shownTab provided -> render only content of that tab

  return (
    <div className="gba:absences-tab gba:space-y-8">
      {/* Absence Overview Headline with Action Button */}
      {!shownTab && (
        <div className="gba:flex gba:justify-between gba:items-start" data-testid="absencehub-header">
          <div className="gba:absence-header">
            <div className="gba:font-bold gba:text-2xl" data-testid="absencehub-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.absence_overview', 'Absence Overview')}
            </div>
            <div className="gba:text-muted-foreground gba:text-lg" data-testid="absencehub-description">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.absence_description',
                'View and manage your absences'
              )}
            </div>
          </div>

          {/* Request Absence Button */}
          <div>
            <AppActionMenu
              data-testid="employee-absence-request-button"
              contextsArray={[FlowContextName.employeeAbsenceRecord]}
              externalContextData={{
                employeeId: employee.id,
                absenceType: employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A001')?.type?.id,
                flowType: 'vacation',
                startDate: selectedStartDate?.format('YYYY-MM-DD'),
                endDate: selectedEndDate?.format('YYYY-MM-DD')
              }}
              prefixDataTestId="employee-absence-request"
              accessToken={accessToken}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <PiPencilSimple className="gba:h-5 gba:w-5" />
                Request Absence
              </div>
            </AppActionMenu>
          </div>
        </div>
      )}

      {/* Absence Charts Section */}
      <AbsenceCharts
        key={`absence-charts-${currentLocale}`}
        entitlements={entitlements}
        absenceList={absenceList}
        loading={loading}
        error={error}
      />

      {(shownTab === 'calendar' || shownTab === 'absence-list' || shownTab === 'entitlements') && (
        <div className="gba:flex gba:justify-end gba:mt-4" data-testid="absencehub-inline-action">
          <AppActionMenu
            data-testid="employee-absence-request-inline-button"
            contextsArray={[FlowContextName.employeeAbsenceRecord]}
            externalContextData={{
              employeeId: employee.id,
              absenceType: employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A001')?.type?.id,
              flowType: 'vacation',
              startDate: selectedStartDate?.format('YYYY-MM-DD'),
              endDate: selectedEndDate?.format('YYYY-MM-DD')
            }}
            prefixDataTestId="employee-absence-request-inline"
            accessToken={accessToken}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
              <PiPencilSimple className="gba:h-5 gba:w-5" />
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')}
            </div>
          </AppActionMenu>
        </div>
      )}

      {/* Absence Hub Integration */}
      <div className="gba:absence-hub-integration" data-testid="absence-hub-integration">
        {shownTab ? (
          <div className="gba:tabsContainer" data-testid="absencehub-tabs-container">
            {tabsItems[0]?.children}
          </div>
        ) : (
          <div className="gba:tabsContainer" data-testid="absencehub-tabs-container">
            <Tabs
              activeKey={activeTab}
              data-testid="absencehub-tabs"
              items={tabsItems}
              onChange={onTabChange}
              className="gba:tabs"
              type="card"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AbsencesTab
