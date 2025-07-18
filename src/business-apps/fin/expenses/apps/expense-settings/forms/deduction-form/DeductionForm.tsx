import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Form, 
  Select, 
  Switch,
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
  DeductionDay,
  getDeductionDayOptions
} from '../../types/ExpenseEnums';
import { ExpenseRuleDeduction } from '../../types/ExpenseRuleTypes';

const { Title } = Typography;
const { Option } = Select;

export interface DeductionFormData {
  id?: string;
  deductBreakfast: boolean;
  deductLunch: boolean;
  deductDinner: boolean;
  deductionDay?: DeductionDay;
  deductionOrder: number;
  overnightAllowance: boolean;
}

interface DeductionFormProps extends BusinessAppContextProps {
  initialData?: ExpenseRuleDeduction;
  isEditing?: boolean;
  onSave: (data: DeductionFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const DeductionForm: React.FC<DeductionFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with data
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        deductBreakfast: initialData.deductBreakfast,
        deductLunch: initialData.deductLunch,
        deductDinner: initialData.deductDinner,
        deductionDay: initialData.deductionDay,
        deductionOrder: initialData.deductionOrder,
        overnightAllowance: initialData.overnightAllowance
      });
    } else {
      // Set defaults for new deduction
      form.setFieldsValue({
        deductBreakfast: false,
        deductLunch: false,
        deductDinner: false,
        deductionOrder: 1,
        overnightAllowance: false,
        deductionDay: DeductionDay.FIRST_DAY
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData: DeductionFormData = {
        ...values,
        id: initialData?.id
      };

      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deduction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <div data-testid="deduction-form-container">
      <Card>
        <Title level={4} style={{ margin: 0, marginBottom: 16 }}>
          {isEditing ? 'Edit Deduction Rule' : 'Create New Deduction Rule'}
        </Title>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            icon={<PiWarning />}
            style={{ marginBottom: 16 }}
            data-testid="deduction-form-error"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          data-testid="deduction-form"
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="deductionDay"
                label="Deduction Day"
                rules={[
                  { required: true, message: 'Deduction day is required' }
                ]}
              >
                <Select
                  placeholder="Select deduction day"
                  data-testid="deduction-form-deduction-day-select"
                >
                  {getDeductionDayOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="deductionOrder"
                label="Deduction Order"
                rules={[
                  { required: true, message: 'Deduction order is required' }
                ]}
              >
                <InputNumber 
                  min={1}
                  placeholder="Enter order"
                  style={{ width: '100%' }}
                  data-testid="deduction-form-order-input"
                />
              </Form.Item>
            </Col>
          </Row>

          <Card 
            title="Meal Deductions"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="deductBreakfast"
                  valuePropName="checked"
                  label="Deduct Breakfast"
                >
                  <Switch 
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    data-testid="deduction-form-breakfast-switch"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="deductLunch"
                  valuePropName="checked"
                  label="Deduct Lunch"
                >
                  <Switch 
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    data-testid="deduction-form-lunch-switch"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="deductDinner"
                  valuePropName="checked"
                  label="Deduct Dinner"
                >
                  <Switch 
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    data-testid="deduction-form-dinner-switch"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card 
            title="Additional Options"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="overnightAllowance"
                  valuePropName="checked"
                  label="Overnight Allowance"
                >
                  <Switch 
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                    data-testid="deduction-form-overnight-switch"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting || loading}
                icon={<PiFloppyDisk />}
                data-testid="deduction-form-save-button"
              >
                {isEditing ? 'Update Deduction Rule' : 'Create Deduction Rule'}
              </Button>
              <Button
                onClick={handleCancel}
                icon={<PiX />}
                data-testid="deduction-form-cancel-button"
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

export default DeductionForm; 