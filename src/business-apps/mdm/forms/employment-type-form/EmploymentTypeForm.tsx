import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { EmploymentType } from '../../apps/employment-data';
import { useTranslation } from 'react-i18next';

export interface EmploymentTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  initialValues?: EmploymentType;
  onSubmit?: (values: any) => Promise<void>;
}

export const EmploymentTypeForm: React.FC<EmploymentTypeFormProps> = ({
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
        data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab-Form`}
        className="gba:w-full"
      >
        <Form.Item
          label={t('forms.employmentType.fields.code.label', { defaultValue: 'Code' })}
          name="code"
          rules={[{ required: true, message: t('forms.employmentType.fields.code.validation', { defaultValue: 'Please enter employment type code' }) }]}
        >
          <Input placeholder={t('forms.employmentType.fields.code.placeholder', { defaultValue: 'Enter code' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.employmentType.fields.name.label', { defaultValue: 'Name' })}
          name="value"
          rules={[{ required: true, message: t('forms.employmentType.fields.name.validation', { defaultValue: 'Please enter employment type name' }) }]}
        >
          <Input placeholder={t('forms.employmentType.fields.name.placeholder', { defaultValue: 'Enter name' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.employmentType.fields.alternativeCode.label', { defaultValue: 'Alternative Code' })}
          name="alternativeCode"
        >
          <Input placeholder={t('forms.employmentType.fields.alternativeCode.placeholder', { defaultValue: 'Enter alternative code (optional)' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.employmentType.fields.additionalValue1.label', { defaultValue: 'Additional Value 1' })}
          name="additionalValue1"
        >
          <Input placeholder={t('forms.employmentType.fields.additionalValue1.placeholder', { defaultValue: 'Enter additional value (optional)' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.employmentType.fields.additionalValue2.label', { defaultValue: 'Additional Value 2' })}
          name="additionalValue2"
        >
          <Input placeholder={t('forms.employmentType.fields.additionalValue2.placeholder', { defaultValue: 'Enter additional value (optional)' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.employmentType.fields.additionalValue3.label', { defaultValue: 'Additional Value 3' })}
          name="additionalValue3"
        >
          <Input placeholder={t('forms.employmentType.fields.additionalValue3.placeholder', { defaultValue: 'Enter additional value (optional)' })} />
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

export default EmploymentTypeForm;
