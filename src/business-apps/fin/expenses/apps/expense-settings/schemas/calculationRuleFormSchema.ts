import { z } from 'zod'

/**
 * Zod schema for CalculationRuleForm validation
 */
export const calculationRuleFormSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Rule code is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  standard: z.boolean(),
  activeFrom: z.string().min(1, 'Active from is required'),
  activeTo: z.string().optional(),
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
