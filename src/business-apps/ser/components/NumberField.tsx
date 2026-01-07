import * as React from 'react';
import {
  Input,
  Label,
} from '@newwork/nw-design-system';
import { HashIcon } from '@phosphor-icons/react';

export interface NumberFieldProps {
  /** Field name for form identification */
  name: string;
  /** Field label */
  label: string;
  /** Whether to show the label (default: true) */
  showLabel?: boolean;
  /** Current value (number or string) */
  value?: number | string;
  /** Change handler */
  onChange: (value: number | string) => void;
  /** Blur handler for validation */
  onBlur?: () => void;
  /** Whether field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Field description */
  description?: string;
  /** Whether field has validation error */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testId?: string;
  /** Additional CSS classes */
  className?: string;
  /** HTML id attribute */
  id?: string;
}

/**
 * NumberField Component
 * 
 * A number input component that uses comma as decimal separator for European formatting.
 * Automatically converts between comma display (user-facing) and dot format (internal/API).
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  name,
  label,
  showLabel = true,
  value,
  onChange,
  onBlur,
  required = false,
  placeholder,
  description,
  hasError = false,
  errorMessage,
  disabled = false,
  testId = `number-field-${name}`,
  className = '',
  id,
  ...props
}) => {
  // Format number for display (dot to comma)
  const formatNumberForDisplay = React.useCallback((num: number | string): string => {
    if (num === '' || num === null || num === undefined) return '';
    return String(num).replace('.', ',');
  }, []);

  // Parse number from input (comma to dot) - allow partial input during typing
  const parseNumberFromInput = React.useCallback((input: string, currentValue: number | string): number | string => {
    if (!input || input.trim() === '') return '';
    
    // Prevent multiple decimal separators
    const dotCount = (input.match(/\./g) || []).length;
    const commaCount = (input.match(/,/g) || []).length;
    
    // If more than one decimal separator total, reject the input
    if (dotCount + commaCount > 1) {
      return currentValue || ''; // Return previous valid value
    }
    
    // Allow partial input like "11." or "11," during typing
    const normalizedInput = input.replace(',', '.');
    
    // If input ends with decimal separator, keep it as string for now
    if (normalizedInput.endsWith('.')) {
      return normalizedInput;
    }
    
    // Try to parse as number
    const parsed = parseFloat(normalizedInput);
    
    // If it's a valid number, return it
    if (!isNaN(parsed)) {
      return parsed;
    }
    
    // If it's not a valid number but contains valid characters, keep the string
    if (/^[0-9]*[.,]?[0-9]*$/.test(input)) {
      return normalizedInput;
    }
    
    // Otherwise, return empty
    return '';
  }, []);

  // Handle input change
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parseNumberFromInput(e.target.value, value || '');
    onChange(parsedValue);
  }, [onChange, parseNumberFromInput, value]);

  return (
    <div className="gba:space-y-2" data-testid={`${testId}-container`}>
      {/* Label - only show if showLabel is true */}
      {showLabel && (
        <Label 
          htmlFor={id || name} 
          className="gba:block gba:text-sm gba:font-medium gba:text-foreground"
          data-testid={`${testId}-label`}
        >
          <HashIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
          {label}
          {required && <span className="gba:text-destructive gba:ml-1">*</span>}
        </Label>
      )}

      {/* Description */}
      {description && (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-description`}>
          {description}
        </p>
      )}

      {/* Number Input */}
      <Input
        id={id || name}
        name={name}
        type="text"
        inputMode="decimal"
        value={formatNumberForDisplay(value || '')}
        onChange={handleInputChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${hasError ? 'gba:border-destructive' : ''} ${className}`}
        data-testid={testId}
        {...props}
      />

      {/* Error Message */}
      {hasError && errorMessage && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs" data-testid={`${testId}-error`}>
          <HashIcon className="gba:w-3 gba:h-3" />
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default NumberField;
