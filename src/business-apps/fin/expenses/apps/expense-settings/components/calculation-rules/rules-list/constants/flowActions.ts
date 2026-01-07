export interface FlowActionDef {
  nameKey: string
  nameFallback: string
  iconRelative?: string
  disabled?: boolean
  hidden?: boolean
  link?: string
  modalKey?: 'openCalculationRuleModal'
}

export const EXPENSE_CALCULATION_RULES_FLOW_ACTIONS: FlowActionDef[] = [
  {
    nameKey: 'lowcoder:employee_list.flows_button.actions',
    nameFallback: 'Actions',
    disabled: true
  },
  {
    nameKey: 'lowcoder:expense_calculation_rule.flow_button',
    nameFallback: 'Create Calculation Rule',
    iconRelative: '/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg',
    modalKey: 'openCalculationRuleModal'
  }
]
