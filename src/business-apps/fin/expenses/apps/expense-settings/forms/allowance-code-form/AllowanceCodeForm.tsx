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
  TravelLocation, 
  AllowanceType,
  getTravelLocationOptions, 
  getAllowanceTypeOptions,
  convertTravelLocationToAbroad,
  convertAbroadToTravelLocation
} from '../../types/ExpenseEnums';
import { ExpenseRuleAllowanceCode } from '../../types/ExpenseRuleTypes';
import { useGetExpenseRuleAllowanceCodeById } from '../../queries/ExpenseRuleQueries';

const { Title } = Typography;
const { Option } = Select;

export interface AllowanceCodeFormData {
  id?: string;
  code: string;
  amount: number;
  travelLocation?: TravelLocation;
  allowanceType?: AllowanceType;
  calculation?: string;
  codeOrder: number;
}

interface AllowanceCodeFormProps extends BusinessAppContextProps {
  initialData?: ExpenseRuleAllowanceCode;
  isEditing?: boolean;
  onSave: (data: AllowanceCodeFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const AllowanceCodeForm: React.FC<AllowanceCodeFormProps> = ({
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

  // ✅ NEW: Hook for fetching fresh allowance code data
  const { fetchExpenseRuleAllowanceCodeById } = useGetExpenseRuleAllowanceCodeById({ accessToken } as BusinessAppContextProps);

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleAllowanceCodeById(initialData.id);
          if (freshData) {
            form.setFieldsValue({
              code: freshData.code,
              amount: freshData.amount,
              travelLocation: convertAbroadToTravelLocation(freshData.abroad),
              allowanceType: freshData.allowanceType,
              calculation: freshData.calculation,
              codeOrder: freshData.codeOrder || 1
            });
            return;
          }
        } catch (error) {
          console.error('Failed to load fresh allowance code data:', error);
          // Continue with fallback to initial data
        }
      }
      
      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        form.setFieldsValue({
          code: initialData.code,
          amount: initialData.amount,
          travelLocation: convertAbroadToTravelLocation(initialData.abroad),
          allowanceType: initialData.allowanceType,
          calculation: initialData.calculation,
          codeOrder: initialData.codeOrder || 1
        });
      } else {
        // Set defaults for new allowance code
        form.setFieldsValue({
          amount: 0,
          codeOrder: 1,
          travelLocation: TravelLocation.BOTH
        });
      }
    };

    loadData();
  }, [initialData?.id, isEditing, form, fetchExpenseRuleAllowanceCodeById]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData: AllowanceCodeFormData = {
        ...values,
        id: initialData?.id
      };

      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allowance code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <div data-testid="allowance-code-form-container">
      <Card>
        <Title level={4} style={{ margin: 0, marginBottom: 16 }}>
          {isEditing ? 'Edit Allowance Code' : 'Create New Allowance Code'}
        </Title>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            icon={<PiWarning />}
            style={{ marginBottom: 16 }}
            data-testid="allowance-code-form-error"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          data-testid="allowance-code-form"
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="code"
                label="Allowance Code"
                rules={[
                  { required: true, message: 'Allowance code is required' },
                  { max: 10, message: 'Code cannot exceed 10 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter code (e.g., LHD)"
                  data-testid="allowance-code-form-code-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[
                  { required: true, message: 'Amount is required' }
                ]}
              >
                <InputNumber 
                  min={0}
                  step={0.01}
                  placeholder="Enter amount"
                  style={{ width: '100%' }}
                  data-testid="allowance-code-form-amount-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="codeOrder"
                label="Display Order"
                rules={[
                  { required: true, message: 'Display order is required' }
                ]}
              >
                <InputNumber 
                  min={1}
                  placeholder="Enter order"
                  style={{ width: '100%' }}
                  data-testid="allowance-code-form-order-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="travelLocation"
                label="Travel Location"
                rules={[
                  { required: true, message: 'Travel location is required' }
                ]}
              >
                <Select
                  placeholder="Select travel location"
                  data-testid="allowance-code-form-travel-location-select"
                >
                  {getTravelLocationOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="allowanceType"
                label="Allowance Type"
                rules={[
                  { required: true, message: 'Allowance type is required' }
                ]}
              >
                <Select
                  placeholder="Select allowance type"
                  data-testid="allowance-code-form-allowance-type-select"
                >
                  {getAllowanceTypeOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="calculation"
                label="Calculation Formula"
              >
                <Input 
                  placeholder="Enter calculation formula (optional)"
                  data-testid="allowance-code-form-calculation-input"
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
                data-testid="allowance-code-form-save-button"
              >
                {isEditing ? 'Update Allowance Code' : 'Create Allowance Code'}
              </Button>
              <Button
                onClick={handleCancel}
                icon={<PiX />}
                data-testid="allowance-code-form-cancel-button"
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

export default AllowanceCodeForm; 