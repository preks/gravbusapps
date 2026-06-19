import React, { useEffect, useMemo, useRef, useState } from 'react'
import '@newwork/nw-design-system/style'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation,
  DateInput
} from '@newwork/nw-design-system'
import {
  formatDate,
  getCatalogValue,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import FormHeader from '../../components/FormHeader'
import { env } from '@/common/env/EnvUtils'
import translations from '../../_i18n'

export interface EntitlementRowLike {
  id?: string
  version?: number
  employeeId?: string
  type?: { id: string; value?: string; code?: string; translations?: any[] }
  validFrom?: string
  validTo?: string
  available?: number
  pending?: number
  approved?: number
  total?: number
}

import { EmployeeInfo } from '../../components/FormHeader'

interface UpdateEntitlementModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLine: EntitlementRowLike | null
  absenceTypes: Array<{ id: string; value?: string; code?: string; translations?: any[]; objectValue?: any }>
  existingEntitlements: EntitlementRowLike[]
  employeeId: string
  employeeHireDate?: string
  accessToken: string
  year: number
  onSuccess: () => Promise<void>
  employeeHeaderInfo?: EmployeeInfo
}

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

const normalizeInteger = (value: string): string => {
  const onlyDigits = (value || '').replace(/\D/g, '')
  if (onlyDigits.length === 0) return '0'
  // Disallow leading zeros like 015 -> 15
  const normalized = String(parseInt(onlyDigits, 10) || 0)
  return normalized
}

const toDateInputValue = (value?: string): string => {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

const getTodayDateInputValue = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateInputValueFromDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const toMonthStartDateInputValue = (value?: string): string => {
  const normalizedValue = toDateInputValue(value)

  if (!normalizedValue) {
    return ''
  }

  const [year = '', month = ''] = normalizedValue.split('-')
  return `${year}-${month}-01`
}

const toUtcStartOfMonthIso = (value: string): string => {
  return `${toMonthStartDateInputValue(value)}T00:00:00Z`
}

const toUtcDateIso = (value: string): string => {
  return `${toDateInputValue(value)}T00:00:00Z`
}

const toMonthStartDateInputValueFromParts = (year: string, month: string): string => {
  if (!year || !month) {
    return ''
  }

  const normalizedYear = year.replace(/\D/g, '').slice(0, 4)
  const normalizedMonth = month.replace(/\D/g, '').slice(0, 2).padStart(2, '0')

  if (!/^\d{4}$/.test(normalizedYear) || !/^(0[1-9]|1[0-2])$/.test(normalizedMonth)) {
    return ''
  }

  return `${normalizedYear}-${normalizedMonth}-01`
}

const isValidIsoDateInputValue = (value: string): boolean => {
  const match = ISO_DATE_REGEX.exec(value)
  if (!match) {
    return false
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (!year || !month || !day) {
    return false
  }

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

const maxDateValue = (firstValue: string, secondValue: string): string => {
  return firstValue >= secondValue ? firstValue : secondValue
}

const nextMonthStartDateValue = (value?: string): string => {
  const normalizedValue = toMonthStartDateInputValue(value)
  if (!normalizedValue) {
    return ''
  }

  const [year = '', month = ''] = normalizedValue.split('-')
  const numericYear = Number(year)
  const numericMonth = Number(month)
  if (!numericYear || !numericMonth) {
    return ''
  }

  const date = new Date(Date.UTC(numericYear, numericMonth - 1, 1))
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  date.setUTCMonth(date.getUTCMonth() + 1)
  const nextYear = date.getUTCFullYear()
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${nextYear}-${nextMonth}-01`
}

const areDateValuesEqual = (firstValue?: string, secondValue?: string): boolean => {
  return toDateInputValue(firstValue) === toDateInputValue(secondValue)
}

const compareDateValuesDesc = (firstValue?: string, secondValue?: string): number => {
  const normalizedFirstValue = toDateInputValue(firstValue)
  const normalizedSecondValue = toDateInputValue(secondValue)

  if (normalizedFirstValue === normalizedSecondValue) {
    return 0
  }

  if (!normalizedFirstValue) {
    return 1
  }

  if (!normalizedSecondValue) {
    return -1
  }

  return normalizedFirstValue > normalizedSecondValue ? -1 : 1
}

export const UpdateEntitlementModal: React.FC<UpdateEntitlementModalProps> = ({
  isOpen,
  onClose,
  selectedLine,
  absenceTypes,
  existingEntitlements,
  employeeId,
  employeeHireDate,
  accessToken,
  year,
  onSuccess,
  employeeHeaderInfo
}) => {
  const { t } = useTranslation(translations)

  const [absenceTypeRef, setAbsenceTypeRef] = useState<string>('')
  const [total, setTotal] = useState<number>(0)
  const [pending, setPending] = useState<number>(0)
  const [approved, setApproved] = useState<number>(0)
  const [validFromMonthId, setValidFromMonthId] = useState<string>('')
  const [validFromYear, setValidFromYear] = useState<string>('')
  const [validFromDraft, setValidFromDraft] = useState<string>('')
  const [dateDayValidationError, setDateDayValidationError] = useState(false)
  const [initialState, setInitialState] = useState<{
    typeRef: string
    total: number
    pending: number
    approved: number
    validFrom: string
  } | null>(null)

  const selectTriggerRef = useRef<HTMLButtonElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousCommittedValidFromRef = useRef<string>('')
  const previousAbsenceTypeRef = useRef<string | null>(null)
  const initializedOpenContextRef = useRef<string>('')

  const [touchedType, setTouchedType] = useState(false)
  const [touchedValidFrom, setTouchedValidFrom] = useState(false)
  const typeError = touchedType && !absenceTypeRef
  const isValidYear = useMemo(() => {
    const normalizedYear = validFromYear.replace(/\D/g, '').slice(0, 4)
    if (!/^\d{4}$/.test(normalizedYear)) {
      return false
    }
    const numeric = Number(normalizedYear)
    return numeric >= 1000 && numeric <= 9999
  }, [validFromYear])
  const minimumValidFrom = useMemo(() => toDateInputValue(employeeHireDate), [employeeHireDate])
  const minimumValidFromMonthStart = useMemo(() => toMonthStartDateInputValue(employeeHireDate), [employeeHireDate])
  const hasExistingEntitlementForSelectedType = useMemo(() => {
    if (!absenceTypeRef) {
      return false
    }

    return existingEntitlements.some(entitlement => {
      if (selectedLine?.id && entitlement.id === selectedLine.id) {
        return false
      }

      return entitlement.type?.id === absenceTypeRef
    })
  }, [absenceTypeRef, existingEntitlements, selectedLine?.id])
  const isFirstEntitlementForSelectedType =
    !selectedLine && absenceTypeRef !== '' && !hasExistingEntitlementForSelectedType
  const isValidFromLockedToHireDate = Boolean(minimumValidFrom && isFirstEntitlementForSelectedType)
  const isValidFromDisabled = !absenceTypeRef || isValidFromLockedToHireDate
  const canUseHireDateAsValidFrom = isValidFromLockedToHireDate
  const validFrom = useMemo(() => {
    if (isValidFromLockedToHireDate) {
      return minimumValidFrom
    }

    const normalizedDraft = toDateInputValue(validFromDraft)
    if (
      canUseHireDateAsValidFrom &&
      normalizedDraft === minimumValidFrom &&
      isValidIsoDateInputValue(normalizedDraft)
    ) {
      return normalizedDraft
    }

    if (!isValidYear || !validFromMonthId) {
      return ''
    }

    return toMonthStartDateInputValueFromParts(validFromYear, validFromMonthId)
  }, [
    canUseHireDateAsValidFrom,
    isValidFromLockedToHireDate,
    isValidYear,
    minimumValidFrom,
    validFromDraft,
    validFromMonthId,
    validFromYear
  ])
  const normalizedValidFrom = useMemo(() => toMonthStartDateInputValue(validFrom), [validFrom])
  const latestExistingValidFromForType = useMemo(() => {
    if (!absenceTypeRef) {
      return ''
    }

    const matchingDates = existingEntitlements
      .filter(entitlement => {
        if (selectedLine?.id && entitlement.id === selectedLine.id) {
          return false
        }

        return entitlement.type?.id === absenceTypeRef
      })
      .map(entitlement => toDateInputValue(entitlement.validFrom))
      .filter(Boolean)
      .sort((firstValue, secondValue) => compareDateValuesDesc(firstValue, secondValue))

    return matchingDates[0] || ''
  }, [absenceTypeRef, existingEntitlements, selectedLine?.id])
  const minimumDateForSelectedType = useMemo(() => {
    if (!latestExistingValidFromForType) {
      if (isValidFromLockedToHireDate) {
        return minimumValidFrom
      }

      return minimumValidFromMonthStart
    }

    const minimumDateAfterLatestEntry = nextMonthStartDateValue(latestExistingValidFromForType)
    return minimumValidFromMonthStart
      ? maxDateValue(minimumDateAfterLatestEntry, minimumValidFromMonthStart)
      : minimumDateAfterLatestEntry
  }, [isValidFromLockedToHireDate, latestExistingValidFromForType, minimumValidFrom, minimumValidFromMonthStart])
  const hireDateViolation = Boolean(validFrom && minimumDateForSelectedType && validFrom < minimumDateForSelectedType)
  const inBetweenViolation = Boolean(
    normalizedValidFrom && latestExistingValidFromForType && normalizedValidFrom < latestExistingValidFromForType
  )
  const hasDuplicateEntitlement = useMemo(() => {
    if (!absenceTypeRef || !normalizedValidFrom) {
      return false
    }

    return existingEntitlements.some(entitlement => {
      if (selectedLine?.id && entitlement.id === selectedLine.id) {
        return false
      }

      return entitlement.type?.id === absenceTypeRef && areDateValuesEqual(entitlement.validFrom, normalizedValidFrom)
    })
  }, [absenceTypeRef, existingEntitlements, normalizedValidFrom, selectedLine?.id])

  const effectiveFromPlaceholderDate = useMemo(() => {
    return minimumDateForSelectedType || minimumValidFromMonthStart || ''
  }, [minimumDateForSelectedType, minimumValidFromMonthStart])
  const minimumAllowedMonthYearLabel = useMemo(() => {
    if (!effectiveFromPlaceholderDate) {
      return ''
    }

    const [year = '', month = ''] = effectiveFromPlaceholderDate.split('-')
    const numericYear = Number(year)
    const numericMonth = Number(month)
    if (!numericYear || !numericMonth) {
      return ''
    }

    const date = new Date(numericYear, numericMonth - 1, 1)
    if (Number.isNaN(date.getTime())) {
      return ''
    }

    try {
      return new Intl.DateTimeFormat(getCurrentActiveUserLocale(), { month: 'long', year: 'numeric' }).format(date)
    } catch {
      return `${year}-${month}`
    }
  }, [effectiveFromPlaceholderDate])
  const validFromDay = useMemo(() => {
    const day = toDateInputValue(validFrom).split('-')[2]
    return Number(day || '')
  }, [validFrom])
  const isHireDateException = Boolean(canUseHireDateAsValidFrom && validFrom && validFrom === minimumValidFrom)
  const lockedValidFromViolation = Boolean(isValidFromLockedToHireDate && validFrom !== minimumValidFrom)
  const shouldShowHireDateHint = canUseHireDateAsValidFrom && minimumValidFrom !== minimumValidFromMonthStart
  const validFromRuleHint = useMemo(() => {
    if (!absenceTypeRef) {
      return t('entitlements-valid-from-select-type-first')
    }

    if (isValidFromLockedToHireDate) {
      return t('entitlements-valid-from-hire-date-preselected')
    }

    const hintKey = shouldShowHireDateHint
      ? 'entitlements-valid-from-month-start-or-hire-date-hint'
      : 'entitlements-valid-from-month-start-hint'

    return t(hintKey)
  }, [absenceTypeRef, isValidFromLockedToHireDate, shouldShowHireDateHint, t])
  const isMonthStartDay = validFrom ? validFromDay === 1 || isHireDateException : true
  const missingValidFromError = touchedValidFrom && !validFrom && !dateDayValidationError
  const invalidValidFromDayError = touchedValidFrom && dateDayValidationError
  const disabledDates = useMemo(() => {
    return (date: Date) => {
      if (isValidFromLockedToHireDate) {
        return toDateInputValueFromDate(date) !== minimumValidFrom
      }

      return date.getDate() !== 1 && (!canUseHireDateAsValidFrom || toDateInputValueFromDate(date) !== minimumValidFrom)
    }
  }, [canUseHireDateAsValidFrom, isValidFromLockedToHireDate, minimumValidFrom])

  const clearCommittedValidFrom = () => {
    setValidFromYear('')
    setValidFromMonthId('')
  }

  const commitValidFrom = (nextDate: string) => {
    setTouchedValidFrom(true)

    if (isValidFromLockedToHireDate) {
      setDateDayValidationError(false)
      setValidFromDraft(minimumValidFrom)
      const [nextYear = '', nextMonth = ''] = minimumValidFrom.split('-')
      setValidFromYear(nextYear)
      setValidFromMonthId(nextMonth)
      return
    }

    if (!nextDate) {
      setDateDayValidationError(false)
      clearCommittedValidFrom()
      return
    }

    const [nextYear = '', nextMonth = '', day = ''] = nextDate.split('-')
    const isAllowedHireDate = canUseHireDateAsValidFrom && nextDate === minimumValidFrom
    if (Number(day) !== 1 && !isAllowedHireDate) {
      setDateDayValidationError(true)
      clearCommittedValidFrom()
      return
    }

    setDateDayValidationError(false)
    setValidFromYear(nextYear)
    setValidFromMonthId(nextMonth)
  }

  useEffect(() => {
    if (!isOpen) {
      initializedOpenContextRef.current = ''
      return
    }

    const openContextKey = `${selectedLine?.id ?? 'new'}:${minimumValidFrom}:${year}`
    if (initializedOpenContextRef.current === openContextKey) {
      return
    }

    initializedOpenContextRef.current = openContextKey

    const defaultType = selectedLine?.type?.id || ''
    const selectedLineValidFrom = toDateInputValue(selectedLine?.validFrom)
    const defaultValidFromRaw = selectedLineValidFrom || maxDateValue(getTodayDateInputValue(), minimumValidFrom || '')
    const defaultValidFrom = selectedLine ? toMonthStartDateInputValue(defaultValidFromRaw) : ''
    const [defaultYear = '', defaultMonth = ''] = (defaultValidFrom || '').split('-')
    setAbsenceTypeRef(defaultType)
    setTotal(Number(selectedLine?.total ?? 0))
    setPending(Number(selectedLine?.pending ?? 0))
    setApproved(Number(selectedLine?.approved ?? 0))
    setValidFromYear(defaultYear)
    setValidFromMonthId(defaultMonth)
    setValidFromDraft(defaultValidFrom)
    setDateDayValidationError(false)
    setTouchedType(false)
    setTouchedValidFrom(false)
    setInitialState({
      typeRef: defaultType,
      total: Number(selectedLine?.total ?? 0),
      pending: Number(selectedLine?.pending ?? 0),
      approved: Number(selectedLine?.approved ?? 0),
      validFrom: defaultValidFrom
    })
    previousCommittedValidFromRef.current = defaultValidFrom
  }, [existingEntitlements.length, isOpen, minimumValidFrom, selectedLine, year])

  useEffect(() => {
    if (!isOpen) {
      previousCommittedValidFromRef.current = ''
      return
    }

    const previousCommitted = previousCommittedValidFromRef.current
    if (validFromDraft === previousCommitted && validFromDraft !== validFrom) {
      setValidFromDraft(validFrom)
    }
    previousCommittedValidFromRef.current = validFrom
  }, [isOpen, validFrom, validFromDraft])

  useEffect(() => {
    if (!isOpen) {
      previousAbsenceTypeRef.current = null
      return
    }

    const previousType = previousAbsenceTypeRef.current
    if (previousType === null) {
      previousAbsenceTypeRef.current = absenceTypeRef
      return
    }

    if (previousType === absenceTypeRef) {
      return
    }

    previousAbsenceTypeRef.current = absenceTypeRef

    if (isValidFromLockedToHireDate && minimumValidFrom) {
      const [nextYear = '', nextMonth = ''] = minimumValidFrom.split('-')
      setValidFromDraft(minimumValidFrom)
      setValidFromYear(nextYear)
      setValidFromMonthId(nextMonth)
      setDateDayValidationError(false)
      return
    }

    if (!minimumDateForSelectedType) {
      return
    }

    const normalizedCurrentValidFrom = toMonthStartDateInputValue(validFrom)
    if (normalizedCurrentValidFrom && normalizedCurrentValidFrom >= minimumDateForSelectedType) {
      return
    }

    const [nextYear = '', nextMonth = ''] = minimumDateForSelectedType.split('-')
    setValidFromDraft(minimumDateForSelectedType)
    setValidFromYear(nextYear)
    setValidFromMonthId(nextMonth)
    setDateDayValidationError(false)
  }, [absenceTypeRef, isOpen, isValidFromLockedToHireDate, minimumDateForSelectedType, minimumValidFrom, validFrom])

  // Manage initial focus when modal opens
  useEffect(() => {
    if (!isOpen) return
    const focusNextTick = () => {
      // If select is enabled, focus it; otherwise focus Cancel
      const selectDisabled = Boolean(selectedLine?.type?.id)
      if (!selectDisabled && selectTriggerRef.current) {
        selectTriggerRef.current.focus()
        return
      }
      if (cancelButtonRef.current) cancelButtonRef.current.focus()
    }
    const t = setTimeout(focusNextTick, 0)
    return () => clearTimeout(t)
  }, [isOpen, selectedLine])

  const available = useMemo(() => {
    const result = Number(total || 0) - Number(pending || 0) - Number(approved || 0)
    return result
  }, [total, pending, approved])

  const headerTitle = t('entitlements-add-title')

  const handleSubmit = async () => {
    const body: any = {
      employeeAbsenceEntitlement: {
        employeeId: employeeId,
        typeRef: absenceTypeRef,
        available: available,
        pending: pending,
        approved: approved,
        total: total,
        validFrom: isHireDateException ? toUtcDateIso(validFrom) : toUtcStartOfMonthIso(validFrom),
        validTo: null
      },
      changeMode: 'INSERT'
    }

    const processesBase = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') || ''
    await fetch(`${processesBase}/employee-time/saveEmployeeAbsenceEntitlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    })

    await onSuccess()
    onClose()
  }

  const hasChangesComparedToInitial = useMemo(() => {
    if (!initialState) return true
    return (
      initialState.typeRef !== absenceTypeRef ||
      initialState.total !== total ||
      initialState.pending !== pending ||
      initialState.approved !== approved ||
      initialState.validFrom !== validFrom
    )
  }, [initialState, absenceTypeRef, total, pending, approved, validFrom])

  const isSubmitDisabled =
    !absenceTypeRef ||
    !validFrom ||
    !isValidYear ||
    !isMonthStartDay ||
    dateDayValidationError ||
    hireDateViolation ||
    lockedValidFromViolation ||
    inBetweenViolation ||
    hasDuplicateEntitlement ||
    !hasChangesComparedToInitial

  return (
    <div
      data-testid="hcm_createHrAbsence_mainContainer"
      className="gba:!border-0 gba:!shadow-none gba:flex gba:flex-col"
    >
      <FormHeader
        title={headerTitle}
        flowIconUrl={flowIconUrl}
        className="gba:px-0"
        employee={
          employeeHeaderInfo
            ? {
                firstName: employeeHeaderInfo.firstName,
                lastName: employeeHeaderInfo.lastName,
                pictureThumbnail: employeeHeaderInfo.pictureThumbnail,
                jobTitle: employeeHeaderInfo.jobTitle
              }
            : undefined
        }
      />
      <div className="gba:!border-0 gba:!shadow-none gba:flex gba:flex-col gba:gap-4 gba:px-6">
        {/* Absence Type Select */}
        <div className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:font-semibold gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.absence_type', 'Absence Type')}
            <span className="gba:text-destructive"> *</span>
          </div>
          <div>
            <Select value={absenceTypeRef} onValueChange={v => setAbsenceTypeRef(v)}>
              <SelectTrigger
                ref={selectTriggerRef}
                data-testid="hcm_createHrAbsence_absenceTypeSelect"
                className="gba:w-full gba:text-sm"
              >
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:working_hours_form.employee_placeholder',
                    'Select...'
                  )}
                />
              </SelectTrigger>
              {(() => {
                const selectableTypes = absenceTypes || []
                return selectableTypes.length > 0 ? (
                  <SelectContent>
                    {selectableTypes.map(item => (
                      <SelectItem key={item.id} value={item.id} data-testid={`absence-type-option-${item.id}`}>
                        {getCatalogValue(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                ) : null
              })()}
            </Select>
          </div>
          {typeError && (
            <div className="gba:text-destructive">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_absences.create_absence.absence_validation_message',
                'The Absence Type is required. Please select an Absence Type.'
              )}
            </div>
          )}
        </div>

        <div className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:font-semibold gba:text-sm">
            {t('entitlements-effective-from')}
            <span className="gba:text-destructive"> *</span>
          </div>
          <div className="gba:flex gba:gap-3 gba:w-full" data-testid="flw_updateEntitlementModal_validFromInput">
            <div className="gba:flex-1 gba:min-w-0">
              <DateInput
                value={validFromDraft}
                captionLayout={'dropdown'}
                min={minimumDateForSelectedType || minimumValidFromMonthStart || undefined}
                className="!gba:w-full gba:min-w-0"
                showOutsideDays={false}
                disabled={isValidFromDisabled}
                onDraftChange={(value: string) => {
                  setValidFromDraft(value)
                  setTouchedValidFrom(true)

                  if (!value) {
                    commitValidFrom('')
                    return
                  }

                  if (!isValidIsoDateInputValue(value)) {
                    setDateDayValidationError(false)
                    clearCommittedValidFrom()
                    return
                  }

                  commitValidFrom(value)
                }}
                disabledDates={disabledDates}
                data-testid="flw_updateEntitlementModal_validFromDateInput"
                onChange={value => {
                  const nextDate = toDateInputValue(typeof value === 'string' ? value : '')
                  setValidFromDraft(nextDate)
                  commitValidFrom(nextDate)
                }}
              />
            </div>
          </div>
          {invalidValidFromDayError && (
            <div
              className="gba:text-sm gba:text-destructive"
              data-testid="flw_updateEntitlementModal_validFromDateError"
            >
              {t('entitlements-effective-from-month-invalid')}
            </div>
          )}
          {missingValidFromError && (
            <div
              className="gba:text-sm gba:text-destructive"
              data-testid="flw_updateEntitlementModal_validFromRequiredError"
            >
              {t('entitlements-effective-from-required')}
            </div>
          )}
          {hireDateViolation && (
            <div
              className="gba:text-sm gba:text-destructive"
              data-testid="flw_updateEntitlementModal_validFromHireDateError"
            >
              {t('entitlements-valid-from-hire-date-error')}:{' '}
              {formatDate(minimumValidFrom, 'date.short') || minimumValidFrom}
            </div>
          )}
          {lockedValidFromViolation && (
            <div
              className="gba:text-sm gba:text-destructive"
              data-testid="flw_updateEntitlementModal_validFromLockedError"
            >
              {t('entitlements-valid-from-hire-date-locked-error')}
            </div>
          )}
          {hasDuplicateEntitlement && (
            <div className="gba:text-sm gba:text-destructive" data-testid="flw_updateEntitlementModal_duplicateError">
              {t('entitlements-duplicate-error')}
            </div>
          )}
          {inBetweenViolation && (
            <div className="gba:text-sm gba:text-destructive" data-testid="flw_updateEntitlementModal_inBetweenError">
              {t('entitlements-in-between-error')}:{' '}
              {formatDate(latestExistingValidFromForType, 'date.short') || latestExistingValidFromForType}
            </div>
          )}
          {minimumAllowedMonthYearLabel && absenceTypeRef && !isValidFromLockedToHireDate ? (
            <div
              className="gba:text-sm gba:leading-5 gba:text-muted-foreground"
              data-testid="flw_updateEntitlementModal_validFromHint"
            >
              {t('entitlements-valid-from-minimum-hint', { monthYear: minimumAllowedMonthYearLabel })}
            </div>
          ) : null}
          <div
            className="gba:text-sm gba:leading-5 gba:text-muted-foreground"
            data-testid="flw_updateEntitlementModal_monthStartHint"
          >
            {validFromRuleHint}
          </div>
        </div>
        {/* Numeric Inputs */}
        <div className="gba:flex gba:flex-col gba:gap-4">
          <div className="gba:flex gba:flex-col gba:gap-2">
            <div className="gba:font-semibold gba:text-sm">{t('entitlements-total-annual')}</div>
            <Input
              data-testid="flw_updateEntitlementModal_totalInput"
              inputMode="numeric"
              value={String(total)}
              onChange={e => setTotal(Number(normalizeInteger(e.target.value)))}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:working_hours_form.enter_dots_placeholder',
                'Enter...'
              )}
              className="gba:appearance-none gba:text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
          <Button
            variant="outline"
            data-testid="hcm_createHrAbsence_cancelButton"
            onClick={onClose}
            ref={cancelButtonRef}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            data-testid="hcm_createHrAbsence_submitButton"
            disabled={isSubmitDisabled}
            onClick={() => {
              setTouchedType(true)
              setTouchedValidFrom(true)
              if (isSubmitDisabled) return
              handleSubmit().catch(() => undefined)
            }}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
              'Add'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default UpdateEntitlementModal
