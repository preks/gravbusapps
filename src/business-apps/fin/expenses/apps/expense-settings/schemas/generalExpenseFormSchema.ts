import { z } from 'zod'

/**
 * Zod schema for GeneralExpenseForm validation
 */
export const generalExpenseFormSchema = z.object({
  id: z.string().optional(),
  expenseRuleId: z.string(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  reimbursable: z.boolean().default(true),
  taxCodeRef: z.string().min(1, 'Tax Code is required'),
  taxValue: z.number().min(0).max(100).optional(),
  activeFrom: z.string().min(1, 'Valid From is required'),
  activeTo: z.string().optional(),
  expenseGroupRef: z.string().min(1, 'Expense Group is required'),
  version: z.number().optional(),
  additionalProperties: z.record(z.unknown()).optional()
})

export type GeneralExpenseFormSchema = z.infer<typeof generalExpenseFormSchema>

/**
 * Create a schema with date validation against rule dates
 */
export const createGeneralExpenseFormSchema = (ruleActiveFrom: string, ruleActiveTo?: string) => {
  return generalExpenseFormSchema.superRefine((data, ctx) => {
    const ruleFrom = new Date(ruleActiveFrom)
    const ruleTo = ruleActiveTo ? new Date(ruleActiveTo) : null
    const expenseFrom = new Date(data.activeFrom)
    const expenseTo = data.activeTo ? new Date(data.activeTo) : null

    if (expenseFrom < ruleFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Valid From cannot be before the rule's Valid From`,
        path: ['activeFrom']
      })
    }

    if (ruleTo && expenseFrom > ruleTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Valid From cannot be after the rule's Valid To`,
        path: ['activeFrom']
      })
    }

    if (ruleTo && expenseTo && expenseTo > ruleTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Valid To cannot be after the rule's Valid To`,
        path: ['activeTo']
      })
    }

    if (expenseTo && expenseFrom > expenseTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Valid To cannot be before Valid From`,
        path: ['activeTo']
      })
    }
  })
}
