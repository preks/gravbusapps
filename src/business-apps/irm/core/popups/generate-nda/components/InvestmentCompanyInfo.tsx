import React from 'react'
import type { InvestmentAddressData, OpportunityData } from '../hooks/useOpportunityData'

interface InvestmentCompanyInfoProps {
  company?: OpportunityData['investmentCompany']
  dataTestId?: string
}

const extractAddressLine = (addressLine: unknown): string => {
  if (!addressLine) return ''
  if (typeof addressLine === 'string') return addressLine
  if (typeof addressLine === 'object') {
    const lines = (addressLine as { lines?: unknown }).lines
    if (Array.isArray(lines) && typeof lines[0] === 'string') {
      return lines[0]
    }
  }
  return ''
}

const getPrimaryAddress = (addresses?: InvestmentAddressData[] | null): InvestmentAddressData | undefined => {
  return addresses?.find(address => address.addressType === 'PRIMARY_ADDRESS') || addresses?.[0]
}

const InvestmentCompanyInfo: React.FC<InvestmentCompanyInfoProps> = ({
  company,
  dataTestId = 'investment-company-info'
}) => {
  if (!company) {
    return (
      <div
        className="gba:rounded-md gba:border gba:border-input gba:bg-muted gba:px-3 gba:py-3 gba:text-sm gba:text-muted-foreground"
        data-testid={`${dataTestId}-empty`}
      >
        No investment company linked to this opportunity.
      </div>
    )
  }

  const primaryAddress = getPrimaryAddress(company.investmentAddress)
  const street = extractAddressLine(primaryAddress?.addressLine)
  const postalCode = primaryAddress?.postalCode || ''
  const city = primaryAddress?.locality || ''
  const region = primaryAddress?.region?.value || ''
  const country = primaryAddress?.country?.value || ''

  const cityLine = [postalCode, city].filter(Boolean).join(' ')
  const addressLine = [street, cityLine, region, country].filter(Boolean).join(', ')

  return (
    <div className="gba:rounded-md gba:border gba:border-input gba:bg-muted gba:px-3 gba:py-3" data-testid={dataTestId}>
      <p className="gba:text-sm gba:font-medium gba:text-foreground">{company.name || 'Unnamed company'}</p>
      <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{addressLine || 'No primary address available.'}</p>
    </div>
  )
}

export default InvestmentCompanyInfo
