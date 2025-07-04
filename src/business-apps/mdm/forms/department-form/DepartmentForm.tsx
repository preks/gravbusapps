import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Department } from '../../apps/employment-data/types';
import { useTranslation } from 'react-i18next';

export interface DepartmentFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  initialValues?: Department;
  onSubmit?: (values: any) => Promise<void>;
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({
  prefixDataTestId,
  initialValues,
  onSubmit
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation('master-data');
  
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [form, initialValues]);
  
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (onSubmit) {
        await onSubmit(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };
  
  const handleCancel = () => {
    form.resetFields();
  };
  return (
      <Form
        form={form}
        layout="vertical"
        data-testid={`${prefixDataTestId || ''}-DepartmentForm-Form`}
        className="gba:w-full"
      >
        <Form.Item
          label={t('forms.department.fields.name.label', { defaultValue: 'Name' })}
          name="name"
          rules={[{ required: true, message: t('forms.department.fields.name.validation', { defaultValue: 'Please enter department name' }) }]}
        >
          <Input placeholder={t('forms.department.fields.name.placeholder', { defaultValue: 'Enter department name' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.department.fields.code.label', { defaultValue: 'Code' })}
          name="code"
        >
          <Input placeholder={t('forms.department.fields.code.placeholder', { defaultValue: 'Enter department code (optional)' })} />
        </Form.Item>

        <Form.Item
          label={t('forms.department.fields.type.label', { defaultValue: 'Type' })}
          name="type"
          rules={[{ required: true, message: t('forms.department.fields.type.validation', { defaultValue: 'Please enter department type' }) }]}
        >
          <Input placeholder={t('forms.department.fields.type.placeholder', { defaultValue: 'Enter department type' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.department.fields.description.label', { defaultValue: 'Description' })}
          name="description"
        >
          <Input.TextArea 
            placeholder={t('forms.department.fields.description.placeholder', { defaultValue: 'Enter department description (optional)' })} 
            rows={3}
          />
        </Form.Item>

        <Form.Item
          label={t('forms.department.fields.parentNodeId.label', { defaultValue: 'Parent Department' })}
          name="parentNodeId"
        >
          <Input placeholder={t('forms.department.fields.parentNodeId.placeholder', { defaultValue: 'Enter parent department ID (optional)' })} />
        </Form.Item>
        
        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
          <Button onClick={handleCancel}>
            {t('forms.common.buttons.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="primary" onClick={handleSave}>
            {initialValues ? t('forms.common.buttons.update', { defaultValue: 'Update' }) : t('forms.common.buttons.create', { defaultValue: 'Create' })}
          </Button>
        </div>
      </Form>
  );
};

export default DepartmentForm;
