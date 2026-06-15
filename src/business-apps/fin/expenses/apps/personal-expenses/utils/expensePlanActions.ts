export {
  generateExpensePlanOwnerActions,
  type ExpensePlanActionContext,
  type ExpensePlanActionSource,
  type GenerateExpensePlanActionsOptions
} from '@/business-apps/fin/expenses/common/utils/expensePlanOwnerActions'

import { generateExpensePlanOwnerActions } from '@/business-apps/fin/expenses/common/utils/expensePlanOwnerActions'

/** @deprecated Prefer `generateExpensePlanOwnerActions` with `t` as the third argument. */
export function generateExpensePlanActions(
  plan: Parameters<typeof generateExpensePlanOwnerActions>[0],
  context: Parameters<typeof generateExpensePlanOwnerActions>[1],
  options: {
    includeDetails?: boolean
    t: (key: string) => string
  }
) {
  return generateExpensePlanOwnerActions(plan, context, options.t, {
    includeDetails: options.includeDetails
  })
}
