export interface AllowanceSetupFormValues {
  name: string
  issue: string
  onlyTax: boolean
  activeFrom: string
  activeTo?: string
  allowancePeriodId: string
  allowanceCodeId: string
}

export interface AllowanceSetupSaveData {
  id?: string
  version?: number
  expenseRuleId: string
  businessKey?: string
  name: string
  issue: string
  onlyTax: boolean
  activeFrom: string | undefined
  activeTo: string | undefined
  setupOrder?: number
  additionalProperties?: Record<string, unknown>
  allowancePeriodId: string
  allowanceCodeId: string
}

/**
 * Transforms form values to save data for restricted UPDATE (only activeTo editable)
 */
export const transformAllowanceSetupForRestrictedUpdate = (
  formValues: AllowanceSetupFormValues,
  editingItem: any,
  ruleId: string,
  formatDateFrom: (dateStr: string | undefined) => string | undefined,
  formatDateTo: (dateStr: string | undefined) => string | undefined
): AllowanceSetupSaveData => {
  return {
    id: editingItem.id,
    version: editingItem.version,
    expenseRuleId: ruleId,
    name: editingItem.name,
    issue: editingItem.issue,
    onlyTax: editingItem.onlyTax,
    activeFrom: formatDateFrom(editingItem.activeFrom),
    activeTo: formatDateTo(formValues.activeTo),
    allowancePeriodId: editingItem.allowancePeriod.id,
    allowanceCodeId: editingItem.allowanceCode.id
  }
}

/**
 * Transforms form values to save data for full CREATE or UPDATE
 */
export const transformAllowanceSetupForSave = (
  formValues: AllowanceSetupFormValues,
  ruleId: string,
  editingItem: Record<string, unknown> | null,
  formatDateFrom: (dateStr: string | undefined) => string | undefined,
  formatDateTo: (dateStr: string | undefined) => string | undefined
): AllowanceSetupSaveData => {
  const isUpdate = !!editingItem

  return {
    ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
    expenseRuleId: ruleId,
    businessKey: undefined,
    name: formValues.name,
    issue: formValues.issue,
    onlyTax: formValues.onlyTax,
    activeFrom: formatDateFrom(formValues.activeFrom),
    activeTo: formatDateTo(formValues.activeTo),
    setupOrder: undefined,
    additionalProperties: undefined,
    allowancePeriodId: formValues.allowancePeriodId,
    allowanceCodeId: formValues.allowanceCodeId
  }
}
