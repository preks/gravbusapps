import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'
import { LeadLayout } from '@/common/components/common-relations/form-layouts/lead-layout'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildInvestmentLeadPayload } from '@/common/data/investment/types/investmentLeadTypes'
import { AppActionForm } from '@/components/app-action-form'
import {
  InvestmentProspectSegment,
  useProspectFields
} from '@/common/components/investment/form-segments/investment-prospect-segment'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import { createDynamicLeadSchema } from './utils/leadFormSchema'
import {
  LEAD_STATUS,
  LEAD_SOURCE,
  LEAD_RATING,
  COMPANY_SIZE,
  ANNUAL_REVENUE
} from '@/common/data/investment/constants/catalogConstants'

const prefixDataTestId = 'IrmLeadForm'

interface LeadFormProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentLead>
  onSubmit?: (lead: Partial<InvestmentLead>) => Promise<void>
  onCancel?: () => Promise<void>
}

const LeadForm: React.FC<LeadFormProps> = ({ initialValues, accessToken, userInfo, additionalData }) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  // Extract leadId from multiple sources (same pattern as ConvertLeadForm)
  const leadId =
    initialValues?.id ||
    additionalData?.leadId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    undefined

  // Lead state - use new declarative hook
  const { lead: fetchedLead, loading: leadLoading, error: leadError } = useInvestmentLead(accessToken, leadId)
  const [lead, setLead] = useState<InvestmentLead | null>((initialValues as InvestmentLead) || null)

  // Update lead when fetched
  useEffect(() => {
    if (fetchedLead) {
      setLead(fetchedLead)
    }
  }, [fetchedLead])

  // Load prospect fields definition for dynamic schema + filtered groups/types
  // Use investmentGroupRef and investmentTypeRef directly from lead object (like all other fields)
  const {
    formFieldsDefinition,
    groups,
    types,
    configuration,
    isLoading: catalogLoading
  } = useProspectFields({
    investmentGroupRef: lead?.investmentGroupRef || null,
    investmentTypeRef: lead?.investmentTypeRef || null,
    accessToken
  })

  // Create dynamic schema ONCE - includes all dynamic prospect fields
  // Use the same schema object for both resolver and Form prop
  const leadSchema = useMemo(() => {
    return createDynamicLeadSchema(formFieldsDefinition || undefined)
  }, [formFieldsDefinition])

  // Map InvestmentLead to form values - automatic mapping with DYNAMIC schema
  const mapInvestmentLeadToFormValues = useCallback(
    (ld: InvestmentLead | null): any => {
      if (!ld) {
        return {}
      }

      // ✅ Use mapToFormValues with DYNAMIC schema (includes all static + dynamic fields)
      // This automatically maps ALL fields from the lead
      return mapToFormValues(ld, leadSchema)
    },
    [leadSchema]
  )

  const form = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      ...mapInvestmentLeadToFormValues(lead),
      ...initialValues
    } as any
  })

  // Sync form when lead changes OR when formFieldsDefinition loads
  const leadRef = React.useRef(lead)
  const formFieldsDefinitionRef = React.useRef(formFieldsDefinition)
  React.useEffect(() => {
    // Reset form when lead ID changes
    if (leadRef.current?.id !== lead?.id) {
      if (lead) {
        const formValues = mapInvestmentLeadToFormValues(lead)
        form.reset({
          ...formValues,
          ...initialValues
        } as any)
      }
      leadRef.current = lead
      formFieldsDefinitionRef.current = formFieldsDefinition
      return
    }

    // Reset form when formFieldsDefinition loads/changes (for dynamic fields)
    // Only reset if we have lead data (update mode)
    if (lead && formFieldsDefinitionRef.current !== formFieldsDefinition) {
      const formValues = mapInvestmentLeadToFormValues(lead)
      form.reset({
        ...formValues,
        ...initialValues
      } as any)
      formFieldsDefinitionRef.current = formFieldsDefinition
    }
  }, [lead?.id, lead, formFieldsDefinition, form, mapInvestmentLeadToFormValues, initialValues])

  // Watch investment group and type for prospect segment (for dynamic updates)
  // investmentGroupRef and investmentTypeRef are strings in the form (mapped by mapToFormValues)
  // Use form values or fallback to lead object (like all other fields)
  const investmentGroupRef = form.watch('investmentGroupRef') || lead?.investmentGroupRef || null
  const investmentTypeRef = form.watch('investmentTypeRef') || lead?.investmentTypeRef || null

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = useCallback(async (formValues: any) => {
    // Build complete InvestmentLead object - ALL form values included
    // addressLine is already in correct format { lines: string[] } from schema
    // buildInvestmentLeadPayload will handle field mapping and transformations
    const leadPayload: Partial<InvestmentLead> = {
      ...formValues // All form values match interface structure exactly
    } as Partial<InvestmentLead>

    // buildInvestmentLeadPayload handles:
    // - Field mapping via investmentLeadFormFields
    // - Empty value exclusion
    // - Type transformations
    return buildInvestmentLeadPayload(leadPayload)
  }, [])

  const processType = lead?.id ? 'update' : 'create'

  // Handle form cancellation
  const handleCancel = async () => {
    // Cancel is handled automatically by AppActionForm
  }

  return (
    <AppActionForm
      processType={processType}
      form={form}
      schema={leadSchema}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={form.getValues()}
      data-testid={prefixDataTestId}
    >
      <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
        <LeadLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={lead?.ownerEmployee}
          entityId={lead?.id}
          leadStatusCatalogIdentifier={LEAD_STATUS}
          leadSourceCatalogIdentifier={LEAD_SOURCE}
          leadRatingCatalogIdentifier={LEAD_RATING}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          loading={leadLoading && !!leadId}
          customSegments={[
            {
              id: 'investment-prospect',
              title: 'Investment Information',
              content: (
                <InvestmentProspectSegment
                  investmentGroupRef={investmentGroupRef || null}
                  investmentTypeRef={investmentTypeRef || null}
                  businessAppContext={{ accessToken, userInfo, additionalData }}
                  testIdPrefix={prefixDataTestId}
                  currencySymbol="€"
                  configuration={configuration}
                  groups={groups}
                  types={types}
                  isLoading={catalogLoading}
                />
              )
            }
          ]}
        />
        {/* Error Display */}
        {leadError && (
          <Alert variant="destructive">
            <AlertDescription>Error loading lead: {leadError}</AlertDescription>
          </Alert>
        )}
      </CatalogSelect.Provider>
    </AppActionForm>
  )
}

export default LeadForm
