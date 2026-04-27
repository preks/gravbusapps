import { z } from 'zod'

export const compensationBandSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
    description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
    minSalary: z.number().min(0, 'Minimum salary must be greater than or equal to 0'),
    maxSalary: z.number().min(0, 'Maximum salary must be greater than or equal to 0'),
    currencyRef: z.string().min(1, 'Currency is required')
  })
  .refine(data => data.maxSalary >= data.minSalary, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['maxSalary']
  })

export type CompensationBandFormValues = z.infer<typeof compensationBandSchema>

/**
 * Validates a compensation band name against existing names
 * @param name - The name to validate
 * @param usedNames - Array of already used names
 * @returns Error message if invalid, null if valid
 */
export function validateCompensationBandName(name: string, usedNames: string[] = []): string | null {
  if (!name) {
    return 'Name is required'
  }

  if (name.length > 100) {
    return 'Name must be less than 100 characters'
  }

  if (usedNames.includes(name.trim())) {
    return 'This name is already in use'
  }

  return null
}
