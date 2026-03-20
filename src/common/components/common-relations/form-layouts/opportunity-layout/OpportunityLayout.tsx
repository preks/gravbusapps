import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Skeleton, FormSection } from '@newwork/nw-design-system'
import { OpportunityInformationSegment } from '../../form-segments/opportunity-information-segment'
import { OpportunityPipelineSegment } from '../../form-segments/opportunity-pipeline-segment'
import { CURRENCY } from '@/common/constants/commonCatalogs'
import translations from './_i18n'

interface OpportunityLayoutProps {
  businessAppContext?: BusinessAppContextProps
  ownerEmployee?: any
  entityId?: string
  account?: any // Deprecated - use opportunityAccounts instead
  opportunityAccounts?: any[] // Multiple accounts with types (junction table format)
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
  pipelineCatalogIdentifier?: string
  stageCatalogIdentifier?: string
  opportunityStatusCatalogIdentifier?: string
  opportunityForecastCatalogIdentifier?: string
  accountTypeCatalogIdentifier?: string
  currencyCatalogIdentifier?: string
  opportunityInformationCustomFields?: React.ReactNode
  opportunityPipelineCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean

  // Hide related entities (account/contact) sections - useful in Lead Convert context
  hideRelatedEntities?: boolean

  // Show dynamic stage required indicator (for conditional validation - IRM)
  // Set to false when stage is always required (CRM)
  showDynamicStageRequired?: boolean
}

const OpportunityLayout: React.FC<OpportunityLayoutProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  account,
  company,
  opportunityAccounts,
  useAccounts,
  opportunityContacts,
  useContacts,
  onNewContact,
  pipelineCatalogIdentifier,
  stageCatalogIdentifier,
  opportunityStatusCatalogIdentifier,
  opportunityForecastCatalogIdentifier,
  accountTypeCatalogIdentifier,
  currencyCatalogIdentifier = CURRENCY,
  opportunityInformationCustomFields,
  opportunityPipelineCustomFields,
  customSegments = [],
  loading = false,
  hideRelatedEntities = false,
  showDynamicStageRequired = true
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
        {/* FormSection Skeleton */}
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
        company={company}
        opportunityAccounts={opportunityAccounts}
        useAccounts={useAccounts}
        opportunityContacts={opportunityContacts}
        useContacts={useContacts}
        onNewContact={onNewContact}
        customFields={opportunityInformationCustomFields}
        hideRelatedEntities={hideRelatedEntities}
        opportunityForecastCatalogIdentifier={opportunityForecastCatalogIdentifier}
        accountTypeCatalogIdentifier={accountTypeCatalogIdentifier}
        currencyCatalogIdentifier={currencyCatalogIdentifier}
      />
      <FormSection title={t('pipeline-title')} value="pipeline-stage">
        <OpportunityPipelineSegment
          pipelineCatalogIdentifier={pipelineCatalogIdentifier}
          stageCatalogIdentifier={stageCatalogIdentifier}
          opportunityStatusCatalogIdentifier={opportunityStatusCatalogIdentifier}
          customFields={opportunityPipelineCustomFields}
          showDynamicStageRequired={showDynamicStageRequired}
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

export default OpportunityLayout
