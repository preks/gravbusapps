import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * SalaryAdjustmentForm component for adjusting employee salaries
 * Provides form for salary adjustments, promotions, and other compensation changes
 */
export interface SalaryAdjustmentFormProps extends BusinessAppContextProps {
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => void
  initialValues?: any
  isLoading?: boolean
}

const SalaryAdjustmentForm: React.FC<SalaryAdjustmentFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  isLoading = false
}) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (onSubmit) {
      await onSubmit(initialValues ?? {})
    }
  }

  return (
    <div data-testid="salary-adjustment-form-container" className="gba:p-6">
      <h2 className="gba:text-xl gba:font-medium gba:mb-4">
        {getTranslationFromI18nKeyAndLabel('salary.adjustment.form.title', 'Salary Adjustment')}
      </h2>

      <form
        onSubmit={handleSubmit}
        data-testid="salary-adjustment-form"
      >
        {/* Form fields will be implemented during component conversion */}
        <div className="gba:flex gba:justify-end gba:mt-6 gba:gap-3">
          <Button type="button" variant="outline" data-testid="salary-adjustment-form-cancel-button" onClick={onCancel}>
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="salary-adjustment-form-submit-button"
          >
            {getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default SalaryAdjustmentForm
