import { z } from 'zod'

/**
 * Zod schema for AllowanceRegionRuleForm validation
 */
export const allowanceRegionRuleFormSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  activeFrom: z.string().min(1, 'Active from is required'),
  activeTo: z.string().optional(),
  travelRegionSetRef: z.string().optional()
})

export type AllowanceRegionRuleFormSchema = z.infer<typeof allowanceRegionRuleFormSchema>
