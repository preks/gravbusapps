import { z } from 'zod'

// Clocking Type Options
export const CLOCKING_TYPE_OPTIONS = [
  { code: 'IN_CLOCKING_TYPE', displayValue: 'Clocking In' },
  { code: 'OUT_CLOCKING_TYPE', displayValue: 'Clocking Out' },
  { code: 'ALL_CLOCKING_TYPE', displayValue: 'All' }
]

// Rounding Type Options
export const ROUNDING_TYPE_OPTIONS = [
  { code: 'UP_ROUNDING_TYPE', displayValue: 'Round Up' },
  { code: 'DOWN_ROUNDING_TYPE', displayValue: 'Round Down' },
  { code: 'START_ROUNDING_TYPE', displayValue: 'Round to Start' },
  { code: 'END_ROUNDING_TYPE', displayValue: 'Round to End' }
]

// Validation schema for rounding rule detail row
export const roundingRuleDetailRowSchema = z
  .object({
    displayOrder: z.number().min(1, 'Display Order must be at least 1'),
    clockingType: z.string().min(1, 'Clocking Type is required'),
    roundingType: z.string().min(1, 'Rounding Type is required'),
    startTime: z.string().min(1, 'Start Time is required'),
    endTime: z.string().min(1, 'End Time is required'),
    gracePeriod: z.string().nullable(),
    roundingValue: z.string().nullable(),
    onlyFirstLast: z.boolean()
  })
  .superRefine((data, ctx) => {
    // Rounding Value is required only for UP and DOWN rounding types
    const requiresRoundingValue = data.roundingType === 'UP_ROUNDING_TYPE' || data.roundingType === 'DOWN_ROUNDING_TYPE'

    if (requiresRoundingValue && (!data.roundingValue || data.roundingValue === '')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rounding Value is required for Round Up and Round Down types',
        path: ['roundingValue']
      })
    }
  })

export type RoundingRuleDetailRowFormData = z.infer<typeof roundingRuleDetailRowSchema>

// Default values for new rounding rule detail
export const getDefaultRoundingRuleDetailValues = (): RoundingRuleDetailRowFormData => ({
  displayOrder: 1,
  clockingType: '',
  roundingType: '',
  startTime: '',
  endTime: '',
  gracePeriod: null,
  roundingValue: '',
  onlyFirstLast: false
})

// Helper to determine which fields are required based on rounding type
export const getRequiredFieldsForRoundingRule = (
  roundingType: string | null | undefined
): {
  clockingType: boolean
  roundingType: boolean
  startTime: boolean
  endTime: boolean
  roundingValue: boolean
  gracePeriod: boolean
} => {
  // Rounding Value is only required for UP and DOWN rounding types
  // For START and END rounding types, roundingValue is disabled
  const isUpOrDown = roundingType === 'UP_ROUNDING_TYPE' || roundingType === 'DOWN_ROUNDING_TYPE'

  return {
    clockingType: true,
    roundingType: true,
    startTime: true,
    endTime: true,
    roundingValue: isUpOrDown,
    gracePeriod: false
  }
}

// Helper to check if rounding value field should be enabled
export const isRoundingValueEnabled = (roundingType: string | null | undefined): boolean => {
  return roundingType === 'UP_ROUNDING_TYPE' || roundingType === 'DOWN_ROUNDING_TYPE'
}
