/**
 * Validation utilities following Single Responsibility Principle
 * Each function has one reason to change
 */

import { FormData } from '../types/FormTypes'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface RequestAdvancePaymentValidationMessages {
  expensePlanRequired: string
  amountRequired: string
  currencyRequired: string
  costCenterRequired: string
  paymentMethodRequired: string
  amountLimit: string
}

/**
 * Validates required form fields
 * Follows Single Responsibility Principle
 */
export const validateRequiredFields = (
  formData: FormData,
  messages: RequestAdvancePaymentValidationMessages
): ValidationResult => {
  const errors: string[] = []

  if (!formData.expensePlanId) {
    errors.push(messages.expensePlanRequired)
  }

  if (!formData.amount || formData.amount <= 0) {
    errors.push(messages.amountRequired)
  }

  if (!formData.currency) {
    errors.push(messages.currencyRequired)
  }

  if (!formData.costCenter) {
    errors.push(messages.costCenterRequired)
  }

  if (!formData.paymentMethod) {
    errors.push(messages.paymentMethodRequired)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates amount against maximum allowed
 * Follows Single Responsibility Principle
 */
export const validateAmountLimit = (
  amount: number,
  maxAmount: number,
  amountLimitMessage: string
): ValidationResult => {
  if (amount > maxAmount) {
    return {
      isValid: false,
      errors: [amountLimitMessage]
    }
  }

  return {
    isValid: true,
    errors: []
  }
}

/**
 * Combines all validation rules
 * Follows Open/Closed Principle - can add new validators without modifying existing ones
 */
export const validateForm = (
  formData: FormData,
  maxAmount: number,
  messages: RequestAdvancePaymentValidationMessages
): ValidationResult => {
  const requiredFieldsResult = validateRequiredFields(formData, messages)
  const amountLimitResult = validateAmountLimit(formData.amount, maxAmount, messages.amountLimit)

  const allErrors = [...requiredFieldsResult.errors, ...amountLimitResult.errors]

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}
