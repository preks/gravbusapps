import React, { useState } from 'react';
import {
  Form, Input, Button, DatePicker, Checkbox, Radio, Select, 
  Upload, Card, Alert, Space, Typography, Divider
} from 'antd';
import { Upload as UploadIcon, Save, Send } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface TaskFormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  description?: string;
}

export interface TaskFormProps {
  fields: TaskFormField[];
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  isSubmitting?: boolean;
  initialValues?: Record<string, any>;
  showCompleteButton?: boolean;
  showSaveButton?: boolean;
  ticketId?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  fields,
  onSubmit,
  isSubmitting = false,
  initialValues = {},
  showCompleteButton = true,
  showSaveButton = false,
  ticketId,
}) => {
  const [form] = Form.useForm();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Transform form values based on field types
      const transformedValues: Record<string, any> = {};
      
      fields.forEach(field => {
        const value = values[field.name];
        
        switch (field.type.toLowerCase()) {
          case 'date':
          case 'datetime':
            if (value && (value instanceof Date || (value && typeof value.toISOString === 'function'))) {
              transformedValues[field.name] = value.toISOString();
            }
            break;
          
          case 'checkbox':
            // Handle both single checkbox and checkbox group
            if (field.options) {
              // Multiple checkboxes - array of selected values
              transformedValues[field.name] = value || [];
            } else {
              // Single checkbox - boolean value
              transformedValues[field.name] = !!value;
            }
            break;
          
          case 'number':
            transformedValues[field.name] = value ? Number(value) : null;
            break;
          
          default:
            transformedValues[field.name] = value;
        }
      });

      await onSubmit(transformedValues);
      setHasUnsavedChanges(false);
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Handle save draft (without completing task)
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // TODO: Implement save draft functionality
      console.log('Saving draft:', values);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Track form changes
  const handleFormChange = () => {
    setHasUnsavedChanges(true);
  };

  // Render form field based on type
  const renderFormField = (field: TaskFormField) => {
    const commonProps = {
      placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}...`,
    };

    switch (field.type.toLowerCase()) {
      case 'text':
      case 'string':
        return <Input {...commonProps} data-testid={`form-field-${field.name}`} />;
      
      case 'textarea':
        return (
          <TextArea 
            {...commonProps}
            rows={4}
            data-testid={`form-field-${field.name}`}
          />
        );
      
      case 'email':
        return (
          <Input 
            {...commonProps}
            type="email"
            data-testid={`form-field-${field.name}`}
          />
        );
      
      case 'number':
        return (
          <Input 
            {...commonProps}
            type="number"
            data-testid={`form-field-${field.name}`}
          />
        );
      
      case 'date':
        return (
          <DatePicker 
            style={{ width: '100%' }}
            placeholder={`Select ${field.label.toLowerCase()}`}
            data-testid={`form-field-${field.name}`}
          />
        );
      
      case 'datetime':
        return (
          <DatePicker 
            showTime
            style={{ width: '100%' }}
            placeholder={`Select ${field.label.toLowerCase()}`}
            data-testid={`form-field-${field.name}`}
          />
        );
      
      case 'select':
      case 'dropdown':
        return (
          <Select 
            {...commonProps}
            style={{ width: '100%' }}
            data-testid={`form-field-${field.name}`}
          >
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      
      case 'radio':
        return (
          <Radio.Group data-testid={`form-field-${field.name}`}>
            <Space direction="vertical">
              {field.options?.map(option => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        );
      
      case 'checkbox':
        if (field.options && field.options.length > 1) {
          // Multiple checkboxes
          return (
            <Checkbox.Group data-testid={`form-field-${field.name}`}>
              <Space direction="vertical">
                {field.options.map(option => (
                  <Checkbox key={option.value} value={option.value}>
                    {option.label}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          );
        } else {
          // Single checkbox
          return (
            <Checkbox data-testid={`form-field-${field.name}`}>
              {field.options?.[0]?.label || field.label}
            </Checkbox>
          );
        }
      
      case 'file':
      case 'upload':
        return (
          <Upload.Dragger
            name="file"
            multiple={false}
            action="/api/upload" // TODO: Implement file upload endpoint
            data-testid={`form-field-${field.name}`}
          >
            <p className="ant-upload-drag-icon">
              <UploadIcon className="gba:w-8 gba:h-8 gba:mx-auto" />
            </p>
            <p className="ant-upload-text">
              Click or drag file to upload for {field.label}
            </p>
          </Upload.Dragger>
        );
      
      default:
        // Fallback to text input
        return <Input {...commonProps} data-testid={`form-field-${field.name}`} />;
    }
  };

  return (
    <Card 
      title={
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Save className="gba:w-4 gba:h-4" />
            {getTranslationFromI18nKeyAndLabel('services.ticket.form.title', 'Complete Task Information')}
          </div>
          {hasUnsavedChanges && (
            <Text type="warning" className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('services.ticket.form.unsaved', 'Unsaved changes')}
            </Text>
          )}
        </div>
      }
      data-testid={`task-form-${ticketId}`}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleFormChange}
        data-testid="task-completion-form"
      >
        {fields.length === 0 ? (
          <Alert
            message={getTranslationFromI18nKeyAndLabel('services.ticket.form.no_fields', 'No additional information required')}
            description={getTranslationFromI18nKeyAndLabel('services.ticket.form.no_fields_desc', 'This task can be completed without filling out additional information.')}
            type="info"
            showIcon
            className="gba:mb-4"
          />
        ) : (
          <div className="gba:space-y-4">
            {fields.map((field, index) => (
              <div key={field.name} className="gba:space-y-2">
                <Form.Item
                  name={field.name}
                  label={
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Text strong>{field.label}</Text>
                      {field.required && <Text type="danger">*</Text>}
                      <Text 
                        type="secondary" 
                        className="gba:text-xs gba:bg-blue-100 gba:px-2 gba:py-1 gba:rounded"
                      >
                        {field.type.toUpperCase()}
                      </Text>
                    </div>
                  }
                  rules={[
                    {
                      required: field.required,
                      message: getTranslationFromI18nKeyAndLabel(
                        'services.ticket.form.required',
                        `${field.label} is required`
                      ),
                    },
                  ]}
                  extra={field.description}
                >
                  {renderFormField(field)}
                </Form.Item>
                
                {index < fields.length - 1 && <Divider className="gba:my-4" />}
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* Form Actions */}
        <div className="gba:flex gba:justify-between gba:items-center gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            {hasUnsavedChanges && (
              <Text type="warning" className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel('services.ticket.form.unsaved_warning', 'You have unsaved changes')}
              </Text>
            )}
          </div>
          
          <Space>
            {showSaveButton && (
              <Button
                icon={<Save className="gba:w-4 gba:h-4" />}
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                data-testid="save-draft-button"
              >
                {getTranslationFromI18nKeyAndLabel('services.ticket.form.save_draft', 'Save Draft')}
              </Button>
            )}
            
            {showCompleteButton && (
              <Button
                type="primary"
                icon={<Send className="gba:w-4 gba:h-4" />}
                onClick={handleSubmit}
                loading={isSubmitting}
                data-testid="complete-task-button"
              >
                {getTranslationFromI18nKeyAndLabel('services.ticket.form.complete_task', 'Complete Task')}
              </Button>
            )}
          </Space>
        </div>
      </Form>
    </Card>
  );
};
