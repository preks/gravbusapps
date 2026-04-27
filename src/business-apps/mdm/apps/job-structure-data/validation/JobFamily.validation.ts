import { z } from 'zod'

// ─── Form Values Type ────────────────────────────────────────────────────────

export interface JobFamilyFormValues {
  name: string
  code: string
  description: string
}

// ─── Validation Schema ──────────────────────────────────────────────────────

export const jobFamilySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  code: z.string().min(1, 'Code is required').max(20, 'Code must be at most 20 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional()
})

// ─── Validation Functions ───────────────────────────────────────────────────

export function validateJobFamilyCode(code: string, usedCodes: string[]): string | null {
  if (!code) {
    return 'Code is required'
  }
  if (!/^[A-Z0-9_]+$/.test(code)) {
    return 'Code must contain only uppercase letters, numbers, and underscores'
  }
  if (usedCodes.includes(code)) {
    return 'This code is already in use'
  }
  return null
}
