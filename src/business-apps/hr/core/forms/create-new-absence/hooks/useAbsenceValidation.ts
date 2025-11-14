import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getDateFormat, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useAbsenceTypeDetails } from './useAbsenceTypeDetails'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
import { getEmployeeAbsences, getEmployeeAbsenceBalance, getTodayAbsences } from '../queries/getEmployeeAbsences'

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
        requestedDays = dayjs(newEndDate).diff(dayjs(newStartDate), 'day') + 1
      } else {
        requestedDays = dayjs(newEndDate).diff(dayjs(newStartDate), 'day') + 1
      }

      if (requestedDays > absenceBalance.remaining) {
        errors.push({
          type: 'balance',
          message: `Insufficient balance. Requested: ${requestedDays} days, Available: ${absenceBalance.remaining} days`,
          details: {
            requestedDays,
            availableBalance: absenceBalance.remaining,
            totalBalance: absenceBalance.annualTotal,
            usedBalance: absenceBalance.approved
          }
        })
      }

      return { errors, warnings }
    },
    [absenceBalance, absenceTypeDetails]
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
    hasExistingSickLeave: existingSickLeave !== null
  }
}
