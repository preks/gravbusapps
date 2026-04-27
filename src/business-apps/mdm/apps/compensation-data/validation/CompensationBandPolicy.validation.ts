import { z } from 'zod'

// ─── Form Values Type ────────────────────────────────────────────────────────

export interface CompensationBandPolicyFormValues {
  compensationBand: {
    id: string
    name: string
    description: string | null
  } | null
  jobLevel: {
    id: string
    code: string
    name: string
    hierarchyOrder: number
  } | null
  jobFamily: {
    id: string
    code: string
    name: string
  } | null
  geoZone: {
    id: string
    name: string
  } | null
  priority: number
}

// export type CompensationBandPolicyFormValues = z.infer<typeof compensationBandPolicySchema>

// ─── Validation Schema ──────────────────────────────────────────────────────

export const compensationBandPolicySchema = z.object({
  compensationBand: z
    .object({
      id: z.string().min(1, 'Compensation Band is required'),
      name: z.string(),
      description: z.string().nullable()
    })
    .nullable()
    .refine(val => val !== null, 'Compensation Band is required'),

  jobLevel: z
    .object({
      id: z.string().min(1, 'Job Level is required'),
      code: z.string(),
      name: z.string(),
      hierarchyOrder: z.number()
    })
    .nullable()
    .refine(val => val !== null, 'Job Level is required'),

  jobFamily: z
    .object({
      id: z.string().min(1, 'Job Family is required'),
      code: z.string(),
      name: z.string()
    })
    .nullable()
    .refine(val => val !== null, 'Job Family is required'),

  geoZone: z
    .object({
      id: z.string().min(1, 'Geo Zone is required'),
      name: z.string()
    })
    .nullable()
    .refine(val => val !== null, 'Geo Zone is required'),

  priority: z.number().min(1, 'Priority must be at least 1').max(1000, 'Priority must be at most 1000')
})

// ─── Validation Functions ───────────────────────────────────────────────────

export function validateCompensationBandPolicyPriority(priority: number): string | null {
  if (priority < 1) {
    return 'Priority must be at least 1'
  }
  if (priority > 1000) {
    return 'Priority must be at most 1000'
  }
  return null
}
