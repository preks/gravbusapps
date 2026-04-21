import React, { useEffect, useMemo, useRef, useState } from 'react'
import '@newwork/nw-design-system/style'
import {
  Alert,
  AlertDescription,
  Button,
  DateInput,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'
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

const normalizeInteger = (value: string): string => {
  const onlyDigits = (value || '').replace(/[^0-9]/g, '')
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

const maxDateValue = (firstValue: string, secondValue: string): string => {
  return firstValue >= secondValue ? firstValue : secondValue
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
  const [validFrom, setValidFrom] = useState<string>('')
  const [initialState, setInitialState] = useState<{
    typeRef: string
    total: number
    pending: number
    approved: number
    validFrom: string
  } | null>(null)

  const selectTriggerRef = useRef<HTMLButtonElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  const [touchedType, setTouchedType] = useState(false)
  const typeError = touchedType && !absenceTypeRef
  const minimumValidFrom = useMemo(() => toDateInputValue(employeeHireDate), [employeeHireDate])
  const normalizedValidFrom = useMemo(() => toMonthStartDateInputValue(validFrom), [validFrom])
  const isFirstEntitlementEntry = !selectedLine && existingEntitlements.length === 0
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
      return minimumValidFrom
    }

    return minimumValidFrom
      ? maxDateValue(latestExistingValidFromForType, minimumValidFrom)
      : latestExistingValidFromForType
  }, [latestExistingValidFromForType, minimumValidFrom])
  const hireDateViolation = Boolean(normalizedValidFrom && minimumValidFrom && normalizedValidFrom < minimumValidFrom)
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

  useEffect(() => {
    if (!isOpen) return
    const defaultType = selectedLine?.type?.id || ''
    const defaultValidFrom =
      toDateInputValue(selectedLine?.validFrom) ||
      (isFirstEntitlementEntry && minimumValidFrom
        ? minimumValidFrom
        : maxDateValue(getTodayDateInputValue(), minimumValidFrom || '')) ||
      getTodayDateInputValue()
    setAbsenceTypeRef(defaultType)
    setTotal(Number(selectedLine?.total ?? 0))
    setPending(Number(selectedLine?.pending ?? 0))
    setApproved(Number(selectedLine?.approved ?? 0))
    setValidFrom(defaultValidFrom)
    setTouchedType(false)
    setInitialState({
      typeRef: defaultType,
      total: Number(selectedLine?.total ?? 0),
      pending: Number(selectedLine?.pending ?? 0),
      approved: Number(selectedLine?.approved ?? 0),
      validFrom: defaultValidFrom
    })
  }, [isFirstEntitlementEntry, isOpen, minimumValidFrom, selectedLine, year])

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
        validFrom: toUtcStartOfMonthIso(validFrom),
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
    hireDateViolation ||
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
          <DateInput
            type="date"
            value={validFrom}
            onChange={value => setValidFrom(typeof value === 'string' ? value : '')}
            min={minimumDateForSelectedType || undefined}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:working_hours_form.employee_placeholder',
              'Select...'
            )}
            className="gba:w-[100%]"
            data-testid="flw_updateEntitlementModal_validFromInput"
            {...({ locale: getCurrentActiveUserLocale(), captionLayout: 'dropdown' } as any)}
          />
          {hireDateViolation && (
            <div
              className="gba:text-sm gba:text-destructive"
              data-testid="flw_updateEntitlementModal_validFromHireDateError"
            >
              {t('entitlements-valid-from-hire-date-error')}:{' '}
              {formatDate(minimumValidFrom, 'date.short') || minimumValidFrom}
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
          <Alert
            variant="default"
            className="gba:w-full gba:py-2 gba:px-3"
            data-testid="flw_updateEntitlementModal_validFromHint"
          >
            <WarningCircleIcon className="gba:h-4 gba:w-4" />
            <AlertDescription className="gba:!max-w-none gba:text-xs gba:leading-5">
              {t('entitlements-valid-from-month-start-hint')}
            </AlertDescription>
          </Alert>
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
              if (isSubmitDisabled) return
              void handleSubmit()
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
