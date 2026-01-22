import React, { useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Skeleton, FormSection, useFormAccordionContext } from '@newwork/nw-design-system'
import { LeadInformationSegment } from '../../form-segments/lead-information-segment'
import { LeadPersonSegment } from '../../form-segments/lead-person-segment'
import { LeadCompanySegment } from '../../form-segments/lead-company-segment'
import translations from './_i18n'
import type { AutocompleteOption } from '@newwork/nw-design-system'

interface LeadLayoutProps {
  businessAppContext?: BusinessAppContextProps
  ownerEmployee?: any
  entityId?: string
  leadStatusCatalogIdentifier: string
  leadSourceCatalogIdentifier: string
  leadRatingCatalogIdentifier: string
  companySizeCatalogIdentifier: string
  annualRevenueCatalogIdentifier: string
  leadInformationCustomFields?: React.ReactNode
  leadPersonCustomFields?: React.ReactNode
  leadCompanyCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean

  // Account autocomplete props
  accountSearchOptions?: AutocompleteOption[]
  onAccountSearch?: (query: string) => void
  onAccountSelect?: (accountId: string, accountData: any) => void
  accountSearchLoading?: boolean

  // Auto-filled fields tracking
  autoFilledFields?: Set<string>
  onFieldChange?: (fieldName: string) => void

  // Expand company section when account is selected
  expandCompanySection?: boolean
}

const LeadLayout: React.FC<LeadLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  leadStatusCatalogIdentifier,
  leadSourceCatalogIdentifier,
  leadRatingCatalogIdentifier,
  companySizeCatalogIdentifier,
  annualRevenueCatalogIdentifier,
  leadInformationCustomFields,
  leadPersonCustomFields,
  leadCompanyCustomFields,
  customSegments = [],
  loading = false,
  accountSearchOptions = [],
  onAccountSearch,
  onAccountSelect,
  accountSearchLoading = false,
  autoFilledFields = new Set(),
  onFieldChange,
  expandCompanySection = false
}) => {
  const { t } = useTranslation(translations)
  const accordionContext = useFormAccordionContext()

  // Auto-expand company section when account is selected
  useEffect(() => {
    if (expandCompanySection && accordionContext) {
      accordionContext.expandSectionOnError('company-information')
    }
  }, [expandCompanySection, accordionContext])

  // Show skeletons while loading (after all hooks)
  if (loading) {
    return (
      <div data-testid="lead-layout-loading" className="gba:space-y-6">
        {/* Lead Information Skeleton */}
        <div className="gba:space-y-4">
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-3/4" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-32 gba:w-full" />
        </div>
        {/* FormSection Skeleton */}
        <div className="gba:space-y-2">
          <Skeleton className="gba:h-12 gba:w-full" />
          <Skeleton className="gba:h-12 gba:w-full" />
        </div>
      </div>
    )
  }

  return (
    <div data-testid="lead-layout">
      <LeadInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        leadStatusCatalogIdentifier={leadStatusCatalogIdentifier}
        leadSourceCatalogIdentifier={leadSourceCatalogIdentifier}
        leadRatingCatalogIdentifier={leadRatingCatalogIdentifier}
        customFields={leadInformationCustomFields}
        accountSearchOptions={accountSearchOptions}
        onAccountSearch={onAccountSearch}
        onAccountSelect={onAccountSelect}
        accountSearchLoading={accountSearchLoading}
        autoFilledFields={autoFilledFields}
        onFieldChange={onFieldChange}
      />
      <FormSection title={t('personal-title')} value="personal-information">
        <LeadPersonSegment customFields={leadPersonCustomFields} />
      </FormSection>
      <FormSection title={t('company-title')} value="company-information">
        <LeadCompanySegment
          companySizeCatalogIdentifier={companySizeCatalogIdentifier}
          annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
          customFields={leadCompanyCustomFields}
          autoFilledFields={autoFilledFields}
          onFieldChange={onFieldChange}
        />
      </FormSection>
      {customSegments.map(segment => (
        <FormSection key={segment.id} title={segment.title} value={segment.id}>
          {segment.content}
        </FormSection>
      ))}
    </div>
  )
}

export default LeadLayout
