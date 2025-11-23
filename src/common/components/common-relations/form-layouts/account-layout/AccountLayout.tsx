import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useTranslation,
  Skeleton,
  FormAccordion,
  FormAccordionItem,
  FormAccordionTrigger,
  FormAccordionContent
} from '@newwork/nw-design-system'
import { AccountInformationSegment } from '../../form-segments/account-information-segment'
import { AccountDetailsSegment } from '../../form-segments/account-details-segment'
import { AddressSegment } from '../../form-segments/address-segment'
import { CommunicationSegment } from '../../form-segments/communication-segment'
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

  // Custom segments to add to the accordion (after standard segments)
  customSegments?: Array<{
    id: string
    title: string
    content: React.ReactNode
  }>

  // Ref to store current file and thumbnail (for handlePreSubmit in form component)
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  annualRevenueCatalogIdentifier = 'AccountAnnualRevenueBand:v1',
  companySizeCatalogIdentifier = 'CompanySize:v1',
  useContacts,
  accountInformationCustomFields,
  accountDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments = [],
  avatarFileRef,
  loading = false
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
        {/* Accordion Skeleton */}
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
      {/* Account Information - Not in Accordion */}
      <AccountInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        useContacts={useContacts}
        customFields={accountInformationCustomFields}
        avatarFileRef={avatarFileRef}
      />

      {/* Other Segments in Accordion */}
      <FormAccordion type="multiple" className="gba:w-full" data-testid="account-layout-accordion">
        <FormAccordionItem value="communication-channels">
          <FormAccordionTrigger>{t('communication-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <CommunicationSegment customFields={communicationCustomFields} />
          </FormAccordionContent>
        </FormAccordionItem>
        <FormAccordionItem value="address-information">
          <FormAccordionTrigger>{t('address-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <AddressSegment customFields={addressCustomFields} />
          </FormAccordionContent>
        </FormAccordionItem>
        <FormAccordionItem value="financial-information">
          <FormAccordionTrigger>{t('financial-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <AccountDetailsSegment
              annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
              companySizeCatalogIdentifier={companySizeCatalogIdentifier}
              customFields={accountDetailsCustomFields}
            />
          </FormAccordionContent>
        </FormAccordionItem>
        {customSegments.map(segment => (
          <FormAccordionItem key={segment.id} value={segment.id}>
            <FormAccordionTrigger>{segment.title}</FormAccordionTrigger>
            <FormAccordionContent>{segment.content}</FormAccordionContent>
          </FormAccordionItem>
        ))}
      </FormAccordion>
    </div>
  )
}

export default AccountLayout
