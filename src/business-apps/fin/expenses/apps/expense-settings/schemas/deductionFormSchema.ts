import { z } from 'zod'
import { DeductionDay } from '../types/ExpenseEnums'

/**
 * Zod schema for DeductionForm validation
 */
export const deductionFormSchema = z.object({
  id: z.string().optional(),
  deductBreakfast: z.boolean().default(false),
  deductLunch: z.boolean().default(false),
  deductDinner: z.boolean().default(false),
  deductionDay: z.nativeEnum(DeductionDay, {
    required_error: 'Deduction day is required'
  }),
  deductionOrder: z
    .number({ required_error: 'Deduction order is required' })
    .min(1, 'Deduction order must be at least 1'),
  overnightAllowance: z.boolean().default(false)
})

export type DeductionFormSchema = z.infer<typeof deductionFormSchema>
