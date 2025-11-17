import React, { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { OpportunityLayout } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { createOpportunitySegmentResolver } from '@/common/components/common-relations/schemas/opportunitySchema'
import { InvestmentProspectSegment } from '@/common/components/investment/form-segments/investment-prospect-segment'
import {
  buildInvestmentOpportunityPayload,
  buildInvestmentOpportunityContacts
} from '@/common/data/investment/types/investmentOpportunityTypes'
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
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getCurrencySymbol } from '@/common/utils/numberFormatter'

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

interface OpportunityFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map InvestmentOpportunity to form values
const mapInvestmentOpportunityToFormValues = (opportunity: InvestmentOpportunity): any => {
  // Extract investment type ID from object or string
  const investmentTypeId =
    typeof opportunity.investmentType === 'object' && opportunity.investmentType?.id
      ? opportunity.investmentType.id
      : opportunity.investmentTypeRef || opportunity.investmentType || ''

  return {
    id: opportunity.id,
    version: opportunity.version,
    ownerEmployeeId: opportunity.ownerEmployeeId || '',
    name: opportunity.name || '',
    investmentName: opportunity.investmentName || '',
    dealType: opportunity.dealType || '',
    pipeline: opportunity.opportunityPipelineRef || '',
    pipelineStage: opportunity.opportunityPipelineStageRef || '',
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
    // Use investmentGroup and investmentType (not investmentGroupRef/investmentTypeRef)
    investmentGroup: opportunity.investmentGroupRef || '',
    investmentType: investmentTypeId ? { id: investmentTypeId } : null,
    notesSummary: opportunity.notesSummary || ''
  }
}

const OpportunityFormComponent: React.FC<OpportunityFormComponentProps> = ({
  businessAppContext,
  initialValues,
  onCancel = async () => {}
}) => {
  // Extract opportunityId from businessAppContext
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Load opportunity data when editing - using new declarative hook
  const { opportunity: opportunityData } = useInvestmentOpportunity(businessAppContext, opportunityId)

  // Account search hook
  const {
    options: accountOptions,
    loading: accountsLoading,
    search: searchAccounts
  } = useGetInvestmentAccounts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  // Contacts hook
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContacts
  } = useGetInvestmentContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  const contacts = useMemo(() => (contactsList as any[]) || [], [contactsList])

  // Form setup (using any for IRM-specific fields like dealType, investmentGroup, investmentType, contactIds)
  const form = useForm<any>({
    resolver: createOpportunitySegmentResolver() as any,
    defaultValues: {},
    mode: 'onChange'
  })

  // Transform opportunity data to form values
  const opportunityToFormValues = useMemo(() => {
    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

    if (!opportunityData) {
      // Auto-set current user as owner for new opportunities
      const defaultOwnerEmployeeId = initialValues?.ownerEmployeeId || currentUserEmployeeId || ''

      return {
        ownerEmployeeId: defaultOwnerEmployeeId,
        name: '',
        investmentName: '',
        dealType: businessAppContext.additionalData?.dealType || '',
        pipeline: '',
        pipelineStage: '',
        estimatedAmount: '',
        currency: '',
        closeDate: '',
        accountId: '',
        contactIds: [],
        investmentGroup: '',
        investmentType: null,
        notesSummary: '',
        ...initialValues
      }
    }

    const mapped = mapInvestmentOpportunityToFormValues(opportunityData)
    return {
      ownerEmployeeId: mapped.ownerEmployeeId || currentUserEmployeeId || '',
      name: mapped.name || '',
      investmentName: mapped.investmentName || '',
      dealType: mapped.dealType || businessAppContext.additionalData?.dealType || '',
      pipeline: mapped.pipeline || '',
      pipelineStage: mapped.pipelineStage || '',
      estimatedAmount: mapped.estimatedAmount || '',
      currency: mapped.currency || '',
      closeDate: mapped.closeDate || '',
      accountId: mapped.accountId || '',
      contactIds: mapped.contactIds || [],
      investmentGroup: mapped.investmentGroup || '',
      investmentType: mapped.investmentType || null,
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
    businessAppContext.additionalData?.dealType,
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
      // Convert investmentGroup and investmentType to investmentGroupRef and investmentTypeRef for payload
      const investmentTypeRef =
        typeof values.investmentType === 'object' && values.investmentType?.id
          ? values.investmentType.id
          : values.investmentType || ''

      const { investmentOpportunity } = buildInvestmentOpportunityPayload({
        ...values,
        opportunityPipelineRef: values.pipeline,
        opportunityPipelineStageRef: values.pipelineStage,
        ownerEmployeeId: values.ownerEmployeeId,
        accountId: values.accountId,
        currencyRef: values.currency,
        contactIds: values.contactIds || [],
        // Convert form field names to API field names
        investmentGroupRef: values.investmentGroup || '',
        investmentTypeRef: investmentTypeRef
      })

      const opportunityContacts = buildInvestmentOpportunityContacts(values.contactIds || [], values.id)

      const isUpdate = !!values.id
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'
      const payload = {
        investmentOpportunity: {
          ...investmentOpportunity,
          opportunityContacts
        },
        changeMode
      }

      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (err) {
      console.error('Error submitting investment opportunity form:', err)
      throw err
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()
      dispatchProcessContinueEvent('pse_pause', {})
    } catch (err) {
      console.error('Error cancelling investment opportunity form:', err)
    }
  }

  // Handle pre-submit (for file uploads, etc.)
  const handlePreSubmit = async (values: any) => {
    // No special pre-submit logic needed for opportunities
    return values
  }

  // Deal Type selector (IRM-specific custom field)
  const isDealTypeLocked = !!businessAppContext.additionalData?.dealType
  const dealTypeField = !isDealTypeLocked ? (
    <FormField
      control={form.control}
      name="dealType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Deal Type</FormLabel>
          <FormControl>
            <Select
              value={field.value || ''}
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
  const investmentGroupId = form.watch('investmentGroup')
  const investmentTypeValue = form.watch('investmentType')
  const investmentTypeId =
    typeof investmentTypeValue === 'object' ? investmentTypeValue?.id : investmentTypeValue || null
  const currencySymbol = form.watch('currency') ? getCurrencySymbol(form.watch('currency')) : undefined

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
        submitButtonText={opportunityData?.id ? 'Update Investment Opportunity' : 'Create Investment Opportunity'}
      >
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          <OpportunityLayout
            businessAppContext={businessAppContext}
            ownerEmployee={opportunityData?.ownerEmployee}
            entityId={opportunityData?.id}
            accountId={form.watch('accountId') || undefined}
            accounts={accountOptions as any}
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
            onContactsChange={(contactIds: any) => form.setValue('contactIds', contactIds)}
            pipelineFieldName="pipeline"
            stageFieldName="pipelineStage"
            pipelineCatalogIdentifier="InvestmentOpportunityPipeline:v1"
            stageCatalogIdentifier="InvestmentOpportunityPipelineStage:v1"
            opportunityInformationCustomFields={dealTypeField}
            customSegments={[
              {
                id: 'investment-prospect',
                title: 'Investment Information',
                content: (
                  <InvestmentProspectSegment
                    investmentGroupId={investmentGroupId}
                    investmentTypeId={investmentTypeId}
                    businessAppContext={businessAppContext}
                    testIdPrefix={formatDataTestId(prefixDataTestId, 'investment-prospect')}
                    currencySymbol={currencySymbol}
                  />
                )
              }
            ]}
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default OpportunityFormComponent
