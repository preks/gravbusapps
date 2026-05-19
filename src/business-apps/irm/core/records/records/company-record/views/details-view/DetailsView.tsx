import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { ArticleIcon, IdentificationCardIcon, MapPinIcon, UsersIcon } from '@phosphor-icons/react'
import type { DetailsViewProps } from '../../types'
import translations from '../../_i18n'

const EMPTY_VALUE = '-'

const formatCatalogValue = (value?: { value?: string; code?: string } | null): string => {
  return value?.value || value?.code || EMPTY_VALUE
}

const formatAddressPart = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value.toString()
  return undefined
}

const formatAddressLine = (addressLine: unknown): string => {
  if (!addressLine) return EMPTY_VALUE
  if (typeof addressLine === 'string') return addressLine
  if (typeof addressLine === 'object') {
    const formattedLine = Object.values(addressLine as Record<string, unknown>)
      .map(formatAddressPart)
      .filter((value): value is string => Boolean(value))
      .join(', ')

    return formattedLine || EMPTY_VALUE
  }
  return formatAddressPart(addressLine) || EMPTY_VALUE
}

const formatExecutiveName = (
  executive: NonNullable<DetailsViewProps['investmentCompany']['executives']>[number]
): string => {
  const employee = executive.employee
  if (employee) {
    return employee.displayName || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  }

  const contact = executive.investmentContact
  if (contact) {
    return contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
  }

  return EMPTY_VALUE
}

const formatExecutiveSource = (
  t: (key: string) => string,
  executive: NonNullable<DetailsViewProps['investmentCompany']['executives']>[number]
): string => {
  if (executive.employeeId) return t('source-employee')
  if (executive.investmentContactId) return t('source-investment-contact')
  return EMPTY_VALUE
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; dataTestId: string }> = ({
  label,
  value,
  dataTestId
}) => (
  <div className="gba:flex gba:flex-col gba:gap-1" data-testid={dataTestId}>
    <span className="gba:text-sm gba:text-muted-foreground">{label}</span>
    <span className="gba:text-sm gba:font-medium">{value || EMPTY_VALUE}</span>
  </div>
)

export const DetailsView: React.FC<DetailsViewProps> = ({ investmentCompany }) => {
  const { t } = useTranslation(translations)
  const addresses = investmentCompany.addresses || []
  const executives = investmentCompany.executives || []

  return (
    <>
      <div className="gba:col-span-12 gba:grid gba:grid-cols-12 gba:gap-4">
        <Card className="gba:col-span-4" data-testid="investment-company-registration-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <IdentificationCardIcon className="gba:h-5 gba:w-5" />
              {t('registration-tax-title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:grid gba:grid-cols-1 gba:gap-4">
            <DetailItem
              label={t('commercial-registration-number-label')}
              value={investmentCompany.commercialRegistrationNumber}
              dataTestId="investment-company-commercial-registration-number"
            />
            <DetailItem
              label={t('tax-identification-number-label')}
              value={investmentCompany.taxIdentificationNumber}
              dataTestId="investment-company-tax-identification-number"
            />
            <DetailItem
              label={t('tax-number-label')}
              value={investmentCompany.taxNumber}
              dataTestId="investment-company-tax-number"
            />
            <DetailItem
              label={t('vat-number-label')}
              value={investmentCompany.valueAddedTaxNumber}
              dataTestId="investment-company-vat-number"
            />
          </CardContent>
        </Card>

        <Card className="gba:col-span-4" data-testid="investment-company-addresses-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <MapPinIcon className="gba:h-5 gba:w-5" />
              {t('address-information-title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {addresses.length > 0 ? (
              <div className="gba:space-y-4">
                {addresses.map(address => (
                  <div
                    key={address.id}
                    className="gba:space-y-3 gba:p-4 gba:rounded-lg gba:border gba:border-border"
                    data-testid={`investment-company-address-${address.id}`}
                  >
                    <DetailItem
                      label={t('type-label')}
                      value={address.addressType}
                      dataTestId={`address-type-${address.id}`}
                    />
                    <DetailItem
                      label={t('address-label')}
                      value={formatAddressLine(address.addressLine)}
                      dataTestId={`address-line-${address.id}`}
                    />
                    <DetailItem
                      label={t('locality-label')}
                      value={address.locality}
                      dataTestId={`address-locality-${address.id}`}
                    />
                    <DetailItem
                      label={t('postal-code-label')}
                      value={address.postalCode}
                      dataTestId={`address-postal-code-${address.id}`}
                    />
                    <DetailItem
                      label={t('region-label')}
                      value={formatCatalogValue(address.region)}
                      dataTestId={`address-region-${address.id}`}
                    />
                    <DetailItem
                      label={t('country-label')}
                      value={formatCatalogValue(address.country)}
                      dataTestId={`address-country-${address.id}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-addresses')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="gba:col-span-4" data-testid="investment-company-executives-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <UsersIcon className="gba:h-5 gba:w-5" />
              {t('executives-title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {executives.length > 0 ? (
              <div className="gba:space-y-4">
                {executives.map(executive => (
                  <div
                    key={executive.id}
                    className="gba:p-4 gba:rounded-lg gba:border gba:border-border gba:space-y-3"
                    data-testid={`investment-company-executive-${executive.id}`}
                  >
                    <DetailItem
                      label={t('name-label')}
                      value={formatExecutiveName(executive)}
                      dataTestId={`executive-name-${executive.id}`}
                    />
                    <DetailItem
                      label={t('executive-type-label')}
                      value={formatCatalogValue(executive.executiveType)}
                      dataTestId={`executive-type-${executive.id}`}
                    />
                    <DetailItem
                      label={t('source-label')}
                      value={formatExecutiveSource(t, executive)}
                      dataTestId={`executive-source-${executive.id}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-executives')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gba:col-span-12" data-testid="investment-company-description-card">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <ArticleIcon className="gba:h-5 gba:w-5" />
            {t('company-description-title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investmentCompany.description ? (
            <p className="gba:text-sm" data-testid="investment-company-description">
              {investmentCompany.description}
            </p>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground" data-testid="investment-company-description-empty">
              {t('no-description')}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default DetailsView
