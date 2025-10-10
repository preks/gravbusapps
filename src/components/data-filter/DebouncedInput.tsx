import React, { useState, useEffect, forwardRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'

/**
 * Props for the DebouncedInput component
 */
interface DebouncedInputProps {
  /** Current value to display in the input */
  value: string
  /** Function called when the debounced value changes */
  onChange: (value: string) => void
  /** Placeholder text for the input */
  placeholder?: string
  /** Additional CSS class names */
  className?: string
  /** Debounce delay in milliseconds */
  debounceDelay?: number
  /** Input aria-label for accessibility */
  ariaLabel?: string
  /** data-testid attribute for testing */
  'data-testid'?: string
}

/**
 * A text input component that debounces changes to avoid excessive updates
 * Useful for search fields where we want to delay API calls while the user is typing
 */
export const DebouncedInput = forwardRef<HTMLInputElement, DebouncedInputProps>(
  (
    {
      // Props destructuring
      value,
      onChange,
      placeholder = 'Search...',
      className = '',
      debounceDelay = 300,
      ariaLabel = 'Search',
      'data-testid': dataTestId = 'debounced-input'
    },
    ref
  ) => {
    // Local state for immediate UI feedback
    const [localValue, setLocalValue] = useState(value)

    // Update local value when prop value changes
    useEffect(() => {
      setLocalValue(value)
    }, [value])

    // Debounce the local value changes
    const debouncedValue = useDebounce(localValue, debounceDelay)

    // Call onChange when the debounced value changes
    useEffect(() => {
      if (debouncedValue !== value) {
        onChange(debouncedValue)
      }
    }, [debouncedValue, onChange, value])

    // Handle local input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value)
    }

    return (
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        aria-label={ariaLabel}
        ref={ref}
        data-testid={dataTestId}
      />
    )
  }
)
