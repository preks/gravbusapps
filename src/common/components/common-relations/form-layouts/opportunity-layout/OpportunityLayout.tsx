import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Accordion, useTranslation } from '@newwork/nw-design-system'
import { OpportunityInformationSegment } from '../../form-segments/opportunity-information-segment'
import { OpportunityDetailsSegment } from '../../form-segments/opportunity-details-segment'
import { OpportunityPipelineSegment } from '../../form-segments/opportunity-pipeline-segment'
import type { SelectOption as AccountSelectOption } from '../../selects/account-select'
import type { SelectOption as ContactSelectOption } from '../../selects/contact-select'
import translations from './_i18n'

interface OpportunityLayoutProps {
  businessAppContext?: BusinessAppContextProps
  ownerEmployee?: any
  entityId?: string
  accountId?: string | { id: string; name: string }
  accounts?: AccountSelectOption[]
  accountsLoading?: boolean
  accountsError?: string | null
  searchAccounts?: (search: string) => void
  onAccountChange?: (accountId: string | { id: string; name: string } | null) => void
  opportunityContacts?: any[]
  contacts?: ContactSelectOption[]
  contactsLoading?: boolean
  contactsError?: string | null
  searchContacts?: (search: string) => void
  onContactsChange?: (contactIds: Array<string | { id: string; name: string }>) => void
  onNewContact?: () => void
  pipelineFieldName?: string
  stageFieldName?: string
  opportunityStatusFieldName?: string
  pipelineCatalogIdentifier?: string
  stageCatalogIdentifier?: string
  opportunityStatusCatalogIdentifier?: string
  opportunityInformationCustomFields?: React.ReactNode
  opportunityDetailsCustomFields?: React.ReactNode
  opportunityPipelineCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
}

const OpportunityLayout: React.FC<OpportunityLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  accountId,
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts,
  onAccountChange,
  opportunityContacts,
  contacts,
  contactsLoading,
  contactsError,
  searchContacts,
  onContactsChange,
  onNewContact,
  pipelineFieldName,
  stageFieldName,
  opportunityStatusFieldName,
  pipelineCatalogIdentifier,
  stageCatalogIdentifier,
  opportunityStatusCatalogIdentifier,
  opportunityInformationCustomFields,
  opportunityDetailsCustomFields,
  opportunityPipelineCustomFields,
  customSegments = []
}) => {
  const { t } = useTranslation(translations)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])

  const accordionItems = useMemo(
    () => [
      {
        id: 'pipeline-stage',
        title: t('pipeline-title'),
        content: (
          <OpportunityPipelineSegment
            pipelineFieldName={pipelineFieldName}
            stageFieldName={stageFieldName}
            opportunityStatusFieldName={opportunityStatusFieldName}
            pipelineCatalogIdentifier={pipelineCatalogIdentifier}
            stageCatalogIdentifier={stageCatalogIdentifier}
            opportunityStatusCatalogIdentifier={opportunityStatusCatalogIdentifier}
            customFields={opportunityPipelineCustomFields}
          />
        )
      },
      {
        id: 'amount-date',
        title: t('amount-title'),
        content: <OpportunityDetailsSegment customFields={opportunityDetailsCustomFields} />
      },
      ...customSegments
    ],
    [
      t,
      businessAppContext,
      pipelineFieldName,
      stageFieldName,
      opportunityStatusFieldName,
      pipelineCatalogIdentifier,
      stageCatalogIdentifier,
      opportunityStatusCatalogIdentifier,
      opportunityPipelineCustomFields,
      opportunityDetailsCustomFields,
      customSegments
    ]
  )

  return (
    <div data-testid="opportunity-layout">
      <OpportunityInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        accountId={accountId}
        accounts={accounts}
        accountsLoading={accountsLoading}
        accountsError={accountsError}
        searchAccounts={searchAccounts}
        onAccountChange={onAccountChange}
        opportunityContacts={opportunityContacts}
        contacts={contacts}
        contactsLoading={contactsLoading}
        contactsError={contactsError}
        searchContacts={searchContacts}
        onContactsChange={onContactsChange}
        onNewContact={onNewContact}
        customFields={opportunityInformationCustomFields}
      />
      <Accordion
        className="gba:w-full gba:[&>div[data-slot=accordion-item]]:bg-transparent gba:[&_button[data-slot=accordion-trigger]]:bg-transparent gba:[&_button[data-slot=accordion-trigger][data-state=open]]:bg-transparent gba:[&_button[data-slot=accordion-trigger]]:pl-0 gba:[&_[data-slot=accordion-content]>div]:bg-transparent gba:[&_[data-slot=accordion-content]>div]:p-0"
        value={accordionValue}
        onValueChange={value => setAccordionValue(value)}
        items={accordionItems}
      />
    </div>
  )
}

export default OpportunityLayout
