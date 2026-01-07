import React from 'react'
import { Label, Input } from '@newwork/nw-design-system'
import { BENEFIT_FORM_VALIDATION } from '../../constants/benefitFormValidation'

interface BenefitValueFieldProps {
  t: (key: string, params?: any) => string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}

/**
 * Reusable benefit yearly value input field with currency symbol
 */
const BenefitValueField: React.FC<BenefitValueFieldProps> = ({
  t,
  value,
  onChange,
  disabled = false,
  required = false
}) => {
  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-foreground">
        {t('modal-request-value-label')}
        {required && <span className="gba:text-destructive"> *</span>}
      </Label>
      <div className="gba:relative">
        <span className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-sm gba:text-muted-foreground">
          {BENEFIT_FORM_VALIDATION.DEFAULT_CURRENCY === 'EUR' ? '€' : '$'}
        </span>
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('modal-request-value-placeholder')}
          className="gba:pl-8"
          min="0"
          step="100"
          data-testid="request-benefit-value-input"
          disabled={disabled}
        />
      </div>
      <p className="gba:text-xs gba:text-muted-foreground">{t('modal-request-value-help')}</p>
    </div>
  )
}

export default BenefitValueField
