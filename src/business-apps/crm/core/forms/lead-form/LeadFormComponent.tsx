import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { LeadLayout } from '@/common/components/common-relations/form-layouts/lead-layout'
import { createLeadSegmentResolver } from '@/common/components/common-relations/schemas/leadSchema'
import { buildCustomerLeadPayload } from '@/common/data/customer/types/customerLeadTypes'
import { CampaignSelect } from '@/common/components/customer/form-segments/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'

const prefixDataTestId = 'LeadForm'

interface LeadFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<CustomerLead>
  onSubmit?: (values: Partial<CustomerLead>) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerLead to form values (mapping to schema field names)
const mapCustomerLeadToFormValues = (lead: CustomerLead | null): any => {
  if (!lead) {
    return {}
  }

  // Map addressLine to addressLines array
  const addressLines = lead.addressLine
    ? typeof lead.addressLine === 'string'
      ? lead.addressLine
          .split(',')
          .map((line: string) => line.trim())
          .filter(Boolean)
      : typeof lead.addressLine === 'object' && lead.addressLine?.lines
        ? lead.addressLine.lines
        : Array.isArray(lead.addressLine)
          ? lead.addressLine
          : []
    : []

  return {
    // System fields
    id: lead.id,
    version: lead.version,

    // Personal Information
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    jobPosition: lead.position || '', // Schema uses 'jobPosition', lead has 'position'
    academicTitleRef: lead.academicTitleRef || '',
    email: lead.email || '', // Flat field
    phoneNumber: lead.phoneNumber || '', // Flat field

    // Company Information - Schema uses 'company' not 'companyName'
    company: lead.companyName || '',
    companyEmail: lead.companyEmail || '',
    companyPhone: lead.companyPhone || '',
    website: lead.companyWebsite || '', // Schema uses 'website' not 'companyWebsite'

    // Lead Classification
    leadStatusRef: lead.leadStatusRef || '',
    leadSourceRef: lead.leadSourceRef || '',
    leadRatingRef: lead.leadRatingRef || '',
    sensitive: lead.sensitive || false,

    // Company Details
    legalFormRef: lead.legalFormRef || '',
    industryClassRef: lead.industryClassRef || '',
    companySizeRef: lead.companySizeRef || '',
    accountAnnualRevenueBandRef: lead.accountAnnualRevenueBandRef || '',

    // Owner Information
    ownerEmployeeId: lead.ownerEmployeeId || '',

    // Flat address fields
    addressLines: addressLines.length > 0 ? addressLines : [],
    postalCode: lead.postalCode || '',
    locality: lead.locality || '',
    regionRef: lead.regionRef || '',
    countryRef: lead.countryRef || '',

    // Sales Campaign (CRM-specific)
    salesCampaignId: (lead as any).salesCampaignId || ''
  }
}

const LeadFormComponent: React.FC<LeadFormComponentProps> = ({
  businessAppContext,
  initialValues,
  onCancel = async () => {}
}) => {
  // Extract leadId from businessAppContext
  const leadId =
    initialValues?.id ||
    businessAppContext.additionalData?.leadId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    undefined

  // Load lead data when editing - using new declarative hook
  const { lead: leadData } = useCustomerLead(businessAppContext, leadId)

  // Transform lead data to form values
  const leadToFormValues = useMemo(() => {
    if (!leadData) {
      return {
        ownerEmployeeId: '',
        firstName: '',
        lastName: '',
        company: '', // Schema uses 'company' not 'companyName'
        leadStatusRef: '',
        leadSourceRef: '',
        leadRatingRef: '',
        sensitive: false,
        academicTitleRef: '',
        jobPosition: '', // Schema uses 'jobPosition' not 'position'
        legalFormRef: '',
        industryClassRef: '',
        website: '', // Schema uses 'website' not 'companyWebsite'
        companyEmail: '',
        companyPhone: '',
        companySizeRef: '',
        accountAnnualRevenueBandRef: '',
        salesCampaignId: '',
        email: '',
        phoneNumber: '',
        addressLines: [],
        postalCode: '',
        locality: '',
        regionRef: '',
        countryRef: '',
        ...initialValues
      }
    }

    const mapped = mapCustomerLeadToFormValues(leadData)
    return {
      ...mapped,
      ...initialValues
    }
  }, [leadData, initialValues])

  // Initialize React Hook Form (using any for salesCampaignId which is not in CustomerLead interface but used in form)
  const form = useForm<any>({
    resolver: createLeadSegmentResolver() as any,
    defaultValues: leadToFormValues as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when lead changes
  useEffect(() => {
    if (leadData) {
      const formValues = mapCustomerLeadToFormValues(leadData)
      form.reset({
        ...formValues,
        salesCampaignId: (leadData as any).salesCampaignId || ''
      } as any)
    }
  }, [leadData?.id, leadData, form])

  // Handle form submission - returns payload for AppActionForm
  const handleSubmit = async (data: any) => {
    // Build CustomerLead object (salesCampaignId is handled by payload builder mapping)
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
              businessAppContext={businessAppContext}
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
    <CatalogSelect.Provider {...businessAppContext} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        businessAppContext={businessAppContext}
        showCancelButton={true}
        data-testid={prefixDataTestId}
        submitButtonText={leadData?.id ? 'Update Lead' : 'Create Lead'}
      >
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          <LeadLayout
            businessAppContext={businessAppContext}
            ownerEmployee={leadData?.ownerEmployee}
            entityId={leadData?.id}
            leadStatusCatalogIdentifier="SalesLeadStatus:v1"
            leadSourceCatalogIdentifier="SalesLeadSource:v1"
            leadRatingCatalogIdentifier="SalesLeadRating:v1"
            companySizeCatalogIdentifier="EmployeeSize:v1"
            annualRevenueCatalogIdentifier="RevenueSize:v1"
            leadInformationCustomFields={salesCampaignSelector}
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default LeadFormComponent
