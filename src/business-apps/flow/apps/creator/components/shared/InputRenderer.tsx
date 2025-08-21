import React from 'react';
import { DatePicker, Checkbox } from 'antd';
import { 
  Input, 
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system';
import { InputType } from '@/common/network/flows/FlowTemplateClient';

interface InputRendererProps {
  input: any;
  index: number;
  testId?: string;
  readOnly?: boolean;
  value?: any;
  onChange?: (value: any) => void;
}

export const InputRenderer: React.FC<InputRendererProps> = ({
  input,
  index,
  testId = 'input-renderer',
  readOnly = false,
  value,
  onChange
}) => {
  const renderField = () => {
    switch (input.type) {
      case InputType.TEXTAREA:
        return (
          <div className="gba:mb-4">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {input.label}
            </label>
            <Textarea
              rows={4}
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
            />
          </div>
        );
        
      case InputType.SELECT:
        return (
          <div className="gba:mb-4">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {input.label}
            </label>
            <Select 
              disabled={readOnly}
              value={value || ''}
              onValueChange={(newValue) => {
                console.log('Select value changing to:', newValue);
                onChange?.(newValue);
              }}
            >
              <SelectTrigger data-testid={`${testId}-input-${index}`}>
                <SelectValue placeholder={input.placeholder || `Select ${input.label}`} />
              </SelectTrigger>
              <SelectContent>
                {input.options?.map((option: any, optIndex: number) => {
                  // Handle both string options and {label, value} objects
                  if (typeof option === 'string') {
                    return (
                      <SelectItem 
                        key={optIndex} 
                        value={option}
                      >
                        {option}
                      </SelectItem>
                    );
                  } else if (option && typeof option === 'object' && option.value && option.label) {
                    return (
                      <SelectItem 
                        key={optIndex} 
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    );
                  }
                  return null;
                })}
              </SelectContent>
            </Select>
          </div>
        );
        
      case InputType.MULTISELECT:
        return (
          <div className="gba:mb-4">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {input.label}
            </label>
            <Select 
              disabled={readOnly}
              value={value || ''}
              onValueChange={(newValue) => {
                console.log('MultiSelect value changing to:', newValue);
                onChange?.(newValue);
              }}
            >
              <SelectTrigger data-testid={`${testId}-input-${index}`}>
                <SelectValue placeholder={input.placeholder || `Select ${input.label}`} />
              </SelectTrigger>
              <SelectContent>
                {input.options?.map((option: any, optIndex: number) => {
                  // Handle both string options and {label, value} objects
                  if (typeof option === 'string') {
                    return (
                      <SelectItem 
                        key={optIndex} 
                        value={option}
                      >
                        {option}
                      </SelectItem>
                    );
                  } else if (option && typeof option === 'object' && option.value && option.label) {
                    return (
                      <SelectItem 
                        key={optIndex} 
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    );
                  }
                  return null;
                })}
              </SelectContent>
            </Select>
          </div>
        );
        
      case InputType.DATE:
        return (
          <div className="gba:mb-4">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {input.label}
            </label>
            <DatePicker
              placeholder={input.placeholder || `Select ${input.label}`}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value}
              onChange={(date) => onChange?.(date)}
            />
          </div>
        );
        
      case InputType.DATETIME:
        return (
          <div className="gba:mb-4">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {input.label}
            </label>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder={input.placeholder || `Select ${input.label}`}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value}
              onChange={(date) => onChange?.(date)}
            />
          </div>
        );
        
      case InputType.NUMBER:
      case InputType.TEXT:
      default:
        return (
          <div className="gba:mb-4">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {input.label}
            </label>
            <Input
              type={input.type === InputType.NUMBER ? 'number' : 'text'}
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
            />
          </div>
        );
        
      case InputType.CHECKBOX:
        // Handle checkbox group with options
        if (input.options && input.options.length > 0) {
          return (
            <div className="gba:mb-4">
              <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {input.label}
              </label>
              <Checkbox.Group
                data-testid={`${testId}-input-${index}`}
                disabled={readOnly}
                value={value || []}
                onChange={(checkedValues) => onChange?.(checkedValues)}
              >
                {input.options.map((option: any, optIndex: number) => (
                  <div key={optIndex} style={{ marginBottom: '8px' }}>
                    <Checkbox value={option.value} disabled={readOnly}>
                      {option.label}
                    </Checkbox>
                  </div>
                ))}
              </Checkbox.Group>
            </div>
          );
        }
        // Single checkbox fallback
        return (
          <div className="gba:mb-4">
            <Checkbox
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              checked={value || false}
              onChange={(e) => onChange?.(e.target.checked)}
            >
              {input.placeholder || input.label}
            </Checkbox>
          </div>
        );
    }
  };

  return renderField();
};