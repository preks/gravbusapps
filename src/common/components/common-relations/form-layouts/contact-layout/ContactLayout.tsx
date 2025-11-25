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
import { ContactInformationSegment } from '../../form-segments/contact-information-segment'
import { ContactDetailsSegment } from '../../form-segments/contact-details-segment'
import { AddressSegment } from '../../form-segments/address-segment'
import { CommunicationSegment } from '../../form-segments/communication-segment'
import translations from './_i18n'

interface ContactLayoutProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps

  // Owner employee from contact data (to display immediately in EmployeeSelect)
  ownerEmployee?: any

  // Entity ID (contact ID for edit mode)
  entityId?: string

  // Account selection hook result - raw entities and refetch function - generic types for context-agnostic component
  useAccounts?: {
    accounts: any[]
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }

  // Custom fields injection for ContactInformationSegment
  contactInformationCustomFields?: React.ReactNode
  // Custom fields injection for ContactDetailsSegment
  contactDetailsCustomFields?: React.ReactNode
  // Custom fields injection for AddressSegment
  addressCustomFields?: React.ReactNode
  // Custom fields injection for CommunicationSegment
  communicationCustomFields?: React.ReactNode

  // Custom segments to add to the FormAccordion (after standard segments)
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
  useAccounts,
  contactInformationCustomFields,
  contactDetailsCustomFields,
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
        {/* FormAccordion Skeleton */}
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
      {/* Contact Information - Not in FormAccordion */}
      <ContactInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        useAccounts={useAccounts}
        customFields={contactInformationCustomFields}
        avatarFileRef={avatarFileRef}
      />

      {/* Other Segments in FormAccordion */}
      <FormAccordion type="multiple" className="gba:w-full" data-testid="contact-layout-FormAccordion">
        <FormAccordionItem value="personal-information">
          <FormAccordionTrigger>{t('personal-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <ContactDetailsSegment customFields={contactDetailsCustomFields} />
          </FormAccordionContent>
        </FormAccordionItem>
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

export default ContactLayout
