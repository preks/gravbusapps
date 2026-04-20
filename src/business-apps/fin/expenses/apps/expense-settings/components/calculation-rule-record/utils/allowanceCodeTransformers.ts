import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { toISOStartOfDay, toISOEndOfDay } from '../../../utils/dateUtils'

dayjs.extend(utc)

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
  travelLocation?: string
  additionalProperties?: Record<string, unknown>
  activeFrom: string
  activeTo?: string
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
 * Helper to format active date
 */
const formatActiveFrom = (date: string | undefined): string | null => {
  return date ? toISOStartOfDay(date) || null : null
}

/**
 * Helper to format active to date
 */
const formatActiveTo = (date: string | undefined): string | null => {
  return date ? toISOEndOfDay(date) || null : null
}

/**
 * Transforms form values to save data for unrestricted UPDATE operation
 */
export const transformAllowanceCodeForUnrestrictedUpdate = (
  formValues: AllowanceCodeFormValues,
  editingItem: any,
  ruleId: string
): AllowanceCodeSaveData => {
  return {
    id: editingItem.id,
    version: editingItem.version,
    expenseRuleId: ruleId,
    businessKey: editingItem.businessKey,
    additionalProperties: formValues.additionalProperties ?? editingItem.additionalProperties ?? {},
    codeOrder: editingItem.codeOrder,
    travelLocation: formValues.travelLocation || editingItem.travelLocation,
    secondWageCode: editingItem.secondWageCode || null,
    code: formValues.code,
    name: formValues.name,
    reimbursable: formValues.reimbursable,
    amount: formValues.amount ?? null,
    calculationRef: formValues.calculation || null,
    expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE',
    firstAllowanceRegionRuleId: formValues.firstAllowanceRegionRuleId || null,
    firstAllowanceRegionRulePercent: formValues.firstAllowanceRegionRulePercent ?? 0,
    secondAllowanceRegionRuleId: formValues.secondAllowanceRegionRuleId || null,
    secondAllowanceRegionRulePercent: formValues.secondAllowanceRegionRulePercent ?? 0,
    firstWageCode: formValues.firstWageCode || null,
    activeFrom: formatActiveFrom(formValues.activeFrom),
    activeTo: formatActiveTo(formValues.activeTo)
  }
}

/**
 * Transforms form values to save data for restricted UPDATE operation (only activeTo editable)
 */
export const transformAllowanceCodeForRestrictedUpdate = (
  formValues: AllowanceCodeFormValues,
  editingItem: any,
  ruleId: string
): AllowanceCodeSaveData => {
  return {
    id: editingItem.id,
    version: editingItem.version,
    expenseRuleId: ruleId,
    businessKey: editingItem.businessKey,
    additionalProperties: formValues.additionalProperties ?? editingItem.additionalProperties ?? {},
    codeOrder: editingItem.codeOrder,
    travelLocation: formValues.travelLocation || editingItem.travelLocation,
    secondWageCode: editingItem.secondWageCode || null,
    code: editingItem.code,
    name: editingItem.name,
    reimbursable: editingItem.reimbursable,
    amount: editingItem.amount ?? null,
    calculationRef: editingItem.calculation || null,
    expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE',
    firstAllowanceRegionRuleId: editingItem.firstAllowanceRegionRuleId || null,
    firstAllowanceRegionRulePercent: editingItem.firstAllowanceRegionRulePercent ?? 0,
    secondAllowanceRegionRuleId: editingItem.secondAllowanceRegionRuleId || null,
    secondAllowanceRegionRulePercent: editingItem.secondAllowanceRegionRulePercent ?? 0,
    firstWageCode: editingItem.firstWageCode || null,
    activeFrom: formatActiveFrom(editingItem.activeFrom),
    activeTo: formatActiveTo(formValues.activeTo)
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
    travelLocation: formValues.travelLocation || null,
    additionalProperties: formValues.additionalProperties || {},
    activeFrom: formatActiveFrom(formValues.activeFrom),
    activeTo: formatActiveTo(formValues.activeTo)
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
    activeFrom: code.activeFrom,
    activeTo: code.activeTo,
    version: code.version,
    businessKey: code.businessKey,
    additionalProperties: code.additionalProperties,
    codeOrder: code.codeOrder,
    travelLocation: code.travelLocation,
    isDeleted: false
  }
}
