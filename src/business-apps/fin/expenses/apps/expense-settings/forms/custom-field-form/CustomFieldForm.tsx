import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Form, 
  Input, 
  Select, 
  InputNumber,
  Button, 
  Space, 
  Alert, 
  Typography, 
  Card,
  Row,
  Col
} from 'antd';
import { PiFloppyDisk, PiX, PiWarning } from 'react-icons/pi';
import { 
  RuleSource,
  getRuleSourceOptions
} from '../../types/ExpenseEnums';
import { ExpenseRuleCustomField } from '../../types/ExpenseRuleTypes';
import { useGetExpenseRuleOtherInfoById } from '../../queries/ExpenseRuleQueries';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface CustomFieldFormData {
  id?: string;
  fieldName: string;
  fieldValue: string;
  fieldType: string;
  ruleSource?: RuleSource;
  fieldOrder: number;
}

interface CustomFieldFormProps extends BusinessAppContextProps {
  initialData?: ExpenseRuleCustomField;
  isEditing?: boolean;
  onSave: (data: CustomFieldFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  loading = false,
  accessToken
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: Hook for fetching fresh custom field data
  const { fetchExpenseRuleOtherInfoById } = useGetExpenseRuleOtherInfoById({ accessToken } as BusinessAppContextProps);

  // Field type options
  const fieldTypeOptions = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'CURRENCY', label: 'Currency' },
    { value: 'PERCENTAGE', label: 'Percentage' }
  ];

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleOtherInfoById(initialData.id);
          if (freshData) {
            form.setFieldsValue({
              fieldName: freshData.source || 'Custom Field',
              fieldValue: freshData.infoValue,
              fieldType: 'TEXT', // Default value - map from freshData if available
              ruleSource: freshData.source || RuleSource.GENERAL_EXPENSE_RULE,
              fieldOrder: 1 // Default value - map from freshData if available
            });
            return;
          }
        } catch (error) {
          console.error('Failed to load fresh custom field data:', error);
          // Continue with fallback to initial data
        }
      }
      
      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        form.setFieldsValue({
          fieldName: initialData.fieldName,
          fieldValue: initialData.fieldValue,
          fieldType: initialData.fieldType,
          ruleSource: initialData.ruleSource,
          fieldOrder: initialData.fieldOrder
        });
      } else {
        // Set defaults for new custom field
        form.setFieldsValue({
          fieldType: 'TEXT',
          fieldOrder: 1,
          ruleSource: RuleSource.GENERAL_EXPENSE_RULE
        });
      }
    };

    loadData();
  }, [initialData?.id, isEditing, form, fetchExpenseRuleOtherInfoById]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData: CustomFieldFormData = {
        ...values,
        id: initialData?.id
      };

      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom field');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <div data-testid="custom-field-form-container">
      <Card>
        <Title level={4} style={{ margin: 0, marginBottom: 16 }}>
          {isEditing ? 'Edit Custom Field' : 'Create New Custom Field'}
        </Title>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            icon={<PiWarning />}
            style={{ marginBottom: 16 }}
            data-testid="custom-field-form-error"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          data-testid="custom-field-form"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="fieldName"
                label="Field Name"
                rules={[
                  { required: true, message: 'Field name is required' },
                  { max: 100, message: 'Field name cannot exceed 100 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter field name (e.g., Max Amount)"
                  data-testid="custom-field-form-name-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="fieldType"
                label="Field Type"
                rules={[
                  { required: true, message: 'Field type is required' }
                ]}
              >
                <Select
                  placeholder="Select field type"
                  data-testid="custom-field-form-type-select"
                >
                  {fieldTypeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="ruleSource"
                label="Rule Source"
                rules={[
                  { required: true, message: 'Rule source is required' }
                ]}
              >
                <Select
                  placeholder="Select rule source"
                  data-testid="custom-field-form-rule-source-select"
                >
                  {getRuleSourceOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="fieldOrder"
                label="Display Order"
                rules={[
                  { required: true, message: 'Display order is required' }
                ]}
              >
                <InputNumber 
                  min={1}
                  placeholder="Enter order"
                  style={{ width: '100%' }}
                  data-testid="custom-field-form-order-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="fieldValue"
                label="Field Value"
                rules={[
                  { required: true, message: 'Field value is required' }
                ]}
              >
                <TextArea 
                  rows={3}
                  placeholder="Enter field value or configuration"
                  data-testid="custom-field-form-value-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting || loading}
                icon={<PiFloppyDisk />}
                data-testid="custom-field-form-save-button"
              >
                {isEditing ? 'Update Custom Field' : 'Create Custom Field'}
              </Button>
              <Button
                onClick={handleCancel}
                icon={<PiX />}
                data-testid="custom-field-form-cancel-button"
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CustomFieldForm; 