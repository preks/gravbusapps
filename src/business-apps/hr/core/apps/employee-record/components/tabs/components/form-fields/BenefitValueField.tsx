import React from 'react'
import { Label, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BENEFIT_FORM_VALIDATION } from '../../../../constants/benefitFormValidation'

interface BenefitValueFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}

/**
 * Reusable benefit yearly value input field with currency symbol
 */
const BenefitValueField: React.FC<BenefitValueFieldProps> = ({
  value,
  onChange,
  disabled = false,
  required = false
}) => {
  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.expected_value', 'Expected Yearly Value')}
        {required ? (
          <span className="gba:text-destructive"> *</span>
        ) : (
          <span className="gba:text-muted-foreground">
            {' '}
            ({getTranslationFromI18nKeyAndLabel('common.optional', 'Optional')})
          </span>
        )}
      </Label>
      <div className="gba:relative">
        <span className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-sm gba:text-muted-foreground">
          {BENEFIT_FORM_VALIDATION.DEFAULT_CURRENCY === 'EUR' ? '€' : '$'}
        </span>
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="15000"
          className="gba:pl-8"
          min="0"
          step="100"
          data-testid="request-benefit-value-input"
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default BenefitValueField
