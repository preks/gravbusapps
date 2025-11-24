import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import {
  OpportunityLayout,
  opportunitySchema
} from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildCustomerOpportunityPayload } from '@/common/data/customer/types/customerOpportunityTypes'
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useCustomerContactsList } from '@/common/data/customer/hooks/useCustomerContacts'
import {
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS
} from '@/common/data/customer/constants/customerCatalogs'
import { ErrorAlert } from '@/components/error-alert'

// CRM-specific schema extension (adds salesCampaignId only)
export const customerOpportunitySchema = opportunitySchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

type OpportunityFormProps = BusinessAppContextProps

const OpportunityForm: React.FC<OpportunityFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract opportunityId from additionalData
  const opportunityId =
    additionalData?.opportunityId || additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Fetch opportunity data using declarative hook
  const { opportunity, loading, error } = useCustomerOpportunity(accessToken || '', opportunityId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Account selection hook - using new declarative list hook
  const useAccounts = useCustomerAccountsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // Contact selection hook - using new declarative list hook
  const useContacts = useCustomerContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // Initialize React Hook Form with CRM-specific schema
  const form = useForm<z.infer<typeof customerOpportunitySchema>>({
    resolver: zodResolver(customerOpportunitySchema),
    defaultValues: mapToFormValues(opportunity || {}, customerOpportunitySchema) as Partial<CustomerOpportunity>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when opportunity changes
  const opportunityRef = useRef(opportunity)
  useEffect(() => {
    if (opportunityRef.current?.id !== opportunity?.id) {
      form.reset(mapToFormValues(opportunity || {}, customerOpportunitySchema) as Partial<CustomerOpportunity>)
      opportunityRef.current = opportunity
    }
  }, [opportunity?.id, opportunity, form])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { opportunity } = buildCustomerOpportunityPayload(data)
      return {
        opportunity,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting opportunity:', error)
      throw error
    }
  }, [])

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load opportunity data' })
  }
  if (useAccounts.error) {
    errors.push({ error: useAccounts.error, context: 'Failed to load accounts' })
  }
  if (useContacts.error) {
    errors.push({ error: useContacts.error, context: 'Failed to load contacts' })
  }

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-opportunity-form" />
  }

  // Handle form cancellation
  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  // Handle pre-submit: Upload files if present (placeholder for future implementation)
  const handlePreSubmit = async (formData: any) => {
    return formData
  }

  // Sales Campaign selector (CRM-specific custom field)
  const salesCampaignSelect = (
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
              businessAppContext={{ accessToken, userInfo, additionalData }}
              selectedCampaign={
                opportunity?.salesCampaign
                  ? {
                      id: opportunity.salesCampaignId || '',
                      name: opportunity.salesCampaign?.name || '',
                      type: undefined,
                      typeRef: undefined
                    }
                  : null
              }
              placeholder="Search Campaign..."
              data-testid={formatDataTestId('customer-opportunity-form', 'campaign-select')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const processType = opportunity?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        schema={customerOpportunitySchema}
        data-testid={formatDataTestId('customer-opportunity-form', 'Form')}
        submitButtonText={opportunity?.id ? 'Update Opportunity' : 'Create Opportunity'}
        isSubmitDisabled={loading}
      >
        <OpportunityLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={opportunity?.ownerEmployee}
          entityId={opportunity?.id || opportunityId}
          account={opportunity?.account || undefined}
          useAccounts={useAccounts}
          opportunityContacts={opportunity?.opportunityContacts}
          useContacts={useContacts}
          pipelineFieldName="opportunityPipelineRef"
          stageFieldName="opportunityPipelineStageRef"
          opportunityStatusFieldName="opportunityStatusRef"
          pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
          stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
          opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
          opportunityInformationCustomFields={salesCampaignSelect}
          loading={loading && !!opportunityId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default OpportunityForm
