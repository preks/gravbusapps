import React, { useMemo, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { OpportunityLayout } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import {
  InvestmentProspectSegment,
  useProspectFields
} from '@/common/components/investment/form-segments/investment-prospect-segment'
import { createDynamicOpportunitySchema } from './utils/opportunityFormSchema'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildInvestmentOpportunityPayload } from '@/common/data/investment/types/investmentOpportunityTypes'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { getCurrencySymbol } from '@/common/utils/numberFormatter'
import {
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS
} from '@/common/data/investment/constants/catalogConstants'

const prefixDataTestId = 'InvestmentOpportunityForm'

// Deal types for Investment Opportunities (matching backend enum values)
const DEAL_TYPES = [
  {
    id: 'INVESTMENT_DEAL',
    value: 'INVESTMENT_DEAL',
    label: 'Investment Deal',
    name: 'Investment Deal'
  },
  {
    id: 'DIVESTMENT_DEAL',
    value: 'DIVESTMENT_DEAL',
    label: 'Divestment Deal',
    name: 'Divestment Deal'
  },
  {
    id: 'UNKOWN_DEAL_TYPE',
    value: 'UNKOWN_DEAL_TYPE',
    label: 'Unknown Deal Type',
    name: 'Unknown Deal Type'
  }
] as const

interface InvestmentOpportunityFormProps extends BusinessAppContextProps {
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

// Map InvestmentOpportunity to form values - automatic mapping with DYNAMIC schema
// Note: This function is defined inside the component to access the dynamic schema

const InvestmentOpportunityForm: React.FC<InvestmentOpportunityFormProps> = ({
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

  // Extract opportunityId from additionalData
  const opportunityId =
    additionalData?.opportunityId || additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Load opportunity data when editing - using new declarative hook
  const { opportunity: opportunityData, loading: opportunityLoading } = useInvestmentOpportunity(
    accessToken,
    opportunityId
  )

  // Load prospect fields definition for dynamic schema + filtered groups/types
  // Use investmentGroupRef and investmentTypeRef directly from opportunity object (like all other fields)
  const {
    formFieldsDefinition,
    groups,
    types,
    configuration,
    isLoading: catalogLoading
  } = useProspectFields({
    investmentGroupRef: opportunityData?.investmentGroupRef || null,
    investmentTypeRef: opportunityData?.investmentTypeRef || null,
    accessToken
  })

  // Create dynamic schema ONCE - includes all dynamic prospect fields
  // Use the same schema object for both resolver and Form prop
  const opportunitySchema = useMemo(() => {
    return createDynamicOpportunitySchema(formFieldsDefinition || undefined)
  }, [formFieldsDefinition])

  // Map InvestmentOpportunity to form values - automatic mapping with DYNAMIC schema
  const mapInvestmentOpportunityToFormValues = useCallback(
    (opportunity: InvestmentOpportunity | null): any => {
      if (!opportunity) {
        return {}
      }

      // ✅ Use mapToFormValues with DYNAMIC schema (includes all static + dynamic fields)
      // This automatically maps ALL fields from the opportunity
      // Date (closeDate) and number (estimatedAmount) transformations are now automatic
      return mapToFormValues(opportunity, opportunitySchema)
    },
    [opportunitySchema]
  )

  // Account search hook
  const accountsHookResult = useGetInvestmentAccounts(
    { accessToken, userInfo, additionalData },
    {
      withState: true,
      autoFetch: true,
      pageSize: 20,
      mapToSelectOptions: true
    }
  )

  // Extract hook result for accountsHook prop (mapToSelectOptions ensures options are SelectOption[])
  const accountsHook = {
    options: accountsHookResult.options as any[],
    loading: accountsHookResult.loading,
    error: accountsHookResult.error,
    search: accountsHookResult.search
  }

  // Contacts hook
  const contactsHookResult = useGetInvestmentContacts(
    { accessToken, userInfo, additionalData },
    {
      withState: true,
      autoFetch: true,
      pageSize: 20,
      mapToSelectOptions: true
    }
  )

  // Extract hook result for contactsHook prop (mapToSelectOptions ensures options are SelectOption[])
  const contactsHook = {
    options: contactsHookResult.options as any[],
    loading: contactsHookResult.loading,
    error: contactsHookResult.error,
    search: contactsHookResult.search
  }

  // Form setup - use the SAME schema object for resolver
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId
  const mappedOpportunity = mapInvestmentOpportunityToFormValues(opportunityData)
  const form = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      ...mappedOpportunity,
      ownerEmployeeId: mappedOpportunity.ownerEmployeeId || currentUserEmployeeId || '',
      ...initialValues
    } as any,
    mode: 'onChange'
  })

  // Watch investment group and type for prospect segment (for dynamic updates)
  // investmentGroupRef and investmentTypeRef are strings in the form (mapped by mapToFormValues)
  // Use form values or fallback to opportunity object (like all other fields)
  const investmentGroupRef: string | null =
    (form.watch('investmentGroupRef') as string) || opportunityData?.investmentGroupRef || null
  const investmentTypeRef: string | null =
    (form.watch('investmentTypeRef') as string) || opportunityData?.investmentTypeRef || null

  // Sync form when opportunity changes OR when formFieldsDefinition loads
  const opportunityRef = React.useRef(opportunityData)
  const formFieldsDefinitionRef = React.useRef(formFieldsDefinition)
  useEffect(() => {
    // Reset form when opportunity ID changes
    if (opportunityRef.current?.id !== opportunityData?.id) {
      if (opportunityData) {
        const formValues = mapInvestmentOpportunityToFormValues(opportunityData)
        const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId
        form.reset({
          ...formValues,
          ownerEmployeeId: formValues.ownerEmployeeId || currentUserEmployeeId || '',
          ...initialValues
        } as any)
      }
      opportunityRef.current = opportunityData
      formFieldsDefinitionRef.current = formFieldsDefinition
      return
    }

    // Reset form when formFieldsDefinition loads/changes (for dynamic fields)
    // Only reset if we have opportunity data (update mode)
    if (opportunityData && formFieldsDefinitionRef.current !== formFieldsDefinition) {
      const formValues = mapInvestmentOpportunityToFormValues(opportunityData)
      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId
      form.reset({
        ...formValues,
        ownerEmployeeId: formValues.ownerEmployeeId || currentUserEmployeeId || '',
        ...initialValues
      } as any)
      formFieldsDefinitionRef.current = formFieldsDefinition
    }
  }, [
    opportunityData?.id,
    opportunityData,
    formFieldsDefinition,
    form,
    mapInvestmentOpportunityToFormValues,
    initialValues,
    userInfo?.employeeDetails?.employeeId
  ])

  // Handle form submission
  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = async (data: any) => {
    const investmentOpportunity: Partial<InvestmentOpportunity> = {
      ...data
    }

    const { investmentOpportunity: opportunityPayload } = buildInvestmentOpportunityPayload(investmentOpportunity)
    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    return {
      investmentOpportunity: opportunityPayload,
      changeMode
    }
  }

  // Handle form cancellation
  // Note: AppActionForm automatically dispatches 'pse_pause' event, no need to call dispatchProcessContinueEvent
  const handleCancel = async () => {
    await onCancel()
  }

  // Deal Type selector (IRM-specific custom field)
  const isDealTypeLocked = !!additionalData?.dealType
  const dealTypeField = !isDealTypeLocked ? (
    <FormField
      control={form.control}
      name="dealType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Deal Type</FormLabel>
          <FormControl>
            <Select
              value={typeof field.value === 'string' ? field.value : ''}
              onValueChange={field.onChange}
              data-testid={formatDataTestId(prefixDataTestId, 'deal-type')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please select deal type..." />
              </SelectTrigger>
              <SelectContent>
                {DEAL_TYPES.map(dealType => (
                  <SelectItem key={dealType.id} value={dealType.value}>
                    {dealType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ) : null

  const processType = opportunityData?.id ? 'update' : 'create'
  const currencyRefValue = form.watch('currencyRef')
  const currencySymbol =
    typeof currencyRefValue === 'string' && currencyRefValue ? getCurrencySymbol(currencyRefValue) : undefined

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={opportunitySchema}
        data-testid={prefixDataTestId}
        submitButtonText={opportunityData?.id ? 'Update Opportunity' : 'Create Opportunity'}
      >
        <OpportunityLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={opportunityData?.ownerEmployee}
          entityId={opportunityData?.id}
          account={opportunityData?.account || undefined}
          accountsHook={accountsHook}
          opportunityContacts={opportunityData?.opportunityContacts}
          contactsHook={contactsHook}
          pipelineFieldName="opportunityPipelineRef"
          stageFieldName="opportunityPipelineStageRef"
          pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
          stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
          opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
          opportunityInformationCustomFields={dealTypeField}
          loading={opportunityLoading && !!opportunityId}
          customSegments={[
            {
              id: 'investment-prospect',
              title: 'Investment Information',
              content: (
                <InvestmentProspectSegment
                  investmentGroupRef={investmentGroupRef}
                  investmentTypeRef={investmentTypeRef}
                  businessAppContext={{ accessToken, userInfo, additionalData }}
                  testIdPrefix={formatDataTestId(prefixDataTestId, 'investment-prospect')}
                  currencySymbol={currencySymbol}
                  configuration={configuration}
                  groups={groups}
                  types={types}
                  isLoading={catalogLoading}
                />
              )
            }
          ]}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentOpportunityForm
