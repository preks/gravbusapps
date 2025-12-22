import dayjs from 'dayjs'

export interface AllowanceCodeFormValues {
  code: string
  name: string
  reimbursable: boolean
  amount?: number
  calculation?: string
  expenseGroupRef?: string
  firstAllowanceRegionRuleId?: string
  firstAllowanceRegionRulePercent?: number
  secondAllowanceRegionRuleId?: string
  secondAllowanceRegionRulePercent?: number
  firstWageCode?: string
  validFrom: string
  validTo?: string
}

export interface AllowanceCodeSaveData {
  id?: string
  version?: number
  expenseRuleId: string
  businessKey?: string
  additionalProperties?: Record<string, unknown>
  codeOrder?: number
  travelLocation?: string
  secondWageCode?: string | null
  code: string
  name: string
  reimbursable: boolean
  amount: number | null
  calculationRef: string | null
  expenseGroupRef: string
  firstAllowanceRegionRuleId: string | null
  firstAllowanceRegionRulePercent: number
  secondAllowanceRegionRuleId: string | null
  secondAllowanceRegionRulePercent: number
  firstWageCode: string | null
  activeFrom: string | null
  activeTo: string | null
}

/**
 * Transforms form values to save data for UPDATE operation
 */
export const transformAllowanceCodeForUpdate = (
  formValues: AllowanceCodeFormValues,
  editingItem: any,
  ruleId: string,
  isRestrictedEdit: boolean
): AllowanceCodeSaveData => {
  return {
    id: editingItem.id,
    version: editingItem.version,
    expenseRuleId: ruleId,
    businessKey: editingItem.businessKey,
    additionalProperties: editingItem.additionalProperties || {},
    codeOrder: editingItem.codeOrder,
    travelLocation: editingItem.travelLocation,
    secondWageCode: editingItem.secondWageCode || null,
    // User-editable fields from form (or editingItem if restricted)
    code: isRestrictedEdit ? editingItem.code : formValues.code,
    name: isRestrictedEdit ? editingItem.name : formValues.name,
    reimbursable: isRestrictedEdit ? editingItem.reimbursable : formValues.reimbursable,
    amount: isRestrictedEdit ? (editingItem.amount ?? null) : (formValues.amount ?? null),
    calculationRef: isRestrictedEdit ? editingItem.calculation || null : formValues.calculation || null,
    expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE',
    firstAllowanceRegionRuleId: isRestrictedEdit
      ? editingItem.firstAllowanceRegionRuleId || null
      : formValues.firstAllowanceRegionRuleId || null,
    firstAllowanceRegionRulePercent: isRestrictedEdit
      ? (editingItem.firstAllowanceRegionRulePercent ?? 0)
      : (formValues.firstAllowanceRegionRulePercent ?? 0),
    secondAllowanceRegionRuleId: isRestrictedEdit
      ? editingItem.secondAllowanceRegionRuleId || null
      : formValues.secondAllowanceRegionRuleId || null,
    secondAllowanceRegionRulePercent: isRestrictedEdit
      ? (editingItem.secondAllowanceRegionRulePercent ?? 0)
      : (formValues.secondAllowanceRegionRulePercent ?? 0),
    firstWageCode: isRestrictedEdit ? editingItem.firstWageCode || null : formValues.firstWageCode || null,
    activeFrom: isRestrictedEdit
      ? editingItem.validFrom
        ? dayjs(editingItem.validFrom).startOf('day').toISOString()
        : null
      : formValues.validFrom
        ? dayjs(formValues.validFrom).startOf('day').toISOString()
        : null,
    activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null
  }
}

/**
 * Transforms form values to save data for CREATE operation
 */
export const transformAllowanceCodeForCreate = (
  formValues: AllowanceCodeFormValues,
  ruleId: string
): AllowanceCodeSaveData => {
  return {
    expenseRuleId: ruleId,
    code: formValues.code || '',
    name: formValues.name || '',
    reimbursable: formValues.reimbursable ?? true,
    amount: formValues.amount ?? 0,
    calculationRef: formValues.calculation || null,
    expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE',
    firstAllowanceRegionRuleId: formValues.firstAllowanceRegionRuleId || null,
    firstAllowanceRegionRulePercent: formValues.firstAllowanceRegionRulePercent ?? 0,
    secondAllowanceRegionRuleId: formValues.secondAllowanceRegionRuleId || null,
    secondAllowanceRegionRulePercent: formValues.secondAllowanceRegionRulePercent ?? 0,
    firstWageCode: formValues.firstWageCode || null,
    secondWageCode: null,
    activeFrom: formValues.validFrom ? dayjs(formValues.validFrom).startOf('day').toISOString() : null,
    activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null
  }
}

/**
 * Transforms API response to AllowanceCode display format
 */
export const transformAllowanceCodeFromAPI = (code: any): any => {
  return {
    id: code.id,
    code: code.code || '',
    name: code.name || '',
    reimbursable: code.reimbursable || false,
    amount: code.amount ?? 0,
    calculation: code.calculationRef || code.calculation?.id || '',
    expenseGroup: code.expenseGroup || { id: '', value: '', code: '' },
    firstAllowanceRegionRuleId: code.firstAllowanceRegionRuleId || '',
    firstAllowanceRegionRulePercent: code.firstAllowanceRegionRulePercent ?? 0,
    secondAllowanceRegionRuleId: code.secondAllowanceRegionRuleId || '',
    secondAllowanceRegionRulePercent: code.secondAllowanceRegionRulePercent ?? 0,
    firstAllowanceRegionRule: code.firstAllowanceRegionRule,
    secondAllowanceRegionRule: code.secondAllowanceRegionRule,
    firstWageCode: code.firstWageCode,
    secondWageCode: code.secondWageCode,
    validFrom: code.activeFrom,
    validTo: code.activeTo,
    version: code.version,
    businessKey: code.businessKey,
    additionalProperties: code.additionalProperties,
    codeOrder: code.codeOrder,
    travelLocation: code.travelLocation,
    isDeleted: false
  }
}
