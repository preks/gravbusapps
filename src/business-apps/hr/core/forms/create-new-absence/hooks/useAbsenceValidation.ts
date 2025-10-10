import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getDateFormat } from '@/common/utils/windowUtils'
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
  locale?: string
  context: BusinessAppContextProps
}

export const useAbsenceValidation = ({
  accessToken,
  employeeId,
  selectedType,
  startDate,
  endDate,
  locale = 'en',
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

  // Get absence type details to check checkEntitlement flag
  const { details: absenceTypeDetails } = useAbsenceTypeDetails(context, selectedType)

  // Helper function to check if an absence type is a sick leave
  const isSickLeaveType = useCallback((absence: EmployeeAbsence): boolean => {
    // Check if the absence type has the HEALTH parent entry ID
    return absence.type?.parentEntryId === 'AbsenceGroup:v1:HEALTH'
  }, [])

  // Fetch today's absences when employee changes
  useEffect(() => {
    if (!accessToken || !employeeId) {
      setTodayAbsences([])
      setExistingSickLeave(null)
      return
    }

    const fetchTodayAbsences = async () => {
      try {
        // Get today's date in YYYY-MM-DD format for proper comparison
        const today = dayjs().format('YYYY-MM-DD')

        const response = await client.request(getTodayAbsences, {
          employeeId,
          today
        })

        const absences = response?.EmployeeAbsence || []

        setTodayAbsences(absences)

        // Find existing sick leave for today

        absences.forEach((absence: EmployeeAbsence, index: number) => {
          const isMainlySickType = isSickLeaveType(absence)
        })

        const sickLeave = absences.find(
          (absence: EmployeeAbsence) =>
            isSickLeaveType(absence) && (absence.status === 'PENDING' || absence.status === 'APPROVED')
        )

        if (sickLeave) {
          setExistingSickLeave(sickLeave)
        } else {
          setExistingSickLeave(null)
        }
      } catch (error) {
        console.error("❌ Error fetching today's absences:", error)
        setTodayAbsences([])
        setExistingSickLeave(null)
      }
    }

    fetchTodayAbsences()
  }, [accessToken, employeeId, client, isSickLeaveType])

  // Fetch existing absences when employee or dates change
  useEffect(() => {
    if (!accessToken || !employeeId || !startDate || !endDate) {
      setExistingAbsences([])
      return
    }

    const fetchExistingAbsences = async () => {
      try {
        const startDateStr = dayjs(startDate).format('YYYY-MM-DD')
        const endDateStr = dayjs(endDate).format('YYYY-MM-DD')

        const response = await client.request(getEmployeeAbsences, {
          employeeId,
          startDate: startDateStr,
          endDate: endDateStr
        })
        const absences = response?.EmployeeAbsence || []

        setExistingAbsences(absences)
      } catch (error) {
        console.error('❌ Error fetching existing absences:', error)
        setExistingAbsences([])
      }
    }

    fetchExistingAbsences()
  }, [accessToken, employeeId, startDate, endDate, client])

  // Fetch balance when absence type changes - only if checkEntitlement is true
  useEffect(() => {
    if (!accessToken || !employeeId || !selectedType) {
      setAbsenceBalance(null)
      return
    }

    // Check if this absence type requires entitlement checking
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

        // Get the most recent valid balance
        const validBalance = balances.find((balance: EmployeeAbsenceBalance) => {
          const now = dayjs()
          const validFrom = dayjs(balance.validFrom)
          const validTo = dayjs(balance.validTo)
          const isValid = now.isAfter(validFrom) && now.isBefore(validTo)

          return isValid
        })

        setAbsenceBalance(validBalance || null)
      } catch (error) {
        console.error('❌ Error fetching absence balance:', error)
        setAbsenceBalance(null)
      }
    }

    fetchAbsenceBalance()
  }, [accessToken, employeeId, selectedType, client, absenceTypeDetails])

  const checkOverlapValidation = useCallback(
    (newStartDate: Date, newEndDate: Date): AbsenceValidationError[] => {
      const errors: AbsenceValidationError[] = []

      if (!existingAbsences.length) {
        return errors
      }

      const newStart = dayjs(newStartDate)
      const newEnd = dayjs(newEndDate)

      for (const absence of existingAbsences) {
        // Skip cancelled or rejected absences
        if (absence.status === 'CANCELLED' || absence.status === 'REJECTED') {
          continue
        }

        // Skip the current sick leave being updated (exclude from overlap check)
        if (existingSickLeave && absence.id === existingSickLeave.id) {
          continue
        }

        const existingStart = dayjs(absence.startDate)
        const existingEnd = dayjs(absence.endDate)

        // Check for overlap
        const hasOverlap = newStart.isSameOrBefore(existingEnd) && newEnd.isSameOrAfter(existingStart)
        if (hasOverlap) {
          // Get the absence type name from translations using the correct locale
          let absenceTypeName = absence.typeRef // fallback to typeRef

          if (absence.type?.translations && absence.type.translations.length > 0) {
            // Try to find translation for the current locale
            const localeTranslation = absence.type.translations.find(t => t.localeCode === locale)
            // Use locale-specific translation if found, otherwise use first available
            absenceTypeName = localeTranslation?.value || absence.type.translations[0].value
          }

          errors.push({
            type: 'overlap',
            message: `There is already a ${absenceTypeName} absence scheduled from ${existingStart.format(
              getDateFormat('date-long')
            )} to ${existingEnd.format(getDateFormat('date-long'))}. Please select different dates.`,
            details: {
              conflictingAbsence: absence,
              conflictingDates: {
                start: absence.startDate,
                end: absence.endDate
              },
              absenceType: absenceTypeName
            }
          })
        }
      }

      return errors
    },
    [existingAbsences]
  )

  type BalanceValidationResult = {
    errors: AbsenceValidationError[]
    warnings: AbsenceValidationError[]
  }

  const checkBalanceValidation = useCallback(
    (newStartDate: Date, newEndDate: Date): BalanceValidationResult => {
      const warnings: AbsenceValidationError[] = []
      const errors: AbsenceValidationError[] = []

      // Check if this absence type requires entitlement checking
      const shouldCheckEntitlement = absenceTypeDetails?.objectValue?.checkEntitlement === true

      // If checkEntitlement is false or undefined, skip balance validation
      if (!shouldCheckEntitlement) {
        return { errors, warnings }
      }

      if (!absenceBalance) {
        // Only show warning if checkEntitlement is true AND no balance data
        warnings.push({
          type: 'balance',
          message: 'Unable to verify absence balance. Please check manually.',
          details: { reason: 'no_balance_info' }
        })
        return { errors, warnings }
      }

      // Calculate requested days based on measurement type
      const measurement = absenceTypeDetails?.objectValue?.measurement
      let requestedDays: number

      if (measurement === 'WorkingDays') {
        // For vacation types with WorkingDays measurement, use calendar days for validation
        // (backend expects calendar days even for WorkingDays measurement)
        requestedDays = dayjs(newEndDate).diff(dayjs(newStartDate), 'day') + 1
      } else {
        // Default to calendar days
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

      // Only validate if we have both dates
      if (!validationStartDate || !validationEndDate) {
        setValidationErrors([])
        return []
      }

      // Ensure end date is not before start date
      if (dayjs(validationEndDate).isBefore(dayjs(validationStartDate).subtract(1, 'day'))) {
        const dateOrderError: AbsenceValidationError = {
          type: 'general',
          message: 'End date must be after start date'
        }
        setValidationErrors([dateOrderError])
        return [dateOrderError]
      }

      setIsValidating(true)
      // Reset warnings before each validation run
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
    [startDate, endDate, checkOverlapValidation, checkBalanceValidation]
  )

  // Auto-validate when dates change
  useEffect(() => {
    if (startDate && endDate) {
      validateAbsence()
    } else {
      setValidationErrors([])
    }
  }, [startDate, endDate, validateAbsence])

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
    // Sick leave specific functionality
    todayAbsences,
    existingSickLeave,
    isSickLeaveType,
    hasExistingSickLeave: existingSickLeave !== null
  }
}
