import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Skeleton } from '@newwork/nw-design-system'
import { FormAccordion } from '@/components/form-accordion'
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

  // Account selection hook result
  // When mapToSelectOptions: true is used, options will always be SelectOption[]
  accountsHook?: {
    options: AccountSelectOption[]
    loading: boolean
    error: string | null
    search: (searchTerm: string) => void
  }

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

  // Ref to store current file and thumbnail (for handlePreSubmit in form component)
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const ContactLayout: React.FC<ContactLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  accountsHook,
  contactInformationCustomFields,
  contactDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments = [],
  avatarFileRef,
  loading = false
}) => {
  const { t } = useTranslation(translations)

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
        content: <AddressSegment customFields={addressCustomFields} />
      },
      ...customSegments
    ],
    [t, contactDetailsCustomFields, addressCustomFields, communicationCustomFields, customSegments]
  )

  // Show skeletons while loading (after all hooks)
  if (loading) {
    return (
      <div data-testid="contact-layout-loading" className="gba:space-y-6">
        {/* Contact Information Skeleton */}
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
    <div data-testid="contact-layout">
      {/* Contact Information - Not in Accordion */}
      <ContactInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        accountsHook={accountsHook}
        customFields={contactInformationCustomFields}
        avatarFileRef={avatarFileRef}
      />

      {/* Other Segments in Accordion */}
      <FormAccordion items={accordionItems} className="gba:w-full" data-testid="contact-layout-accordion" />
    </div>
  )
}

export default ContactLayout
