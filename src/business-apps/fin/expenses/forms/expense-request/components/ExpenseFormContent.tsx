import React, { useEffect } from 'react'
import { Form } from 'antd'
import { InputField, SelectField, TextAreaField, CheckboxGroup } from '@newwork/gravity-ui-catalog'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { useExpenseRequestCreationTranslation } from '../../expense-request-creation/useExpenseRequestCreationTranslation'
import { TITLE_MAX_LENGTH, COMMENT_TEXTAREA_ROWS, REQUEST_TYPES } from '../constants/constants'
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
  expenseCatalogueData = {}
}) => {
  const { t } = useExpenseRequestCreationTranslation()
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
                  message: t('current-title-custom-rule')
                },
                {
                  max: TITLE_MAX_LENGTH,
                  message: t('maximum-characters-title-error-message')
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputField
                label={t('form-title-label')}
                name="title"
                placeholder={t('current-title-placeholder')}
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
                  message: t('current-cost-center-custom-rule')
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
                label={t('current-cost-center-label')}
                placeholder={t('current-cost-center-placeholder')}
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
                label={t('select-project')}
                placeholder={t('select-project-placeholder')}
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
                label={t('comment-text-area')}
                placeholder={t('comment-text-area-enter')}
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
                    {t('transportation-checkbox')}
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
