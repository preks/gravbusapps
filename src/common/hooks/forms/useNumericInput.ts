/**
 * Custom hook for numeric input handling
 * Follows Single Responsibility Principle and Dependency Inversion
 *
 * Shared hook for managing numeric inputs across the application
 * Used by: Expenses, HR Salaries, Bonuses, etc.
 */

import { useState, useCallback } from 'react'
import {
  validateKeyPress,
  validateNumericInput,
  validatePastedContent
} from '@/common/utils/validation/numericInputValidation'

export interface NumericInputOptions {
  maxDecimals?: number
  allowNegative?: boolean
  maxValue?: number
  minValue?: number
  onValidationError?: (error: string | null) => void
}

export interface NumericInputHook {
  displayValue: string
  numericValue: number
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  setValue: (value: number) => void
  error: string | null
}

/**
 * Hook that provides numeric input behavior
 * Follows Dependency Inversion - depends on validation abstractions
 */
export const useNumericInput = (
  initialValue: number | undefined | null,
  onChange: (value: number | undefined | null) => void,
  options: NumericInputOptions = {}
): NumericInputHook => {
  // Destructure options to ensure stable references for callbacks
  const { maxDecimals, allowNegative, maxValue, minValue, onValidationError } = options

  const [displayValue, setDisplayValue] = useState(() => {
    // Explicitly handle undefined/null/0 as empty state (no value entered yet)
    if (initialValue === null || initialValue === undefined || initialValue === 0) {
      return ''
    }
    // Format positive numbers or negative numbers when allowNegative is true
    if (initialValue > 0 || (allowNegative && initialValue < 0)) {
      return initialValue.toFixed(maxDecimals || 2)
    }
    return ''
  })
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    if (error) {
      setError(null)
      onValidationError?.(null)
    }
  }, [error, onValidationError])

  const reportError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage)
      onValidationError?.(errorMessage)
    },
    [onValidationError]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const validation = validateKeyPress(e, { allowNegative })

      if (!validation.isAllowed && validation.shouldPreventDefault) {
        e.preventDefault()
        return
      }

      // Special handling for decimal point
      if (e.key === '.' && displayValue.includes('.')) {
        e.preventDefault()
        return
      }

      clearError()
    },
    [displayValue, allowNegative, clearError]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      const validation = validateNumericInput(inputValue, displayValue, {
        maxDecimals,
        allowNegative,
        maxValue,
        minValue
      })

      clearError()

      // Handle empty or partial negative input (just "-")
      if (validation.cleanedValue === '' || validation.cleanedValue === '-') {
        setDisplayValue(validation.cleanedValue) // Keep "-" visible if typed
        onChange(null)
        return
      }

      // Set display value for valid numeric input
      setDisplayValue(validation.cleanedValue)

      // Parse the value
      let numericValue = Number.parseFloat(validation.cleanedValue)

      // If parsing fails (NaN), pass null instead of 0
      if (Number.isNaN(numericValue)) {
        onChange(null)
        return
      }

      // Clamp value to min/max range if provided
      if (maxValue !== undefined && numericValue > maxValue) {
        numericValue = maxValue
        setDisplayValue(maxValue.toString())
        reportError(`Value exceeds maximum of ${maxValue}`)
      }

      if (minValue !== undefined && numericValue < minValue) {
        numericValue = minValue
        setDisplayValue(minValue.toString())
        reportError(`Value is below minimum of ${Math.abs(minValue)}`)
      }

      onChange(numericValue)
    },
    [displayValue, maxDecimals, allowNegative, maxValue, minValue, onChange, clearError, reportError]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()

      const pastedText = e.clipboardData.getData('text')
      const validation = validatePastedContent(pastedText, displayValue, {
        maxDecimals,
        allowNegative,
        maxValue,
        minValue
      })

      if (!validation.isValid) {
        reportError(validation.error || 'Invalid paste content')
        return
      }

      // Get input element and selection range
      const input = e.currentTarget
      const selectionStart = input.selectionStart ?? displayValue.length
      const selectionEnd = input.selectionEnd ?? displayValue.length

      // Build new value by replacing selected text
      const newValue =
        displayValue.slice(0, selectionStart) + validation.cleanedValue + displayValue.slice(selectionEnd)

      // Simulate change event with the new value
      const syntheticEvent = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLInputElement>

      handleChange(syntheticEvent)

      // Restore caret position after paste
      const newCaretPosition = selectionStart + validation.cleanedValue.length
      requestAnimationFrame(() => {
        input.setSelectionRange(newCaretPosition, newCaretPosition)
      })
    },
    [displayValue, maxDecimals, allowNegative, maxValue, minValue, handleChange, reportError]
  )

  const setValue = useCallback(
    (value: number) => {
      // Clear display for invalid values, negatives (when not allowed), or zero
      if (!Number.isFinite(value) || (value < 0 && !allowNegative) || value === 0) {
        setDisplayValue('')
        clearError()
        onChange(null)
        return
      }

      // Format with toFixed and update display
      const formatted = value.toFixed(maxDecimals || 2)
      onChange(Number(formatted))
      setDisplayValue(formatted)
      clearError()
    },
    [maxDecimals, allowNegative, clearError, onChange]
  )

  return {
    displayValue,
    numericValue: Number.parseFloat(displayValue) || 0,
    handleKeyDown,
    handleChange,
    handlePaste,
    setValue,
    error
  }
}
