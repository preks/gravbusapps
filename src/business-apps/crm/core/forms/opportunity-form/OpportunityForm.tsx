import React, { useEffect, useCallback, useState } from 'react'
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
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useGetCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'

const prefixDataTestId = 'OpportunityForm'

// CRM-specific schema extension (adds salesCampaignId only)
export const customerOpportunitySchema = opportunitySchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

interface OpportunityFormProps extends BusinessAppContextProps {
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerOpportunity to form values - automatic mapping with transformations
const mapCustomerOpportunityToFormValues = (
  opportunity: CustomerOpportunity
): Partial<z.infer<typeof customerOpportunitySchema>> => {
  // ✅ Automatic mapping - schema matches interface exactly
  // Note: opportunityContacts objects are kept for display purposes (like accountContacts in AccountForm)
  // They are automatically processed by payloadBuilder
  // Date (closeDate) and number (estimatedAmount) transformations are now automatic
  return mapToFormValues(opportunity, customerOpportunitySchema)
}

const OpportunityForm: React.FC<OpportunityFormProps> = ({
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
  const { opportunity: opportunityData, loading: opportunityLoading } = useCustomerOpportunity(
    accessToken,
    opportunityId
  )

  // Map opportunity data to form values - automatic mapping
  const mapOpportunityToFormValues = useCallback(
    (opp: CustomerOpportunity | null): Partial<z.infer<typeof customerOpportunitySchema>> => {
      if (!opp) {
        return {}
      }
      return mapCustomerOpportunityToFormValues(opp)
    },
    []
  )

  // Form setup with CRM-specific schema
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId
  const mappedOpportunity = mapOpportunityToFormValues(opportunityData)
  const form = useForm<z.infer<typeof customerOpportunitySchema>>({
    resolver: zodResolver(customerOpportunitySchema),
    defaultValues: {
      ...mappedOpportunity,
      ownerEmployeeId: mappedOpportunity.ownerEmployeeId || currentUserEmployeeId || '',
      ...initialValues
    } as any,
    mode: 'onChange'
  })

  // Account search - using central hook
  const { fetchCustomerAccounts } = useCustomerAccounts({ accessToken, userInfo, additionalData })
  const [accounts, setAccounts] = useState<Array<{ id: string; value: string; label: string; name: string }>>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const searchAccounts = useCallback(
    async (search: string) => {
      setAccountsLoading(true)
      setAccountsError(null)
      try {
        const result = await fetchCustomerAccounts({ search, limit: 20, offset: 0 })
        const mappedAccounts = (result.accounts || []).map((acc: any) => ({
          id: acc.id,
          value: acc.id,
          label: acc.name,
          name: acc.name
        }))
        setAccounts(mappedAccounts)
        setAccountsLoading(false)
        return mappedAccounts
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to search accounts'
        setAccountsError(errorMessage)
        setAccountsLoading(false)
        return []
      }
    },
    [fetchCustomerAccounts]
  )

  // Initial load of accounts
  useEffect(() => {
    if (accessToken) {
      searchAccounts('')
    }
  }, [accessToken, searchAccounts])

  // Extract hook result for accountsHook prop
  const accountsHook = {
    options: accounts,
    loading: accountsLoading,
    error: accountsError,
    search: searchAccounts
  }

  // Contacts hook - using central hook
  const contactsHookResult = useGetCustomerContacts(
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

  // Sync form when opportunity changes
  const opportunityRef = React.useRef(opportunityData)
  useEffect(() => {
    if (opportunityRef.current?.id !== opportunityData?.id) {
      const mapped = mapOpportunityToFormValues(opportunityData)
      form.reset({
        ...mapped,
        ownerEmployeeId: mapped.ownerEmployeeId || currentUserEmployeeId || '',
        ...initialValues
      } as any)
      opportunityRef.current = opportunityData
    }
  }, [opportunityData?.id, opportunityData, form, mapOpportunityToFormValues, currentUserEmployeeId, initialValues])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = async (data: any) => {
    const customerOpportunity: Partial<CustomerOpportunity> = {
      ...data
    }

    const { opportunity: opportunityPayload } = buildCustomerOpportunityPayload(customerOpportunity)
    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    return {
      opportunity: opportunityPayload,
      changeMode
    }
  }

  // Handle form cancellation
  // Note: AppActionForm automatically dispatches 'pse_pause' event, no need to call dispatchProcessContinueEvent
  const handleCancel = async () => {
    await onCancel()
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
              businessAppContext={{ accessToken, userInfo, additionalData }}
              selectedCampaign={
                field.value
                  ? {
                      id: field.value,
                      name: (opportunityData as any)?.salesCampaign?.name || '',
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
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={customerOpportunitySchema}
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
          opportunityStatusFieldName="opportunityStatusRef"
          opportunityInformationCustomFields={salesCampaignSelector}
          loading={opportunityLoading && !!opportunityId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default OpportunityForm
