import dayjs from 'dayjs'

type SourceEnum = 'GENERAL_EXPENSE_RULE' | 'MILEAGE_RULE' | 'ALLOWANCE_RULE' | 'ATTENTION_RULE' | ''

export interface OtherCalculationFormValues {
  source: SourceEnum
  relatedId?: string
  costCenterId?: string
  reimbursablePercent?: number
  activeFrom: string
  activeTo?: string
}

export interface OtherCalculationItem {
  id: string
  version?: number
}

export interface OtherCalculationSaveData {
  id?: string
  version?: number
  expenseRuleId: string
  activeFrom?: string | null
  activeTo: string | null
  costCenterId?: string | null
  source?: string | null
  reimbursablePercent?: number | null
  expenseRuleGeneralExpenseId?: string | null
  expenseRuleMileageId?: string | null
  expenseRuleAllowanceCodeId?: string | null
}

/**
 * Transform form values for restricted update (only activeTo can be changed)
 */
export const transformOtherCalcForRestrictedUpdate = (
  formValues: OtherCalculationFormValues,
  editingItem: OtherCalculationItem,
  ruleId: string
): OtherCalculationSaveData => ({
  id: editingItem.id,
  version: editingItem.version,
  expenseRuleId: ruleId,
  activeTo: formValues.activeTo ? dayjs(formValues.activeTo).endOf('day').toISOString() : null
})

/**
 * Transform form values for full save (create or unrestricted update)
 */
export const transformOtherCalcForSave = (
  formValues: OtherCalculationFormValues,
  ruleId: string,
  editingItem?: OtherCalculationItem | null
): OtherCalculationSaveData => ({
  ...(editingItem && { id: editingItem.id, version: editingItem.version }),
  expenseRuleId: ruleId,
  activeFrom: formValues.activeFrom ? dayjs(formValues.activeFrom).startOf('day').toISOString() : null,
  activeTo: formValues.activeTo ? dayjs(formValues.activeTo).endOf('day').toISOString() : null,
  costCenterId: formValues.costCenterId || null,
  source: formValues.source || null,
  reimbursablePercent: formValues.reimbursablePercent || null,
  expenseRuleGeneralExpenseId: formValues.source === 'GENERAL_EXPENSE_RULE' ? formValues.relatedId : null,
  expenseRuleMileageId: formValues.source === 'MILEAGE_RULE' ? formValues.relatedId : null,
  expenseRuleAllowanceCodeId: formValues.source === 'ALLOWANCE_RULE' ? formValues.relatedId : null
})
