import { z } from 'zod'
import { BUDGET_PLAN_STATUS_OPTIONS } from '../../../../types/budgetPlanGraphqlEnums'

const statusTuple = BUDGET_PLAN_STATUS_OPTIONS as unknown as [string, ...string[]]

/** Normalize date strings for comparison (form `type="date"` vs API date / ISO). */
export function normalizeBudgetPlanDateKey(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const s = String(value).trim()
  if (s === '') {
    return null
  }
  return s.length >= 10 ? s.slice(0, 10) : s
}

export interface ExistingBudgetPlanDateRange {
  startDate: string | null
  endDate: string | null
}

export function buildCreateBudgetPlanFormSchema(
  t: (key: string) => string,
  options: { existingPlans: ReadonlyArray<ExistingBudgetPlanDateRange> }
) {
  const { existingPlans } = options

  return z
    .object({
      name: z.string().min(1, t('budget-plan-form-name-required')),
      description: z.string().optional(),
      fiscalYear: z.coerce.number().int().min(1900).max(2200),
      budgetPlanStatus: z.enum(statusTuple),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      effectiveDate: z.string().optional()
    })
    .superRefine((vals, ctx) => {
      const start = normalizeBudgetPlanDateKey(vals.startDate)
      const end = normalizeBudgetPlanDateKey(vals.endDate)
      if (start == null || end == null) {
        return
      }
      const duplicate = existingPlans.some(
        p => normalizeBudgetPlanDateKey(p.startDate) === start && normalizeBudgetPlanDateKey(p.endDate) === end
      )
      if (duplicate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('budget-plan-form-duplicate-date-range'),
          path: ['endDate']
        })
      }
    })
}

export type CreateBudgetPlanFormValues = z.infer<ReturnType<typeof buildCreateBudgetPlanFormSchema>>
