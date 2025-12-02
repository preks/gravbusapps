import React from 'react'
import { DateInput, Label } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

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
      <div className="gba:mb-4" data-testid="ccr-valid-from-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrValidFrom">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_from_label',
              'Valid From'
            )}{' '}
            *
          </Label>
          <DateInput
            value={validFrom ? dayjs(validFrom).format('YYYY-MM-DD') : ''}
            onChange={value => onChangeFrom(value ? new Date(value) : null)}
            disabled={isUpdate}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_placeholder',
              'Select Date'
            )}
            outputFormat="iso"
            captionLayout="dropdown"
            data-testid="ccr-valid-from-input"
            onBlur={onBlurFrom}
          />
          {showFromError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-valid-from-error">
              {errors.validFrom}
            </div>
          )}
        </div>
      </div>

      <div className="gba:mb-4" data-testid="ccr-valid-to-container">
        <div className="gba:space-y-2">
          <Label htmlFor="ccrValidTo">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_label',
              'Valid To'
            )}{' '}
            *
          </Label>
          <DateInput
            value={validTo ? dayjs(validTo).format('YYYY-MM-DD') : ''}
            onChange={value => onChangeTo(value ? new Date(value) : null)}
            disabled={false}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_placeholder',
              'Select Date'
            )}
            outputFormat="iso"
            captionLayout="dropdown"
            data-testid="ccr-valid-to-input"
            onBlur={onBlurTo}
          />
          {showToError && (
            <div className="gba:text-sm gba:text-destructive" data-testid="ccr-valid-to-error">
              {errors.validTo}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default DateRangeSection
