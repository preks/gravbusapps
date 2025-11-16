import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Accordion, useTranslation } from '@newwork/nw-design-system'
import { ContactInformationSegment } from '../../form-segments/contact-information-segment'
import { ContactDetailsSegment } from '../../form-segments/contact-details-segment'
import { AddressSegment } from '../../form-segments/address-segment'
import { CommunicationSegment } from '../../form-segments/communication-segment'
import type { SelectOption as AccountSelectOption } from '../../selects/account-select'
import translations from './_i18n'

interface ContactLayoutProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps

  // Owner employee from contact data (to display immediately in EmployeeSelect)
  ownerEmployee?: any

  // Entity ID (contact ID for edit mode)
  entityId?: string

  // Avatar image for preview (from existing contact data) - CRM only
  avatarImage?: string

  // Account selection props
  accounts?: AccountSelectOption[]
  accountsLoading?: boolean
  accountsError?: string | null
  searchAccounts?: (search: string) => void

  // Address data from contact query (for immediate display of country/region)
  addresses?: Array<{
    country?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
    region?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
  }>

  // Custom fields injection for ContactInformationSegment
  contactInformationCustomFields?: React.ReactNode
  // Custom fields injection for ContactDetailsSegment
  contactDetailsCustomFields?: React.ReactNode
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

const ContactLayout: React.FC<ContactLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  avatarImage,
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts,
  addresses,
  contactInformationCustomFields,
  contactDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments = []
}) => {
  const { t } = useTranslation(translations)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])

  const accordionItems = useMemo(
    () => [
      {
        id: 'personal-information',
        title: t('personal-title'),
        content: <ContactDetailsSegment customFields={contactDetailsCustomFields} />
      },
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
      ...customSegments
    ],
    [t, addresses, contactDetailsCustomFields, addressCustomFields, communicationCustomFields, customSegments]
  )

  return (
    <div data-testid="contact-layout">
      {/* Contact Information - Not in Accordion */}
      <ContactInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        avatarImage={avatarImage}
        accounts={accounts}
        accountsLoading={accountsLoading}
        accountsError={accountsError}
        searchAccounts={searchAccounts}
        customFields={contactInformationCustomFields}
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

export default ContactLayout
