import { z } from 'zod'

export const jobLevelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20, 'Code must be less than 20 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores')
    .trim(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
  hierarchyOrder: z
    .number()
    .int('Hierarchy order must be a whole number')
    .min(1, 'Hierarchy order must be at least 1')
    .max(99, 'Hierarchy order must be less than 100')
})

export type JobLevelFormValues = z.infer<typeof jobLevelSchema>

/**
 * Validates a job level code against existing codes
 * @param code - The code to validate
 * @param usedCodes - Array of already used codes
 * @returns Error message if invalid, null if valid
 */
export function validateJobLevelCode(code: string, usedCodes: string[] = []): string | null {
  if (!code) {
    return 'Code is required'
  }

  if (code.length > 20) {
    return 'Code must be less than 20 characters'
  }

  if (!/^[A-Z0-9_]+$/.test(code)) {
    return 'Code must contain only uppercase letters, numbers, and underscores'
  }

  if (usedCodes.includes(code.toUpperCase())) {
    return 'This code is already in use'
  }

  return null
}
