import React from 'react';
import { Form, Input, Select, Upload, Button, Checkbox, Radio } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { InputType } from '../../types/flowTemplate';

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
        
      case InputType.RADIO:
      case 'radio': // Handle lowercase for backward compatibility
        return (
          <Radio.Group
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          >
            {input.options?.map((option: any, optIndex: number) => (
              <div key={optIndex} style={{ marginBottom: '8px' }}>
                <Radio value={option.value} disabled={readOnly}>
                  {option.label}
                </Radio>
              </div>
            ))}
          </Radio.Group>
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

        
      case InputType.FILE:
        return (
          <Upload
            beforeUpload={() => false} // Prevent auto upload
            data-testid={`${testId}-input-${index}`}
            disabled={readOnly}
          >
            <Button icon={<PaperClipOutlined />} disabled={readOnly}>
              {getTranslationFromI18nKeyAndLabel('flow.step.selectFile', 'Select File')}
            </Button>
          </Upload>
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
        ...(input.type === InputType.CHECKBOX && input.required && !readOnly 
          ? [{ validator: (_: any, value: boolean | string[]) => {
              // For checkbox groups (multiple options), check if at least one is selected
              if (input.options && input.options.length > 0) {
                return (Array.isArray(value) && value.length > 0) 
                  ? Promise.resolve() 
                  : Promise.reject(new Error(`${input.label} is required`));
              }
              // For single checkbox, check if it's checked
              return value ? Promise.resolve() : Promise.reject(new Error(`${input.label} is required`));
            }}]
          : []
        ),
        ...(input.type !== InputType.CHECKBOX && input.required && !readOnly 
          ? [{ required: true, message: `${input.label} is required` }]
          : []
        ),
        ...(input.type === InputType.NUMBER ? [{ type: 'number' as const, message: 'Please enter a valid number' }] : [])
      ]}
    >
      {renderInputField()}
    </Form.Item>
  );
}; 