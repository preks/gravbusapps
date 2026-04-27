import { z } from 'zod'

export const jobFunctionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20, 'Code must be less than 20 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores')
    .trim(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
  jobFamily: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string()
    })
    .nullable()
})

export type JobFunctionFormValues = z.infer<typeof jobFunctionSchema>

export const validateJobFunctionCode = (code: string, usedCodes: string[] = []): string | null => {
  if (!code) return 'Code is required'
  if (code.length > 20) return 'Code must be less than 20 characters'
  if (!/^[A-Z0-9_]+$/.test(code)) return 'Code must contain only uppercase letters, numbers, and underscores'
  if (usedCodes.includes(code)) return 'This code is already in use'
  return null
}
