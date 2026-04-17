import { z } from 'zod'

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
  id: string
  startDate: string | null
  endDate: string | null
}

/**
 * Inclusive overlap on normalized ISO `YYYY-MM-DD` keys (lexicographic order matches calendar order).
 */
export function budgetPlanDateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function buildCreateBudgetPlanFormSchema(
  t: (key: string) => string,
  options: { existingPlans: ReadonlyArray<ExistingBudgetPlanDateRange>; excludePlanId?: string }
) {
  const { existingPlans, excludePlanId } = options

  return z
    .object({
      name: z.string().min(1, t('budget-plan-form-name-required')),
      description: z.string().optional(),
      fiscalYear: z.coerce.number().int().min(1900).max(2200),
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
      const overlapsExisting = existingPlans.some(p => {
        if (excludePlanId != null && p.id === excludePlanId) {
          return false
        }
        const pStart = normalizeBudgetPlanDateKey(p.startDate)
        const pEnd = normalizeBudgetPlanDateKey(p.endDate)
        if (pStart == null || pEnd == null) {
          return false
        }
        return budgetPlanDateRangesOverlap(start, end, pStart, pEnd)
      })
      if (overlapsExisting) {
        ctx.addIssue({
          code: 'custom',
          message: t('budget-plan-form-duplicate-date-range'),
          path: ['endDate']
        })
      }
    })
}

export type CreateBudgetPlanFormValues = z.infer<ReturnType<typeof buildCreateBudgetPlanFormSchema>>
