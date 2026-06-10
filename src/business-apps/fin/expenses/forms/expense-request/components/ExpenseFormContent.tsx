import React, { useEffect } from 'react'
import { Form } from 'antd'
import { InputField, SelectField, TextAreaField, CheckboxGroup } from '@newwork/gravity-ui-catalog'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import { useExpenseRequestCreationTranslation } from '../../expense-request-creation/useExpenseRequestCreationTranslation'
import expensePlanTranslations from '../../expense-plan/_i18n'
import { TITLE_MAX_LENGTH, COMMENT_TEXTAREA_ROWS, REQUEST_TYPES } from '../constants/constants'

type ExpenseFormTranslationScope = 'request' | 'plan'

interface ExpenseFormContentProps {
  form: any
  showTransportation: boolean
  setFormIsValid?: (isValid: boolean) => void
  testIdPrefix?: string
  costCenters?: Array<{ id: string; name: string }>
  projects?: Array<{ id: string; name: string }>
  selectedCostCenter?: string
  setSelectedCostCenter?: (costCenterId: string) => void
  expenseCatalogueData?: any
  translationScope?: ExpenseFormTranslationScope
}

/**
 * Expense Form Content component that displays expense form fields
 */
const ExpenseFormContent: React.FC<ExpenseFormContentProps> = ({
  form,
  showTransportation,
  setFormIsValid,
  testIdPrefix = REQUEST_TYPES.EXPENSE,
  costCenters = [],
  projects = [],
  selectedCostCenter = '',
  setSelectedCostCenter,
  expenseCatalogueData = {},
  translationScope = 'request'
}) => {
  const { t: tRequest } = useExpenseRequestCreationTranslation()
  const { t: tPlan } = useTranslation(expensePlanTranslations)
  const isPlan = translationScope === 'plan'
  const titleLabel = isPlan
    ? showTransportation
      ? tPlan('trip-title-input-label')
      : tPlan('expense-plan-title-input-label')
    : tRequest('form-title-label')
  const titlePlaceholder = isPlan ? tPlan('title-input-placeholder') : tRequest('current-title-placeholder')
  const titleRequiredMessage = isPlan ? tPlan('current-title-custom-rule') : tRequest('current-title-custom-rule')
  const titleMaxLengthMessage = isPlan
    ? tPlan('maximum-characters-title-error-message')
    : tRequest('maximum-characters-title-error-message')
  const costCenterLabel = isPlan ? tPlan('cost-center-select-label') : tRequest('current-cost-center-label')
  const costCenterPlaceholder = isPlan
    ? tPlan('cost-center-select-placeholder')
    : tRequest('current-cost-center-placeholder')
  const costCenterRequiredMessage = isPlan
    ? tPlan('current-cost-center-custom-rule')
    : tRequest('current-cost-center-custom-rule')
  const commentLabel = isPlan ? tPlan('comment-text-area') : tRequest('comment-text-area')
  const commentPlaceholder = isPlan ? tPlan('comment-text-area-enter') : tRequest('comment-text-area-enter')
  const projectLabel = isPlan ? tPlan('select-project') : tRequest('select-project')
  const projectPlaceholder = isPlan ? tPlan('select-project-placeholder') : tRequest('select-project-placeholder')
  const transportationLabel = isPlan ? tPlan('transportation-checkbox') : tRequest('transportation-checkbox')
  const transportationMeans = expenseCatalogueData?.expenseTransportationMeans || []

  /**
   * initialValues only apply on first mount. Catalogue + default cost center load async, so we must
   * sync the form when selectedCostCenter becomes available (otherwise the dropdown stays empty).
   */
  useEffect(() => {
    if (!selectedCostCenter || costCenters.length === 0) {
      return
    }
    const exists = costCenters.some(c => c.id === selectedCostCenter)
    if (!exists) {
      return
    }
    const current = form.getFieldValue('costCenter')
    if (current === selectedCostCenter) {
      return
    }
    form.setFieldsValue({ costCenter: selectedCostCenter })
  }, [selectedCostCenter, costCenters, form])

  return (
    <div style={{ margin: '0' }} data-testid={`${testIdPrefix}-form-container`}>
      <Form
        form={form}
        layout="vertical"
        className="gba:flex gba:flex-col gba:flex-grow"
        data-testid={`${testIdPrefix}-form`}
        initialValues={{
          costCenter: selectedCostCenter
        }}
        onFieldsChange={() => {
          const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0)
          if (setFormIsValid) {
            setFormIsValid(isFormValidValue)
          }
        }}
        onValuesChange={() => {
          form.validateFields().catch(() => {})
          const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0)
          if (setFormIsValid) {
            setFormIsValid(isFormValidValue)
          }
        }}
        validateTrigger={['onChange', 'onBlur']}
      >
        {/* Title field */}
        <div className="gba:mb-4" data-testid={`${testIdPrefix}-title-container`}>
          <div className="gba:relative">
            <Form.Item
              name="title"
              rules={[
                {
                  required: true,
                  message: titleRequiredMessage
                },
                {
                  max: TITLE_MAX_LENGTH,
                  message: titleMaxLengthMessage
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputField
                label={titleLabel}
                name="title"
                placeholder={titlePlaceholder}
                onChange={(field: any) => form.setFieldsValue({ title: field.value })}
                required={true}
                data-testid={`${testIdPrefix}-title-input`}
              />
            </Form.Item>
          </div>
        </div>

        {/* Cost Center field */}
        <div className="gba:mb-4" data-testid={`${testIdPrefix}-cost-center-container`}>
          <div className="gba:relative">
            <Form.Item
              name="costCenter"
              rules={[
                {
                  required: true,
                  message: costCenterRequiredMessage
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              <SelectField
                allowClear
                name="costCenter"
                data-testid={`${testIdPrefix}-cost-center-select`}
                data={
                  costCenters?.map((center: { id: string; name: string }) => ({
                    id: center.id,
                    name: center.name
                  })) || []
                }
                onChange={(value: any) => {
                  form.setFieldsValue({ costCenter: value.value })
                  setSelectedCostCenter?.(value.value as string)
                }}
                label={costCenterLabel}
                placeholder={costCenterPlaceholder}
                value={selectedCostCenter || undefined}
                required={true}
              />
            </Form.Item>
          </div>
        </div>

        {/* Project field */}
        <div className="gba:mb-4" data-testid={`${testIdPrefix}-project-container`}>
          <div className="gba:relative">
            <Form.Item name="project" style={{ marginBottom: 0 }}>
              <SelectField
                allowClear
                name="project"
                data-testid={`${testIdPrefix}-project-select`}
                data={
                  projects?.map((project: { id: string; name: string }) => ({
                    id: project.id,
                    name: project.name
                  })) || []
                }
                onChange={(value: any) => form.setFieldsValue({ project: value.value })}
                label={projectLabel}
                placeholder={projectPlaceholder}
              />
            </Form.Item>
          </div>
        </div>

        {/* Comment field */}
        <div className="gba:mb-4" data-testid={`${testIdPrefix}-comment-container`}>
          <div className="gba:relative">
            <Form.Item name="comment" style={{ marginBottom: 0 }}>
              <TextAreaField
                name="comment"
                data-testid={`${testIdPrefix}-comment-textarea`}
                label={commentLabel}
                placeholder={commentPlaceholder}
                onChange={(field: any) => form.setFieldsValue({ comment: field.value })}
                rows={COMMENT_TEXTAREA_ROWS}
              />
            </Form.Item>
          </div>
        </div>

        {/* Transportation means field - only shown when trip button is clicked */}
        {showTransportation && (
          <div className="gba:mb-4" data-testid={`${testIdPrefix}-transportation-means-container`}>
            <div style={{ position: 'relative', borderRadius: '4px', padding: '10px 16px' }}>
              <Form.Item
                name="transportationMeans"
                label={
                  <div style={{ paddingBottom: '15px', fontWeight: 500, fontStyle: 'normal', fontSize: '14px' }}>
                    {transportationLabel}
                  </div>
                }
                style={{ marginBottom: 0 }}
              >
                <CheckboxGroup
                  name="transportationMeans"
                  data-testid={`${testIdPrefix}-transportation-means-checkbox-group`}
                  options={transportationMeans.map((item: any) => ({
                    label: getCatalogValue(item),
                    value: item.id
                  }))}
                  onChange={(values: any) => form.setFieldsValue({ transportationMeans: values })}
                  className="gba:flex gba:flex-col gba:gap-4 gba:bg-background"
                />
              </Form.Item>
            </div>
          </div>
        )}
      </Form>
    </div>
  )
}

export default ExpenseFormContent
