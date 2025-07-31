import React from 'react';
import { Form, Input, Select, DatePicker, Checkbox } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { InputType } from '@/common/network/flows/FlowTemplateClient';

const { TextArea } = Input;
const { Option } = Select;

interface InputRendererProps {
  input: any;
  index: number;
  testId?: string;
  readOnly?: boolean;
}

export const InputRenderer: React.FC<InputRendererProps> = ({
  input,
  index,
  testId = 'input-renderer',
  readOnly = false
}) => {
  // Use the actual input name if available, fallback to generic field name
  const fieldName = input.name || `input_${index}`;
  
  const renderInputField = () => {
    switch (input.type) {
      case InputType.TEXTAREA:
        return (
          <TextArea
            rows={4}
            placeholder={input.placeholder}
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          />
        );
        
      case InputType.SELECT:
        return (
          <Select
            placeholder={input.placeholder || `Select ${input.label}`}
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          >
            {input.options?.map((option: any, optIndex: number) => {
              // Handle both string options and {label, value} objects
              if (typeof option === 'string') {
                return <Option key={optIndex} value={option}>{option}</Option>;
              } else if (option && typeof option === 'object' && option.value && option.label) {
                return <Option key={optIndex} value={option.value}>{option.label}</Option>;
              }
              return null;
            })}
          </Select>
        );
        
      case InputType.MULTISELECT:
        return (
          <Select
            mode="multiple"
            placeholder={input.placeholder || `Select ${input.label}`}
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          >
            {input.options?.map((option: any, optIndex: number) => {
              // Handle both string options and {label, value} objects
              if (typeof option === 'string') {
                return <Option key={optIndex} value={option}>{option}</Option>;
              } else if (option && typeof option === 'object' && option.value && option.label) {
                return <Option key={optIndex} value={option.value}>{option.label}</Option>;
              }
              return null;
            })}
          </Select>
        );
        
      case InputType.DATE:
        return (
          <DatePicker
            placeholder={input.placeholder || `Select ${input.label}`}
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          />
        );
        
      case InputType.NUMBER:
        return (
          <Input
            type="number"
            placeholder={input.placeholder}
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          />
        );
        
      case InputType.CHECKBOX:
        // Handle checkbox group with options
        if (input.options && input.options.length > 0) {
          return (
            <Checkbox.Group
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
            >
              {input.options.map((option: any, optIndex: number) => (
                <div key={optIndex} style={{ marginBottom: '8px' }}>
                  <Checkbox value={option.value} disabled={readOnly}>
                    {option.label}
                  </Checkbox>
                </div>
              ))}
            </Checkbox.Group>
          );
        }
        // Single checkbox fallback
        return (
          <Checkbox
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          >
            {input.placeholder || input.label}
          </Checkbox>
        );
        
      default:
        return (
          <Input
            placeholder={input.placeholder}
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          />
        );
    }
  };

  return (
    <Form.Item
      key={index}
      name={fieldName}
      label={input.type === InputType.CHECKBOX ? undefined : input.label}
      valuePropName={input.type === InputType.CHECKBOX ? "checked" : "value"}
      rules={[
        // Validation for checkbox groups and multiselect (array values)
        ...((input.type === InputType.CHECKBOX || input.type === InputType.MULTISELECT) && input.required && !readOnly 
          ? [{ validator: (_: any, value: boolean | string[]) => {
              if (input.type === InputType.CHECKBOX && input.options && input.options.length > 0) {
                // Checkbox group - check if at least one is selected
                return (Array.isArray(value) && value.length > 0) 
                  ? Promise.resolve() 
                  : Promise.reject(new Error(`${input.label} is required`));
              } else if (input.type === InputType.CHECKBOX) {
                // Single checkbox - check if it's checked
                return value ? Promise.resolve() : Promise.reject(new Error(`${input.label} is required`));
              } else if (input.type === InputType.MULTISELECT) {
                // Multiselect - check if at least one is selected
                return (Array.isArray(value) && value.length > 0) 
                  ? Promise.resolve() 
                  : Promise.reject(new Error(`${input.label} is required`));
              }
              return Promise.resolve();
            }}]
          : []
        ),
        // Standard validation for other input types
        ...(![InputType.CHECKBOX, InputType.MULTISELECT].includes(input.type) && input.required && !readOnly 
          ? [{ required: true, message: `${input.label} is required` }]
          : []
        ),
        // Number type validation
        ...(input.type === InputType.NUMBER ? [{ type: 'number' as const, message: 'Please enter a valid number' }] : [])
      ]}
    >
      {renderInputField()}
    </Form.Item>
  );
}; 