import React, { useState, useEffect, useMemo } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_INVESTMENT_OPPORTUNITY_BY_ID } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Badge,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'

export interface OpportunityStatusUpdatePopupValues {
  investmentOpportunity: {
    id: string
    version: number
    opportunityStatusRef: string
  }
  changeMode: string
}

export interface OpportunityStatusUpdatePopupProps extends BusinessAppContextProps {
  opportunityId: string
  initialValues?: Partial<OpportunityStatusUpdatePopupValues>
}

const prefixDataTestId = 'OpportunityStatusUpdatePopup'

const OpportunityStatusUpdatePopup: React.FC<OpportunityStatusUpdatePopupProps> = ({
  opportunityId: propOpportunityId,
  initialValues = {},
  ...props
}) => {
  const [statusOptions, setStatusOptions] = useState<any[]>([])
  const [opportunityData, setOpportunityData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract opportunityId from multiple sources (process context, props, URL)
  const opportunityId = useMemo(() => {
    return (
      propOpportunityId ||
      props.additionalData?.opportunityId ||
      props.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
      props.additionalData?.id ||
      new URLSearchParams(window.location.search).get('opportunityId')
    )
  }, [propOpportunityId, props.additionalData])

  // Ensure we have access token from business app context
  const accessToken = props.accessToken

  const catalogClient = useCatalogManagerClient(accessToken || '')
  const graphqlClient = useGraphQLClient(accessToken || '')

  const form = useForm<OpportunityStatusUpdatePopupValues>({
    defaultValues: {
      investmentOpportunity: {
        id: opportunityId || '',
        version: 0,
        opportunityStatusRef: ''
      },
      changeMode: 'UPDATE',
      ...initialValues
    }
  })

  // Load opportunity data and status options
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !opportunityId) {
        setError('Access token or opportunity ID missing')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch opportunity data and status options in parallel
        const [opportunityResponse, statusResponse] = await Promise.all([
          graphqlClient.request(GET_INVESTMENT_OPPORTUNITY_BY_ID(opportunityId)),
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'InvestmentOpportunityStatus', version: 'v1' },
            { limit: 100, offset: 0 }
          )
        ])

        const opportunity = opportunityResponse?.InvestmentOpportunity?.[0]
        if (!opportunity) {
          throw new Error('Opportunity not found')
        }

        setOpportunityData(opportunity)
        setStatusOptions(statusResponse.data || [])

        // Set form values with current opportunity data
        form.setValue('investmentOpportunity.id', opportunity.id)
        form.setValue('investmentOpportunity.version', opportunity.version || 0)
        form.setValue('investmentOpportunity.opportunityStatusRef', opportunity.opportunityStatus?.id || '')
        form.setValue('changeMode', 'UPDATE')
      } catch (err) {
        console.error('Failed to load data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [accessToken, opportunityId, catalogClient, graphqlClient, form])

  // Submit handler
  const handleSubmit = async () => {
    // Get the current form values to ensure we have the latest data
    const currentFormValues = form.getValues()

    // Return payload for process submission matching the saveInvestmentOpportunity model
    return {
      investmentOpportunity: {
        id: currentFormValues.investmentOpportunity.id,
        version: currentFormValues.investmentOpportunity.version,
        opportunityStatusRef: currentFormValues.investmentOpportunity.opportunityStatusRef
      },
      changeMode: currentFormValues.changeMode
    }
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" />
        <p className="gba:mt-4">
          {getTranslationFromI18nKeyAndLabel('crm:opportunity.status.loading', 'Loading opportunity data...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <div className="gba:text-red-600 gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('crm:common.error', 'Error')}
          </h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const currentStatus = opportunityData?.opportunityStatus

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      formData={form.getValues()}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:opportunity.status.update', 'Update Status')}
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-6" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.status.updateTitle', 'Update Opportunity Status')}
          </h2>
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.label', 'Opportunity')}: {opportunityData?.name}
          </p>
        </div>

        {/* Current Status Display */}
        <div className="gba:mb-4 gba:p-4 gba:bg-gray-50 gba:rounded-lg">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:font-medium gba:text-gray-700">
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.status.current', 'Current Status')}:
            </span>
            <Badge variant={currentStatus?.value?.toLowerCase().includes('open') ? 'default' : 'secondary'}>
              {currentStatus?.value || getTranslationFromI18nKeyAndLabel('crm:opportunity.status.none', 'No Status')}
            </Badge>
          </div>
        </div>

        {/* Status Selection */}
        <FormField
          control={form.control}
          name="investmentOpportunity.opportunityStatusRef"
          rules={{
            required: getTranslationFromI18nKeyAndLabel('crm:opportunity.status.required', 'Status is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:opportunity.status.new', 'New Status')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value)
                    form.setValue('investmentOpportunity.opportunityStatusRef', value)
                  }}
                >
                  <SelectTrigger data-testid="opportunity-status-select">
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'crm:opportunity.status.selectPlaceholder',
                        'Select new status'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hidden fields for payload */}
        <input type="hidden" {...form.register('investmentOpportunity.id')} />
        <input type="hidden" {...form.register('investmentOpportunity.version')} />
        <input type="hidden" {...form.register('changeMode')} />
      </div>
    </AppActionForm>
  )
}

export default OpportunityStatusUpdatePopup
export { OpportunityStatusUpdatePopup }
