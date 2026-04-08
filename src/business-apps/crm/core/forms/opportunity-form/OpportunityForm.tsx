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
  opportunitySchemaBase
} from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildCustomerOpportunityPayload } from '@/common/data/customer/types/customerOpportunityTypes'
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useCustomerContactsList } from '@/common/data/customer/hooks/useCustomerContacts'
import {
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_FORECAST,
  CUSTOMER_ACCOUNT_TYPE
} from '@/common/data/customer/constants/customerCatalogs'
import { ErrorAlert } from '@/components/error-alert'

const CRM_VALIDATION_ERRORS = {
  PIPELINE_REQUIRED: 'Pipeline is required',
  STAGE_REQUIRED: 'Stage is required'
}

// CRM-specific schema: Pipeline and Stage are REQUIRED (not optional like IRM)
export const customerOpportunitySchema = opportunitySchemaBase
  .omit({
    opportunityPipelineRef: true,
    opportunityPipelineStageRef: true
  })
  .extend({
    // Override: Pipeline is REQUIRED in CRM
    opportunityPipelineRef: z.string().min(1, CRM_VALIDATION_ERRORS.PIPELINE_REQUIRED),
    // Override: Stage is REQUIRED in CRM
    opportunityPipelineStageRef: z.string().min(1, CRM_VALIDATION_ERRORS.STAGE_REQUIRED),
    // CRM-specific fields
    salesCampaignId: z.string().nullable().optional(),
    winningChance: z.coerce.number().min(0).max(100).nullable().optional()
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

  // Winning Chance field (CRM-specific) - percentage field pattern from PercentageField.tsx
  const winningChanceField = (
    <FormField
      control={form.control}
      name="winningChance"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Winning Chance</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              endAddOn={<span className="gba:text-muted-foreground">%</span>}
              data-testid={formatDataTestId('customer-opportunity-form', 'winning-chance-input')}
              value={field.value ?? ''}
              onChange={e => {
                const value = e.target.value
                if (value === '') {
                  field.onChange(null)
                  return
                }
                const numValue = Number(value)
                // Clamp value between 0 and 100
                if (numValue < 0) {
                  field.onChange(0)
                } else if (numValue > 100) {
                  field.onChange(100)
                } else {
                  field.onChange(numValue)
                }
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

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

  // Combined CRM-specific custom fields
  const crmCustomFields = (
    <div className="gba:space-y-6">
      {winningChanceField}
      {salesCampaignSelect}
    </div>
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
          opportunityAccounts={opportunity?.opportunityAccounts || []}
          useAccounts={useAccounts}
          opportunityContacts={opportunity?.opportunityContacts}
          useContacts={useContacts}
          pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
          stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
          opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
          opportunityForecastCatalogIdentifier={OPPORTUNITY_FORECAST}
          accountTypeCatalogIdentifier={CUSTOMER_ACCOUNT_TYPE}
          opportunityInformationCustomFields={crmCustomFields}
          loading={loading && !!opportunityId}
          showDynamicStageRequired={false}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default OpportunityForm
