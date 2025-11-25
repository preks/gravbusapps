import React from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { ProviderEntry } from '../../types/benefitCatalogTypes'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslatedProviderValue } from '../../utils/benefitTranslationUtils'

interface BenefitProviderFieldProps {
  t: (key: string, params?: any) => string
  value: string
  onChange: (value: string) => void
  providers: ProviderEntry[]
  disabled?: boolean
  required?: boolean
  locale?: string
}

/**
 * Reusable benefit provider selection field
 */
const BenefitProviderField: React.FC<BenefitProviderFieldProps> = ({
  t,
  value,
  onChange,
  providers,
  disabled = false,
  required = false,
  locale
}) => {
  const currentLocale = locale || getCurrentActiveUserLocale()

  // Filter out invalid providers
  const validProviders = React.useMemo(() => {
    return providers?.filter(p => p?.id && p?.value) ?? []
  }, [providers])

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-foreground">
        {t('modal-request-provider-label')}
        {required && <span className="gba:text-destructive"> *</span>}
      </Label>
      {validProviders && validProviders.length > 0 ? (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger data-testid="request-benefit-provider-select">
            <SelectValue placeholder={t('modal-request-provider-placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {validProviders.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                {getTranslatedProviderValue(provider, currentLocale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="gba:text-sm gba:text-muted-foreground gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
          {t('benefits-no-catalog-description')}
        </div>
      )}
    </div>
  )
}

export default BenefitProviderField
