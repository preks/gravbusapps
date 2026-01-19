import React, { useState, useEffect } from 'react'
import { Input } from '@newwork/nw-design-system'
import { useNumericInput } from '../hooks/useNumericInput'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  'data-testid'?: string
  required?: boolean
  maxValue?: number
  minValue?: number
  onValidationError?: (error: string | null) => void
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  disabled = false,
  'data-testid': dataTestId,
  required = false,
  maxValue,
  minValue,
  onValidationError
}) => {
  const [isFocused, setIsFocused] = useState(false)

  // Use the custom hook for numeric input behavior
  const { displayValue, handleKeyDown, handleChange, handlePaste, setValue, error } = useNumericInput(value, onChange, {
    maxDecimals: 2,
    allowNegative: false,
    maxValue,
    minValue,
    onValidationError
  })

  // Update display value when prop value changes from parent
  useEffect(() => {
    if (!isFocused && value !== parseFloat(displayValue)) {
      setValue(value)
    }
  }, [value, isFocused, displayValue, setValue])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)

    // Show raw number when focused for easier editing
    if (value && value > 0) {
      setValue(value)
    }

    // Select all text for easier editing
    requestAnimationFrame(() => {
      e.target.select()
    })
  }

  const handleBlur = () => {
    setIsFocused(false)

    // Format the display value when losing focus
    const numericValue = parseFloat(displayValue) || 0
    if (numericValue > 0) {
      setValue(numericValue)
    }
  }

  // Notify parent of validation errors
  useEffect(() => {
    onValidationError?.(error)
  }, [error, onValidationError])

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      data-testid={dataTestId}
      className="gba:w-full gba:h-10 gba:border-none gba:bg-gray-100"
      inputMode="decimal"
    />
  )
}

export default AmountInput
