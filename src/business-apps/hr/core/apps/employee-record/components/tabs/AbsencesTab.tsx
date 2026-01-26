import React, { useState, useEffect, useCallback } from 'react'
import '@newwork/nw-design-system/style'
import dayjs from 'dayjs'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Tabs } from 'antd'
import { CalendarOutlined, UnorderedListOutlined, PaperClipOutlined } from '@ant-design/icons'
import isBetween from 'dayjs/plugin/isBetween'
import weekday from 'dayjs/plugin/weekday'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import updateLocale from 'dayjs/plugin/updateLocale'

dayjs.extend(isBetween)
dayjs.extend(weekday)
dayjs.extend(weekOfYear)
dayjs.extend(customParseFormat)
dayjs.extend(updateLocale)

import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'

import { AbsencesTabProps } from '../../queries/types'
import { useAbsenceData } from '../../hooks/useAbsenceData'
import AbsenceCalendar from './components/AbsenceCalendar'
import AbsenceList from './components/AbsenceList'
import Entitlements from './components/Entitlements'
import AbsenceCharts from './components/AbsenceCharts'
import { ContextMenuActionHandler } from './components/ContextMenuActionHandler'
import { Dialog, DialogContent } from '@newwork/nw-design-system'
import { PiPlus } from 'react-icons/pi'
import UpdateEmployeeEntitlements from '../../../../forms/update-employee-entitlements'
import { env } from '@/common/env/EnvUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchHolidayDates } from './utils/fetchHolidayDates'

const AbsencesTab: React.FC<AbsencesTabProps> = ({
  employee,
  employeeAbsenceEntitlement,
  accessToken,
  isSelfView,
  shownTab,
  userInfo
}) => {
  const userManagementClient = useRestClient(env('NEXT_PUBLIC_USER_MANAGEMENT_API') || '')
  const [activeTab, setActiveTab] = useState<string>(shownTab ?? 'calendar')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  const [currentDate, setCurrentDate] = useState(dayjs())
  const [selectedStartDate, setSelectedStartDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<dayjs.Dayjs | null>(null)
  const [isEntitlementsModalOpen, setIsEntitlementsModalOpen] = useState(false)
  const [hasHrBackoffice, setHasHrBackoffice] = useState<boolean>(false)
  const [isFetchingGroups, setIsFetchingGroups] = useState<boolean>(true)
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [contextMenuAbsenceData, setContextMenuAbsenceData] = useState<{
    absenceTypeId: string
    startDate: string
    endDate: string
    flowType: string
  } | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const startDateFormatted = selectedStartDate?.format('YYYY-MM-DD') ?? ''
  const endDateFormatted = selectedEndDate?.format('YYYY-MM-DD') ?? ''
  const baseRequestText = getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')
  const requestAbsenceLabel =
    startDateFormatted && endDateFormatted
      ? `${baseRequestText} (${startDateFormatted} - ${endDateFormatted})`
      : baseRequestText

  const { absenceList, entitlements, loading, error, refetch } = useAbsenceData(
    employee?.id,
    accessToken,
    employeeAbsenceEntitlement
  )

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    const interval = setInterval(checkLocale, 1000)
    return () => clearInterval(interval)
  }, [currentLocale])

  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        if (!userInfo?.id || !accessToken) return
        const json = await userManagementClient.get<any>(`/users/${userInfo.id}/groups`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        const arr = Array.isArray(json?.data) ? json.data : []
        const has = arr.some((g: any) => String(g?.name || '').toLowerCase() === 'all-hr-backoffice')
        setHasHrBackoffice(has)
      } catch {
      } finally {
        setIsFetchingGroups(false)
      }
    }
    fetchUserGroups()
  }, [userInfo?.id, accessToken])

  const onTabChange = (key: string) => {
    setActiveTab(key)
  }

  useEffect(() => {
    if (shownTab) {
      setActiveTab(shownTab)
    }
  }, [shownTab])

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
      } catch {}
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
            holidayDates={holidayDates}
            employeeAbsenceEntitlement={employeeAbsenceEntitlement}
            employee={employee}
            accessToken={accessToken}
            onAbsenceTypeSelect={(absenceTypeId, startDate, endDate, flowType) => {
              setContextMenuAbsenceData({ absenceTypeId, startDate, endDate, flowType })
            }}
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

  // Fetch holiday dates for the month of currentDate
  useEffect(() => {
    const loadHolidays = async () => {
      if (!employee?.id || !accessToken) return
      const locale = getCurrentActiveUserLocale()
      const dates = await fetchHolidayDates(graphqlClient, employee.id, currentDate.year(), currentDate.month(), locale)
      setHolidayDates(dates)
    }
    loadHolidays()
  }, [employee?.id, accessToken, graphqlClient, currentDate])

  // Memoize the onComplete callback to prevent unnecessary re-renders
  const handleContextMenuComplete = useCallback(() => {
    setContextMenuAbsenceData(null)
  }, [])

  return (
    <div className="gba:absences-tab gba:space-y-8">
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

          <div className="gba:flex gba:gap-4 gba:items-center gba:self-center">
            {(() => {
              return (
                <AppAction
                  variant="update-primary"
                  key={`primary-${startDateFormatted}-${endDateFormatted}`}
                  data-testid="employee-absence-request-button"
                  lazyLoad
                  emptyState="enable"
                  contexts={[
                    {
                      context: FlowContextName.employeeAbsenceRecord,
                      contextData: {
                        employeeId: employee.id,
                        absenceType: employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A001')?.type
                          ?.id,
                        flowType: 'vacation',
                        startDate: startDateFormatted,
                        endDate: endDateFormatted
                      }
                    }
                  ]}
                  prefixDataTestId="employee-absence-request"
                  accessToken={accessToken}
                >
                  {requestAbsenceLabel}
                </AppAction>
              )
            })()}

            {!isFetchingGroups && hasHrBackoffice && !isSelfView && (
              <div
                data-testid="employee-entitlements-update-button"
                className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                onClick={() => setIsEntitlementsModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setIsEntitlementsModalOpen(true)
                  }
                }}
              >
                <PiPlus className="gba:h-5 gba:w-5" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.add_entitlements', 'Add Entitlement')}
              </div>
            )}
          </div>
        </div>
      )}

      <AbsenceCharts
        key={`absence-charts-${currentLocale}`}
        entitlements={entitlements}
        absenceList={absenceList}
        loading={loading}
        error={error}
      />

      {(shownTab === 'calendar' || shownTab === 'absence-list' || shownTab === 'entitlements') && (
        <div className="gba:flex gba:justify-end gba:mt-4" data-testid="absencehub-inline-action">
          <AppAction
            variant="update-primary"
            key={`inline-${startDateFormatted}-${endDateFormatted}`}
            data-testid="employee-absence-request-inline-button"
            lazyLoad
            emptyState="enable"
            contexts={[
              {
                context: FlowContextName.employeeAbsenceRecord,
                contextData: {
                  employeeId: employee.id,
                  absenceType: employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A001')?.type?.id,
                  flowType: 'vacation',
                  startDate: startDateFormatted,
                  endDate: endDateFormatted
                }
              }
            ]}
            prefixDataTestId="employee-absence-request-inline"
            accessToken={accessToken}
          >
            {requestAbsenceLabel}
          </AppAction>
        </div>
      )}

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

      <Dialog open={isEntitlementsModalOpen} onOpenChange={open => setIsEntitlementsModalOpen(open)}>
        <DialogContent
          className="gba:h-screen gba:max-h-screen gba:!rounded-none gba:!bg-card"
          data-testid="employee-entitlements-update-modal"
        >
          <UpdateEmployeeEntitlements
            accessToken={accessToken}
            additionalData={{ employeeId: employee?.id }}
            onCancel={() => setIsEntitlementsModalOpen(false)}
            onSubmit={() => setIsEntitlementsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Context menu absence action handler */}
      {contextMenuAbsenceData && (
        <ContextMenuActionHandler
          employeeId={employee.id}
          absenceTypeId={contextMenuAbsenceData.absenceTypeId}
          flowType={contextMenuAbsenceData.flowType}
          startDate={contextMenuAbsenceData.startDate}
          endDate={contextMenuAbsenceData.endDate}
          accessToken={accessToken}
          onComplete={handleContextMenuComplete}
        />
      )}
    </div>
  )
}

export default AbsencesTab
