import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { LeadLayout, leadSchema } from '@/common/components/common-relations/form-layouts/lead-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildCustomerLeadPayload } from '@/common/data/customer/types/customerLeadTypes'
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import {
  LEAD_STATUS,
  LEAD_SOURCE,
  LEAD_RATING,
  COMPANY_SIZE,
  ANNUAL_REVENUE
} from '@/common/data/customer/constants/customerCatalogs'
import { ErrorAlert } from '@/components/error-alert'

// CRM-specific schema extension (adds salesCampaignId)
export const customerLeadSchema = leadSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

type LeadFormProps = BusinessAppContextProps

const LeadForm: React.FC<LeadFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract leadId from additionalData
  const leadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || undefined

  // Fetch lead data using declarative hook
  const { lead, loading, error } = useCustomerLead(accessToken || '', leadId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Initialize React Hook Form with CRM-specific schema
  const form = useForm({
    resolver: zodResolver(customerLeadSchema),
    defaultValues: mapToFormValues(lead || {}, customerLeadSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when lead changes
  const leadRef = useRef(lead)
  useEffect(() => {
    if (leadRef.current?.id !== lead?.id) {
      form.reset(mapToFormValues(lead || {}, customerLeadSchema) as Partial<CustomerLead>)
      leadRef.current = lead
    }
  }, [lead?.id, lead, form])

  // Handle form submission - returns payload for AppActionForm
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const payload = buildCustomerLeadPayload(data)
      return {
        ...payload,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting lead:', error)
      throw error
    }
  }, [])

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load lead data' })
  }

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-lead-form" />
  }

  // Handle form cancellation
  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  // Handle pre-submit: Upload files if present (placeholder for future implementation)
  const handlePreSubmit = async (formData: any) => {
    return formData
  }

  // Sales Campaign selector component
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
                lead?.salesCampaign
                  ? {
                      id: lead.salesCampaignId || '',
                      name: lead.salesCampaign?.name || '',
                      type: undefined,
                      typeRef: undefined
                    }
                  : null
              }
              placeholder="Search Campaign..."
              data-testid={formatDataTestId('customer-lead-form', 'campaign-select')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const processType = lead?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        schema={customerLeadSchema}
        data-testid={formatDataTestId('customer-lead-form', 'Form')}
        submitButtonText={lead?.id ? 'Update Lead' : 'Create Lead'}
        isSubmitDisabled={loading}
      >
        <LeadLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={lead?.ownerEmployee}
          entityId={lead?.id || leadId}
          leadStatusCatalogIdentifier={LEAD_STATUS}
          leadSourceCatalogIdentifier={LEAD_SOURCE}
          leadRatingCatalogIdentifier={LEAD_RATING}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          leadInformationCustomFields={salesCampaignSelect}
          loading={loading && !!leadId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default LeadForm
