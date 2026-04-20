import React from 'react'
import { WizardFormStep, Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountLayout } from '../account-layout'
import { ContactLayout } from '../contact-layout'
import { OpportunityLayout } from '../opportunity-layout'
import translations from './_i18n'

export interface LeadConvertAccountStepProps {
  businessAppContext: BusinessAppContextProps
  ownerEmployee?: any
  annualRevenueCatalogIdentifier?: string
  companySizeCatalogIdentifier?: string
  accountPriorityCatalogIdentifier?: string
  useContacts?: {
    contacts: any[]
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }
  loading?: boolean
  accountInformationCustomFields?: React.ReactNode
  accountDetailsCustomFields?: React.ReactNode
  addressCustomFields?: React.ReactNode
  communicationCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>
  isActive?: boolean
  // REQUIRED: Must be explicitly set to 'crm' or 'irm' to ensure correct labels
  accountContext: 'crm' | 'irm'
}

export const LeadConvertAccountStep: React.FC<LeadConvertAccountStepProps> = ({
  businessAppContext,
  ownerEmployee,
  annualRevenueCatalogIdentifier,
  companySizeCatalogIdentifier,
  accountPriorityCatalogIdentifier,
  useContacts,
  loading = false,
  accountInformationCustomFields,
  accountDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments,
  avatarFileRef,
  isActive = true,
  accountContext
}) => {
  const { t } = useTranslation(translations)

  return (
    <WizardFormStep>
      <div data-testid="lead-convert-account-step">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">{t('account-step-title')}</h3>
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <Spinner size="lg" />
            <span className="gba:ml-2">{t('loading-lead-data')}</span>
          </div>
        ) : (
          <AccountLayout
            businessAppContext={businessAppContext}
            ownerEmployee={ownerEmployee}
            annualRevenueCatalogIdentifier={annualRevenueCatalogIdentifier}
            companySizeCatalogIdentifier={companySizeCatalogIdentifier}
            accountPriorityCatalogIdentifier={accountPriorityCatalogIdentifier}
            useContacts={useContacts}
            accountInformationCustomFields={accountInformationCustomFields}
            accountDetailsCustomFields={accountDetailsCustomFields}
            addressCustomFields={addressCustomFields}
            communicationCustomFields={communicationCustomFields}
            customSegments={customSegments}
            avatarFileRef={avatarFileRef}
            isStepActive={isActive}
            accountContext={accountContext}
          />
        )}
      </div>
    </WizardFormStep>
  )
}

export interface LeadConvertContactStepProps {
  businessAppContext: BusinessAppContextProps
  ownerEmployee?: any
  useAccounts?: {
    accounts: any[]
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }
  loading?: boolean
  contactInformationCustomFields?: React.ReactNode
  contactDetailsCustomFields?: React.ReactNode
  communicationCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>
}

export const LeadConvertContactStep: React.FC<LeadConvertContactStepProps> = ({
  businessAppContext,
  ownerEmployee,
  useAccounts,
  loading = false,
  contactInformationCustomFields,
  contactDetailsCustomFields,
  communicationCustomFields,
  customSegments,
  avatarFileRef
}) => {
  const { t } = useTranslation(translations)

  return (
    <WizardFormStep>
      <div data-testid="lead-convert-contact-step">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">{t('contact-step-title')}</h3>
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <Spinner size="lg" />
            <span className="gba:ml-2">{t('loading-lead-data')}</span>
          </div>
        ) : (
          <ContactLayout
            businessAppContext={businessAppContext}
            ownerEmployee={ownerEmployee}
            useAccounts={useAccounts}
            contactInformationCustomFields={contactInformationCustomFields}
            contactDetailsCustomFields={contactDetailsCustomFields}
            communicationCustomFields={communicationCustomFields}
            customSegments={customSegments}
            avatarFileRef={avatarFileRef}
          />
        )}
      </div>
    </WizardFormStep>
  )
}

export interface LeadConvertOpportunityStepProps {
  businessAppContext: BusinessAppContextProps
  ownerEmployee?: any
  useAccounts?: {
    accounts: any[]
    total?: number
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }
  useContacts?: {
    contacts: any[]
    total?: number
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }
  loading?: boolean
  opportunityInformationCustomFields?: React.ReactNode
  opportunityPipelineCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
  // Hide related entities (account/contact) - true for Lead Convert context
  hideRelatedEntities?: boolean
  pipelineCatalogIdentifier?: string
  stageCatalogIdentifier?: string
  opportunityStatusCatalogIdentifier?: string
  opportunityForecastCatalogIdentifier?: string
  currencyCatalogIdentifier?: string
}

export const LeadConvertOpportunityStep: React.FC<LeadConvertOpportunityStepProps> = ({
  businessAppContext,
  ownerEmployee,
  useAccounts,
  useContacts,
  loading = false,
  opportunityInformationCustomFields,
  opportunityPipelineCustomFields,
  customSegments,
  hideRelatedEntities = true, // Default to true for Lead Convert context
  pipelineCatalogIdentifier,
  stageCatalogIdentifier,
  opportunityStatusCatalogIdentifier,
  opportunityForecastCatalogIdentifier,
  currencyCatalogIdentifier
}) => {
  const { t } = useTranslation(translations)

  return (
    <WizardFormStep>
      <div data-testid="lead-convert-opportunity-step">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">{t('opportunity-step-title')}</h3>
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <Spinner size="lg" />
            <span className="gba:ml-2">{t('loading-lead-data')}</span>
          </div>
        ) : (
          <OpportunityLayout
            businessAppContext={businessAppContext}
            ownerEmployee={ownerEmployee}
            useAccounts={useAccounts}
            useContacts={useContacts}
            opportunityInformationCustomFields={opportunityInformationCustomFields}
            opportunityPipelineCustomFields={opportunityPipelineCustomFields}
            customSegments={customSegments}
            hideRelatedEntities={hideRelatedEntities}
            pipelineCatalogIdentifier={pipelineCatalogIdentifier}
            stageCatalogIdentifier={stageCatalogIdentifier}
            opportunityStatusCatalogIdentifier={opportunityStatusCatalogIdentifier}
            opportunityForecastCatalogIdentifier={opportunityForecastCatalogIdentifier}
            currencyCatalogIdentifier={currencyCatalogIdentifier}
          />
        )}
      </div>
    </WizardFormStep>
  )
}
