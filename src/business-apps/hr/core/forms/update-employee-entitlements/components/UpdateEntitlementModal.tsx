import React, { useEffect, useMemo, useRef, useState } from 'react'
import '@newwork/nw-design-system/style'
import {
  Button,
  DateInput,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import {
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
  employeeId: string
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

const toUtcStartOfMonthIso = (value: string): string => {
  const [year = '', month = ''] = value.split('-')
  return `${year}-${month}-01T00:00:00Z`
}

export const UpdateEntitlementModal: React.FC<UpdateEntitlementModalProps> = ({
  isOpen,
  onClose,
  selectedLine,
  absenceTypes,
  employeeId,
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

  useEffect(() => {
    if (!isOpen) return
    const defaultType = selectedLine?.type?.id || ''
    const defaultValidFrom = toDateInputValue(selectedLine?.validFrom) || `${year}-01-01`
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
  }, [isOpen, selectedLine, year])

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

  const headerTitle = getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.add_entitlements', 'Add Entitlement')

  const addByTypeText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:entitlements.add_entitlement_by_type',
    'Add Entitlement by Type'
  )

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

  const isSubmitDisabled = !absenceTypeRef || !validFrom || !hasChangesComparedToInitial

  return (
    <div
      data-testid="hcm_createHrAbsence_mainContainer"
      className="gba:!bg-card gba:!border-0 gba:!shadow-none gba:flex gba:flex-col gba:gap-4  gba:px-6"
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

      <div data-testid="flw_updateEntitlementModal_addByType" className="gba:text-sm">
        {addByTypeText}
      </div>

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

      {/* Year of Entitlement Display */}
      <div className="gba:flex gba:flex-col gba:gap-2">
        <div className="gba:font-semibold gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.year_of_entitlement', 'Year of Entitlement')}
        </div>
        <div
          className="gba:bg-muted gba:rounded-md gba:px-3 gba:py-2 gba:text-sm"
          data-testid="flw_updateEmployeeEntitlements_year_in_modal"
        >
          {year}
        </div>
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
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:working_hours_form.employee_placeholder',
            'Select...'
          )}
          className="gba:w-[100%]"
          data-testid="flw_updateEntitlementModal_validFromInput"
          {...({ locale: getCurrentActiveUserLocale(), captionLayout: 'dropdown' } as any)}
        />
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="flw_updateEntitlementModal_validFromHint">
          {t('entitlements-valid-from-month-start-hint')}
        </div>
      </div>

      {/* Numeric Inputs */}
      <div className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:font-semibold gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.total_annual', 'Total (Annual)')}
          </div>
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
  )
}

export default UpdateEntitlementModal
