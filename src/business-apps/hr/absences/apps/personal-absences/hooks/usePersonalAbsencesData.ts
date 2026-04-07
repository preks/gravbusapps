import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale, getCatalogValue, getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { startProcess } from '@/common/utils/start-process'
import { useEmployeeData } from '@/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { usePublicHolidays } from '@/business-apps/hr/absences/hooks/usePublicHolidays'
import { calculateWorkingDays } from '@/business-apps/hr/core/forms/create-new-absence/utils/workingDaysCalculator'
import { employeeWorkingHoursQuery } from '@/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences'
import { GET_EMPLOYEE_ABSENCES } from '../queries/graphql'
import { getAbsenceGroups } from '@/business-apps/hr/core/forms/create-new-absence/queries/getAbsenceGroups'
import { useAbsenceTypeCatalog } from './useAbsenceTypeCatalog'
import { useEntitlementSnapshot } from './useEntitlementSnapshot'
import type { AbsenceRow } from '../types/personalAbsences'
import dayjs from 'dayjs'

const PAGE_SIZE = 10

type PersonalAbsenceEntitlement = {
  type: {
    id: string
    value: string
    objectValue?: {
      color?: string
      display?: boolean
    }
  }
  approved: number
  pending: number
  total: number
  available?: number
  validFrom: string
  validTo?: string | null
}

export function usePersonalAbsencesData(accessToken: string | undefined, employeeId: string | undefined) {
  const client = useGraphQLClient(accessToken)
  const rawStructureId = getCurrentActiveStructureId()
  const structureId = rawStructureId ?? ''

  const [absences, setAbsences] = useState<AbsenceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [absenceGroups, setAbsenceGroups] = useState<any[]>([])
  const [refreshTick, setRefreshTick] = useState(0)
  const [workingHours, setWorkingHours] = useState<any>(null)

  const { mapType } = useAbsenceTypeCatalog(accessToken)
  const { entitlements: rawSnapshotEntitlements, refetch: refetchSnapshot } = useEntitlementSnapshot(
    accessToken,
    employeeId || '',
    mapType
  )

  const snapshotEntitlements = useMemo(
    () =>
      (rawSnapshotEntitlements || []).map(ent => {
        const mapped = mapType(ent.typeRef || ent.type)
        return {
          ...ent,
          type: mapped?.label || ent.type,
          color: mapped?.color || ent.color,
          display: mapped?.display ?? true
        }
      }),
    [rawSnapshotEntitlements, mapType]
  )

  const {
    loading: employeeLoading,
    employee,
    absenceEntitlements,
    refetch: refetchEmployeeData
  } = useEmployeeData(accessToken || '', structureId, employeeId || '')

  const baseEntitlements = useMemo(() => {
    const currentYear = dayjs().year()
    const yearStart = dayjs(`${currentYear}-01-01`).startOf('day')
    const yearEnd = dayjs(`${currentYear}-12-31`).endOf('day')
    const entitlementMap = new Map<
      string,
      {
        type: string
        typeRef: string
        color?: string
        used: number
        total: number
        pending: number
        available: number
        display: boolean
      }
    >()

    ;(absenceEntitlements as PersonalAbsenceEntitlement[]).forEach(entitlement => {
      if (!entitlement?.type?.id || !entitlement.validFrom) {
        return
      }

      const validFrom = dayjs(entitlement.validFrom)
      const validTo = entitlement.validTo ? dayjs(entitlement.validTo) : null
      const overlapsCurrentYear =
        validFrom.isSameOrBefore(yearEnd) && (validTo === null || validTo.isSameOrAfter(yearStart))

      if (!overlapsCurrentYear) {
        return
      }

      const typeRef = entitlement.type.id
      const mapped = mapType(typeRef)
      const existing = entitlementMap.get(typeRef)
      const total = Number(entitlement.total) || 0
      const used = Number(entitlement.approved) || 0
      const pending = Number(entitlement.pending) || 0
      const available = Number(entitlement.available) || Math.max(0, total - used - pending)

      if (existing) {
        existing.total += total
        existing.used += used
        existing.pending += pending
        existing.available += available
        return
      }

      entitlementMap.set(typeRef, {
        type: mapped?.label || entitlement.type.value || typeRef,
        typeRef,
        color: mapped?.color || entitlement.type.objectValue?.color,
        used,
        total,
        pending,
        available,
        display: mapped?.display ?? entitlement.type.objectValue?.display ?? true
      })
    })

    return Array.from(entitlementMap.values())
  }, [absenceEntitlements, mapType])

  const mergedEntitlements = useMemo(() => {
    if (!baseEntitlements.length) {
      return snapshotEntitlements
    }

    const mergedByType = new Map(baseEntitlements.map(entitlement => [entitlement.typeRef, entitlement]))

    snapshotEntitlements.forEach(snapshotEntitlement => {
      const typeRef = snapshotEntitlement.typeRef || snapshotEntitlement.type
      const fallbackEntitlement = mergedByType.get(typeRef)

      mergedByType.set(typeRef, {
        ...fallbackEntitlement,
        ...snapshotEntitlement,
        typeRef,
        type: snapshotEntitlement.type || fallbackEntitlement?.type || typeRef,
        color: snapshotEntitlement.color || fallbackEntitlement?.color,
        display: snapshotEntitlement.display === true || fallbackEntitlement?.display === true
      })
    })

    return Array.from(mergedByType.values())
  }, [baseEntitlements, snapshotEntitlements])

  useProcessCompletion({
    onSuccess: () => {
      if (refetchSnapshot) refetchSnapshot()
      if (refetchEmployeeData) refetchEmployeeData()
      setRefreshTick(t => t + 1)
    }
  })

  const { holidays: publicHolidays } = usePublicHolidays({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  useEffect(() => {
    if (!employeeId || !accessToken) return
    client
      .request(employeeWorkingHoursQuery, { employeeId })
      .then((res: any) => {
        const wh = res?.employee?.[0]?.workingHours
        if (!wh) {
          setWorkingHours(null)
          return
        }
        const hasAnyHours = [
          wh.mondayHours,
          wh.tuesdayHours,
          wh.wednesdayHours,
          wh.thursdayHours,
          wh.fridayHours,
          wh.saturdayHours,
          wh.sundayHours
        ].some(h => h != null && h > 0)
        setWorkingHours(hasAnyHours ? wh : null)
      })
      .catch(() => {})
  }, [employeeId, accessToken, client])

  useEffect(() => {
    if (!accessToken) return
    client
      .request(getAbsenceGroups, { activeUserLocale: getCurrentActiveUserLocale() })
      .then((res: any) => setAbsenceGroups(res?.CatalogEntry || []))
      .catch(() => {})
  }, [accessToken, client])

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    client
      .request(GET_EMPLOYEE_ABSENCES, {
        where: { employee: { id: { _eq: employeeId } }, isDeleted: { _eq: false } },
        offset: 0,
        limit: 1000,
        orderBy: [{ createdAt: 'DESC' }],
        activeUserLocale: getCurrentActiveUserLocale()
      })
      .then((res: any) => {
        const rows = (res?.EmployeeAbsence || []).map((a: any) => ({
          id: a.id,
          type: a.type ? getCatalogValue(a.type) || '' : '',
          typeColor: a.type?.objectValue?.color || '6366f1',
          typeParentEntryId: a.type?.parentEntryId || '',
          startDate: a.startDate,
          endDate: a.endDate,
          status: getAbsenceStatusLabel(a.status),
          originalStatus: a.status || '',
          workingDays: a.workingDays ?? 0,
          description: a.description || '',
          createdAt: a.createdAt
        }))
        setAbsences(rows)
      })
      .catch(() => setError('Failed to load absence data.'))
      .finally(() => setLoading(false))
  }, [employeeId, accessToken, refreshTick, client])

  const getAbsenceGroupDisplayValue = useCallback((group: any) => {
    const tr = group.translations?.find((t: any) => t.localeCode === getCurrentActiveUserLocale())
    return tr?.value || group.id
  }, [])

  const getProcessName = useCallback(
    (groupId: string): string => {
      const map: Record<string, string> = {
        'sick-leave': 'createEmployeeSickLeave',
        'special-leave': 'createEmployeeSpecialLeave',
        vacation: 'createEmployeeVacation',
        'work-leave': 'createEmployeeWorkLeave'
      }
      const group = absenceGroups.find(g => g.id === groupId)
      if (group) {
        const name = getAbsenceGroupDisplayValue(group).toLowerCase()
        const idValue = String(group.id || '').toLowerCase()
        const combined = `${idValue} ${name}`

        // Check special leave first so "Sonderurlaub" is not misclassified as vacation by "urlaub".
        if (
          combined.includes('special') ||
          combined.includes('personal') ||
          combined.includes('sonderurlaub') ||
          combined.includes('concediu special')
        ) {
          return 'createEmployeeSpecialLeave'
        }

        if (
          combined.includes('sick') ||
          combined.includes('illness') ||
          combined.includes('krank') ||
          combined.includes('medical') ||
          combined.includes('boala') ||
          combined.includes('concediu medical')
        ) {
          return 'createEmployeeSickLeave'
        }

        if (
          combined.includes('work') ||
          combined.includes('training') ||
          combined.includes('arbeitsbezogen') ||
          combined.includes('beruf') ||
          combined.includes('business') ||
          combined.includes('serviciu') ||
          combined.includes('munca')
        ) {
          return 'createEmployeeWorkLeave'
        }

        if (
          combined.includes('vacation') ||
          combined.includes('holiday') ||
          combined.includes('annual') ||
          combined.includes('urlaub') ||
          combined.includes('concediu') ||
          combined.includes('odihna')
        ) {
          return 'createEmployeeVacation'
        }
      }
      return map[groupId] || 'createEmployeeVacation'
    },
    [absenceGroups, getAbsenceGroupDisplayValue]
  )

  const handleCreateAbsence = useCallback(
    (absenceType: string) => {
      startProcess({
        domain: 'employee-time',
        processName: getProcessName(absenceType),
        payload: { employeeId, absenceType },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [getProcessName, employeeId]
  )

  const pendingRequests = useMemo(() => absences.filter(a => a.originalStatus === 'PENDING'), [absences])

  const upcomingAbsences = useMemo(
    () =>
      absences
        .filter(a => dayjs(a.startDate).isAfter(dayjs()) && a.originalStatus === 'APPROVED')
        .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))
        .slice(0, 5),
    [absences]
  )

  const nextHoliday = useMemo(() => {
    const today = dayjs()
    let closest: { name: string; date: dayjs.Dayjs } | null = null
    for (const h of publicHolidays) {
      const code = h.alternativeCode || h.code || ''
      if (!code || code.length !== 8) continue
      const y = code.slice(0, 4)
      const m = code.slice(4, 6)
      const d = code.slice(6, 8)
      const hDate = dayjs(`${y}-${m}-${d}`)
      if (!hDate.isValid() || !hDate.isAfter(today)) continue
      const name = (h as any).translations?.[0]?.value || h.value || ''
      if (!closest || hDate.isBefore(closest.date)) {
        closest = { name, date: hDate }
      }
    }
    return closest
  }, [publicHolidays])

  const typeOptions = useMemo(() => Array.from(new Set(absences.map(a => a.type).filter(Boolean))), [absences])

  const filteredAbsences = useMemo(() => {
    let list = absences
    if (statusFilter !== 'all') list = list.filter(a => a.originalStatus === statusFilter)
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter)
    return list.sort((a, b) => dayjs(b.startDate).diff(dayjs(a.startDate)))
  }, [absences, statusFilter, typeFilter])

  const totalPages = Math.ceil(filteredAbsences.length / PAGE_SIZE)
  const paginatedAbsences = filteredAbsences.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const displayEntitlements = useMemo(() => mergedEntitlements.filter(e => e.display), [mergedEntitlements])

  const otherEntitlements = useMemo(
    () => mergedEntitlements.filter(e => !e.display && e.used > 0),
    [mergedEntitlements]
  )

  const ytdAbsentDays = useMemo(() => {
    const year = dayjs().year()
    return absences
      .filter(a => a.originalStatus === 'APPROVED' && dayjs(a.startDate).year() === year)
      .reduce((sum, a) => sum + (a.workingDays || 0), 0)
  }, [absences])

  const ytdTotalWorkingDays = useMemo(() => {
    const yearStart = new Date(dayjs().year(), 0, 1)
    const yearEnd = new Date(dayjs().year(), 11, 31)
    return calculateWorkingDays(yearStart, yearEnd, {
      holidays: publicHolidays,
      excludeWeekends: true,
      workingHours
    })
  }, [publicHolidays, workingHours])

  return {
    absences,
    loading,
    error,
    employeeLoading,
    employee,
    absenceEntitlements,
    absenceGroups,
    workingHours,
    publicHolidays,
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
    totalPages,
    paginatedAbsences,
    displayEntitlements,
    otherEntitlements,
    ytdAbsentDays,
    ytdTotalWorkingDays,
    getAbsenceGroupDisplayValue,
    handleCreateAbsence,
    pageSize: PAGE_SIZE,
    refetchEntitlements: refetchSnapshot
  }
}
