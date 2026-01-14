/**
 * Custom hook for numeric input handling
 * Follows Single Responsibility Principle and Dependency Inversion
 */

import { useState, useCallback } from 'react'
import { validateKeyPress, validateNumericInput, validatePastedContent } from '../utils/inputValidation'

export interface NumericInputOptions {
  maxDecimals?: number
  allowNegative?: boolean
  maxValue?: number
  minValue?: number
  onValidationError?: (error: string) => void
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
  initialValue: number = 0,
  onChange: (value: number) => void,
  options: NumericInputOptions = {}
): NumericInputHook => {
  const [displayValue, setDisplayValue] = useState(
    initialValue > 0 ? initialValue.toFixed(options.maxDecimals || 2) : ''
  )
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    if (error) {
      setError(null)
    }
  }, [error])

  const reportError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage)
      options.onValidationError?.(errorMessage)
    },
    [options]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const validation = validateKeyPress(e, { allowNegative: options.allowNegative })

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
    [displayValue, options.allowNegative, clearError]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      const validation = validateNumericInput(inputValue, displayValue, options)

      if (!validation.isValid) {
        reportError(validation.error || 'Invalid input')
        return
      }

      clearError()
      setDisplayValue(validation.cleanedValue)

      const parsedValue = parseFloat(validation.cleanedValue) || 0
      onChange(parsedValue)
    },
    [displayValue, options, onChange, clearError, reportError]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()

      const pastedText = e.clipboardData.getData('text')
      const validation = validatePastedContent(pastedText, displayValue, options)

      if (!validation.isValid) {
        reportError(validation.error || 'Invalid paste content')
        return
      }

      // Simulate change event with the new value
      const newValue = displayValue + validation.cleanedValue
      const syntheticEvent = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLInputElement>

      handleChange(syntheticEvent)
    },
    [displayValue, options, handleChange, reportError]
  )

  const setValue = useCallback(
    (value: number) => {
      const formatted = value > 0 ? value.toFixed(options.maxDecimals || 2) : ''
      setDisplayValue(formatted)
      clearError()
    },
    [options.maxDecimals, clearError]
  )

  return {
    displayValue,
    numericValue: parseFloat(displayValue) || 0,
    handleKeyDown,
    handleChange,
    handlePaste,
    setValue,
    error
  }
}
