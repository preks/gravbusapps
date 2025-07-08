import React, { useEffect } from 'react';
import { Form, Input, Select, Alert, Button, Space } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Project } from '../../apps/organizational-data/types';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

export interface ProjectFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  initialValues?: Project;
  onSubmit?: (values: any) => Promise<void>;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
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
      data-testid={`${prefixDataTestId || ''}-ProjectForm`}
      className="gba:w-full"
    >
        <Form.Item
          label={t('forms.project.fields.name.label', { defaultValue: 'Name' })}
          name="name"
          rules={[{ required: true, message: t('forms.project.fields.name.validation', { defaultValue: 'Please enter project name' }) }]}
        >
          <Input placeholder={t('forms.project.fields.name.placeholder', { defaultValue: 'Enter project name' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.project.fields.description.label', { defaultValue: 'Description' })}
          name="description"
        >
          <Input.TextArea 
            placeholder={t('forms.project.fields.description.placeholder', { defaultValue: 'Enter project description (optional)' })} 
            rows={3}
          />
        </Form.Item>
        
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <Form.Item
            label={t('forms.project.fields.projectType.label', { defaultValue: 'Project Type' })}
            name="projectType"
            rules={[{ required: true, message: t('forms.project.fields.projectType.validation', { defaultValue: 'Please select a project type' }) }]}
          >
            <Select placeholder={t('forms.project.fields.projectType.placeholder', { defaultValue: 'Select project type' })}>
              <Option value="INTERNAL">{t('forms.project.fields.projectType.options.internal', { defaultValue: 'Internal' })}</Option>
              <Option value="EXTERNAL">{t('forms.project.fields.projectType.options.external', { defaultValue: 'External' })}</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            label={t('forms.project.fields.validTo.label', { defaultValue: 'Valid Until' })}
            name="validTo"
          >
            <Input 
              type="datetime-local"
              placeholder={t('forms.project.fields.validTo.placeholder', { defaultValue: 'Select end date (optional)' })}
            />
          </Form.Item>
        </div>
        
        <Alert
          message={t('forms.project.alerts.crudOperations.title', { defaultValue: 'Information' })}
          description={t('forms.project.alerts.crudOperations.message', { defaultValue: 'Project changes will be saved immediately upon submission.' })}
          type="info"
          showIcon
          className="gba:mt-4 gba:mb-4"
        />
        
        <div className="gba:flex gba:justify-end gba:gap-2">
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

export default ProjectForm;
