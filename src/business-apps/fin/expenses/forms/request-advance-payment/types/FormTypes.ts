/**
 * Form-related types following Interface Segregation Principle
 * Clients depend only on interfaces they use
 */

export interface FormData {
  expensePlanId: string
  amount: number
  currency: string
  costCenter: string
  paymentMethod: string
  notes: string
}

export interface FormValidationState {
  isValid: boolean
  errors: string[]
  validationError: string | null
}

export interface FormSubmissionState {
  isSubmitting: boolean
  error: string | null
}

/**
 * Props for form components following Interface Segregation Principle
 */
export interface BaseFormFieldProps {
  'data-testid'?: string
  disabled?: boolean
}

export interface SelectFieldProps extends BaseFormFieldProps {
  value: string
  onChange: (value: string) => void
}

export interface TextFieldProps extends BaseFormFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface NumberFieldProps extends BaseFormFieldProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  required?: boolean
}
