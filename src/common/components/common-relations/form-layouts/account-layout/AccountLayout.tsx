import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Accordion, useTranslation } from '@newwork/nw-design-system'
import { AccountInformationSegment } from '../../form-segments/account-information-segment'
import { AccountDetailsSegment } from '../../form-segments/account-details-segment'
import { AddressSegment } from '../../form-segments/address-segment'
import { CommunicationSegment } from '../../form-segments/communication-segment'
import type { SelectOption as ContactSelectOption } from '../../selects/contact-select'
import translations from './_i18n'

interface AccountLayoutProps {
  // Business app context for EmployeeSelect and file uploads
  businessAppContext?: BusinessAppContextProps

  // Upload configuration (provided by the form, from its respective constants)
  uploadConfig?: {
    appName: string
    accessScope: 'public' | 'private' | 'tenant'
    getAvatarPath: (entityId: string | undefined) => string
  }

  // Owner employee from account data (to display immediately in EmployeeSelect)
  ownerEmployee?: any

  // Entity ID (account ID for edit mode)
  entityId?: string

  // Catalog identifiers for financial info (CRM vs IRM differences)
  annualRevenueCatalogIdentifier?: string // e.g., "RevenueSize:v1" (CRM) or "AccountAnnualRevenueBand:v1" (IRM)
  companySizeCatalogIdentifier?: string // e.g., "EmployeeSize:v1" (CRM) or "CompanySize:v1" (IRM)

  // Avatar image for preview (from existing account data)
  avatarImage?: string

  // Contact selection props
  contacts?: ContactSelectOption[]
  contactsLoading?: boolean
  contactsError?: string | null
  searchContacts?: (search: string) => void

  // Address data from account query (for immediate display of country/region)
  addresses?: Array<{
    country?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
    region?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
  }>

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
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  businessAppContext,
  uploadConfig,
  ownerEmployee,
  entityId,
  annualRevenueCatalogIdentifier = 'AccountAnnualRevenueBand:v1',
  companySizeCatalogIdentifier = 'CompanySize:v1',
  avatarImage,
  contacts,
  contactsLoading,
  contactsError,
  searchContacts,
  addresses,
  accountInformationCustomFields,
  accountDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments = []
}) => {
  const { t } = useTranslation(translations)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])

  const accordionItems = useMemo(
    () => [
      {
        id: 'communication-channels',
        title: t('communication-title'),
        content: <CommunicationSegment customFields={communicationCustomFields} />
      },
      {
        id: 'address-information',
        title: t('address-title'),
        content: <AddressSegment addresses={addresses} customFields={addressCustomFields} />
      },
      {
        id: 'financial-information',
        title: t('financial-title'),
        content: (
          <AccountDetailsSegment
            annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
            companySizeCatalogIdentifier={companySizeCatalogIdentifier}
            customFields={accountDetailsCustomFields}
          />
        )
      },
      ...customSegments
    ],
    [
      t,
      addresses,
      annualRevenueCatalogIdentifier,
      companySizeCatalogIdentifier,
      accountDetailsCustomFields,
      addressCustomFields,
      communicationCustomFields,
      customSegments
    ]
  )

  return (
    <div data-testid="account-layout">
      {/* Account Information - Not in Accordion */}
      <AccountInformationSegment
        businessAppContext={businessAppContext}
        uploadConfig={uploadConfig}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        avatarImage={avatarImage}
        contacts={contacts}
        contactsLoading={contactsLoading}
        contactsError={contactsError}
        searchContacts={searchContacts}
        customFields={accountInformationCustomFields}
      />

      {/* Other Segments in Accordion */}
      <Accordion
        className="gba:w-full gba:[&>div[data-slot=accordion-item]]:bg-transparent gba:[&_button[data-slot=accordion-trigger]]:bg-transparent gba:[&_button[data-slot=accordion-trigger][data-state=open]]:bg-transparent gba:[&_button[data-slot=accordion-trigger]]:pl-0 gba:[&_[data-slot=accordion-content]>div]:bg-transparent gba:[&_[data-slot=accordion-content]>div]:p-0"
        value={accordionValue}
        onValueChange={value => setAccordionValue(value)}
        items={accordionItems}
      />
    </div>
  )
}

export default AccountLayout
