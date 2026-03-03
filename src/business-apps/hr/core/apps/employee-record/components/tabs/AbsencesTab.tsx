import React, { useState, useEffect } from 'react'
import '@newwork/nw-design-system/style'
import dayjs from 'dayjs'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent } from '@newwork/nw-design-system'
import { CalendarIcon, ListIcon, PaperclipIcon } from 'lucide-react'
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
import { PiPlus } from 'react-icons/pi'
import UpdateEmployeeEntitlements from '../../../../forms/update-employee-entitlements'
import { env } from '@/common/env/EnvUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ENTITLEMENTS_SNAPSHOT_FOR_YEAR } from '@/business-apps/hr/absences/apps/personal-absences/queries/graphql'
import { fetchHolidayDates } from './utils/fetchHolidayDates'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useAbsenceEffectiveDates } from '../../hooks/useAbsenceEffectiveDates'
import { useEmployeeWeeklySchedule } from '../../hooks/useEmployeeWeeklySchedule'

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
  const graphqlClient = useGraphQLClient(accessToken)
  const A001_TYPE_REF = 'AbsenceType:v1:A001'
  const [annualLeaveOverride, setAnnualLeaveOverride] = useState<{
    total: number
    used: number
    pending: number
    available: number
  } | null>(null)
  const [snapshotByType, setSnapshotByType] = useState<
    Record<string, { total: number; usedApproved: number; usedPending: number; remaining: number }>
  >({})
  const [refreshTick, setRefreshTick] = useState(0)

  const startDateFormatted = selectedStartDate?.format('YYYY-MM-DD') ?? ''
  const endDateFormatted = selectedEndDate?.format('YYYY-MM-DD') ?? ''
  const baseRequestText = getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')
  const requestAbsenceLabel =
    startDateFormatted && endDateFormatted
      ? `${baseRequestText} (${startDateFormatted} - ${endDateFormatted})`
      : baseRequestText
  const canAddEntitlements = !isFetchingGroups && hasHrBackoffice && !isSelfView

  const { absenceList, entitlements, loading, error, refetch } = useAbsenceData(
    employee?.id,
    accessToken,
    employeeAbsenceEntitlement
  )

  // Refresh tab data and snapshot when a related process completes successfully
  useProcessCompletion({
    onSuccess: () => {
      refetch?.()
      setRefreshTick(t => t + 1)
    }
  })

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

  // Fetch Annual Leave (A001) entitlement snapshot for the full current year and aggregate windows
  useEffect(() => {
    interface EntitlementSnapshotRow {
      typeRef: string
      totalEntitlement?: number | string
      usedApproved?: number | string
      usedPending?: number | string
      remaining?: number | string
      periodStart?: string
      periodEnd?: string
    }

    const fetchAnnualLeaveSnapshot = async () => {
      try {
        if (!graphqlClient || !employee?.id) return
        const year = currentDate.year()
        const yearStart = dayjs(`${year}-01-01`).format('YYYY-MM-DD')
        const yearEnd = dayjs(`${year}-12-31`).format('YYYY-MM-DD')

        const res: {
          EntitlementUsageSnapshotView?: EntitlementSnapshotRow[]
          entitlement_usage_snapshot_view?: EntitlementSnapshotRow[]
        } = await graphqlClient.request(GET_ENTITLEMENTS_SNAPSHOT_FOR_YEAR, {
          employeeId: employee.id,
          yearStart,
          yearEnd
        })

        const rows: EntitlementSnapshotRow[] =
          res?.EntitlementUsageSnapshotView || res?.entitlement_usage_snapshot_view || []

        // Aggregate all rows per typeRef for Entitlements tab and donut use
        const byType = new Map<
          string,
          { total: number; usedApproved: number; usedPending: number; remaining: number }
        >()
        rows.forEach(r => {
          const key = r?.typeRef
          if (!key) return
          const acc = byType.get(key) || { total: 0, usedApproved: 0, usedPending: 0, remaining: 0 }
          acc.total += Number(r?.totalEntitlement) || 0
          acc.usedApproved += Number(r?.usedApproved) || 0
          acc.usedPending += Number(r?.usedPending) || 0
          // remaining is per-window; recompute after summing components to avoid drift
          byType.set(key, acc)
        })
        // Recompute remaining per type after summation
        byType.forEach(v => {
          v.remaining = Math.max(0, v.total - v.usedApproved - v.usedPending)
        })
        setSnapshotByType(Object.fromEntries(byType))

        // Derive A001 override from aggregated map
        const a = byType.get(A001_TYPE_REF)
        if (a) {
          setAnnualLeaveOverride({
            total: a.total,
            used: a.usedApproved,
            pending: a.usedPending,
            available: a.remaining
          })
        } else {
          setAnnualLeaveOverride(null)
        }
      } catch (err) {
        // Gracefully fall back to existing entitlement values; non-fatal
        if (process?.env?.NODE_ENV !== 'production') {
          console.warn('Annual leave snapshot fetch failed', err)
        }
        setAnnualLeaveOverride(null)
        setSnapshotByType({})
      }
    }

    fetchAnnualLeaveSnapshot()
  }, [graphqlClient, employee?.id, currentDate, refreshTick])

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

  // Debounce timestamp for process completion handling
  const lastRefetchAt = React.useRef(0)

  // Determine if an incoming event represents a successful process completion
  const isProcessSuccessEvent = (event: any): boolean => {
    const resolution = event?.detail?.resolution || event?.detail?.response?.detail?.resolution
    const hasAbsencePayload = !!(event?.detail?.response?.employeeAbsence || event?.detail?.payload?.employeeAbsence)
    return resolution === 'success' || hasAbsencePayload
  }

  // Stable handler to avoid deep nesting in effects
  const handleProcessEvent = React.useCallback(
    (event: any) => {
      try {
        if (!isProcessSuccessEvent(event)) return
        const now = Date.now()
        if (now - lastRefetchAt.current < 2000) return
        lastRefetchAt.current = now
        refetch?.()
        // Also bump refreshTick so Annual Leave snapshot useEffect re-runs
        setRefreshTick(t => t + 1)
      } catch {}
    },
    [refetch]
  )

  useEffect(() => {
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

    // Resolve targets using globalThis.window to satisfy static analysis
    const targets: Window[] = []
    const win = (globalThis as any).window as Window | undefined
    if (win) {
      targets.push(win)
      try {
        const parent = win.parent && win.parent !== win ? win.parent : undefined
        const top = win.top && win.top !== win && win.top !== parent ? win.top : undefined
        if (parent) targets.push(parent)
        if (top) targets.push(top)
      } catch {
        // ignore cross-origin access errors
      }
    }

    targets.forEach(t => {
      eventNames.forEach(name => t.addEventListener(name, handleProcessEvent as EventListener))
    })

    return () => {
      targets.forEach(t => {
        eventNames.forEach(name => t.removeEventListener(name, handleProcessEvent as EventListener))
      })
    }
  }, [handleProcessEvent])

  // Merge Annual Leave snapshot override (A001) into entitlements without affecting other types
  const ANNUAL_LABEL_HINTS = ['annual', 'vacation', 'holiday'] as const

  const mergedEntitlements = React.useMemo(() => {
    if (!annualLeaveOverride) return entitlements
    const matchAnnual = (label: string) => {
      const l = (label || '').toLowerCase()
      return ANNUAL_LABEL_HINTS.some(h => l.includes(h))
    }
    const a001Applied = entitlements.map(e =>
      matchAnnual(e.type)
        ? {
            ...e,
            used: annualLeaveOverride.used,
            total: annualLeaveOverride.total,
            pending: annualLeaveOverride.pending,
            available: annualLeaveOverride.available
          }
        : e
    )
    const withTypeIdApplied = a001Applied.map(e => {
      const snap = snapshotByType[e.typeId]
      return snap
        ? { ...e, used: snap.usedApproved, total: snap.total, pending: snap.usedPending, available: snap.remaining }
        : e
    })
    const hasAnnual = withTypeIdApplied.some(e => matchAnnual(e.type) || (e.typeId || '').includes('A001'))
    if (!hasAnnual) {
      return [
        ...withTypeIdApplied,
        {
          type: 'Annual Leave',
          used: annualLeaveOverride.used,
          total: annualLeaveOverride.total,
          pending: annualLeaveOverride.pending,
          available: annualLeaveOverride.available,
          color: '2F80ED',
          icon: undefined,
          typeId: A001_TYPE_REF,
          checkEntitlement: undefined
        } as any
      ]
    }
    return withTypeIdApplied
  }, [entitlements, annualLeaveOverride, snapshotByType])

  const { effectiveDates, allowWeekendPaintingInFallback } = useAbsenceEffectiveDates(
    graphqlClient,
    employee?.id,
    currentDate
  )
  const nonWorkingDates = useEmployeeWeeklySchedule(accessToken, employee?.id, currentDate)

  const tabsItems = [
    {
      key: 'calendar',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar', 'Calendar'),
      icon: <CalendarIcon className="gba:h-4 gba:w-4" />,
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
            effectiveDates={effectiveDates ?? undefined}
            allowWeekendPaintingInFallback={allowWeekendPaintingInFallback}
            nonWorkingDates={!effectiveDates ? (nonWorkingDates ?? undefined) : undefined}
          />
        </div>
      )
    },
    {
      key: 'absence-list',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absence_list', 'Absence List'),
      icon: <ListIcon className="gba:h-4 gba:w-4" />,
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
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.entitlements', 'Entitlements'),
      icon: <PaperclipIcon className="gba:h-4 gba:w-4" />,
      children: (
        <div className="gba:entitlements-content">
          <Entitlements entitlements={mergedEntitlements} loading={loading} error={error} />
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

  // Non-working dates derived from weekly schedule are now provided by useEmployeeWeeklySchedule

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

            {canAddEntitlements && (
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
        entitlements={mergedEntitlements}
        absenceList={absenceList}
        loading={loading}
        error={error}
      />

      {(shownTab === 'calendar' || shownTab === 'absence-list' || shownTab === 'entitlements') && (
        <div className="gba:flex gba:justify-end gba:mt-4" data-testid="absencehub-inline-action">
          <div className="gba:flex gba:items-center gba:gap-4">
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
            {shownTab === 'entitlements' && canAddEntitlements && (
              <div
                data-testid="employee-entitlements-update-inline-button"
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

      <div className="gba:absence-hub-integration" data-testid="absence-hub-integration">
        {shownTab ? (
          <div className="gba:tabsContainer" data-testid="absencehub-tabs-container">
            {tabsItems[0]?.children}
          </div>
        ) : (
          <div className="gba:tabsContainer" data-testid="absencehub-tabs-container">
            <Tabs value={activeTab} onValueChange={onTabChange} className="gba:w-full">
              <TabsList className="gba:w-full gba:justify-start">
                {tabsItems.map(item => (
                  <TabsTrigger key={item.key} value={item.key} startIcon={item.icon} className="gba:text-sm">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabsItems.map(item => (
                <TabsContent key={item.key} value={item.key}>
                  {item.children}
                </TabsContent>
              ))}
            </Tabs>
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
    </div>
  )
}

export default AbsencesTab
