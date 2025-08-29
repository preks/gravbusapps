import React, { useState, useEffect } from 'react';
import { Input } from '@newwork/nw-design-system';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  'data-testid'?: string;
  required?: boolean;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
  'data-testid': dataTestId,
  required = false
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      if (value && value > 0) {
        setDisplayValue(value.toFixed(2));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    
    // Show raw number when focused for easier editing
    if (value && value > 0) {
      setDisplayValue(String(value));
    } else {
      setDisplayValue('');
    }
    
    // Select all text for easier editing
    setTimeout(() => {
      e.target.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    let cleanValue = displayValue.trim();
    
    // If empty, set to 0
    if (!cleanValue) {
      setDisplayValue('');
      onChange(0);
      return;
    }
    
    // Parse the value
    const parsedValue = parseFloat(cleanValue);
    
    if (!isNaN(parsedValue)) {
      // If it's a whole number, add .00
      if (Number.isInteger(parsedValue)) {
        const formattedValue = parsedValue.toFixed(2);
        setDisplayValue(formattedValue);
        onChange(parseFloat(formattedValue));
      } else {
        // If it already has decimals, format to 2 decimal places
        const formattedValue = parsedValue.toFixed(2);
        setDisplayValue(formattedValue);
        onChange(parseFloat(formattedValue));
      }
    } else {
      // Invalid input, revert to previous value
      if (value && value > 0) {
        setDisplayValue(value.toFixed(2));
      } else {
        setDisplayValue('');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Only allow valid number input
    const cleanValue = inputValue.replace(/[^\d.-]/g, '');
    
    // Handle decimal places - limit to 2 decimal places
    if (cleanValue.includes('.')) {
      const parts = cleanValue.split('.');
      if (parts[1] && parts[1].length > 2) {
        const limitedValue = `${parts[0]}.${parts[1].substring(0, 2)}`;
        setDisplayValue(limitedValue);
        const parsedValue = parseFloat(limitedValue) || 0;
        onChange(parsedValue);
        return;
      }
    }
    
    const parsedValue = parseFloat(cleanValue) || 0;
    onChange(parsedValue);
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      data-testid={dataTestId}
      className="gba:w-full gba:h-10 gba:border-none gba:bg-gray-100"
      inputMode="decimal"
    />
  );
};

export default AmountInput;
