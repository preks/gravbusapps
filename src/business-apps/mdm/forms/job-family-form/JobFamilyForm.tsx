import React from 'react';
import { Button, Form, Input } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface JobFamily {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  children?: JobFamily[];
}

export interface JobFamilyFormProps extends BusinessAppContextProps {
  initialValues?: Partial<JobFamily>;
  onSubmit?: (values: Partial<JobFamily>) => void;
  onCancel?: () => void;
  selectedParentId?: string | null;
  selectedParentName?: string;
  prefixDataTestId?: string;
}

const JobFamilyForm: React.FC<JobFamilyFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  selectedParentId,
  selectedParentName,
  prefixDataTestId,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name || '',
        code: initialValues.code || '',
        description: initialValues.description || '',
      });
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
      className="gba-mt-4"
      data-testid={`${prefixDataTestId || ''}-JobFamilyForm`}
    >
      <Form.Item
        name="name"
        label="Family Name"
        rules={[{ required: true, message: 'Please enter family name' }]}
      >
        <Input placeholder="e.g., Engineering, Sales, Marketing" />
      </Form.Item>
      
      <Form.Item
        name="code"
        label="Code"
        rules={[{ required: true, message: 'Please enter code' }]}
      >
        <Input placeholder="e.g., ENG, SALES, MKT" />
      </Form.Item>
      
      <Form.Item
        name="description"
        label="Description"
      >
        <Input.TextArea 
          placeholder="Describe this job family and the types of roles it contains"
          rows={3}
        />
      </Form.Item>

      {selectedParentId && (
        <Form.Item label="Parent Family">
          <Input 
            value={selectedParentName || 'Unknown'} 
            disabled 
            placeholder="This will be a child of the selected family"
          />
        </Form.Item>
      )}

      <div className="gba-flex gba-justify-end gba-gap-2 gba-mt-4">
        <Form.Item>
          <Button 
            onClick={handleCancel}
            data-testid={`${prefixDataTestId || ''}-JobFamilyForm-CancelButton`}
          >
            Cancel
          </Button>
        </Form.Item>
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleSubmit}
            data-testid={`${prefixDataTestId || ''}-JobFamilyForm-SubmitButton`}
          >
            Save
          </Button>
        </Form.Item>
      </div>
    </Form>
  );
};

export default JobFamilyForm;
