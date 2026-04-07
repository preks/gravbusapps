import { z } from 'zod'

/** Empty string = user has not entered a value yet (no default 0 in the field). */
function preprocessEmptyOrNumber(min: number, max: number) {
  return z.preprocess(
    (v: unknown) => {
      if (v === '' || v === null || v === undefined) return ''
      if (typeof v === 'string' && v.trim() === '') return ''
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isNaN(n)) return v
      return n
    },
    z.union([z.literal(''), z.number().min(min).max(max)])
  )
}

export function buildCreateBudgetPlanFormSchema(translate: (key: string) => string) {
  return z
    .object({
      /** Links the company budget row to an existing compensation budget plan (dropdown). */
      compensationBudgetPlanId: z.string().min(1, translate('budget-setup-create-plan-select-plan-required')),
      salaryBudgetAmount: preprocessEmptyOrNumber(-1e12, 1e12),
      salaryBudgetPercent: preprocessEmptyOrNumber(-100, 1000),
      currencyRef: z.string().min(1, translate('budget-setup-create-plan-currency-required'))
    })
    .refine(data => data.salaryBudgetAmount !== '' && data.salaryBudgetPercent !== '', {
      message: translate('budget-setup-create-plan-salary-budget-required'),
      path: ['salaryBudgetAmount']
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
  compensationBudgetPlanId: string,
  initialCurrencyRef = ''
): CreatePlanFormValues {
  return {
    compensationBudgetPlanId,
    salaryBudgetAmount: '',
    salaryBudgetPercent: '',
    currencyRef: initialCurrencyRef
  }
}
