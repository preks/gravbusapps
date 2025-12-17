import { z } from 'zod'
import { RuleSource } from '../types/ExpenseEnums'

/**
 * Zod schema for CustomFieldForm validation
 */
export const customFieldFormSchema = z.object({
  id: z.string().optional(),
  fieldName: z.string().min(1, 'Field name is required').max(100, 'Field name cannot exceed 100 characters'),
  fieldValue: z.string().min(1, 'Field value is required'),
  fieldType: z.string().min(1, 'Field type is required'),
  ruleSource: z.nativeEnum(RuleSource, {
    required_error: 'Rule source is required'
  }),
  fieldOrder: z.number({ required_error: 'Display order is required' }).min(1, 'Display order must be at least 1')
})

export type CustomFieldFormSchema = z.infer<typeof customFieldFormSchema>
