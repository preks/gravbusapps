'use client';

import React, { useState } from 'react';
import { Form, Row, Col } from 'antd';
import { FormInstance } from 'antd/lib/form';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DateInputField,
  InputField,
  SelectField,
} from '@newwork/gravity-ui-catalog';
import { getDateFormat } from '@/common/utils/windowUtils';

interface FormScreenComponentProps {
  form: FormInstance;
  isSubmitting: boolean;
  handleFormSubmit: (e: React.FormEvent) => Promise<void>;
  statusOptions: { value: string; label: string }[];
  prefixDataTestId?: string;
}

export const FormScreenComponent: React.FC<FormScreenComponentProps> = ({
  form,
  isSubmitting,
  handleFormSubmit,
  statusOptions,
  prefixDataTestId = 'performance-goal-form'
}) => {
  const { t } = useTranslation();
  const [formIsValid, setFormIsValid] = useState(false);
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        startDate: new Date(),
        dueDate: dayjs().add(5, 'day').toDate(),
        progressPercent: 0,
        status: 'ON_TRACK'
      }}
      data-testid={`${prefixDataTestId}-form`}
      className="gba:w-full gba:max-w-2xl gba:mx-auto"
      onFieldsChange={() => {
        const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0);
        setFormIsValid(isFormValidValue);
      }}
      onValuesChange={() => {
        form.validateFields();
        const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0);
        setFormIsValid(isFormValidValue);
      }}
      validateTrigger={['onChange', 'onBlur']}
    >
      <div className="gba:marginBottom16">
        <Form.Item
          name="title"
          rules={[{ required: true, message: t('performance_goal.title_required', 'Please enter a goal title') }]}
          data-testid={`${prefixDataTestId}-title-field`}
        >
          <InputField
            label={t("performance_goal.title_label", "Title")}
            name="title"
            placeholder={t("performance_goal.title_placeholder", "Enter goal title")}
            onChange={(field) => form.setFieldsValue({ title: field.value as string })}
            required={true}
            maxLength={100}
          />
        </Form.Item>
      </div>
      
      <div className="gba:marginBottom16">
        <Form.Item
          name="startDate"
          rules={[{ required: true, message: t('performance_goal.start_date_required', 'Please select a start date') }]}
          data-testid={`${prefixDataTestId}-start-date-field`}
        >
          <DateInputField
            label={t("performance_goal.start_date_label", "Start Date")}
            name="startDate"
            placeholder={t("performance_goal.start_date_placeholder", "Select start date")}
            onChange={(field) => {
              if (field.value) {
                form.setFieldsValue({ startDate: field.value as Date });
              }
            }}
            required={true}
            format={getDateFormat('date')}
          />
        </Form.Item>
      </div>
      
      <div className="gba:marginBottom16">
        <Form.Item
          name="dueDate"
          rules={[
            { required: true, message: t('performance_goal.due_date_required', 'Please select a due date') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const startDate = getFieldValue('startDate');
                if (!value || !startDate) return Promise.resolve();
                
                const dueDate = value instanceof Date ? value : new Date(value);
                const start = startDate instanceof Date ? startDate : new Date(startDate);
                
                if (dueDate > start) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('performance_goal.due_date_after_start', 'Due date must be after start date')));
              },
            }),
          ]}
          data-testid={`${prefixDataTestId}-due-date-field`}
        >
          <DateInputField
            label={t("performance_goal.due_date_label", "Due Date")}
            name="dueDate"
            placeholder={t("performance_goal.due_date_placeholder", "Select due date")}
            onChange={(field) => {
              if (field.value) {
                form.setFieldsValue({ dueDate: field.value as Date });
              }
            }}
            required={true}
            format={getDateFormat('date')}
          />
        </Form.Item>
      </div>
      
      <div className="gba:marginBottom16">
        <Form.Item 
          name="status"
          rules={[{ required: true, message: t('performance_goal.status_required', 'Please select a status') }]}
          data-testid={`${prefixDataTestId}-status-field`}
        >
          <SelectField
            label={t("performance_goal.status_label", "Status")}
            name="status"
            placeholder={t("performance_goal.status_placeholder", "Select status")}
            onChange={(field) => form.setFieldsValue({ status: field.value as string })}
            required={true}
            data={statusOptions.map(option => ({
              id: option.value,
              name: option.label
            }))}
          />
        </Form.Item>
      </div>
      
      <div className="gba:marginBottom16">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="progressPercent"
              rules={[{ 
                required: true, 
                message: t('performance_goal.progress_required', 'Please enter progress percentage') 
              }]}
              data-testid={`${prefixDataTestId}-progress-field`}
            >
              <InputField
                label={t("performance_goal.progress_label", "Progress")}
                name="progressPercent"
                placeholder={t("performance_goal.progress_placeholder", "Enter progress percentage")}
                onChange={(field) => {
                  let value = parseInt(field.value as string || '0', 10);
                  if (isNaN(value)) value = 0;
                  value = Math.min(100, Math.max(0, value));
                  form.setFieldsValue({ progressPercent: value });
                }}
                required={true}
                suffix="%"
                type="number"
                min={0}
                max={100}
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
      
      <div className="gba:marginTop16">
        <Form.Item>
          <div className="gba:flex gba:justify-center gba:mt-6">
            <Button 
              variant="primary" 
              onClick={handleFormSubmit} 
              loading={isSubmitting}
              disabled={!formIsValid}
              data-testid={`${prefixDataTestId}-create-button`}
              className="gba:w-40"
              size="large"
            >
              {t("performance_goal.create", "Create")}
            </Button>
          </div>
        </Form.Item>
      </div>
    </Form>
  );
};

export default FormScreenComponent;
