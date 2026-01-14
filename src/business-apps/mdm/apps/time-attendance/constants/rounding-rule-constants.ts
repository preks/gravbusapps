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
  { code: 'START_ROUNDING_TYPE', displayValue: 'Start Rounding' },
  { code: 'END_ROUNDING_TYPE', displayValue: 'End Rounding' }
]

// Validation schema for rounding rule detail row
export const roundingRuleDetailRowSchema = z.object({
  displayOrder: z.number().min(1, 'Display Order must be at least 1'),
  clockingType: z.string().min(1, 'Clocking Type is required'),
  roundingType: z.string().min(1, 'Rounding Type is required'),
  startTime: z.string().min(1, 'Start Time is required'),
  endTime: z.string().min(1, 'End Time is required'),
  gracePeriod: z.string().nullable(),
  roundingValue: z.string().min(1, 'Rounding Value is required'),
  onlyFirstLast: z.boolean()
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
