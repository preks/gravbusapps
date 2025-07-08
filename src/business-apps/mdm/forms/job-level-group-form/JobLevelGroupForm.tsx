import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { JobLevel } from '../job-level/JobLevelForm';

export interface JobLevelGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  levels?: JobLevel[];
}

export interface JobLevelGroupFormProps extends BusinessAppContextProps {
  initialValues?: Partial<JobLevelGroup>;
  onSubmit?: (values: Partial<JobLevelGroup>) => void;
  onCancel?: () => void;
  prefixDataTestId?: string;
}

const JobLevelGroupForm: React.FC<JobLevelGroupFormProps> = ({
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
      data-testid={`${prefixDataTestId || ''}-JobLevelGroupForm`}
    >
      <Form.Item
        name="name"
        label="Group Name"
        rules={[{ required: true, message: 'Please enter group name' }]}
      >
        <Input placeholder="e.g., Software Engineering, Management, Sales" />
      </Form.Item>
      <Form.Item
        name="code"
        label="Code"
        rules={[{ required: true, message: 'Please enter code' }]}
      >
        <Input placeholder="e.g., SWE, MGT, SALES" />
      </Form.Item>
      <Form.Item
        name="description"
        label="Description"
      >
        <Input.TextArea 
          placeholder="Describe the career path and role types in this group"
          rows={3}
        />
      </Form.Item>

      <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
        <Form.Item>
          <Button 
            onClick={handleCancel}
            data-testid={`${prefixDataTestId || ''}-JobLevelGroupForm-CancelButton`}
          >
            Cancel
          </Button>
        </Form.Item>
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleSubmit}
            data-testid={`${prefixDataTestId || ''}-JobLevelGroupForm-SubmitButton`}
          >
            Save
          </Button>
        </Form.Item>
      </div>
    </Form>
  );
};

export default JobLevelGroupForm;
