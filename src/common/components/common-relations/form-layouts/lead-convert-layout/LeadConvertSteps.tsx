import React from 'react'
import { WizardFormStep, Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountLayout } from '../account-layout'
import { ContactLayout } from '../contact-layout'
import { OpportunityLayout } from '../opportunity-layout'
import type { SelectOption as AccountSelectOption } from '../../selects/account-select'
import type { SelectOption as ContactSelectOption } from '../../selects/contact-select'
import translations from './_i18n'

export interface LeadConvertAccountStepProps {
  businessAppContext: BusinessAppContextProps
  ownerEmployee?: any
  annualRevenueCatalogIdentifier?: string
  companySizeCatalogIdentifier?: string
  contacts?: ContactSelectOption[]
  contactsLoading?: boolean
  contactsError?: string | null
  searchContacts?: (search: string) => void
  uploadConfig?: {
    appName: string
    accessScope: 'public' | 'private' | 'tenant'
    getAvatarPath: (entityId: string | undefined) => string
  }
  loading?: boolean
  accountInformationCustomFields?: React.ReactNode
  accountDetailsCustomFields?: React.ReactNode
  addressCustomFields?: React.ReactNode
  communicationCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
}

export const LeadConvertAccountStep: React.FC<LeadConvertAccountStepProps> = ({
  businessAppContext,
  ownerEmployee,
  annualRevenueCatalogIdentifier = 'AccountAnnualRevenueBand:v1',
  companySizeCatalogIdentifier = 'CompanySize:v1',
  contacts,
  contactsLoading,
  contactsError,
  searchContacts,
  uploadConfig,
  loading = false,
  accountInformationCustomFields,
  accountDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments
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
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            searchContacts={searchContacts}
            uploadConfig={uploadConfig}
            accountInformationCustomFields={accountInformationCustomFields}
            accountDetailsCustomFields={accountDetailsCustomFields}
            addressCustomFields={addressCustomFields}
            communicationCustomFields={communicationCustomFields}
            customSegments={customSegments}
          />
        )}
      </div>
    </WizardFormStep>
  )
}

export interface LeadConvertContactStepProps {
  businessAppContext: BusinessAppContextProps
  ownerEmployee?: any
  accounts?: AccountSelectOption[]
  accountsLoading?: boolean
  accountsError?: string | null
  searchAccounts?: (search: string) => void
  loading?: boolean
  contactInformationCustomFields?: React.ReactNode
  contactDetailsCustomFields?: React.ReactNode
  addressCustomFields?: React.ReactNode
  communicationCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
}

export const LeadConvertContactStep: React.FC<LeadConvertContactStepProps> = ({
  businessAppContext,
  ownerEmployee,
  accounts,
  accountsLoading,
  accountsError,
  searchAccounts,
  loading = false,
  contactInformationCustomFields,
  contactDetailsCustomFields,
  addressCustomFields,
  communicationCustomFields,
  customSegments
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
            accounts={accounts}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            searchAccounts={searchAccounts}
            contactInformationCustomFields={contactInformationCustomFields}
            contactDetailsCustomFields={contactDetailsCustomFields}
            addressCustomFields={addressCustomFields}
            communicationCustomFields={communicationCustomFields}
            customSegments={customSegments}
          />
        )}
      </div>
    </WizardFormStep>
  )
}

export interface LeadConvertOpportunityStepProps {
  businessAppContext: BusinessAppContextProps
  ownerEmployee?: any
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
  pipelines: Array<{ id: string; value: string; label?: string; name?: string }>
  stages: Array<{ id: string; value: string; label?: string; name?: string }>
  stagesLoading?: boolean
  onPipelineChange?: (pipelineId: string) => void
  opportunityStatuses?: Array<{ id: string; value: string; label?: string }>
  currencies: Array<{ id: string; value: string; label?: string; name?: string }>
  currenciesLoading?: boolean
  currenciesError?: string | null
  currenciesHasMore?: boolean
  searchCurrencies?: (search: string) => void
  loadMoreCurrencies?: () => void
  pipelineFieldName?: string
  stageFieldName?: string
  opportunityStatusFieldName?: string
  loading?: boolean
  opportunityInformationCustomFields?: React.ReactNode
  opportunityDetailsCustomFields?: React.ReactNode
  opportunityPipelineCustomFields?: React.ReactNode
  customSegments?: Array<{ id: string; title: string; content: React.ReactNode }>
  // Hide related entities (account/contact) - true for Lead Convert context
  hideRelatedEntities?: boolean
}

export const LeadConvertOpportunityStep: React.FC<LeadConvertOpportunityStepProps> = ({
  businessAppContext,
  ownerEmployee,
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
  pipelines,
  stages,
  stagesLoading,
  onPipelineChange,
  opportunityStatuses,
  currencies,
  currenciesLoading,
  currenciesError,
  currenciesHasMore,
  searchCurrencies,
  loadMoreCurrencies,
  pipelineFieldName = 'pipeline',
  stageFieldName = 'pipelineStage',
  opportunityStatusFieldName = 'opportunityStatus',
  loading = false,
  opportunityInformationCustomFields,
  opportunityDetailsCustomFields,
  opportunityPipelineCustomFields,
  customSegments,
  hideRelatedEntities = true // Default to true for Lead Convert context
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
            pipelines={pipelines}
            stages={stages}
            stagesLoading={stagesLoading}
            onPipelineChange={onPipelineChange}
            opportunityStatuses={opportunityStatuses}
            currencies={currencies}
            currenciesLoading={currenciesLoading}
            currenciesError={currenciesError}
            currenciesHasMore={currenciesHasMore}
            searchCurrencies={searchCurrencies}
            loadMoreCurrencies={loadMoreCurrencies}
            pipelineFieldName={pipelineFieldName}
            stageFieldName={stageFieldName}
            opportunityStatusFieldName={opportunityStatusFieldName}
            opportunityInformationCustomFields={opportunityInformationCustomFields}
            opportunityDetailsCustomFields={opportunityDetailsCustomFields}
            opportunityPipelineCustomFields={opportunityPipelineCustomFields}
            customSegments={customSegments}
            hideRelatedEntities={hideRelatedEntities}
          />
        )}
      </div>
    </WizardFormStep>
  )
}
