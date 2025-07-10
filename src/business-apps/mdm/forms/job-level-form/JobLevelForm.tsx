import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface JobLevel {
  id: string;
  name: string;
  code: string;
  level: number;
  experienceYears?: number;
  description?: string;
  compensationBandId?: string;
  groupId: string;
}

export interface JobLevelFormProps extends BusinessAppContextProps {
  initialValues?: Partial<JobLevel>;
  onSubmit?: (values: Partial<JobLevel>) => void;
  onCancel?: () => void;
  prefixDataTestId?: string;
}

const JobLevelForm: React.FC<JobLevelFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  prefixDataTestId,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [form, initialValues]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (onSubmit) {
        onSubmit(values);
      }
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className="gba:mt-4"
      data-testid={`${prefixDataTestId || ''}-JobLevelForm`}
    >
      <Form.Item
        name="name"
        label="Job Level Name"
        rules={[{ required: true, message: 'Please enter job level name' }]}
      >
        <Input placeholder="e.g., Senior Software Engineer, Engineering Manager" />
      </Form.Item>
      <Form.Item
        name="code"
        label="Code"
        rules={[{ required: true, message: 'Please enter code' }]}
      >
        <Input placeholder="e.g., SSE, EM" />
      </Form.Item>
      <Form.Item
        name="level"
        label="Level Number"
        rules={[{ required: true, message: 'Please enter level number' }]}
      >
        <InputNumber 
          min={1} 
          max={20} 
          placeholder="1-20" 
          className="gba:w-full"
        />
      </Form.Item>
      <Form.Item
        name="experienceYears"
        label="Experience Required (Years)"
      >
        <InputNumber 
          min={0} 
          max={30} 
          placeholder="Years of experience"
          className="gba:w-full"
        />
      </Form.Item>
      <Form.Item
        name="description"
        label="Description"
      >
        <Input.TextArea 
          placeholder="Describe the responsibilities and requirements for this level"
          rows={3}
        />
      </Form.Item>
      <Form.Item
        name="compensationBandId"
        label="Compensation Band"
      >
        <Select 
          placeholder="Select compensation band (optional)"
          allowClear
        >
          <Select.Option value="band1">AZ1 - Entry Level</Select.Option>
          <Select.Option value="band2">AZ2 - Junior</Select.Option>
          <Select.Option value="band3">AZ3 - Mid Level</Select.Option>
          <Select.Option value="band4">K/T1 - Senior</Select.Option>
          <Select.Option value="band5">K/T2 - Principal</Select.Option>
          <Select.Option value="band6">K/T3 - Staff</Select.Option>
        </Select>
      </Form.Item>

      <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
        <Form.Item>
          <Button 
            onClick={handleCancel}
            data-testid={`${prefixDataTestId || ''}-JobLevelForm-CancelButton`}
          >
            Cancel
          </Button>
        </Form.Item>
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleSubmit}
            data-testid={`${prefixDataTestId || ''}-JobLevelForm-SubmitButton`}
          >
            Save
          </Button>
        </Form.Item>
      </div>
    </Form>
  );
};

export default JobLevelForm;
