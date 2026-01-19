/**
 * Validation utilities following Single Responsibility Principle
 * Each function has one reason to change
 */

import { FormData } from '../types/FormTypes'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates required form fields
 * Follows Single Responsibility Principle
 */
export const validateRequiredFields = (formData: FormData): ValidationResult => {
  const errors: string[] = []

  if (!formData.expensePlanId) {
    errors.push('Expense plan is required')
  }

  if (!formData.amount || formData.amount <= 0) {
    errors.push('Amount must be greater than 0')
  }

  if (!formData.currency) {
    errors.push('Currency is required')
  }

  if (!formData.costCenter) {
    errors.push('Cost center is required')
  }

  if (!formData.paymentMethod) {
    errors.push('Payment method is required')
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
export const validateAmountLimit = (amount: number, maxAmount: number): ValidationResult => {
  if (amount > maxAmount) {
    return {
      isValid: false,
      errors: ["Advance Payment amount can't be greater than Estimated Expenses and Allowances amount"]
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
export const validateForm = (formData: FormData, maxAmount: number): ValidationResult => {
  const requiredFieldsResult = validateRequiredFields(formData)
  const amountLimitResult = validateAmountLimit(formData.amount, maxAmount)

  const allErrors = [...requiredFieldsResult.errors, ...amountLimitResult.errors]

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}
