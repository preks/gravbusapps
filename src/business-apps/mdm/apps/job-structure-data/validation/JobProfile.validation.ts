import { z } from 'zod'

const jobFunctionSchema = z
  .object({
    id: z.string(),
    code: z.string().nullable(),
    name: z.string().nullable()
  })
  .nullable()

const jobLevelSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    hierarchyOrder: z.number()
  })
  .nullable()

const skillSchema = z.object({
  skillId: z.string(),
  skillName: z.string(),
  level: z.number().nullable()
})

export const jobProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20, 'Code must be less than 20 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores')
    .trim(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
  jobFunction: jobFunctionSchema,
  jobLevel: jobLevelSchema,
  skills: z.array(skillSchema).optional().default([])
})

export type JobProfileFormValues = z.infer<typeof jobProfileSchema>

/**
 * Validates a job profile code against existing codes
 * @param code - The code to validate
 * @param usedCodes - Array of already used codes
 * @returns Error message if invalid, null if valid
 */
export function validateJobProfileCode(code: string, usedCodes: string[] = []): string | null {
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
