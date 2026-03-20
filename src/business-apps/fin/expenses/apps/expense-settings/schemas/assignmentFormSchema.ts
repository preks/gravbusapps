import { z } from 'zod'

/**
 * Zod schema for AssignmentForm validation
 * Note: expenseRuleId is required, other fields are optional assignment targets
 */
export const assignmentFormSchema = z.object({
  id: z.string().optional(),
  assignmentOrder: z.number().min(1, 'Order must be at least 1'),
  cascading: z.boolean(),
  applicants: z.boolean(),
  activeFrom: z.string().optional(),
  activeTo: z.string().optional(),
  expenseRuleId: z.string().min(1, 'Expense rule is required'),
  employeeId: z.string().optional(),
  companyId: z.string().optional(),
  organizationalUnitId: z.string().optional(),
  siteLocationId: z.string().optional(),
  employmentTypeRef: z.string().optional(),
  contractTypeRef: z.string().optional()
})

export type AssignmentFormSchema = z.infer<typeof assignmentFormSchema>
