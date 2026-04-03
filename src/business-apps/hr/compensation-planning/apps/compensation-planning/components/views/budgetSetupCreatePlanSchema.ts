import { z } from 'zod'
import {
  BUDGET_DISTRIBUTION_METHOD_OPTIONS,
  DEFAULT_BUDGET_DISTRIBUTION_METHOD,
  type BudgetDistributionMethodApi
} from '../../../../types/budgetPlanGraphqlEnums'

function preprocessNum(min: number, max: number) {
  return z.preprocess(v => (typeof v === 'string' && v.trim() === '' ? 0 : v), z.coerce.number().min(min).max(max))
}

const distributionMethodValues = BUDGET_DISTRIBUTION_METHOD_OPTIONS as unknown as [
  BudgetDistributionMethodApi,
  ...BudgetDistributionMethodApi[]
]

export function buildCreateBudgetPlanFormSchema(translate: (key: string) => string) {
  return z.object({
    /** Links the company budget row to an existing compensation budget plan (dropdown). */
    compensationBudgetPlanId: z.string().min(1, translate('budget-setup-create-plan-select-plan-required')),
    salaryBudgetAmount: preprocessNum(-1e12, 1e12),
    salaryBudgetPercent: preprocessNum(-100, 1000),
    bonusBudgetAmount: preprocessNum(-1e12, 1e12),
    bonusBudgetPercent: preprocessNum(-100, 1000),
    distributionMethod: z.enum(distributionMethodValues, {
      errorMap: () => ({ message: translate('budget-setup-create-plan-distribution-required') })
    }),
    headcount: z.preprocess(
      v => (typeof v === 'string' && v.trim() === '' ? 0 : v),
      z.coerce.number().int().min(0).max(10_000_000)
    ),
    currencyRef: z.string().min(1, translate('budget-setup-create-plan-currency-required'))
  })
}

export type CreatePlanFormValues = z.infer<ReturnType<typeof buildCreateBudgetPlanFormSchema>>

/** Prefer toolbar selection when it exists in the list; otherwise first plan; otherwise empty. */
export function pickDefaultCompensationBudgetPlanId(
  plans: { id: string }[] | undefined,
  preferred: string | null | undefined
): string {
  const list = plans ?? []
  if (list.length === 0) {
    return ''
  }
  if (preferred && list.some(p => p.id === preferred)) {
    return preferred
  }
  return list[0].id
}

export function getDefaultCreatePlanFormValues(
  headcount: number,
  compensationBudgetPlanId: string,
  initialCurrencyRef = ''
): CreatePlanFormValues {
  return {
    compensationBudgetPlanId,
    salaryBudgetAmount: 0,
    salaryBudgetPercent: 0,
    bonusBudgetAmount: 0,
    bonusBudgetPercent: 0,
    distributionMethod: DEFAULT_BUDGET_DISTRIBUTION_METHOD,
    headcount,
    currencyRef: initialCurrencyRef
  }
}
