import React from 'react';
import { Form } from 'antd';
import { InputField, SelectField, TextAreaField, CheckboxGroup } from '@newwork/gravity-ui-catalog';
import { useTranslation } from 'react-i18next';
import { getCatalogValue } from '@/common/utils/windowUtils';
import { useExpenseRequestContext } from '../context/ExpenseRequestContext';

interface ExpenseFormContentProps {
  form: any;
  showTransportation: boolean;
  setFormIsValid?: (isValid: boolean) => void;
}

/**
 * Expense Form Content component that displays expense form fields
 */
const ExpenseFormContent: React.FC<ExpenseFormContentProps> = ({ form, showTransportation, setFormIsValid }) => {
  const { t } = useTranslation();
  const { 
    costCenters, 
    projects, 
    selectedCostCenter,
    setSelectedCostCenter,
    expenseCatalogueData
  } = useExpenseRequestContext();
  
  const transportationMeans = expenseCatalogueData?.expenseTransportationMeans || [];

  return (
    <div className="gba:formContainer" data-testid="expense-form-container">
      <Form 
        form={form} 
        layout="vertical" 
        className="gba:form" 
        data-testid="expense-form"
        initialValues={{
          costCenter: selectedCostCenter
        }}
        onFieldsChange={() => {
          const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0);
          setFormIsValid && setFormIsValid(isFormValidValue);
        }}
        onValuesChange={() => {
          form.validateFields().catch(() => {});
          const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0);
          setFormIsValid && setFormIsValid(isFormValidValue);
        }}
        validateTrigger={['onChange', 'onBlur']}
      >
        {/* Title field */}
        <div className="gba:marginBottom16" data-testid="title-container">
          <div className="gba:relativePosition">
            <Form.Item
              name="title"
              rules={[
                { 
                  required: true, 
                  message: t('lowcoder:create_expense_request.expense_request_container.current_title_custom_rule', 'Please enter a title') 
                },
                { 
                  max: 50, 
                  message: t('lowcoder:create_expense_request.maximum_characters_title_error_message', 'Maximum limit reached: The title can be up to 50 characters only.') 
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputField
                label={t('lowcoder:create_expense_request.expense_request_exceed_characters_error_message', 'Title')}
                name="title"
                placeholder={t('lowcoder:create_expense_request.expense_request_container.current_title_placeholder', 'Enter Title')}
                onChange={(field: any) => form.setFieldsValue({ title: field.value })}
                required={true}
                data-testid="title-input"
              />
            </Form.Item>
          </div>
        </div>

        {/* Cost Center field */}
        <div className="gba:marginBottom16" data-testid="cost-center-container">
          <div className="gba:relativePosition">
            <Form.Item
              name="costCenter"
              rules={[{ 
                required: true, 
                message: t('lowcoder:create_expense_request.expense_request_container.current_cost_center_custom_rule', 'Please select a cost center') 
              }]}
              style={{ marginBottom: 0 }}
            >
              <SelectField
                allowClear
                name="costCenter"
                data-testid="cost-center-select"
                data={costCenters?.map((center: { id: string; name: string }) => ({
                  id: center.id,
                  name: center.name,
                })) || []}
                onChange={(value: any) => {
                  form.setFieldsValue({ costCenter: value.value });
                  setSelectedCostCenter(value.value as string);
                }}
                label={t('lowcoder:create_expense_request.expense_request_container.current_cost_center_label', 'Cost Center')}
                placeholder={t('lowcoder:create_expense_request.expense_request_container.current_cost_center_placeholder', 'Select Cost Center')}
                value={selectedCostCenter || undefined}
                required={true}
              />
            </Form.Item>
          </div>
        </div>

        {/* Project field */}
        <div className="gba:marginBottom16" data-testid="project-container">
          <div className="gba:relativePosition">
            <Form.Item
              name="project"
              style={{ marginBottom: 0 }}
            >
              <SelectField
                allowClear
                name="project"
                data-testid="project-select"
                data={projects?.map((project: { id: string; name: string }) => ({
                  id: project.id,
                  name: project.name,
                })) || []}
                onChange={(value: any) => form.setFieldsValue({ project: value.value })}
                label={t('lowcoder:add_allowance_info_request.select_project', 'Project')}
                placeholder={t('lowcoder:add_allowance_info_request.select_project_placeholder', 'Select Project')}
              />
            </Form.Item>
          </div>
        </div>

        {/* Comment field */}
        <div className="gba:marginBottom16" data-testid="comment-container">
          <div className="gba:relativePosition">
            <Form.Item
              name="comment"
              style={{ marginBottom: 0 }}
            >
              <TextAreaField
                name="comment"
                data-testid="comment-textarea"
                label={t('lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area', 'Comment')}
                placeholder={t('lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area', 'Enter Comment')}
                onChange={(field: any) => form.setFieldsValue({ comment: field.value })}
                rows={4}
              />
            </Form.Item>
          </div>
        </div>

        {/* Transportation means field - only shown when trip button is clicked */}
        {showTransportation && (
          <div className="gba:marginBottom16" data-testid="transportation-means-container">
            <div className="gba:relativePositionCheckbox">
              <Form.Item
                name="transportationMeans"
                label={<div className="gba:transportationMeansLabel">{t('lowcoder:create_expense_request.expense_request_container.transportation_checkbox', 'Means of Transportation')}</div>}
                style={{ marginBottom: 0 }}
              >
                <CheckboxGroup
                  name="transportationMeans"
                  data-testid="transportation-means-checkbox-group"
                  options={transportationMeans.map((item: any) => ({
                    label: getCatalogValue(item),
                    value: item.id
                  }))}
                  onChange={(values: any) => form.setFieldsValue({ transportationMeans: values })}
                  className="gba:transportationCheckboxGroup"
                />
              </Form.Item>
            </div>
          </div>
        )}
      </Form>
    </div>
  );
};

export default ExpenseFormContent;
