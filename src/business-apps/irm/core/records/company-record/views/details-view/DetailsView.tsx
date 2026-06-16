import React, { useEffect, useState } from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import {
  ArticleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  IdentificationCardIcon,
  MapPinIcon,
  UsersIcon
} from '@phosphor-icons/react'
import type { DetailsViewProps } from '../../types'
import { ExecutiveDetailsRow } from './ExecutiveDetailsRow'
import translations from '../../_i18n'

const EMPTY_VALUE = '-'

const formatCatalogValue = (value?: { value?: string; code?: string } | null): string => {
  return value?.value || value?.code || EMPTY_VALUE
}

const formatOwnerName = (ownerEmployee: DetailsViewProps['investmentCompany']['ownerEmployee']): string =>
  ownerEmployee?.displayName ||
  ownerEmployee?.fullName ||
  `${ownerEmployee?.firstName || ''} ${ownerEmployee?.lastName || ''}`.trim() ||
  EMPTY_VALUE

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

const formatAddressType = (addressType?: string): string => {
  if (!addressType) return EMPTY_VALUE
  const knownAddressTypeLabels: Record<string, string> = {
    PRIMARY_ADDRESS: 'Primary Address',
    SECONDARY_ADDRESS: 'Secondary Address'
  }
  if (knownAddressTypeLabels[addressType]) return knownAddressTypeLabels[addressType]
  return addressType
    .toLowerCase()
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
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

export const DetailsView: React.FC<DetailsViewProps> = ({ investmentCompany, accessToken }) => {
  const { t } = useTranslation(translations)
  const addresses = investmentCompany.addresses || []
  const executives = investmentCompany.executives || []
  const [currentExecutiveIndex, setCurrentExecutiveIndex] = useState(0)
  const hasExecutiveCarousel = executives.length > 1
  const activeExecutive = executives[currentExecutiveIndex] || executives[0]

  useEffect(() => {
    setCurrentExecutiveIndex(0)
  }, [executives.length])

  const handlePreviousExecutive = () => {
    setCurrentExecutiveIndex(previousIndex => {
      if (executives.length === 0) return 0
      return previousIndex > 0 ? previousIndex - 1 : executives.length - 1
    })
  }

  const handleNextExecutive = () => {
    setCurrentExecutiveIndex(previousIndex => {
      if (executives.length === 0) return 0
      return previousIndex < executives.length - 1 ? previousIndex + 1 : 0
    })
  }

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
            <DetailItem
              label={t('owner-label')}
              value={formatOwnerName(investmentCompany.ownerEmployee)}
              dataTestId="investment-company-owner"
            />
            {investmentCompany.ownsProperty && (
              <div className="gba:flex" data-testid="investment-company-owns-property">
                <Badge variant="success">{t('owns-property-label')}</Badge>
              </div>
            )}
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
                    className="gba:space-y-3"
                    data-testid={`investment-company-address-${address.id}`}
                  >
                    <DetailItem
                      label={t('type-label')}
                      value={formatAddressType(address.addressType)}
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

        <Card className="gba:col-span-4 gba:flex gba:flex-col" data-testid="investment-company-executives-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <UsersIcon className="gba:h-5 gba:w-5" />
              {t('executives-title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:relative gba:flex-1">
            {executives.length > 0 ? (
              <div className={hasExecutiveCarousel ? 'gba:pb-8' : undefined}>
                {activeExecutive && (
                  <div data-testid={`investment-company-executive-${activeExecutive.id}`}>
                    <ExecutiveDetailsRow executive={activeExecutive} accessToken={accessToken} t={t} />
                  </div>
                )}
              </div>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-executives')}</p>
            )}
            {hasExecutiveCarousel && (
              <div className="gba:absolute gba:bottom-2 gba:right-2 gba:z-10">
                <div className="gba:flex gba:items-center gba:gap-1 gba:rounded gba:border gba:bg-muted gba:px-2 gba:py-1 gba:shadow-sm gba:border-border">
                  <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                    {currentExecutiveIndex + 1}/{executives.length}
                  </span>
                  <button
                    type="button"
                    onClick={handlePreviousExecutive}
                    data-testid="executives-carousel-prev"
                    className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
                  >
                    <CaretLeftIcon className="gba:text-[10px]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextExecutive}
                    data-testid="executives-carousel-next"
                    className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
                  >
                    <CaretRightIcon className="gba:text-[10px]" />
                  </button>
                </div>
              </div>
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
