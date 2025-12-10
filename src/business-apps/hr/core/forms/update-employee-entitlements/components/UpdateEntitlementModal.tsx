import React, { useEffect, useMemo, useRef, useState } from 'react'
import '@newwork/nw-design-system/style'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import FormHeader from '../../components/FormHeader'
import { env } from '@/common/env/EnvUtils'

export interface EntitlementRowLike {
  id?: string
  version?: number
  employeeId?: string
  type?: { id: string; value?: string; code?: string; translations?: any[] }
  available?: number
  pending?: number
  approved?: number
  total?: number
}

export interface EmployeeHeaderInfo {
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  jobTitle?: string
}

interface UpdateEntitlementModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLine: EntitlementRowLike | null
  absenceTypes: Array<{ id: string; value?: string; code?: string; translations?: any[]; objectValue?: any }>
  employeeId: string
  accessToken: string
  year: number
  onSuccess: () => Promise<void>
  existingEntitlementTypeIds?: string[]
  employeeHeaderInfo?: EmployeeHeaderInfo
}

const normalizeInteger = (value: string): string => {
  const onlyDigits = (value || '').replace(/[^0-9]/g, '')
  if (onlyDigits.length === 0) return '0'
  // Disallow leading zeros like 015 -> 15
  const normalized = String(parseInt(onlyDigits, 10) || 0)
  return normalized
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
  existingEntitlementTypeIds,
  employeeHeaderInfo
}) => {
  const isFromTable = Boolean(selectedLine && selectedLine.id)

  const [absenceTypeRef, setAbsenceTypeRef] = useState<string>('')
  const [total, setTotal] = useState<number>(0)
  const [pending, setPending] = useState<number>(0)
  const [approved, setApproved] = useState<number>(0)
  const [initialState, setInitialState] = useState<{
    typeRef: string
    total: number
    pending: number
    approved: number
  } | null>(null)

  const selectTriggerRef = useRef<HTMLButtonElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  const [touchedType, setTouchedType] = useState(false)
  const typeError = touchedType && !absenceTypeRef

  useEffect(() => {
    if (!isOpen) return
    const defaultType = selectedLine?.type?.id || ''
    setAbsenceTypeRef(defaultType)
    setTotal(Number(selectedLine?.total ?? 0))
    setPending(Number(selectedLine?.pending ?? 0))
    setApproved(Number(selectedLine?.approved ?? 0))
    setTouchedType(false)
    setInitialState({
      typeRef: defaultType,
      total: Number(selectedLine?.total ?? 0),
      pending: Number(selectedLine?.pending ?? 0),
      approved: Number(selectedLine?.approved ?? 0)
    })
  }, [isOpen, selectedLine])

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

  const hasAvailableError = available < 0

  const headerTitle = isFromTable
    ? getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.update_entitlements', 'Update Entitlements')
    : getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.add_entitlements', 'Add Entitlement')

  const addByTypeText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:entitlements.add_entitlement_by_type',
    'Add Entitlement by Type'
  )

  const handleSubmit = async () => {
    const firstDay = new Date(year, 0, 1, 0, 0, 0, 0)
    const lastDay = new Date(year, 11, 31, 23, 59, 59, 999)

    const body: any = {
      employeeAbsenceEntitlement: {
        ...(isFromTable
          ? {
              id: selectedLine?.id,
              version: selectedLine?.version
            }
          : {}),
        employeeId: employeeId,
        typeRef: absenceTypeRef,
        available: available,
        pending: pending,
        approved: approved,
        total: total,
        validFrom: firstDay.toISOString(),
        validTo: lastDay.toISOString()
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
      initialState.approved !== approved
    )
  }, [initialState, absenceTypeRef, total, pending, approved])

  const isSubmitDisabled = !absenceTypeRef || hasAvailableError || !hasChangesComparedToInitial

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

      {!isFromTable && (
        <div data-testid="flw_updateEntitlementModal_addByType" className="gba:text-sm">
          {addByTypeText}
        </div>
      )}

      {/* Absence Type Select */}
      <div className="gba:flex gba:flex-col gba:gap-2">
        <div className="gba:font-semibold gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.absence_type', 'Absence Type')}
          <span className="gba:text-destructive"> *</span>
        </div>
        <div>
          <Select value={absenceTypeRef} onValueChange={v => setAbsenceTypeRef(v)} disabled={!!selectedLine?.type?.id}>
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
              const selectableTypes = (() => {
                if (!!selectedLine?.type?.id) return absenceTypes || []
                const existingIds = new Set((existingEntitlementTypeIds || []).filter(Boolean))
                return (absenceTypes || []).filter(item => !existingIds.has(item.id))
              })()
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

        <div className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:font-semibold gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.payment_status', 'Pending')}
          </div>
          <div
            className="gba:bg-muted gba:rounded-md gba:px-3 gba:py-2 gba:text-sm"
            data-testid="flw_updateEntitlementModal_pendingInput"
          >
            {pending}
          </div>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-2">
          <div className="gba:font-semibold gba:text-sm">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:manager_expense_landing_page.upcoming_approved_badge',
              'Approved'
            )}
          </div>
          <div
            className="gba:bg-muted gba:rounded-md gba:px-3 gba:py-2 gba:text-sm"
            data-testid="flw_updateEntitlementModal_approved"
          >
            {approved}
          </div>
        </div>
      </div>

      {/* Available Display */}
      <div className="gba:flex gba:flex-col gba:gap-2">
        <div className="gba:font-semibold gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
        </div>
        <div
          className="gba:bg-muted gba:rounded-md gba:px-3 gba:py-2 gba:text-sm"
          data-testid="flw_updateEntitlementModal_available"
        >
          {available}
        </div>
        {hasAvailableError && (
          <div className="gba:text-destructive">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:entitlements.entitlements_validation_message',
              'The total entitlement cannot be adjusted to this value, as the remaining days must not be negative.'
            )}
          </div>
        )}
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
          {isFromTable
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_update',
                'Update'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
                'Add'
              )}
        </Button>
      </div>
    </div>
  )
}

export default UpdateEntitlementModal
