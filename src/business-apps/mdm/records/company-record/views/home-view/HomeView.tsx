/**
 * HomeView Component for Company Record
 * Displays company details in the overview tab
 */
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, useTranslation } from '@newwork/nw-design-system'
import { Buildings, MapPin, Receipt, Code } from '@phosphor-icons/react'
import type { HomeViewProps } from '../../types'
import type { Address } from '@/common/data/common/types/commonTypes'
import translations from '../../_i18n'

/**
 * Detail item component for displaying label-value pairs
 */
const DetailItem: React.FC<{
  icon: React.ElementType
  label: string
  value: string
  'data-testid'?: string
}> = ({ icon: Icon, label, value, 'data-testid': dataTestId }) => (
  <div className="gba:flex gba:items-start gba:gap-3" data-testid={dataTestId}>
    <div className="gba:p-2 gba:rounded-lg gba:bg-muted">
      <Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
    </div>
    <div className="gba:flex gba:flex-col">
      <span className="gba:text-sm gba:text-muted-foreground">{label}</span>
      <span className="gba:text-sm gba:font-medium">{value}</span>
    </div>
  </div>
)

export const HomeView: React.FC<HomeViewProps> = ({ company }) => {
  const { t } = useTranslation(translations)

  // Parse addresses from company data (future: will come from companyAddress relationship)
  const addresses: Address[] = company?.companyAddress || []

  // Parse additional properties
  const additionalProperties = company?.additionalProperties
    ? typeof company.additionalProperties === 'string'
      ? JSON.parse(company.additionalProperties)
      : company.additionalProperties
    : null

  return (
    <>
      {/* Address Section */}
      <Card className="gba:col-span-12" data-testid="company-address-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <MapPin className="gba:h-5 gba:w-5" />
            {t('addresses')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length > 0 ? (
            <div className="gba:space-y-4">
              {addresses.map((address, index) => (
                <div
                  key={address.id || index}
                  className="gba:p-4 gba:rounded-lg gba:border gba:border-border"
                  data-testid={`company-address-${index}`}
                >
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                    {address.addressType && (
                      <DetailItem
                        icon={MapPin}
                        label={t('address-type')}
                        value={
                          typeof address.addressType === 'string'
                            ? address.addressType
                            : address.addressType.value || '-'
                        }
                        data-testid={`company-address-type-${index}`}
                      />
                    )}
                    {address.addressLine && (
                      <DetailItem
                        icon={MapPin}
                        label={t('address-line')}
                        value={
                          typeof address.addressLine === 'string'
                            ? address.addressLine
                            : Array.isArray(address.addressLine)
                              ? address.addressLine.join(', ')
                              : address.addressLine.lines?.join(', ') || '-'
                        }
                        data-testid={`company-address-line-${index}`}
                      />
                    )}
                    {address.locality && (
                      <DetailItem
                        icon={MapPin}
                        label={t('locality')}
                        value={address.locality}
                        data-testid={`company-address-locality-${index}`}
                      />
                    )}
                    {address.postalCode && (
                      <DetailItem
                        icon={MapPin}
                        label={t('postal-code')}
                        value={address.postalCode}
                        data-testid={`company-address-postal-code-${index}`}
                      />
                    )}
                    {address.region && (
                      <DetailItem
                        icon={MapPin}
                        label={t('region')}
                        value={typeof address.region === 'string' ? address.region : address.region.value || '-'}
                        data-testid={`company-address-region-${index}`}
                      />
                    )}
                    {address.country && (
                      <DetailItem
                        icon={MapPin}
                        label={t('country')}
                        value={typeof address.country === 'string' ? address.country : address.country.value || '-'}
                        data-testid={`company-address-country-${index}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">{t('no-addresses')}</p>
          )}
        </CardContent>
      </Card>

      {/* Tax Information Section */}
      <Card className="gba:col-span-12" data-testid="company-tax-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Receipt className="gba:h-5 gba:w-5" />
            {t('tax-information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            {company?.commercialRegistrationNumber && (
              <DetailItem
                icon={Receipt}
                label={t('commercial-registration-number')}
                value={company.commercialRegistrationNumber}
                data-testid="company-tax-commercial-registration"
              />
            )}
            {company?.taxIdentificationNumber && (
              <DetailItem
                icon={Receipt}
                label={t('tax-identification-number')}
                value={company.taxIdentificationNumber}
                data-testid="company-tax-identification"
              />
            )}
            {company?.taxNumber && (
              <DetailItem
                icon={Receipt}
                label={t('tax-number')}
                value={company.taxNumber}
                data-testid="company-tax-number"
              />
            )}
            {company?.valueAddedTaxNumber && (
              <DetailItem
                icon={Receipt}
                label={t('vat-number')}
                value={company.valueAddedTaxNumber}
                data-testid="company-tax-vat"
              />
            )}
            {!company?.commercialRegistrationNumber &&
              !company?.taxIdentificationNumber &&
              !company?.taxNumber &&
              !company?.valueAddedTaxNumber && (
                <p className="gba:text-sm gba:text-muted-foreground">{t('no-tax-information')}</p>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Properties Section */}
      {additionalProperties && (
        <Card className="gba:col-span-12" data-testid="company-additional-properties-section">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Code className="gba:h-5 gba:w-5" />
              {t('additional-properties')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
              {Object.entries(additionalProperties).map(([key, value]) => (
                <DetailItem
                  key={key}
                  icon={Code}
                  label={key}
                  value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  data-testid={`company-additional-property-${key}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizational Units Section - if units are available */}
      {company?.organizationalUnits && company.organizationalUnits.length > 0 && (
        <Card className="gba:col-span-12" data-testid="company-units-section">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Buildings className="gba:h-5 gba:w-5" />
              {t('organizational-units')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
              {company.organizationalUnits.map((unit, index) => (
                <div
                  key={unit.id}
                  className="gba:p-3 gba:rounded-lg gba:border gba:border-border"
                  data-testid={`company-unit-${index}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:p-2 gba:rounded-full gba:bg-muted">
                      <Buildings className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    </div>
                    <div>
                      <p className="gba:font-medium">{unit.name}</p>
                      {unit.code && <p className="gba:text-sm gba:text-muted-foreground">{unit.code}</p>}
                      {unit.description && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{unit.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default HomeView
