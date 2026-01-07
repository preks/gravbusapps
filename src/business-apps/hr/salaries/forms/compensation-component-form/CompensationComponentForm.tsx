import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Form, Button } from 'antd'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * CompensationComponentForm component for managing additional compensation components
 * Provides form for bonuses, allowances, and other additional compensation
 */
export interface CompensationComponentFormProps extends BusinessAppContextProps {
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => void
  initialValues?: any
  isLoading?: boolean
}

const CompensationComponentForm: React.FC<CompensationComponentFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  isLoading = false
}) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    if (onSubmit) {
      await onSubmit(values)
    }
  }

  return (
    <div data-testid="compensation-component-form-container" className="gba:p-6">
      <h2 className="gba:text-xl gba:font-medium gba:mb-4">
        {getTranslationFromI18nKeyAndLabel('compensation.component.form.title', 'Compensation Component')}
      </h2>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="compensation-component-form"
      >
        {/* Form fields will be implemented during component conversion */}
        <div className="gba:flex gba:justify-end gba:mt-6 gba:gap-3">
          <Button data-testid="compensation-component-form-cancel-button" onClick={onCancel}>
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            data-testid="compensation-component-form-submit-button"
          >
            {getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default CompensationComponentForm
