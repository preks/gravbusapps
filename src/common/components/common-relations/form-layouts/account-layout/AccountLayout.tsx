import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Skeleton, FormSection } from '@newwork/nw-design-system'
import { AccountInformationSegment } from '../../form-segments/account-information-segment'
import { AccountDetailsSegment } from '../../form-segments/account-details-segment'
import { AddressSegment } from '../../form-segments/address-segment'
import { CommunicationSegment, DEFAULT_ACCOUNT_CHANNELS } from '../../form-segments/communication-segment'
import translations from './_i18n'

interface AccountLayoutProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps

  // Owner employee from account data (to display immediately in EmployeeSelect)
  ownerEmployee?: any

  // Entity ID (account ID for edit mode)
  entityId?: string

  // Catalog identifiers for financial info (CRM vs IRM differences)
  annualRevenueCatalogIdentifier?: string // e.g., "RevenueSize:v1" (CRM) or "AccountAnnualRevenueBand:v1" (IRM)
  companySizeCatalogIdentifier?: string // e.g., "EmployeeSize:v1" (CRM) or "CompanySize:v1" (IRM)
  // Catalog identifier for account priority (context-specific)
  accountPriorityCatalogIdentifier?: string

  // Contact selection hook result - raw entities and refetch function - generic types for context-agnostic component
  useContacts?: {
    contacts: any[]
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }

  // Custom fields injection for AccountInformationSegment
  accountInformationCustomFields?: React.ReactNode
  // Custom fields injection for AccountDetailsSegment
  accountDetailsCustomFields?: React.ReactNode
  // Custom fields injection for AddressSegment
  addressCustomFields?: React.ReactNode
  // Custom fields injection for CommunicationSegment
  communicationCustomFields?: React.ReactNode

  // Custom segments to add after standard segments
  customSegments?: Array<{
    id: string
    title: string
    content: React.ReactNode
  }>

  // Ref to store current file and thumbnail (for handlePreSubmit in form component)
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
  isStepActive?: boolean
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  annualRevenueCatalogIdentifier,
  companySizeCatalogIdentifier,
  accountPriorityCatalogIdentifier,
  useContacts,
  accountInformationCustomFields,
  accountDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments = [],
  avatarFileRef,
  loading = false,
  isStepActive = true
}) => {
  const { t } = useTranslation(translations)

  // Show skeletons while loading (after all hooks)
  if (loading) {
    return (
      <div data-testid="account-layout-loading" className="gba:space-y-6">
        {/* Account Information Skeleton */}
        <div className="gba:space-y-4">
          <div className="gba:flex gba:items-center gba:gap-4">
            <Skeleton className="gba:h-20 gba:w-20 gba:rounded-full" />
            <div className="gba:flex-1 gba:space-y-2">
              <Skeleton className="gba:h-6 gba:w-3/4" />
              <Skeleton className="gba:h-4 gba:w-1/2" />
            </div>
          </div>
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
          <Skeleton className="gba:h-12 gba:w-full" />
        </div>
      </div>
    )
  }

  return (
    <div data-testid="account-layout">
      {/* Account Information - Not in FormAccordion */}
      <AccountInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        useContacts={useContacts}
        customFields={accountInformationCustomFields}
        avatarFileRef={avatarFileRef}
        accountPriorityCatalogIdentifier={accountPriorityCatalogIdentifier}
      />

      {/* Other Segments */}
      <FormSection title={t('communication-title')} value="communication-channels">
        <CommunicationSegment customFields={communicationCustomFields} defaultChannelCodes={DEFAULT_ACCOUNT_CHANNELS} />
      </FormSection>
      <FormSection title={t('address-title')} value="address-information">
        <AddressSegment
          businessAppContext={businessAppContext}
          customFields={addressCustomFields}
          isActive={isStepActive}
        />
      </FormSection>
      <FormSection title={t('financial-title')} value="financial-information">
        <AccountDetailsSegment
          annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
          companySizeCatalogIdentifier={companySizeCatalogIdentifier}
          customFields={accountDetailsCustomFields}
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

export default AccountLayout
