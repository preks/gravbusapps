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
import { OpportunityInformationSegment } from '../../form-segments/opportunity-information-segment'
import { OpportunityDetailsSegment } from '../../form-segments/opportunity-details-segment'
import { OpportunityPipelineSegment } from '../../form-segments/opportunity-pipeline-segment'
import translations from './_i18n'

interface OpportunityLayoutProps {
  businessAppContext?: BusinessAppContextProps
  ownerEmployee?: any
  entityId?: string
  account?: any
  // Account selection hook result - raw entities and refetch function
  useAccounts?: {
    accounts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }
  opportunityContacts?: any[]
  // Contact selection hook result - raw entities and refetch function
  useContacts?: {
    contacts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }
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
  useAccounts,
  opportunityContacts,
  useContacts,
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
        useAccounts={useAccounts}
        opportunityContacts={opportunityContacts}
        useContacts={useContacts}
        onNewContact={onNewContact}
        customFields={opportunityInformationCustomFields}
        hideRelatedEntities={hideRelatedEntities}
      />
      <FormAccordion type="multiple" className="gba:w-full" data-testid="opportunity-layout-accordion">
        <FormAccordionItem value="pipeline-stage">
          <FormAccordionTrigger>{t('pipeline-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <OpportunityPipelineSegment
              pipelineFieldName={pipelineFieldName}
              stageFieldName={stageFieldName}
              opportunityStatusFieldName={opportunityStatusFieldName}
              pipelineCatalogIdentifier={pipelineCatalogIdentifier}
              stageCatalogIdentifier={stageCatalogIdentifier}
              opportunityStatusCatalogIdentifier={opportunityStatusCatalogIdentifier}
              customFields={opportunityPipelineCustomFields}
            />
          </FormAccordionContent>
        </FormAccordionItem>
        <FormAccordionItem value="amount-date">
          <FormAccordionTrigger>{t('amount-title')}</FormAccordionTrigger>
          <FormAccordionContent>
            <OpportunityDetailsSegment customFields={opportunityDetailsCustomFields} />
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

export default OpportunityLayout
