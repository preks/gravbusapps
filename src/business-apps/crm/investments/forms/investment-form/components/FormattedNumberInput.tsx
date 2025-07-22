import React, { useState, useEffect, useRef } from 'react';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

interface FormattedNumberInputProps {
  name: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: string | number;
  step?: string | number;
  required?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}



const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  name,
  value,
  onChange,
  placeholder = "0.00",
  className = "",
  min = "0",
  step = "0.01",
  required = false,
  disabled = false,
  'data-testid': dataTestId,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user locale for formatting
  const locale = getCurrentActiveUserLocale() || 'en-US';
  
  // Create debug wrapper for onChange


  // Format number for display using user's locale
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Parse formatted number back to plain number string
  const parseFormattedNumber = (formattedValue: string): string => {
    if (!formattedValue || formattedValue.trim() === '') {
      return '';
    }

    // Simple approach: use the browser's built-in parsing with locale
    // This avoids manual separator detection which can cause issues
    const cleaned = formattedValue.replace(/[^\d.,-]/g, ''); // Keep only digits, dots, commas, and minus
    
    // Try parsing with browser's locale-aware parsing first
    const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
    const decimalSeparator = parts.find(part => part.type === 'decimal')?.value || '.';
    const groupSeparator = parts.find(part => part.type === 'group')?.value || ',';
    
    let normalized = cleaned;
    
    // Remove group separators (thousands separators)
    if (groupSeparator) {
      normalized = normalized.replace(new RegExp(`\\${groupSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '');
    }
    
    // Convert decimal separator to dot if needed
    if (decimalSeparator !== '.' && decimalSeparator) {
      const lastDecimalIndex = normalized.lastIndexOf(decimalSeparator);
      if (lastDecimalIndex !== -1) {
        normalized = normalized.substring(0, lastDecimalIndex) + '.' + normalized.substring(lastDecimalIndex + 1);
      }
    }
    

    
    return normalized;
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (!isNaN(numValue) && numValue !== 0) {
        const formatted = formatNumber(numValue);
        setDisplayValue(formatted);
      } else if (value === '' || value === '0' || value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(String(value));
      }
    }
  }, [value, isFocused, locale, name]);

  const handleFocus = () => {
    setIsFocused(true);
    
    // Show raw number when focused for easier editing
    // Use the original value instead of parsing the display value to avoid precision loss
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue !== 0) {
      setDisplayValue(String(numValue));
    } else {
      setDisplayValue(value ? String(value) : '');
    }
    
    // Select all text for easier editing
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Simplified approach: remove common formatting and parse
    let cleanValue = displayValue;
    
    // Remove spaces and common currency symbols
    cleanValue = cleanValue.replace(/[\s$€£¥]/g, '');
    
    // Try direct parse first (for simple numbers like "1000", "1234.56")
    let directParse = parseFloat(cleanValue);
    if (!isNaN(directParse)) {
      setDisplayValue(formatNumber(directParse));
      onChange(String(directParse));
      return;
    }
    
    // If direct parse fails, try removing common thousands separators
    // and replace common decimal separators
    let normalized = cleanValue;
    
    // Handle common thousands separators: remove them
    normalized = normalized.replace(/,/g, ''); // Remove commas (US style thousands)
    normalized = normalized.replace(/\s/g, ''); // Remove spaces (some locales use spaces)
    
    // Handle decimal separator: normalize to dot
    // Replace last comma with dot (for locales that use comma as decimal)
    const lastCommaIndex = normalized.lastIndexOf(',');
    const lastDotIndex = normalized.lastIndexOf('.');
    
    if (lastCommaIndex > lastDotIndex && lastCommaIndex !== -1) {
      // Comma appears after dot, likely decimal separator
      normalized = normalized.substring(0, lastCommaIndex) + '.' + normalized.substring(lastCommaIndex + 1);
    }
    
    const parsedValue = parseFloat(normalized);
    
         if (!isNaN(parsedValue)) {
       setDisplayValue(formatNumber(parsedValue));
       onChange(String(parsedValue));
     } else if (normalized === '' || normalized === '0') {
       setDisplayValue('');
       onChange('');
    } else {
      // Invalid input, revert to previous value
      const currentNumValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(currentNumValue) && currentNumValue !== 0) {
        setDisplayValue(formatNumber(currentNumValue));
      } else {
        setDisplayValue('');
      }
    }
  };

  const handleChange = (e: any) => {
    const inputValue = String(e.value || '');
    setDisplayValue(inputValue);

    // If user is typing, pass the raw value up without complex parsing
    if (isFocused) {
      // For simple input during typing, just clean up basic characters
      const cleanValue = inputValue.replace(/[^\d.-]/g, '');
      onChange(cleanValue);
    }
  };

  return (
    <input
      ref={inputRef}
      name={name}
      type="text" // Use text to allow formatting
      value={displayValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange({ value: e.target.value })}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`gba:w-full gba:border gba:border-gray-300 gba:rounded-md gba:px-3 gba:py-2 gba:text-sm gba:bg-white focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-blue-500 focus:gba:border-blue-500 disabled:gba:bg-gray-50 disabled:gba:text-gray-500 ${className}`}
      disabled={disabled}
      data-testid={dataTestId}
      inputMode="decimal" // Helps mobile keyboards
    />
  );
};

export default FormattedNumberInput; 