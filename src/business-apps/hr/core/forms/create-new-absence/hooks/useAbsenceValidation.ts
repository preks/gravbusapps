import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  getDateFormat,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import { useAbsenceTypeDetails } from './useAbsenceTypeDetails'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  calculateWorkingDays,
  buildHalfDayDates,
  calculateDateRangeBreakdown,
  type HolidayEntry,
  type DateRangeBreakdown
} from '../utils/workingDaysCalculator'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
import {
  getEmployeeAbsences,
  getEmployeeAbsenceBalance,
  getTodayAbsences,
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery
} from '../queries/getEmployeeAbsences'

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

export interface EmployeeAbsenceBalance {
  id: string
  employeeId: string
  typeRef: string
  annualTotal: number
  remaining: number
  approved: number
  validFrom: string
  validTo: string
}

export interface UseAbsenceValidationProps {
  accessToken: string
  employeeId: string
  selectedType: string
  startDate?: Date
  endDate?: Date
  context: BusinessAppContextProps
}

export const useAbsenceValidation = ({
  accessToken,
  employeeId,
  selectedType,
  startDate,
  endDate,
  context
}: UseAbsenceValidationProps) => {
  const client = useGraphQLClient(accessToken)
  const [validationErrors, setValidationErrors] = useState<AbsenceValidationError[]>([])
  const [validationWarnings, setValidationWarnings] = useState<AbsenceValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [existingAbsences, setExistingAbsences] = useState<EmployeeAbsence[]>([])
  const [absenceBalance, setAbsenceBalance] = useState<EmployeeAbsenceBalance | null>(null)
  const [todayAbsences, setTodayAbsences] = useState<EmployeeAbsence[]>([])
  const [existingSickLeave, setExistingSickLeave] = useState<EmployeeAbsence | null>(null)
  const [holidays, setHolidays] = useState<HolidayEntry[]>([])
  const [dateRangeBreakdown, setDateRangeBreakdown] = useState<DateRangeBreakdown | null>(null)

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
      setHolidays([])
      return
    }

    const fetchRegionAndHolidays = async () => {
      try {
        const activeLocale = getCurrentActiveUserLocale()
        const regionRes = await client.request(employeeRegionLookupQuery, {
          employeeId,
          activeUserLocale: activeLocale
        })

        const regionCode: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id

        if (regionCode) {
          const parentRegionIds: string[] = []

          const regionMatch = regionCode.match(/EmploymentRegion:v\d+:(.+)$/)
          if (regionMatch) {
            const regionSuffix = regionMatch[1]

            const subRegionMatch = regionSuffix.match(/^([A-Z]{2})(\d+)$/)
            if (subRegionMatch) {
              const countryCode = subRegionMatch[1]
              parentRegionIds.push(`EmploymentRegion:v1:${countryCode}U`)
              parentRegionIds.push(`EmploymentRegion:v1:${countryCode}`)
            } else {
              const parts = regionSuffix.split('_')
              if (parts.length >= 3) {
                const countryState = parts.slice(0, 2).join('_')
                parentRegionIds.push(`EmploymentRegion:v1:${countryState}`)
                parentRegionIds.push(`EmploymentRegion:v1:${parts[0]}`)
              } else if (parts.length === 2) {
                parentRegionIds.push(`EmploymentRegion:v1:${parts[0]}`)
              }
            }
          }

          const regionIds = [regionCode, ...parentRegionIds]

          const holidaysRes = await client.request(employmentRegionHolidaysQuery, {
            activeUserLocale: activeLocale,
            regionIds: regionIds
          })

          const holidaysData: HolidayEntry[] = holidaysRes?.holidays || []
          setHolidays(holidaysData)
        } else {
          setHolidays([])
        }
      } catch {
        setHolidays([])
      }
    }

    fetchRegionAndHolidays()
  }, [accessToken, employeeId, client])

  useEffect(() => {
    if (!accessToken || !employeeId || !selectedType) {
      setAbsenceBalance(null)
      return
    }

    const shouldCheckEntitlement = absenceTypeDetails?.objectValue?.checkEntitlement === true

    if (!shouldCheckEntitlement) {
      setAbsenceBalance(null)
      return
    }

    const fetchAbsenceBalance = async () => {
      try {
        const response = await client.request(getEmployeeAbsenceBalance, {
          employeeId,
          typeRef: selectedType
        })
        const balances = response?.EmployeeAbsenceBalance || []

        const validBalance = balances.find((balance: EmployeeAbsenceBalance) => {
          const now = dayjs()
          const validFrom = dayjs(balance.validFrom)
          const validTo = dayjs(balance.validTo)
          const isValid = now.isAfter(validFrom) && now.isBefore(validTo)

          return isValid
        })

        setAbsenceBalance(validBalance || null)
      } catch {
        setAbsenceBalance(null)
      }
    }

    fetchAbsenceBalance()
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

      let newAbsencePriority: number | undefined
      const newObjectValue = absenceTypeDetails?.objectValue

      if (newObjectValue) {
        if (typeof newObjectValue === 'string') {
          try {
            const parsed = JSON.parse(newObjectValue)
            newAbsencePriority = typeof parsed?.priority === 'number' ? parsed.priority : undefined
          } catch {
            newAbsencePriority = undefined
          }
        } else if (typeof newObjectValue === 'object' && newObjectValue !== null) {
          newAbsencePriority = typeof newObjectValue?.priority === 'number' ? newObjectValue.priority : undefined
        }
      }

      const newPriority = newAbsencePriority !== undefined ? newAbsencePriority : 999

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

          let existingAbsencePriority: number | undefined
          const objectValue = absence.type?.objectValue

          if (objectValue) {
            if (typeof objectValue === 'string') {
              try {
                const parsed = JSON.parse(objectValue)
                existingAbsencePriority = typeof parsed?.priority === 'number' ? parsed.priority : undefined
              } catch {
                existingAbsencePriority = undefined
              }
            } else if (typeof objectValue === 'object' && objectValue !== null) {
              existingAbsencePriority = typeof objectValue?.priority === 'number' ? objectValue.priority : undefined
            }
          }

          const existingPriority = existingAbsencePriority !== undefined ? existingAbsencePriority : 999

          if (newPriority >= existingPriority) {
            errors.push({
              type: 'overlap',
              message: `There is already a ${absenceTypeName} absence scheduled from ${existingStart.format(
                getDateFormat('date-long')
              )} to ${existingEnd.format(getDateFormat('date-long'))}.`,
              details: {
                conflictingAbsence: absence,
                conflictingDates: {
                  start: absence.startDate,
                  end: absence.endDate
                },
                absenceType: absenceTypeName,
                existingPriority,
                newPriority,
                priorityComparison: {
                  existing: existingPriority,
                  new: newPriority,
                  canOverride: newPriority < existingPriority
                }
              }
            })
          }
        }
      }

      return errors
    },
    [selectedType, existingAbsences, absenceTypeDetails]
  )

  type BalanceValidationResult = {
    errors: AbsenceValidationError[]
    warnings: AbsenceValidationError[]
  }

  const checkBalanceValidation = useCallback(
    (newStartDate: Date, newEndDate: Date): BalanceValidationResult => {
      const warnings: AbsenceValidationError[] = []
      const errors: AbsenceValidationError[] = []

      const shouldCheckEntitlement = absenceTypeDetails?.objectValue?.checkEntitlement === true

      if (!shouldCheckEntitlement) {
        return { errors, warnings }
      }

      if (!absenceBalance) {
        warnings.push({
          type: 'balance',
          message: 'Unable to verify absence balance. Please check manually.',
          details: { reason: 'no_balance_info' }
        })
        return { errors, warnings }
      }

      const measurement = absenceTypeDetails?.objectValue?.measurement
      let requestedDays: number

      if (measurement === 'WorkingDays') {
        const halfDayDates = buildHalfDayDates(newStartDate, newEndDate)

        requestedDays = calculateWorkingDays(newStartDate, newEndDate, {
          holidays,
          excludeWeekends: true,
          halfDayDates
        })

        const breakdown = calculateDateRangeBreakdown(newStartDate, newEndDate, holidays)
        setDateRangeBreakdown(breakdown)
      } else {
        requestedDays = dayjs(newEndDate).diff(dayjs(newStartDate), 'day') + 1

        const breakdown = calculateDateRangeBreakdown(newStartDate, newEndDate, holidays)
        setDateRangeBreakdown(breakdown)
      }

      const roundedRequestedDays = Math.round(requestedDays * 100) / 100

      if (roundedRequestedDays > absenceBalance.remaining) {
        const insufficientBalanceLabel = getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_absences.insufficient_balance',
          'Insufficient balance'
        )
        const requestedLabel = getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_absence_overview.absence_overview_table.requested',
          'Requested'
        )
        const availableLabel = getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')
        const daysLabel = getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')

        errors.push({
          type: 'balance',
          message: `${insufficientBalanceLabel}. ${requestedLabel}: ${roundedRequestedDays} ${daysLabel}, ${availableLabel}: ${absenceBalance.remaining} ${daysLabel}`,
          details: {
            requestedDays: roundedRequestedDays,
            availableBalance: absenceBalance.remaining,
            totalBalance: absenceBalance.annualTotal,
            usedBalance: absenceBalance.approved
          }
        })
      }

      return { errors, warnings }
    },
    [absenceBalance, absenceTypeDetails, holidays]
  )

  const validateAbsence = useCallback(
    async (validateStartDate?: Date, validateEndDate?: Date) => {
      const validationStartDate = validateStartDate || startDate
      const validationEndDate = validateEndDate || endDate

      if (!validationStartDate || !validationEndDate || !selectedType) {
        setValidationErrors([])
        return []
      }

      if (dayjs(validationEndDate).isBefore(dayjs(validationStartDate).subtract(1, 'day'))) {
        const dateOrderError: AbsenceValidationError = {
          type: 'general',
          message: 'End date must be after start date'
        }
        setValidationErrors([dateOrderError])
        return [dateOrderError]
      }

      setIsValidating(true)

      setValidationWarnings([])

      try {
        const overlapErrors = checkOverlapValidation(validationStartDate, validationEndDate)
        const { errors: balanceErrors, warnings: balanceWarnings } = checkBalanceValidation(
          validationStartDate,
          validationEndDate
        )

        const allErrors = [...overlapErrors, ...balanceErrors]
        const allWarnings = [...balanceWarnings]
        setValidationErrors(allErrors)
        setValidationWarnings(allWarnings)

        return allErrors
      } catch (error) {
        const generalError: AbsenceValidationError = {
          type: 'general',
          message: 'Validation failed. Please try again.',
          details: { error }
        }
        setValidationErrors([generalError])
        return [generalError]
      } finally {
        setIsValidating(false)
      }
    },
    [startDate, endDate, selectedType, checkOverlapValidation, checkBalanceValidation]
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
    validateAbsence,
    hasValidationErrors: validationErrors.length > 0,
    overlapErrors: validationErrors.filter(error => error.type === 'overlap'),
    balanceErrors: validationErrors.filter(error => error.type === 'balance'),
    generalErrors: validationErrors.filter(error => error.type === 'general'),
    existingAbsences,
    absenceBalance,
    todayAbsences,
    existingSickLeave,
    isSickLeaveType,
    hasExistingSickLeave: existingSickLeave !== null,
    dateRangeBreakdown
  }
}
