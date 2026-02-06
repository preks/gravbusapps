import { PageLayout } from '@newwork/nw-design-system'
import { Calendar, List, Paperclip } from 'lucide-react'
import type { AbsenceItem, StatItem, AbsenceListCardAbsence } from './types/absenceTypes'
import type { Entitlement } from './types/entitlementTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ABSENCES } from './queries/graphql'
import { getAbsenceGroups } from '@/business-apps/hr/core/forms/create-new-absence/queries/getAbsenceGroups'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

import {
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
  getCurrentActiveStructureId
} from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

import { CalendarBlankIcon } from '@phosphor-icons/react'
import { startProcess } from '@/common/utils/start-process'

import AbsencesTab from '@/business-apps/hr/core/apps/employee-record/components/tabs/AbsencesTab'
import { useEmployeeData } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData'
import { AbsenceList } from './components/absence-list-table'
import { useAbsenceTypeCatalog } from './hooks/useAbsenceTypeCatalog'
import { useEntitlementSnapshot } from './hooks/useEntitlementSnapshot'

const statusToColor = (status?: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'var(--nw-warning)'
    case 'approved':
      return 'var(--nw-success)'
    case 'rejected':
      return 'var(--nw-destructive)'
    case 'cancelled':
      return 'var(--nw-muted-foreground)'
    default:
      return 'var(--nw-muted-foreground)'
  }
}

const timeUntil = (startIso: string): string => {
  const days = dayjs(startIso).diff(dayjs(), 'day')
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return 'Started'
  return `in ${days} days`
}

export const PersonalAbsences = (props: BusinessAppContextProps) => {
  const [activeTab, setActiveTab] = useState('calendar')
  const [activeFilter, setActiveFilter] = useState('All')
  const [absenceList, setAbsenceList] = useState<AbsenceListCardAbsence[]>([])
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [stats, setStats] = useState<StatItem[]>([])
  const [upcomingAbsences, setUpcomingAbsences] = useState<AbsenceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [absenceGroups, setAbsenceGroups] = useState<any[]>([])
  const [loadingAbsenceGroups, setLoadingAbsenceGroups] = useState(false)

  const { accessToken, userInfo } = props
  const employeeId = userInfo?.employeeDetails?.employeeId
  const client = useGraphQLClient(accessToken)
  const rawStructureId = getCurrentActiveStructureId()
  const structureId = rawStructureId ?? ''

  // Catalog mapping for labels/colors
  const { mapType } = useAbsenceTypeCatalog(accessToken)
  // Snapshot entitlements (enriched via mapper)
  const { entitlements: snapshotEntitlements, stats: snapshotStats } = useEntitlementSnapshot(
    accessToken,
    employeeId || '',
    mapType
  )

  const {
    loading: employeeLoading,
    employee,
    absenceEntitlements
  } = useEmployeeData(accessToken, structureId, employeeId || '')

  useEffect(() => {
    const fetchAbsenceGroups = async () => {
      if (!accessToken) return

      setLoadingAbsenceGroups(true)
      try {
        const result = await client.request(getAbsenceGroups, {
          activeUserLocale: getCurrentActiveUserLocale()
        })
        setAbsenceGroups(result?.CatalogEntry || [])
      } catch (error) {
        console.error('Failed to fetch absence groups:', error)
      } finally {
        setLoadingAbsenceGroups(false)
      }
    }

    fetchAbsenceGroups()
  }, [accessToken, client])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    Promise.all([
      client.request(GET_EMPLOYEE_ABSENCES, {
        where: {
          employee: { id: { _eq: employeeId } },
          isDeleted: { _eq: false }
        },
        offset: 0,
        limit: 1000,
        orderBy: [{ createdAt: 'DESC' }],
        activeUserLocale: getCurrentActiveUserLocale()
      })
    ])
      .then(([absenceRes]) => {
        const absences = absenceRes?.EmployeeAbsence || []

        setAbsenceList(
          absences.map((absence: any) => ({
            type: absence.type ? getCatalogValue(absence.type) || '' : '',
            status: getAbsenceStatusLabel(absence.status),
            title: absence.type ? getCatalogValue(absence.type) || '' : '',
            startDate: absence.startDate,
            endDate: absence.endDate,
            duration: absence.workingDays ? `${absence.workingDays} ${absence.workingDays === 1 ? 'day' : 'days'}` : '',
            description: absence.description || '',
            icon: (
              <Paperclip
                className="gba:w-4 gba:h-4"
                style={{
                  color: absence.type?.objectValue?.color ? `#${absence.type.objectValue.color}` : 'var(--nw-chart-4)'
                }}
              />
            ),
            typeColor: absence.type?.objectValue?.color ? absence.type.objectValue.color : 'blue',
            statusColor: statusToColor(absence.status),
            requestDate: absence.createdAt
          }))
        )

        setUpcomingAbsences(
          absences
            .filter((a: any) => dayjs(a.startDate).isAfter(dayjs()))
            .map((a: any, idx: number) => ({
              id: a.id || idx,
              type: a.type ? getCatalogValue(a.type) || '' : '',
              icon: <Paperclip className="gba:w-4 gba:h-4" style={{ color: 'var(--nw-chart-4)' }} />,
              dates: `${dayjs(a.startDate).format('MM/DD/YYYY')} - ${dayjs(a.endDate).format('MM/DD/YYYY')}`,
              description: a.description,
              timeUntil: timeUntil(a.startDate),
              bgColor: a.type?.objectValue?.color
            }))
        )

        // Entitlements and stats are provided by the snapshot hook; state is set in a separate effect below
      })
      .catch(() => setError('Failed to load absence data.'))
      .finally(() => setLoading(false))
  }, [employeeId, accessToken])

  // Reflect snapshot entitlements/stats into component state while preserving visuals (icons/colors)
  useEffect(() => {
    if (snapshotEntitlements) {
      setEntitlements(
        snapshotEntitlements.map(ent => ({
          type: ent.type,
          color: ent.color || 'blue',
          used: ent.used,
          total: ent.total,
          pending: ent.pending,
          available: ent.available,
          icon: <Paperclip className="gba:w-4 gba:h-4" style={{ color: ent.color || 'var(--nw-chart-4)' }} />,
          checkEntitlement: undefined
        }))
      )
    }
    if (snapshotStats) {
      setStats(
        snapshotStats.map(s => ({
          ...s,
          icon: <Paperclip className="gba:w-4 gba:h-4" style={{ color: s.color || 'var(--nw-chart-4)' }} />
        })) as any
      )
    }
  }, [snapshotEntitlements, snapshotStats])

  const filterOptions = useMemo(
    () => ['All', ...Array.from(new Set(absenceList.map(a => a.type).filter(Boolean)))],
    [absenceList]
  )

  const onChange = (key: string) => {
    setActiveTab(key)
  }

  const filteredAbsenceList = useMemo(
    () => (activeFilter === 'All' ? absenceList : absenceList.filter(a => a.type === activeFilter)),
    [activeFilter, absenceList]
  )

  const paginatedAbsenceList = useMemo(
    () => filteredAbsenceList.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredAbsenceList, currentPage, pageSize]
  )

  const filteredStats = useMemo(
    () => (activeFilter === 'All' ? stats : stats.filter(s => s.title === activeFilter)),
    [activeFilter, stats]
  )

  const filteredUpcomingAbsences = useMemo(
    () => (activeFilter === 'All' ? upcomingAbsences : upcomingAbsences.filter(a => a.type === activeFilter)),
    [activeFilter, upcomingAbsences]
  )

  const getAbsenceGroupDisplayValue = useCallback((absenceGroup: any) => {
    const translation = absenceGroup.translations?.find((t: any) => t.localeCode === getCurrentActiveUserLocale())
    return translation?.value || absenceGroup.id
  }, [])

  const getProcessNameForAbsenceGroup = useCallback(
    (absenceGroupId: string): string => {
      const processMapping: { [key: string]: string } = {
        'sick-leave': 'createEmployeeSickLeave',
        'special-leave': 'createEmployeeSpecialLeave',
        vacation: 'createEmployeeVacation',
        'work-leave': 'createEmployeeWorkLeave'
      }

      const absenceGroup = absenceGroups.find(group => group.id === absenceGroupId)
      if (absenceGroup) {
        const displayName = getAbsenceGroupDisplayValue(absenceGroup).toLowerCase()

        if (displayName.includes('sick') || displayName.includes('illness')) {
          return 'createEmployeeSickLeave'
        } else if (displayName.includes('special') || displayName.includes('personal')) {
          return 'createEmployeeSpecialLeave'
        } else if (
          displayName.includes('vacation') ||
          displayName.includes('holiday') ||
          displayName.includes('annual')
        ) {
          return 'createEmployeeVacation'
        } else if (
          displayName.includes('work') ||
          displayName.includes('training') ||
          displayName.includes('conference')
        ) {
          return 'createEmployeeWorkLeave'
        }
      }

      return processMapping[absenceGroupId] || 'createEmployeeVacation'
    },
    [absenceGroups, getAbsenceGroupDisplayValue]
  )

  const handleCreateAbsence = useCallback(
    (absenceType: string) => {
      const processName = getProcessNameForAbsenceGroup(absenceType)

      startProcess({
        domain: 'employee-time',
        processName: processName,
        payload: { employeeId: employeeId, absenceType: absenceType },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [getProcessNameForAbsenceGroup, employeeId]
  )

  const createAbsenceMenuItems = useCallback(() => {
    return absenceGroups.map(group => ({
      key: group.id,
      label: getAbsenceGroupDisplayValue(group),
      onClick: () => handleCreateAbsence(group.id)
    }))
  }, [absenceGroups])

  const viewOptions = [
    {
      key: 'calendar',
      icon: <Calendar className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar', 'Calendar')
    },
    {
      key: 'absence-list',
      icon: <List className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absence_list', 'Absence List')
    },
    {
      key: 'entitlements',
      icon: <Paperclip className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.entitlements', 'Entitlements')
    }
  ]

  const renderTabContent = useCallback(() => {
    if (loading || employeeLoading) {
      return (
        <div className="gba:loading" data-testid="personal-absences-loading">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.loading', 'Loading...')}
        </div>
      )
    }

    if (error) {
      return (
        <div className="gba:error" data-testid="personal-absences-error">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.error_loading', 'Failed to load absence data.')}
        </div>
      )
    }

    switch (activeTab) {
      case 'calendar':
      case 'entitlements':
        if (employee && absenceEntitlements) {
          return (
            <AbsencesTab
              employee={employee as any}
              employeeAbsenceEntitlement={absenceEntitlements}
              accessToken={accessToken || ''}
              shownTab={activeTab}
              userInfo={userInfo}
              isSelfView={true}
            />
          )
        }
        return null

      case 'absence-list':
        if (employeeId && accessToken) {
          return <AbsenceList {...props} employeeId={employeeId} />
        }
        return null

      default:
        return null
    }
  }, [
    loading,
    error,
    activeTab,
    absenceList,
    filterOptions,
    activeFilter,
    setActiveFilter,
    setCurrentPage,
    loadingAbsenceGroups,
    absenceGroups.length,
    createAbsenceMenuItems,
    props.accessToken,
    props.userInfo,
    filteredAbsenceList,
    paginatedAbsenceList,
    currentPage,
    pageSize,
    entitlements,
    filteredStats,
    filteredUpcomingAbsences,
    employeeLoading
  ])

  return (
    <div data-testid="personal-absences-container">
      <PageLayout
        headerIcon={CalendarBlankIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.absence_overview', 'Absence Overview')}
        headerSubViews={{
          value: activeTab,
          onValueChange: onChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto gba:p-4" data-testid="personal-absences-content">
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  )
}

export default PersonalAbsences
