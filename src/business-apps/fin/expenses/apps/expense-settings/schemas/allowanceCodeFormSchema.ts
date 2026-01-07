import { z } from 'zod'
import { TravelLocation, AllowanceType } from '../types/ExpenseEnums'

/**
 * Zod schema for AllowanceCodeForm validation
 */
export const allowanceCodeFormSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Allowance code is required').max(10, 'Code cannot exceed 10 characters'),
  amount: z.number({ required_error: 'Amount is required' }),
  travelLocation: z.nativeEnum(TravelLocation, {
    required_error: 'Travel location is required'
  }),
  allowanceType: z.nativeEnum(AllowanceType, {
    required_error: 'Allowance type is required'
  }),
  calculation: z.string().optional(),
  codeOrder: z.number({ required_error: 'Display order is required' }).min(1, 'Display order must be at least 1')
})

export type AllowanceCodeFormSchema = z.infer<typeof allowanceCodeFormSchema>
