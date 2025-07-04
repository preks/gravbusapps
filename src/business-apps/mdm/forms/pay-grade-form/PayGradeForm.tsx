import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

export interface PayGradeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  initialValues?: any;
  onSubmit?: (values: any) => Promise<void>;
}

export const PayGradeForm: React.FC<PayGradeFormProps> = ({
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
      <Form form={form} layout="vertical" className="gba:w-full" data-testid={`${prefixDataTestId}-pay-grade-form`}>
        <Form.Item
          label={t('forms.payGrade.fields.code.label', { defaultValue: 'Code' })}
          name="code"
          rules={[{ required: true, message: t('forms.payGrade.fields.code.validation', { defaultValue: 'Please enter pay grade code' }) }]}
        >
          <Input placeholder={t('forms.payGrade.fields.code.placeholder', { defaultValue: 'Enter pay grade code' })} />
        </Form.Item>

        <Form.Item
          label={t('forms.payGrade.fields.name.label', { defaultValue: 'Name' })}
          name="name"
          rules={[{ required: true, message: t('forms.payGrade.fields.name.validation', { defaultValue: 'Please enter pay grade name' }) }]}
        >
          <Input placeholder={t('forms.payGrade.fields.name.placeholder', { defaultValue: 'Enter pay grade name' })} />
        </Form.Item>

        <div className="gba:grid gba:grid-cols-3 gba:gap-4">
          <Form.Item
            label={t('forms.payGrade.fields.minSalary.label', { defaultValue: 'Minimum Salary' })}
            name="minSalary"
            rules={[{ required: true, message: t('forms.payGrade.fields.minSalary.validation', { defaultValue: 'Please enter minimum salary' }) }]}
          >
            <InputNumber 
              placeholder={t('forms.payGrade.fields.minSalary.placeholder', { defaultValue: 'Enter minimum salary' })}
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            label={t('forms.payGrade.fields.standardSalary.label', { defaultValue: 'Standard Salary' })}
            name="standardSalary"
            rules={[{ required: true, message: t('forms.payGrade.fields.standardSalary.validation', { defaultValue: 'Please enter standard salary' }) }]}
          >
            <InputNumber 
              placeholder={t('forms.payGrade.fields.standardSalary.placeholder', { defaultValue: 'Enter standard salary' })}
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            label={t('forms.payGrade.fields.maxSalary.label', { defaultValue: 'Maximum Salary' })}
            name="maxSalary"
            rules={[{ required: true, message: t('forms.payGrade.fields.maxSalary.validation', { defaultValue: 'Please enter maximum salary' }) }]}
          >
            <InputNumber 
              placeholder={t('forms.payGrade.fields.maxSalary.placeholder', { defaultValue: 'Enter maximum salary' })}
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
        </div>

        <Form.Item
          label={t('forms.payGrade.fields.currency.label', { defaultValue: 'Currency' })}
          name="currency"
          initialValue="EUR"
          rules={[{ required: true, message: t('forms.payGrade.fields.currency.validation', { defaultValue: 'Please select currency' }) }]}
        >
          <Select placeholder={t('forms.payGrade.fields.currency.placeholder', { defaultValue: 'Select currency' })}>
            <Option value="EUR">{t('forms.payGrade.fields.currency.options.eur', { defaultValue: 'Euro (EUR)' })}</Option>
            <Option value="USD">{t('forms.payGrade.fields.currency.options.usd', { defaultValue: 'US Dollar (USD)' })}</Option>
            <Option value="GBP">{t('forms.payGrade.fields.currency.options.gbp', { defaultValue: 'British Pound (GBP)' })}</Option>
          </Select>
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

export default PayGradeForm;
