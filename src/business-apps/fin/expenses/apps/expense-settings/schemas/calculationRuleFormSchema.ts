import { z } from 'zod'

/**
 * Custom date validation that ensures dates are within valid range
 */
const dateStringSchema = z.string().refine(
  val => {
    if (!val) return true // Optional dates can be empty
    const year = parseInt(val.split('-')[0])
    return year >= 1900 && year <= 9999
  },
  { message: 'Date year must be between 1900 and 9999' }
)

/**
 * Zod schema for CalculationRuleForm validation
 */
export const calculationRuleFormSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Rule code is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  standard: z.boolean(),
  activeFrom: dateStringSchema.refine(val => val && val.length > 0, { message: 'Active from is required' }),
  activeTo: dateStringSchema,
  deductionLimit: z.boolean(),
  useLastCountry: z.boolean(),
  useSingleCurrency: z.boolean(),
  taxesCode: z.string().optional(),
  nonpayableCode: z.string().optional(),
  advancePaymentCode: z.string().optional(),
  calculationTypeRef: z.string().optional(),
  countryRef: z.string().optional(),
  currencyRef: z.string().optional(),
  version: z.number().optional()
})

export type CalculationRuleFormSchema = z.infer<typeof calculationRuleFormSchema>
