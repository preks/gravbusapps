import { useState, useCallback, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import { useTranslation } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale, getDateFormat } from '@/common/utils/windowUtils'
import formsTranslations from '@/business-apps/hr/core/forms/_i18n'
import { useAbsenceTypeDetails } from './useAbsenceTypeDetails'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  calculateWorkingDays,
  extractHalfDayDates,
  calculateDateRangeBreakdown,
  type HolidayEntry,
  type DateRangeBreakdown,
  type WorkingHours
} from '../utils/workingDaysCalculator'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
import {
  getEmployeeAbsences,
  getEmployeeAbsenceEntitlement,
  getTodayAbsences,
  latestEntitlementSnapshotForRangeQuery,
  employeeRegionLookupQuery,
  employmentRegionHolidayByDateQuery,
  employmentRegionHolidaysInRangeQuery,
  employeeWorkingHoursQuery
} from '../queries/getEmployeeAbsences'
import { resolveEmploymentRegionRef } from '../utils/employmentRegion'

export interface AbsenceValidationError {
  type: 'overlap' | 'balance' | 'general'
  message: string
  details?: any
}

export interface EmployeeAbsence {
  id: string
  employeeId: string
  typeRef: string
  startDate: string
  endDate: string
  status: string
  description?: string
  balanceUsed?: number
  substituteEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  }
  version?: number
  type?: {
    id: string
    parentEntryId: string
    objectValue?: any
    translations: { value: string; localeCode: string }[]
  }
}

export interface EmployeeAbsenceEntitlement {
  id: string
  employeeId: string
  available: number
  pending: number
  approved: number
  total: number
  validFrom: string
  validTo: string
  type?: {
    id: string
    objectValue?: any
  }
}

/** Up-to-date balance from EntitlementUsageSnapshotView (GetLatestEntitlementSnapshotForRange). */
export interface EntitlementSnapshotForBalance {
  totalEntitlement: number
  usedApproved: number
  usedPending: number
  remaining: number
  snapshotAt: string
}

type ResolvedBalanceDetails = {
  effectiveAvailable: number
  totalBalance: number
  approvedBalance: number
  pendingBalance: number
}

type RequestedDaysCalculation = {
  requestedDays: number
  breakdown: DateRangeBreakdown
}

const resolveBalanceDetails = (
  snapshot: EntitlementSnapshotForBalance | null,
  entitlement: EmployeeAbsenceEntitlement | null
): ResolvedBalanceDetails | null => {
  if (snapshot != null) {
    return {
      effectiveAvailable: Math.max(0, snapshot.remaining),
      totalBalance: snapshot.totalEntitlement,
      approvedBalance: snapshot.usedApproved,
      pendingBalance: snapshot.usedPending
    }
  }

  if (entitlement == null) {
    return null
  }

  return {
    effectiveAvailable: Math.max(0, entitlement.total - entitlement.approved - entitlement.pending),
    totalBalance: entitlement.total,
    approvedBalance: entitlement.approved,
    pendingBalance: entitlement.pending
  }
}

const calculateRequestedDaysWithBreakdown = (
  measurement: string | undefined,
  newStartDate: Date,
  newEndDate: Date,
  holidaysToUse: HolidayEntry[],
  workingHours: WorkingHours | null
): RequestedDaysCalculation => {
  const breakdown = calculateDateRangeBreakdown(newStartDate, newEndDate, holidaysToUse, workingHours)
  if (measurement === 'WorkingDays') {
    const halfDayDates = extractHalfDayDates(holidaysToUse, newStartDate, newEndDate)
    return {
      requestedDays: calculateWorkingDays(newStartDate, newEndDate, {
        holidays: holidaysToUse,
        excludeWeekends: true,
        halfDayDates,
        workingHours
      }),
      breakdown
    }
  }

  return {
    requestedDays: breakdown.effectiveDays - breakdown.holidays.length - breakdown.halfDays.length * 0.5,
    breakdown
  }
}

type BuildBalanceMessageArgs = {
  roundedRequestedDays: number
  effectiveAvailable: number
  measurement: string | undefined
  holidaysToUse: HolidayEntry[]
  newStartDate: Date
  newEndDate: Date
  requestedDays: number
  workingHours: WorkingHours | null
  t: (key: string, values?: Record<string, unknown>) => string
}

const buildInsufficientBalanceMessage = ({
  roundedRequestedDays,
  effectiveAvailable,
  measurement,
  holidaysToUse,
  newStartDate,
  newEndDate,
  requestedDays,
  workingHours,
  t
}: BuildBalanceMessageArgs): string => {
  const insufficientBalanceLabel = t('create-absence-insufficient-balance')
  const requestedLabel = t('create-absence-requested')
  const availableLabel = t('create-absence-available')
  const daysLabel = t('create-absence-days')
  let message = `${insufficientBalanceLabel}. ${requestedLabel}: ${roundedRequestedDays} ${daysLabel}, ${availableLabel}: ${effectiveAvailable} ${daysLabel}`

  if (measurement !== 'WorkingDays' || holidaysToUse.length === 0) {
    return message
  }

  const weekdaysOnly = calculateWorkingDays(newStartDate, newEndDate, {
    holidays: [],
    excludeWeekends: true,
    halfDayDates: new Set(),
    workingHours
  })
  const excludedHolidayDays = Math.round((weekdaysOnly - requestedDays) * 100) / 100
  if (excludedHolidayDays > 0) {
    message += `. ${t('create-absence-bank-holidays-not-counted', { count: excludedHolidayDays })}`
  }

  return message
}

export interface UseAbsenceValidationProps {
  accessToken: string
  employeeId: string
  selectedType: string
  startDate?: Date
  endDate?: Date
  context: BusinessAppContextProps
}

/**
 * Extracts priority from an absence type's objectValue.
 * Lower numbers indicate higher priority (e.g., priority 5 > priority 10).
 * Returns 999 as default (lowest priority) if no priority is found.
 */
export const extractPriority = (objectValue: unknown): number => {
  if (!objectValue) return 999

  if (typeof objectValue === 'string') {
    try {
      const parsed = JSON.parse(objectValue)
      return typeof parsed?.priority === 'number' ? parsed.priority : 999
    } catch {
      return 999
    }
  }

  if (typeof objectValue === 'object' && objectValue !== null) {
    const obj = objectValue as Record<string, unknown>
    return typeof obj?.priority === 'number' ? obj.priority : 999
  }

  return 999
}

export const useAbsenceValidation = ({
  accessToken,
  employeeId,
  selectedType,
  startDate,
  endDate,
  context
}: UseAbsenceValidationProps) => {
  const { t } = useTranslation(formsTranslations)
  const client = useGraphQLClient(accessToken)
  const [validationErrors, setValidationErrors] = useState<AbsenceValidationError[]>([])
  const [validationWarnings, setValidationWarnings] = useState<AbsenceValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [existingAbsences, setExistingAbsences] = useState<EmployeeAbsence[]>([])
  const [absenceEntitlement, setAbsenceEntitlement] = useState<EmployeeAbsenceEntitlement | null>(null)
  const [entitlementSnapshot, setEntitlementSnapshot] = useState<EntitlementSnapshotForBalance | null>(null)
  const [todayAbsences, setTodayAbsences] = useState<EmployeeAbsence[]>([])
  const [existingSickLeave, setExistingSickLeave] = useState<EmployeeAbsence | null>(null)
  const [employeeRegionRef, setEmployeeRegionRef] = useState<string | null>(null)
  const [holidays] = useState<HolidayEntry[]>([])
  const [dateRangeBreakdown, setDateRangeBreakdown] = useState<DateRangeBreakdown | null>(null)
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null)
  const [isCheckingBankHoliday, setIsCheckingBankHoliday] = useState(false)
  const bankHolidayCacheRef = useRef<Record<string, boolean>>({})
  const rangeHolidaysCacheRef = useRef<Record<string, HolidayEntry[]>>({})

  const { details: absenceTypeDetails } = useAbsenceTypeDetails(context, selectedType)

  const isSickLeaveType = useCallback((absence: EmployeeAbsence): boolean => {
    return absence.type?.parentEntryId === 'AbsenceGroup:v1:HEALTH'
  }, [])

  useEffect(() => {
    if (!accessToken || !employeeId) {
      setTodayAbsences([])
      setExistingSickLeave(null)
      return
    }

    const fetchTodayAbsences = async () => {
      try {
        const today = dayjs().format('YYYY-MM-DD')

        const response = await client.request(getTodayAbsences, {
          employeeId,
          today
        })

        const absences = response?.EmployeeAbsence || []

        setTodayAbsences(absences)

        const sickLeave = absences.find(
          (absence: EmployeeAbsence) =>
            isSickLeaveType(absence) && (absence.status === 'PENDING' || absence.status === 'APPROVED')
        )

        if (sickLeave) {
          setExistingSickLeave(sickLeave)
        } else {
          setExistingSickLeave(null)
        }
      } catch {
        setTodayAbsences([])
        setExistingSickLeave(null)
      }
    }

    fetchTodayAbsences()
  }, [accessToken, employeeId, client, isSickLeaveType])

  useEffect(() => {
    if (!accessToken || !employeeId || !startDate || !endDate) {
      setExistingAbsences([])
      return
    }

    const fetchExistingAbsences = async () => {
      try {
        const startDateTimestamp = dayjs(startDate).startOf('day').subtract(1, 'day').toISOString()
        const endDateTimestamp = dayjs(endDate).endOf('day').add(1, 'day').toISOString()

        const response = await client.request(getEmployeeAbsences, {
          employeeId,
          startDate: startDateTimestamp,
          endDate: endDateTimestamp
        })
        const absences = response?.EmployeeAbsence || []

        setExistingAbsences(absences)
      } catch {
        setExistingAbsences([])
      }
    }

    fetchExistingAbsences()
  }, [accessToken, employeeId, startDate, endDate, client])

  useEffect(() => {
    if (!accessToken || !employeeId) {
      setEmployeeRegionRef(null)
      return
    }

    const fetchRegion = async () => {
      try {
        const activeLocale = getCurrentActiveUserLocale()
        const res = await client.request(employeeRegionLookupQuery, {
          employeeId,
          activeUserLocale: activeLocale
        })
        setEmployeeRegionRef(resolveEmploymentRegionRef(res))
      } catch {
        setEmployeeRegionRef(null)
      }
    }

    const fetchWorkingHours = async () => {
      try {
        const workingHoursRes = await client.request(employeeWorkingHoursQuery, {
          employeeId
        })
        const workingHoursData: WorkingHours | null = workingHoursRes?.employee?.[0]?.workingHours?.[0] || null
        setWorkingHours(workingHoursData)
      } catch {
        setWorkingHours(null)
      }
    }

    fetchRegion()
    fetchWorkingHours()
  }, [accessToken, employeeId, client])

  useEffect(() => {
    if (!accessToken || !employeeId || !selectedType) {
      setAbsenceEntitlement(null)
      return
    }

    const shouldCheckEntitlement = absenceTypeDetails?.objectValue?.checkEntitlement === true

    if (!shouldCheckEntitlement) {
      setAbsenceEntitlement(null)
      setEntitlementSnapshot(null)
      return
    }

    const fetchEntitlementAndSnapshot = async () => {
      try {
        const now = dayjs()
        const fromStr = now.startOf('year').format('YYYY-MM-DD')
        const toStr = now.endOf('year').format('YYYY-MM-DD')

        const [entitlementResponse, snapshotResponse] = await Promise.all([
          client.request(getEmployeeAbsenceEntitlement, {
            employeeId,
            typeRef: selectedType
          }),
          client.request(latestEntitlementSnapshotForRangeQuery, {
            employeeId,
            typeRef: selectedType,
            from: fromStr,
            to: toStr
          })
        ])

        const entitlements = entitlementResponse?.EmployeeAbsenceEntitlement || []
        const validEntitlement = entitlements.find((entitlement: EmployeeAbsenceEntitlement) => {
          const validFrom = dayjs(entitlement.validFrom)
          const validTo = dayjs(entitlement.validTo)
          return now.isSameOrAfter(validFrom) && now.isSameOrBefore(validTo)
        })
        setAbsenceEntitlement(validEntitlement || null)

        const snapshotRow = snapshotResponse?.EntitlementUsageSnapshotView?.[0]
        if (snapshotRow) {
          setEntitlementSnapshot({
            totalEntitlement: Number(snapshotRow.totalEntitlement) || 0,
            usedApproved: Number(snapshotRow.usedApproved) || 0,
            usedPending: Number(snapshotRow.usedPending) || 0,
            remaining: Number(snapshotRow.remaining) || 0,
            snapshotAt: snapshotRow.snapshotAt
          })
        } else {
          setEntitlementSnapshot(null)
        }
      } catch {
        setAbsenceEntitlement(null)
        setEntitlementSnapshot(null)
      }
    }

    fetchEntitlementAndSnapshot()
  }, [accessToken, employeeId, selectedType, client, absenceTypeDetails])

  const checkOverlapValidation = useCallback(
    (newStartDate: Date, newEndDate: Date): AbsenceValidationError[] => {
      const errors: AbsenceValidationError[] = []

      if (!selectedType || !absenceTypeDetails) {
        return errors
      }

      if (!existingAbsences.length) {
        return errors
      }

      const newStart = dayjs(newStartDate)
      const newEnd = dayjs(newEndDate)

      const newPriority = extractPriority(absenceTypeDetails?.objectValue)

      for (const absence of existingAbsences) {
        if (absence.status === 'CANCELLED' || absence.status === 'REJECTED') {
          continue
        }

        const existingStart = dayjs(absence.startDate).startOf('day')
        const existingEnd = dayjs(absence.endDate).endOf('day')
        const normalizedNewStart = newStart.startOf('day')
        const normalizedNewEnd = newEnd.endOf('day')

        const hasOverlap =
          normalizedNewStart.isSameOrBefore(existingEnd) && normalizedNewEnd.isSameOrAfter(existingStart)

        if (hasOverlap) {
          let absenceTypeName = absence.typeRef

          if (absence.type?.translations && absence.type.translations.length > 0) {
            const currentLocale = getCurrentActiveUserLocale()
            const localeTranslation = absence.type.translations.find(t => t.localeCode === currentLocale)
            absenceTypeName = localeTranslation?.value || absence.type.translations[0].value
          }

          const existingPriority = extractPriority(absence.type?.objectValue)

          if (newPriority >= existingPriority) {
            errors.push({
              type: 'overlap',
              message: `${t('create-absence-overlap-prefix')} ${absenceTypeName} ${t('create-absence-overlap-scheduled')} ${t('create-absence-from')} ${existingStart.format(
                getDateFormat('date-long')
              )} ${t('create-absence-to')} ${existingEnd.format(getDateFormat('date-long'))}.`,
              details: {
                conflictingAbsence: absence,
                conflictingDates: {
                  start: absence.startDate,
                  end: absence.endDate
                },
                absenceType: absenceTypeName,
                existingPriority,
                newPriority
              }
            })
          }
        }
      }

      return errors
    },
    [selectedType, existingAbsences, absenceTypeDetails, t]
  )

  type BalanceValidationResult = {
    errors: AbsenceValidationError[]
    warnings: AbsenceValidationError[]
  }

  const checkBalanceValidation = useCallback(
    (newStartDate: Date, newEndDate: Date, holidaysForRange?: HolidayEntry[]): BalanceValidationResult => {
      const warnings: AbsenceValidationError[] = []
      const errors: AbsenceValidationError[] = []

      const shouldCheckEntitlement = absenceTypeDetails?.objectValue?.checkEntitlement === true

      if (!shouldCheckEntitlement) {
        return { errors, warnings }
      }

      const balanceDetails = resolveBalanceDetails(entitlementSnapshot, absenceEntitlement)
      if (balanceDetails == null) {
        warnings.push({
          type: 'balance',
          message: t('create-absence-unable-to-verify-balance'),
          details: { reason: 'no_entitlement_info' }
        })
        return { errors, warnings }
      }

      const holidaysToUse = holidaysForRange ?? holidays
      const measurement = absenceTypeDetails?.objectValue?.measurement
      const { requestedDays, breakdown } = calculateRequestedDaysWithBreakdown(
        measurement,
        newStartDate,
        newEndDate,
        holidaysToUse,
        workingHours
      )
      setDateRangeBreakdown(breakdown)

      const roundedRequestedDays = Math.round(requestedDays * 100) / 100
      const { effectiveAvailable, totalBalance, approvedBalance, pendingBalance } = balanceDetails

      if (roundedRequestedDays > effectiveAvailable) {
        const message = buildInsufficientBalanceMessage({
          roundedRequestedDays,
          effectiveAvailable,
          measurement,
          holidaysToUse,
          newStartDate,
          newEndDate,
          requestedDays,
          workingHours,
          t
        })
        errors.push({
          type: 'balance',
          message,
          details: {
            requestedDays: roundedRequestedDays,
            availableBalance: effectiveAvailable,
            totalBalance,
            approvedBalance,
            pendingBalance
          }
        })
      }

      return { errors, warnings }
    },
    [absenceEntitlement, entitlementSnapshot, absenceTypeDetails, holidays, workingHours, t]
  )

  const checkSingleDayBankHoliday = useCallback(
    async (startDate: Date, regionRef: string): Promise<AbsenceValidationError | null> => {
      const altCode = dayjs(startDate).format('YYYYMMDD')
      const year = dayjs(startDate).format('YYYY')
      const cacheKey = `${regionRef}:${altCode}`
      let isBankHoliday = bankHolidayCacheRef.current[cacheKey]

      if (isBankHoliday === undefined) {
        setIsCheckingBankHoliday(true)
        try {
          const activeLocale = getCurrentActiveUserLocale()
          const res = await client.request<{ holidays?: Array<{ additionalValue1?: string }> }>(
            employmentRegionHolidayByDateQuery,
            {
              activeUserLocale: activeLocale,
              regionId: regionRef,
              year,
              altCode
            }
          )
          const entries = res?.holidays || []
          const fullDayHoliday = entries.find(h => h.additionalValue1 !== '05H')
          isBankHoliday = !!fullDayHoliday
          bankHolidayCacheRef.current[cacheKey] = isBankHoliday
        } catch {
          isBankHoliday = false
          bankHolidayCacheRef.current[cacheKey] = false
        } finally {
          setIsCheckingBankHoliday(false)
        }
      }

      if (isBankHoliday) {
        return {
          type: 'general',
          message: t('create-absence-single-day-bank-holiday-blocked')
        }
      }
      return null
    },
    [client, t]
  )

  const fetchRangeHolidays = useCallback(
    async (rangeStart: Date, rangeEnd: Date, regionRef: string): Promise<HolidayEntry[]> => {
      const altCodeFrom = dayjs(rangeStart).format('YYYYMMDD')
      const altCodeTo = dayjs(rangeEnd).format('YYYYMMDD')
      const rangeCacheKey = `${regionRef}:${altCodeFrom}:${altCodeTo}`
      const cached = rangeHolidaysCacheRef.current[rangeCacheKey]
      if (cached === undefined) {
        try {
          const res = await client.request<{
            holidays?: Array<{
              id: string
              value?: string
              code?: string
              alternativeCode?: string
              additionalValue1?: string
              additionalValue2?: string
              additionalValue3?: string
            }>
          }>(employmentRegionHolidaysInRangeQuery, {
            regionId: regionRef,
            altCodeFrom,
            altCodeTo
          })
          const entries = res?.holidays || []
          const holidays = entries.map(h => ({
            id: h.id,
            value: h.value ?? '',
            code: h.code ?? '',
            alternativeCode: h.alternativeCode,
            additionalValue1: h.additionalValue1,
            additionalValue2: h.additionalValue2,
            additionalValue3: h.additionalValue3
          }))
          rangeHolidaysCacheRef.current[rangeCacheKey] = holidays
          return holidays
        } catch {
          return []
        }
      }
      return cached
    },
    [client]
  )

  const validateAbsence = useCallback(
    async (validateStartDate?: Date, validateEndDate?: Date) => {
      const validationStartDate = validateStartDate || startDate
      const validationEndDate = validateEndDate || endDate

      if (!validationStartDate || !validationEndDate || !selectedType) {
        setValidationErrors([])
        setValidationWarnings([])
        return []
      }

      if (dayjs(validationEndDate).isBefore(dayjs(validationStartDate).subtract(1, 'day'))) {
        const dateOrderError: AbsenceValidationError = {
          type: 'general',
          message: t('create-absence-end-date-after-start')
        }
        setValidationErrors([dateOrderError])
        return [dateOrderError]
      }

      setValidationWarnings([])

      const isSingleDay = dayjs(validationStartDate).isSame(dayjs(validationEndDate), 'day')
      if (isSingleDay && employeeRegionRef) {
        const bankHolidayError = await checkSingleDayBankHoliday(validationStartDate, employeeRegionRef)
        if (bankHolidayError) {
          setValidationErrors([bankHolidayError])
          return [bankHolidayError]
        }
      }

      const isRange = !dayjs(validationStartDate).isSame(dayjs(validationEndDate), 'day')
      const rangeHolidays =
        isRange && employeeRegionRef
          ? await fetchRangeHolidays(validationStartDate, validationEndDate, employeeRegionRef)
          : []

      setIsValidating(true)
      try {
        const overlapErrors = checkOverlapValidation(validationStartDate, validationEndDate)
        const { errors: balanceErrors, warnings: balanceWarnings } = checkBalanceValidation(
          validationStartDate,
          validationEndDate,
          rangeHolidays.length > 0 ? rangeHolidays : undefined
        )

        const allErrors = [...overlapErrors, ...balanceErrors]
        const allWarnings = [...balanceWarnings]
        setValidationErrors(allErrors)
        setValidationWarnings(allWarnings)

        return allErrors
      } catch (error) {
        const generalError: AbsenceValidationError = {
          type: 'general',
          message: t('create-absence-validation-failed'),
          details: { error }
        }
        setValidationErrors([generalError])
        return [generalError]
      } finally {
        setIsValidating(false)
      }
    },
    [
      startDate,
      endDate,
      selectedType,
      employeeRegionRef,
      checkSingleDayBankHoliday,
      fetchRangeHolidays,
      checkOverlapValidation,
      checkBalanceValidation,
      t
    ]
  )

  useEffect(() => {
    if (startDate && endDate && selectedType) {
      validateAbsence()
    } else {
      setValidationErrors([])
    }
  }, [startDate, endDate, selectedType, existingAbsences, validateAbsence])

  return {
    validationErrors,
    validationWarnings,
    isValidating,
    isCheckingBankHoliday,
    validateAbsence,
    hasValidationErrors: validationErrors.length > 0,
    overlapErrors: validationErrors.filter(error => error.type === 'overlap'),
    balanceErrors: validationErrors.filter(error => error.type === 'balance'),
    generalErrors: validationErrors.filter(error => error.type === 'general'),
    existingAbsences,
    absenceEntitlement,
    entitlementSnapshot,
    todayAbsences,
    existingSickLeave,
    isSickLeaveType,
    hasExistingSickLeave: existingSickLeave !== null,
    dateRangeBreakdown
  }
}
