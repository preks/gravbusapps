import React, { useState, useEffect, forwardRef } from 'react'
import { Input } from '@newwork/nw-design-system'
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
  /** Additional wrapper CSS class names */
  containerClassName?: string
  /** Debounce delay in milliseconds */
  debounceDelay?: number
  /** Input aria-label for accessibility */
  ariaLabel?: string
  /** data-testid attribute for testing */
  'data-testid'?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Input type (default: text) */
  type?: string
  /** Optional icon to display on the left side of the input */
  icon?: React.ReactNode
  /** onBlur handler */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  /** onFocus handler */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
}

/**
 * A text input component that debounces changes to avoid excessive updates.
 * Useful for search fields where we want to delay API calls while the user is typing.
 * Built on top of the nw-design-system Input component.
 */
export const DebouncedInput = forwardRef<HTMLInputElement, DebouncedInputProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Search...',
      className = '',
      containerClassName = '',
      debounceDelay = 300,
      ariaLabel = 'Search',
      'data-testid': dataTestId = 'debounced-input',
      disabled = false,
      type = 'text',
      icon,
      onBlur,
      onFocus
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
    }, [debouncedValue, onChange])

    // Handle local input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value)
    }

    return (
      <div className={`gba:relative ${containerClassName}`}>
        {icon && (
          <div className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:pointer-events-none gba:z-10">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          type={type}
          className={`${icon ? 'gba:!pl-10' : ''} ${className}`}
          placeholder={placeholder}
          value={localValue}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          aria-label={ariaLabel}
          data-testid={dataTestId}
          disabled={disabled}
        />
      </div>
    )
  }
)

DebouncedInput.displayName = 'DebouncedInput'
