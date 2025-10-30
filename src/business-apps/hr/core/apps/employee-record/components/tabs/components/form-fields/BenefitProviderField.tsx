import React from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface BenefitProviderFieldProps {
  value: string
  onChange: (value: string) => void
  providers: Array<{ id: string; value: string }>
  disabled?: boolean
  required?: boolean
}

/**
 * Reusable benefit provider selection field
 */
const BenefitProviderField: React.FC<BenefitProviderFieldProps> = ({
  value,
  onChange,
  providers,
  disabled = false,
  required = false
}) => {
  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.provider', 'Provider')}
        {required && <span className="gba:text-destructive"> *</span>}
      </Label>
      {providers && providers.length > 0 ? (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger data-testid="request-benefit-provider-select">
            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('common.select_provider', 'Select provider')} />
          </SelectTrigger>
          <SelectContent>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="gba:text-sm gba:text-muted-foreground gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:compensation.no_providers_available',
            'No providers configured for this benefit type'
          )}
        </div>
      )}
    </div>
  )
}

export default BenefitProviderField
