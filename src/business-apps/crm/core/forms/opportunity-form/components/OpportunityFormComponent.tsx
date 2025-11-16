import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import { OpportunityLayout } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { createOpportunitySegmentResolver } from '@/common/components/common-relations/schemas/opportunitySchema'
import {
  buildCustomerOpportunityPayload,
  buildCustomerOpportunityContacts
} from '@/common/data/customer/types/customerOpportunityTypes'
import { CampaignSelect } from '@/common/components/customer/form-segments/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useAccountsGraphQL } from '../hooks/useAccountsGraphQL'
import { useGetCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { usePipelineCatalogs, useOpportunityStatusCatalog } from '../hooks'
import { useCurrenciesGraphQL } from '../hooks/useCurrenciesGraphQL'
import { useCustomerCampaigns } from '@/common/data/customer/hooks/useCustomerCampaigns'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

const prefixDataTestId = 'OpportunityForm'

interface OpportunityFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerOpportunity to form values
const mapCustomerOpportunityToFormValues = (opportunity: CustomerOpportunity): any => {
  return {
    id: opportunity.id,
    version: opportunity.version,
    ownerEmployeeId: opportunity.ownerEmployeeId || '',
    name: opportunity.name || '',
    pipeline: opportunity.opportunityPipelineRef || '',
    salesPipelineStage: opportunity.opportunityPipelineStageRef || '',
    opportunityStatus: opportunity.opportunityStatusRef || '',
    estimatedAmount: opportunity.estimatedAmount?.toString() || '',
    currency: opportunity.currencyRef || '',
    closeDate: opportunity.closeDate ? new Date(opportunity.closeDate).toISOString().split('T')[0] : '',
    accountId: opportunity.accountId || '',
    contactIds:
      opportunity.opportunityContacts?.map(oc => ({
        id: oc.contact?.id || '',
        name: oc.contact?.displayName || oc.contact?.fullName || '',
        associationId: oc.id,
        associationVersion: oc.version
      })) || [],
    salesCampaignId: opportunity.salesCampaignId || '',
    notesSummary: opportunity.notesSummary || ''
  }
}

const OpportunityFormComponent: React.FC<OpportunityFormComponentProps> = ({
  businessAppContext,
  initialValues,
  onCancel = async () => {}
}) => {
  // Load opportunity data when editing
  const [opportunityData, setOpportunityData] = useState<CustomerOpportunity | null>(null)
  const { fetchCustomerOpportunityById } = useCustomerOpportunities(businessAppContext)

  // Extract opportunityId from businessAppContext
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Load opportunity data when opportunityId is provided
  useEffect(() => {
    const loadOpportunityData = async () => {
      if (!opportunityId || !businessAppContext.accessToken) {
        return
      }

      try {
        const result = await fetchCustomerOpportunityById(opportunityId)
        if (result) {
          setOpportunityData(result)
        }
      } catch (err) {
        console.error('Failed to load opportunity data:', err)
      }
    }

    loadOpportunityData()
  }, [opportunityId, businessAppContext.accessToken, fetchCustomerOpportunityById])

  // Account search hook
  const {
    options: accountOptions,
    loading: accountsLoading,
    search: searchAccounts
  } = useAccountsGraphQL({ accessToken: businessAppContext.accessToken })

  // Contacts hook
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContacts
  } = useGetCustomerContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  const contacts = useMemo(() => (contactsList as any[]) || [], [contactsList])

  // Form setup (needs to be before hooks that use it)
  const form = useForm({
    resolver: createOpportunitySegmentResolver(),
    defaultValues: {},
    mode: 'onChange'
  })

  // Pipeline catalogs
  const {
    pipelineOptions: pipelines,
    pipelineStageOptions: stages,
    isLoadingStages: stagesLoading,
    refetchStages
  } = usePipelineCatalogs(businessAppContext, form.watch('pipeline'))

  // Opportunity status catalog
  const { opportunityStatusOptions: opportunityStatuses } = useOpportunityStatusCatalog(businessAppContext)

  // Currencies
  const {
    options: currencies,
    loading: currenciesLoading,
    error: currenciesError,
    hasMore: currenciesHasMore,
    search: searchCurrencies,
    loadMore: loadMoreCurrencies
  } = useCurrenciesGraphQL({ accessToken: businessAppContext.accessToken })

  // Sales Campaign hook (CRM-specific) - not used directly, but kept for future use
  useCustomerCampaigns(businessAppContext.accessToken)

  // Transform opportunity data to form values
  const opportunityToFormValues = useMemo(() => {
    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

    if (!opportunityData) {
      // Auto-set current user as owner for new opportunities
      const defaultOwnerEmployeeId = initialValues?.ownerEmployeeId || currentUserEmployeeId || ''

      return {
        ownerEmployeeId: defaultOwnerEmployeeId,
        name: '',
        pipeline: '',
        salesPipelineStage: '',
        opportunityStatus: '',
        estimatedAmount: '',
        currency: '',
        closeDate: '',
        accountId: '',
        contactIds: [],
        salesCampaignId: '',
        notesSummary: '',
        ...initialValues
      }
    }

    const mapped = mapCustomerOpportunityToFormValues(opportunityData)
    return {
      ownerEmployeeId: mapped.ownerEmployeeId || currentUserEmployeeId || '',
      name: mapped.name || '',
      pipeline: mapped.pipeline || '',
      salesPipelineStage: mapped.salesPipelineStage || '',
      opportunityStatus: mapped.opportunityStatus || '',
      estimatedAmount: mapped.estimatedAmount || '',
      currency: mapped.currency || '',
      closeDate: mapped.closeDate || '',
      accountId: mapped.accountId || '',
      contactIds: mapped.contactIds || [],
      salesCampaignId: mapped.salesCampaignId || '',
      notesSummary: mapped.notesSummary || '',
      id: mapped.id,
      version: mapped.version,
      ...initialValues
    }
  }, [
    opportunityData,
    initialValues,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    businessAppContext.additionalData?.opportunityId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId
  ])

  // Update form when opportunity data changes
  useEffect(() => {
    if (opportunityToFormValues) {
      form.reset(opportunityToFormValues)
    }
  }, [opportunityToFormValues, form])

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      const { customerOpportunity } = buildCustomerOpportunityPayload({
        ...values,
        opportunityPipelineRef: values.pipeline,
        opportunityPipelineStageRef: values.salesPipelineStage,
        ownerEmployeeId: values.ownerEmployeeId,
        accountId: values.accountId,
        currencyRef: values.currency,
        contactIds: values.contactIds || []
      })

      const opportunityContacts = buildCustomerOpportunityContacts(values.contactIds || [], values.id)

      const isUpdate = !!values.id
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'
      const payload = {
        opportunity: {
          ...customerOpportunity,
          opportunityContacts: isUpdate ? opportunityContacts : undefined
        },
        changeMode,
        contactIds: isUpdate ? undefined : opportunityContacts.map(oc => oc.contact)
      }

      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (err) {
      console.error('Error submitting CRM opportunity form:', err)
      throw err
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()
      dispatchProcessContinueEvent('pse_pause', {})
    } catch (err) {
      console.error('Error cancelling CRM opportunity form:', err)
    }
  }

  // Handle pre-submit (for file uploads, etc.)
  const handlePreSubmit = async (values: any) => {
    // No special pre-submit logic needed for opportunities
    return values
  }

  // Sales Campaign selector (CRM-specific custom field)
  const salesCampaignSelector = (
    <FormField
      control={form.control}
      name="salesCampaignId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Sales Campaign</FormLabel>
          <FormControl>
            <CampaignSelect
              value={field.value || null}
              onValueChange={(v: string | null) => field.onChange(v || '')}
              businessAppContext={businessAppContext}
              selectedCampaign={
                opportunityData?.salesCampaignId
                  ? {
                      id: opportunityData.salesCampaignId || '',
                      name: (opportunityData as any).salesCampaign?.name || '',
                      type: undefined,
                      typeRef: undefined
                    }
                  : null
              }
              placeholder="Search Campaign..."
              data-testid={formatDataTestId(prefixDataTestId, 'campaign-select')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const processType = opportunityData?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider {...businessAppContext} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        businessAppContext={businessAppContext}
        showCancelButton={true}
        data-testid={prefixDataTestId}
        submitButtonText={opportunityData?.id ? 'Update Opportunity' : 'Create Opportunity'}
      >
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          <OpportunityLayout
            businessAppContext={businessAppContext}
            ownerEmployee={opportunityData?.ownerEmployee}
            accountId={form.watch('accountId') || undefined}
            accounts={accountOptions}
            accountsLoading={accountsLoading}
            accountsError={null}
            searchAccounts={searchAccounts}
            onAccountChange={accountId => {
              if (accountId) {
                form.setValue('accountId', typeof accountId === 'object' ? accountId.id : accountId)
              } else {
                form.setValue('accountId', '')
              }
            }}
            opportunityContacts={opportunityData?.opportunityContacts}
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            searchContacts={searchContacts}
            onContactsChange={contactIds => form.setValue('contactIds', contactIds)}
            pipelines={pipelines.map((p: any) => ({
              id: p.id,
              value: p.value,
              label: p.label || p.name,
              name: p.name
            }))}
            stages={stages.map((s: any) => ({ id: s.id, value: s.value, label: s.label || s.name, name: s.name }))}
            stagesLoading={stagesLoading}
            onPipelineChange={refetchStages}
            opportunityStatuses={opportunityStatuses.map((s: any) => ({ id: s.id, value: s.value, label: s.label }))}
            currencies={currencies.map((c: any) => ({
              id: c.id,
              value: c.value,
              label: c.label || c.name,
              name: c.name
            }))}
            currenciesLoading={currenciesLoading}
            currenciesError={currenciesError}
            currenciesHasMore={currenciesHasMore}
            searchCurrencies={searchCurrencies}
            loadMoreCurrencies={loadMoreCurrencies}
            pipelineFieldName="pipeline"
            stageFieldName="salesPipelineStage"
            opportunityStatusFieldName="opportunityStatus"
            opportunityInformationCustomFields={salesCampaignSelector}
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default OpportunityFormComponent
