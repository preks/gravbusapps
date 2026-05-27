export type CustomBudgetInputMode = 'amount' | 'percent'

export interface OrgUnitCustomBudgetInput {
  mode: CustomBudgetInputMode
  amountRaw: string
  percentRaw: string
}

export function defaultOrgUnitCustomBudgetInput(): OrgUnitCustomBudgetInput {
  return { mode: 'amount', amountRaw: '', percentRaw: '' }
}
