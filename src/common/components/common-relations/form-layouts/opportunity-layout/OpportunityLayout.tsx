import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Skeleton } from '@newwork/nw-design-system'
import { FormAccordion } from '@/components/form-accordion'
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
  account?: any
  // Account selection hook result
  // When mapToSelectOptions: true is used, options will always be SelectOption[]
  accountsHook?: {
    options: AccountSelectOption[]
    loading: boolean
    error: string | null
    search: (searchTerm: string) => void
  }
  opportunityContacts?: any[]
  // Contact selection hook result
  // When mapToSelectOptions: true is used, options will always be SelectOption[]
  contactsHook?: {
    options: ContactSelectOption[]
    loading: boolean
    error: string | null
    search: (searchTerm: string) => void
  }
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

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean

  // Hide related entities (account/contact) sections - useful in Lead Convert context
  hideRelatedEntities?: boolean
}

const OpportunityLayout: React.FC<OpportunityLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  account,
  accountsHook,
  opportunityContacts,
  contactsHook,
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
  customSegments = [],
  loading = false,
  hideRelatedEntities = false
}) => {
  const { t } = useTranslation(translations)

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

  // Show skeletons while loading (after all hooks)
  if (loading) {
    return (
      <div data-testid="opportunity-layout-loading" className="gba:space-y-6">
        {/* Opportunity Information Skeleton */}
        <div className="gba:space-y-4">
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
        </div>
      </div>
    )
  }

  return (
    <div data-testid="opportunity-layout">
      <OpportunityInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee}
        entityId={entityId}
        account={account}
        accountsHook={accountsHook}
        opportunityContacts={opportunityContacts}
        contactsHook={contactsHook}
        onNewContact={onNewContact}
        customFields={opportunityInformationCustomFields}
        hideRelatedEntities={hideRelatedEntities}
      />
      <FormAccordion items={accordionItems} className="gba:w-full" data-testid="opportunity-layout-accordion" />
    </div>
  )
}

export default OpportunityLayout
