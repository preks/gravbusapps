import React, { useEffect, useCallback } from 'react'
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
} from '@/common/data/customer/constants/catalogConstants'

const prefixDataTestId = 'LeadForm'

// CRM-specific schema extension (adds salesCampaignId)
export const customerLeadSchema = leadSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

interface LeadFormProps extends BusinessAppContextProps {
  initialValues?: Partial<CustomerLead>
  onSubmit?: (values: Partial<CustomerLead>) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerLead to form values - automatic mapping with addressLine transformation
const mapCustomerLeadToFormValues = (lead: CustomerLead | null): Partial<z.infer<typeof customerLeadSchema>> => {
  if (!lead) {
    return {}
  }

  // ✅ Automatic mapping - addressLine is now { lines: string[] } in schema, matches interface
  return mapToFormValues(lead, customerLeadSchema)
}

const LeadForm: React.FC<LeadFormProps> = ({
  initialValues,
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  // Extract leadId from additionalData
  const leadId =
    initialValues?.id ||
    additionalData?.leadId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    undefined

  // Load lead data when editing - using new declarative hook
  const { lead: leadData, loading: leadLoading } = useCustomerLead(accessToken, leadId)

  // Map lead data to form values - automatic mapping
  const mapLeadToFormValues = useCallback((lead: CustomerLead | null): Partial<z.infer<typeof customerLeadSchema>> => {
    if (!lead) {
      return {}
    }
    return mapCustomerLeadToFormValues(lead)
  }, [])

  // Initialize React Hook Form (using any for salesCampaignId which is not in CustomerLead interface but used in form)
  const form = useForm<z.infer<typeof customerLeadSchema>>({
    resolver: zodResolver(customerLeadSchema),
    defaultValues: {
      ...mapLeadToFormValues(leadData),
      ...initialValues
    } as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when lead changes
  useEffect(() => {
    if (leadData) {
      const formValues = mapLeadToFormValues(leadData)
      form.reset({
        ...formValues,
        ...initialValues
      } as any)
    }
  }, [leadData?.id, leadData, form, mapLeadToFormValues, initialValues])

  // Handle form submission - returns payload for AppActionForm
  const handleSubmit = async (data: any) => {
    // Build CustomerLead object (salesCampaignId is handled by payload builder mapping)
    // addressLine is already in correct format { lines: string[] } from schema
    // Note: null values are transformed to empty strings by schema preprocessor
    const customerLead: Partial<CustomerLead & { salesCampaignId?: string }> = {
      ...data
    }

    // Use centralized payload builder (maps salesCampaignId to salesCampaign)
    const payload = buildCustomerLeadPayload(customerLead as any)

    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    // Return payload for AppActionForm to handle process event
    return {
      ...payload,
      changeMode: changeMode
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    await onCancel()
  }

  // Sales Campaign selector component
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
              businessAppContext={{ accessToken, userInfo, additionalData }}
              selectedCampaign={
                (leadData as any)?.salesCampaignId
                  ? {
                      id: (leadData as any).salesCampaignId || '',
                      name: (leadData as any).salesCampaign?.name || '',
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

  // Determine process type based on whether lead exists
  const processType = leadData?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={customerLeadSchema}
        data-testid={prefixDataTestId}
        submitButtonText={leadData?.id ? 'Update Lead' : 'Create Lead'}
      >
        <LeadLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={leadData?.ownerEmployee}
          entityId={leadData?.id}
          leadStatusCatalogIdentifier={LEAD_STATUS}
          leadSourceCatalogIdentifier={LEAD_SOURCE}
          leadRatingCatalogIdentifier={LEAD_RATING}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          leadInformationCustomFields={salesCampaignSelector}
          loading={leadLoading && !!leadId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default LeadForm
