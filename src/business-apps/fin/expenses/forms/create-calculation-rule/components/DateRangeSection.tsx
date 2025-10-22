import React from 'react'
import { DateInputField } from '@newwork/gravity-ui-catalog'
import {
  getCurrentActiveUserLocale,
  getDateFormat,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'

interface DateRangeSectionProps {
  isUpdate: boolean
  validFrom: Date | null
  validTo: Date | null
  onChangeFrom: (value: Date | null) => void
  onChangeTo: (value: Date | null) => void
  onBlurFrom: () => void
  onBlurTo: () => void
  showFromError: boolean
  showToError: boolean
  errors: { validFrom?: string; validTo?: string }
}

const DateRangeSection: React.FC<DateRangeSectionProps> = ({
  isUpdate,
  validFrom,
  validTo,
  onChangeFrom,
  onChangeTo,
  onBlurFrom,
  onBlurTo,
  showFromError,
  showToError,
  errors
}) => {
  return (
    <>
      <div className={`gba:mb-4`} data-testid="ccr-valid-from-container">
        <div className={`gba:relative`}>
          <DateInputField
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_from_label',
              'Valid From'
            )}
            name="ccrValidFrom"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_placeholder',
              'Select Date'
            )}
            data-testid="ccr-valid-from-input"
            value={validFrom as any}
            disabled={isUpdate}
            onChange={(field: any) => onChangeFrom(field?.value ? new Date(field.value) : null)}
            onBlur={onBlurFrom}
            language={getCurrentActiveUserLocale().split('-')[0] as 'en' | 'de' | 'ro' | undefined}
            format={getDateFormat('date.long')}
            required
          />
          {showFromError && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px] gba:text-destructive" data-testid="ccr-valid-from-error">
              {errors.validFrom}
            </div>
          )}
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-valid-to-container">
        <div className={`gba:relative`}>
          <DateInputField
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_label',
              'Valid To'
            )}
            name="ccrValidTo"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_placeholder',
              'Select Date'
            )}
            data-testid="ccr-valid-to-input"
            value={validTo as any}
            onChange={(field: any) => onChangeTo(field?.value ? new Date(field.value) : null)}
            onBlur={onBlurTo}
            language={getCurrentActiveUserLocale().split('-')[0] as 'en' | 'de' | 'ro' | undefined}
            format={getDateFormat('date.long')}
            required
          />
          {showToError && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px] gba:text-destructive" data-testid="ccr-valid-to-error">
              {errors.validTo}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default DateRangeSection
