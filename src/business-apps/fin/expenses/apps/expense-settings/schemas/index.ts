// Export all expense settings form schemas
export { allowanceCodeFormSchema, type AllowanceCodeFormSchema } from './allowanceCodeFormSchema'
export {
  generalExpenseFormSchema,
  createGeneralExpenseFormSchema,
  type GeneralExpenseFormSchema
} from './generalExpenseFormSchema'
export { deductionFormSchema, type DeductionFormSchema } from './deductionFormSchema'
export { calculationRuleFormSchema, type CalculationRuleFormSchema } from './calculationRuleFormSchema'
export {
  mileageRuleFormSchema,
  mileageRuleDetailFormSchema,
  type MileageRuleFormSchema,
  type MileageRuleDetailFormSchema
} from './mileageRuleFormSchema'
export { allowanceRegionRuleFormSchema, type AllowanceRegionRuleFormSchema } from './allowanceRegionRuleFormSchema'
export { assignmentFormSchema, type AssignmentFormSchema } from './assignmentFormSchema'
export { customFieldFormSchema, type CustomFieldFormSchema } from './customFieldFormSchema'

// Default export for screen entry point
import { allowanceCodeFormSchema } from './allowanceCodeFormSchema'
import { generalExpenseFormSchema, createGeneralExpenseFormSchema } from './generalExpenseFormSchema'
import { deductionFormSchema } from './deductionFormSchema'
import { calculationRuleFormSchema } from './calculationRuleFormSchema'
import { mileageRuleFormSchema, mileageRuleDetailFormSchema } from './mileageRuleFormSchema'
import { allowanceRegionRuleFormSchema } from './allowanceRegionRuleFormSchema'
import { assignmentFormSchema } from './assignmentFormSchema'
import { customFieldFormSchema } from './customFieldFormSchema'

export default {
  allowanceCodeFormSchema,
  generalExpenseFormSchema,
  createGeneralExpenseFormSchema,
  deductionFormSchema,
  calculationRuleFormSchema,
  mileageRuleFormSchema,
  mileageRuleDetailFormSchema,
  allowanceRegionRuleFormSchema,
  assignmentFormSchema,
  customFieldFormSchema
}
