import { z } from 'zod'
import { BUDGET_PLAN_STATUS_OPTIONS } from '../../../../types/budgetPlanGraphqlEnums'

const statusTuple = BUDGET_PLAN_STATUS_OPTIONS as unknown as [string, ...string[]]

export function buildCreateBudgetPlanFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('budget-plan-form-name-required')),
    description: z.string().optional(),
    fiscalYear: z.coerce.number().int().min(1900).max(2200),
    budgetPlanStatus: z.enum(statusTuple),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    effectiveDate: z.string().optional()
  })
}

export type CreateBudgetPlanFormValues = z.infer<ReturnType<typeof buildCreateBudgetPlanFormSchema>>
