import React, { useEffect } from 'react';
import { Form, Input, Select, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Capability } from '../../apps/organizational-data/components/tabs';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

export interface CapabilityFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  initialValues?: Capability;
  onSubmit?: (values: any) => Promise<void>;
}

export const CapabilityForm: React.FC<CapabilityFormProps> = ({
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
        data-testid={`${prefixDataTestId}-capability-form`}
        className="gba:w-full"
      >
        <Form.Item
          label={t('forms.capability.fields.name.label', { defaultValue: 'Name' })}
          name="name"
          rules={[{ required: true, message: t('forms.capability.fields.name.validation', { defaultValue: 'Please enter capability name' }) }]}
        >
          <Input placeholder={t('forms.capability.fields.name.placeholder', { defaultValue: 'Enter capability name' })} />
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.code.label', { defaultValue: 'Code' })}
          name="code"
          rules={[{ required: true, message: t('forms.capability.fields.code.validation', { defaultValue: 'Please enter capability code' }) }]}
        >
          <Input placeholder={t('forms.capability.fields.code.placeholder', { defaultValue: 'Enter capability code' })} />
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.category.label', { defaultValue: 'Category' })}
          name="category"
          rules={[{ required: true, message: t('forms.capability.fields.category.validation', { defaultValue: 'Please select a category' }) }]}
        >
          <Select placeholder={t('forms.capability.fields.category.placeholder', { defaultValue: 'Select category' })}>
            <Option value="Technical">{t('forms.capability.fields.category.options.technical', { defaultValue: 'Technical' })}</Option>
            <Option value="Leadership">{t('forms.capability.fields.category.options.leadership', { defaultValue: 'Leadership' })}</Option>
            <Option value="Analytical">{t('forms.capability.fields.category.options.analytical', { defaultValue: 'Analytical' })}</Option>
            <Option value="Creative">{t('forms.capability.fields.category.options.creative', { defaultValue: 'Creative' })}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.level.label', { defaultValue: 'Level' })}
          name="level"
          rules={[{ required: true, message: t('forms.capability.fields.level.validation', { defaultValue: 'Please select a level' }) }]}
        >
          <Select placeholder={t('forms.capability.fields.level.placeholder', { defaultValue: 'Select level' })}>
            <Option value="Beginner">{t('forms.capability.fields.level.options.beginner', { defaultValue: 'Beginner' })}</Option>
            <Option value="Intermediate">{t('forms.capability.fields.level.options.intermediate', { defaultValue: 'Intermediate' })}</Option>
            <Option value="Advanced">{t('forms.capability.fields.level.options.advanced', { defaultValue: 'Advanced' })}</Option>
            <Option value="Expert">{t('forms.capability.fields.level.options.expert', { defaultValue: 'Expert' })}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.competencyArea.label', { defaultValue: 'Competency Area' })}
          name="competencyArea"
          rules={[{ required: true, message: t('forms.capability.fields.competencyArea.validation', { defaultValue: 'Please enter competency area' }) }]}
        >
          <Input placeholder={t('forms.capability.fields.competencyArea.placeholder', { defaultValue: 'Enter competency area' })} />
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.requiredLevel.label', { defaultValue: 'Required Level' })}
          name="requiredLevel"
          rules={[{ required: true, message: t('forms.capability.fields.requiredLevel.validation', { defaultValue: 'Please select required level' }) }]}
        >
          <Select placeholder={t('forms.capability.fields.requiredLevel.placeholder', { defaultValue: 'Select required level' })}>
            <Option value="Junior">{t('forms.capability.fields.requiredLevel.options.junior', { defaultValue: 'Junior' })}</Option>
            <Option value="Intermediate">{t('forms.capability.fields.requiredLevel.options.intermediate', { defaultValue: 'Intermediate' })}</Option>
            <Option value="Senior">{t('forms.capability.fields.requiredLevel.options.senior', { defaultValue: 'Senior' })}</Option>
            <Option value="Expert">{t('forms.capability.fields.requiredLevel.options.expert', { defaultValue: 'Expert' })}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.status.label', { defaultValue: 'Status' })}
          name="status"
          rules={[{ required: true, message: t('forms.capability.fields.status.validation', { defaultValue: 'Please select status' }) }]}
        >
          <Select placeholder={t('forms.capability.fields.status.placeholder', { defaultValue: 'Select status' })}>
            <Option value="Active">{t('forms.capability.fields.status.options.active', { defaultValue: 'Active' })}</Option>
            <Option value="Inactive">{t('forms.capability.fields.status.options.inactive', { defaultValue: 'Inactive' })}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.certificationRequired.label', { defaultValue: 'Certification Required' })}
          name="certificationRequired"
          valuePropName="checked"
        >
          <Select placeholder={t('forms.capability.fields.certificationRequired.placeholder', { defaultValue: 'Select certification requirement' })}>
            <Option value={true}>{t('forms.capability.fields.certificationRequired.options.required', { defaultValue: 'Required' })}</Option>
            <Option value={false}>{t('forms.capability.fields.certificationRequired.options.notRequired', { defaultValue: 'Not Required' })}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('forms.capability.fields.description.label', { defaultValue: 'Description' })}
          name="description"
        >
          <Input.TextArea
            placeholder={t('forms.capability.fields.description.placeholder', { defaultValue: 'Enter description (optional)' })}
            rows={3}
          />
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

export default CapabilityForm;
