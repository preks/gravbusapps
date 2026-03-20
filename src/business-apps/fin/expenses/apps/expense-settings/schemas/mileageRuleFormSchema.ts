import { z } from 'zod'

/**
 * Zod schema for MileageRuleDetail validation
 */
export const mileageRuleDetailFormSchema = z
  .object({
    id: z.string().optional(),
    version: z.number().optional(),
    limitFrom: z.number().optional(),
    limitTo: z.number().optional(),
    rateAmount: z.number().min(0, 'Rate amount must be positive'),
    detailOrder: z.number().min(1).default(1),
    activeFrom: z.string().min(1, 'Active from is required'),
    activeTo: z.string().optional(),
    tempId: z.string().optional(),
    mileageRuleId: z.string().optional(),
    additionalProperties: z.record(z.any()).optional()
  })
  .refine(
    data => {
      if (data.limitFrom !== undefined && data.limitTo !== undefined) {
        return data.limitFrom < data.limitTo
      }
      return true
    },
    {
      message: 'Limit from must be less than limit to',
      path: ['limitTo']
    }
  )
  .refine(
    data => {
      if (data.activeFrom && data.activeTo) {
        return new Date(data.activeFrom) < new Date(data.activeTo)
      }
      return true
    },
    {
      message: 'Active from must be before active to',
      path: ['activeTo']
    }
  )

/**
 * Zod schema for MileageRuleForm validation
 */
export const mileageRuleFormSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  code: z.string().min(1, 'Code is required'),
  ruleName: z.string().min(1, 'Rule name is required'),
  rulePeriod: z.string().min(1, 'Rule period is required'),
  activeFrom: z.string().min(1, 'Active from date is required'),
  activeTo: z.string().optional(),
  details: z.array(mileageRuleDetailFormSchema).min(1, 'At least one mileage detail is required')
})

export type MileageRuleDetailFormSchema = z.infer<typeof mileageRuleDetailFormSchema>
export type MileageRuleFormSchema = z.infer<typeof mileageRuleFormSchema>
