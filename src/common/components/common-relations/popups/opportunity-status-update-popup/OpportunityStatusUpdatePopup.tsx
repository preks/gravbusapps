import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
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
  SelectValue,
  Alert,
  AlertDescription,
  DateInput
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'

export interface OpportunityStatusUpdatePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  opportunityId?: string
  opportunityVersion?: number
  opportunityName?: string

  // Generic configuration (required)
  catalogIdentifier: string // e.g., 'SalesOpportunityStatus' or 'InvestmentOpportunityStatus'
  graphqlEntity: string // e.g., 'Opportunity' or 'InvestmentOpportunity'
  payloadKey: string // e.g., 'opportunity' or 'investmentOpportunity'

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

interface OpportunityData {
  id: string
  version: number
  name: string
  closeDate?: string
  opportunityStatus?: {
    id: string
    value: string
  }
}

interface FormValues {
  opportunityStatusRef: string
  opportunityId: string
  opportunityVersion: number
  closeDate: string
}

const prefixDataTestId = 'opportunity-status-update-popup'

// Helper function to get today's date in ISO format (YYYY-MM-DD)
const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0]
}

/**
 * OpportunityStatusUpdatePopup
 * Fully generic popup for updating opportunity status across any domain.
 * - Accepts catalog identifier, GraphQL entity, and payload key as props
 * - Loads opportunity data and status options from specified catalogs
 * - Routes update through Flow Registry with correct payload structure
 * - When status type is WON or LOST, shows close date field (auto-populated with today or existing date)
 */
export const OpportunityStatusUpdatePopup: React.FC<OpportunityStatusUpdatePopupProps> = ({
  isOpen,
  onClose,
  opportunityId: propOpportunityId,
  opportunityVersion,
  opportunityName,
  accessToken,
  catalogIdentifier,
  graphqlEntity,
  payloadKey,
  onSuccess,
  onError,
  'data-testid': dataTestId = prefixDataTestId,
  ...props
}) => {
  const [statusOptions, setStatusOptions] = useState<any[]>([])
  const [opportunityData, setOpportunityData] = useState<OpportunityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract opportunityId from multiple sources
  const opportunityId = useMemo(() => {
    return (
      propOpportunityId ||
      props.additionalData?.opportunityId ||
      props.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
      props.additionalData?.id
    )
  }, [propOpportunityId, props.additionalData])

  const catalogClient = useCatalogManagerClient(accessToken || '')
  const graphqlClient = useGraphQLClient(accessToken || '')

  const form = useForm<FormValues>({
    defaultValues: {
      opportunityId: opportunityId || '',
      opportunityVersion: opportunityVersion || 0,
      opportunityStatusRef: '',
      closeDate: ''
    }
  })

  // Watch the selected status to conditionally show close date field
  const selectedStatusRef = form.watch('opportunityStatusRef')

  // Helper function to check if selected status type is a closing status (WON or LOST)
  const isClosingStatus = useMemo(() => {
    if (!selectedStatusRef || statusOptions.length === 0) return false
    const selectedStatus = statusOptions.find(status => status.id === selectedStatusRef)
    const statusType = selectedStatus?.type?.toUpperCase()
    return statusType === 'WON' || statusType === 'LOST'
  }, [selectedStatusRef, statusOptions])

  // Load opportunity data and status options
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !opportunityId) {
        setError(
          getTranslationFromI18nKeyAndLabel('opportunity.status.error.noData', 'Access token or opportunity ID missing')
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Build GraphQL query based on domain - includes closeDate
        const query = `
          query GetOpportunityById {
            ${graphqlEntity}(where: { id: { _eq: "${opportunityId}" }, isDeleted: { _eq: false } }) {
              id
              version
              name
              closeDate
              opportunityStatus {
                id
                value
              }
            }
          }
        `

        // Fetch opportunity data and status options in parallel
        const [opportunityResponse, statusResponse] = await Promise.all([
          graphqlClient.request(query),
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier, version: 'v1' },
            { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
          )
        ])

        const opportunity = opportunityResponse?.[graphqlEntity]?.[0]
        if (!opportunity) {
          throw new Error(
            getTranslationFromI18nKeyAndLabel('opportunity.status.error.notFound', 'Opportunity not found')
          )
        }

        setOpportunityData({
          id: opportunity.id,
          version: opportunity.version || 0,
          name: opportunity.name || opportunityName || 'Unnamed Opportunity',
          closeDate: opportunity.closeDate,
          opportunityStatus: opportunity.opportunityStatus
        })
        setStatusOptions(statusResponse.data || [])

        // Set form values with current opportunity data
        form.setValue('opportunityId', opportunity.id)
        form.setValue('opportunityVersion', opportunity.version || 0)
        form.setValue('opportunityStatusRef', opportunity.opportunityStatus?.id || '')
        // Pre-populate closeDate: use existing date if available, otherwise today
        form.setValue('closeDate', opportunity.closeDate?.split('T')[0] || getTodayISO())
      } catch (err) {
        console.error('Failed to load opportunity data:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('opportunity.status.error.loadFailed', 'Failed to load data')
        )
        onError?.(err)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [
    accessToken,
    opportunityId,
    opportunityName,
    isOpen,
    catalogClient,
    graphqlClient,
    catalogIdentifier,
    graphqlEntity,
    form,
    onError
  ])

  // Submit handler - includes closeDate when status type is WON or LOST
  const handleSubmit = async () => {
    const currentFormValues = form.getValues()

    // Build payload using dynamic payloadKey
    return {
      [payloadKey]: {
        id: currentFormValues.opportunityId,
        version: currentFormValues.opportunityVersion,
        opportunityStatusRef: currentFormValues.opportunityStatusRef,
        // Include closeDate only when status type is WON or LOST
        ...(isClosingStatus && { closeDate: currentFormValues.closeDate })
      },
      changeMode: 'UPDATE'
    }
  }

  const handleFormSuccess = () => {
    onSuccess?.()
    onClose()
  }

  if (!isOpen) {
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(dataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p className="gba:mt-4">
          {getTranslationFromI18nKeyAndLabel('opportunity.status.loading', 'Loading opportunity data...')}
        </p>
      </div>
    )
  }

  if (error || !opportunityData) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(dataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription>
            {error ||
              getTranslationFromI18nKeyAndLabel('opportunity.status.error.failed', 'Failed to load opportunity data')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const currentStatus = opportunityData.opportunityStatus

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      formData={form.getValues()}
      submitButtonText={getTranslationFromI18nKeyAndLabel('opportunity.status.update', 'Update Status')}
      businessAppContext={{ ...props, accessToken }}
      onSuccess={handleFormSuccess}
      data-testid={formatDataTestId(dataTestId, 'form')}
    >
      <div className="gba:space-y-6" data-testid={formatDataTestId(dataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2" data-testid={formatDataTestId(dataTestId, 'title')}>
            {getTranslationFromI18nKeyAndLabel('opportunity.status.updateTitle', 'Update Opportunity Status')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid={formatDataTestId(dataTestId, 'subtitle')}>
            {getTranslationFromI18nKeyAndLabel('opportunity.label', 'Opportunity')}: {opportunityData.name}
          </p>
        </div>

        {/* Current Status Display */}
        <div
          className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg"
          data-testid={formatDataTestId(dataTestId, 'current-status')}
        >
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('opportunity.status.current', 'Current Status')}:
            </span>
            <Badge variant={currentStatus?.value?.toLowerCase().includes('open') ? 'default' : 'secondary'}>
              {currentStatus?.value || getTranslationFromI18nKeyAndLabel('opportunity.status.none', 'No Status')}
            </Badge>
          </div>
        </div>

        {/* Status Selection */}
        <FormField
          control={form.control}
          name="opportunityStatusRef"
          rules={{
            required: getTranslationFromI18nKeyAndLabel('opportunity.status.required', 'Status is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('opportunity.status.new', 'New Status')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value)
                    form.setValue('opportunityStatusRef', value)
                  }}
                >
                  <SelectTrigger data-testid={formatDataTestId(dataTestId, 'status-select')}>
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'opportunity.status.selectPlaceholder',
                        'Select new status'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem
                        key={status.id}
                        value={status.id}
                        data-testid={formatDataTestId(dataTestId, `status-option-${status.id}`)}
                      >
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

        {/* Close Date Field - Only shown when status type is WON or LOST */}
        {isClosingStatus && (
          <FormField
            control={form.control}
            name="closeDate"
            rules={{
              required: getTranslationFromI18nKeyAndLabel('opportunity.closeDate.required', 'Close date is required')
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{getTranslationFromI18nKeyAndLabel('opportunity.closeDate.label', 'Close Date')}</FormLabel>
                <FormControl>
                  <DateInput
                    value={field.value || ''}
                    onChange={value => field.onChange(value || '')}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'opportunity.closeDate.placeholder',
                      'Select close date...'
                    )}
                    data-testid={formatDataTestId(dataTestId, 'close-date-input')}
                    outputFormat="iso"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Hidden fields for payload */}
        <input type="hidden" {...form.register('opportunityId')} />
        <input type="hidden" {...form.register('opportunityVersion')} />
      </div>
    </AppActionForm>
  )
}

export default OpportunityStatusUpdatePopup
