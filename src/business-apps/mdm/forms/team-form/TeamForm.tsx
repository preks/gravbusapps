import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Team } from '../../apps/organizational-data/types';
import { useTranslation } from 'react-i18next';

export interface TeamFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  initialValues?: Team;
  onSubmit?: (values: any) => Promise<void>;
}

export const TeamForm: React.FC<TeamFormProps> = ({
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
        data-testid={`${prefixDataTestId || ''}-TeamsTab-Form`}
        className="gba:w-full"
      >
        <Form.Item
          label={t('forms.team.fields.name.label', { defaultValue: 'Name' })}
          name="name"
          rules={[{ required: true, message: t('forms.team.fields.name.validation', { defaultValue: 'Please enter team name' }) }]}
        >
          <Input placeholder={t('forms.team.fields.name.placeholder', { defaultValue: 'Enter team name' })} />
        </Form.Item>
        
        <Form.Item
          label={t('forms.team.fields.description.label', { defaultValue: 'Description' })}
          name="description"
        >
          <Input.TextArea 
            placeholder={t('forms.team.fields.description.placeholder', { defaultValue: 'Enter team description (optional)' })} 
            rows={3}
          />
        </Form.Item>

        <Form.Item
          label={t('forms.team.fields.rank.label', { defaultValue: 'Rank' })}
          name="rank"
          rules={[{ required: true, message: t('forms.team.fields.rank.validation', { defaultValue: 'Please enter team rank' }) }]}
        >
          <Input type="number" placeholder={t('forms.team.fields.rank.placeholder', { defaultValue: 'Enter team rank' })} />
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

export default TeamForm;
