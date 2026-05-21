/**
 * HomeView Component for Company Record
 * Displays company details in the overview tab
 */
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, useTranslation } from '@newwork/nw-design-system'
import { MapPinIcon, ReceiptIcon, UserIcon, FileTextIcon } from '@phosphor-icons/react'
import type { HomeViewProps } from '../../types'
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

  // Addresses from GraphQL (addressLine is jsonb)
  const addresses = company?.addresses || []

  return (
    <>
      {/* Description Section */}
      {company?.description && (
        <Card className="gba:col-span-12" data-testid="company-description-section">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <FileTextIcon className="gba:h-5 gba:w-5" />
              {t('description')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm">{company.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Address Section */}
      <Card className="gba:col-span-4" data-testid="company-address-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <MapPinIcon className="gba:h-5 gba:w-5" />
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
                  <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                    {address.addressType && (
                      <DetailItem
                        icon={MapPinIcon}
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
                        icon={MapPinIcon}
                        label={t('address-line')}
                        value={
                          typeof address.addressLine === 'object'
                            ? Object.values(address.addressLine).filter(Boolean).join(', ')
                            : String(address.addressLine)
                        }
                        data-testid={`company-address-line-${index}`}
                      />
                    )}
                    {address.locality && (
                      <DetailItem
                        icon={MapPinIcon}
                        label={t('locality')}
                        value={address.locality}
                        data-testid={`company-address-locality-${index}`}
                      />
                    )}
                    {address.postalCode && (
                      <DetailItem
                        icon={MapPinIcon}
                        label={t('postal-code')}
                        value={address.postalCode}
                        data-testid={`company-address-postal-code-${index}`}
                      />
                    )}
                    {address.region && (
                      <DetailItem
                        icon={MapPinIcon}
                        label={t('region')}
                        value={typeof address.region === 'string' ? address.region : address.region.value || '-'}
                        data-testid={`company-address-region-${index}`}
                      />
                    )}
                    {address.country && (
                      <DetailItem
                        icon={MapPinIcon}
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

      {/* Director Information Section */}
      <Card className="gba:col-span-4" data-testid="company-director-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <UserIcon className="gba:h-5 gba:w-5" />
            {t('director')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailItem
            icon={UserIcon}
            label={t('name')}
            value={
              company?.director
                ? company.director.displayName ||
                  `${company.director.firstName || ''} ${company.director.lastName || ''}`.trim() ||
                  '-'
                : '-'
            }
            data-testid="company-director-name"
          />
        </CardContent>
      </Card>

      {/* Tax Information Section */}
      <Card className="gba:col-span-4" data-testid="company-tax-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <ReceiptIcon className="gba:h-5 gba:w-5" />
            {t('tax-information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <DetailItem
              icon={ReceiptIcon}
              label={t('commercial-registration-number')}
              value={company?.commercialRegistrationNumber || '-'}
              data-testid="company-tax-commercial-registration"
            />
            <DetailItem
              icon={ReceiptIcon}
              label={t('tax-identification-number')}
              value={company?.taxIdentificationNumber || '-'}
              data-testid="company-tax-identification"
            />
            <DetailItem
              icon={ReceiptIcon}
              label={t('tax-number')}
              value={company?.taxNumber || '-'}
              data-testid="company-tax-number"
            />
            <DetailItem
              icon={ReceiptIcon}
              label={t('vat-number')}
              value={company?.valueAddedTaxNumber || '-'}
              data-testid="company-tax-vat"
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default HomeView
