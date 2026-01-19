import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Combobox,
  Spinner,
  Alert
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CatalogSelect } from '@/components/catalog-select'
import { useInvestmentOpportunitiesList } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useGetEquityInvestments } from '@/common/data/investment/hooks/useEquityInvestments'

const prefixDataTestId = 'EquityInvestmentRoundForm'
const CURRENCY_CATALOG = 'Currency:v1'

// Form validation schema
const equityInvestmentRoundSchema = z.object({
  name: z
    .string()
    .min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.nameRequired', 'Round name is required')),
  year: z
    .string()
    .min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.yearRequired', 'Year is required')),
  preValue: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel('investment.rounds.validation.preValueRequired', 'Pre-value is required')
    ),
  investmentVolume: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'investment.rounds.validation.investmentVolumeRequired',
        'Investment volume is required'
      )
    ),
  roundSharePercentage: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'investment.rounds.validation.sharePercentageRequired',
        'Share percentage is required'
      )
    ),
  currencyRef: z
    .string()
    .min(1, getTranslationFromI18nKeyAndLabel('investment.rounds.validation.currencyRequired', 'Currency is required')),
  equityInvestment: z.string().optional(), // Will be provided via context or user selection
  investmentOpportunityId: z.string().optional(), // Link to originating opportunity
  id: z.string().optional(), // For updates
  version: z.number().optional() // For optimistic locking in updates
})

type EquityInvestmentRoundFormValues = z.infer<typeof equityInvestmentRoundSchema>

export interface EquityInvestmentRoundFormProps extends BusinessAppContextProps {
  onSuccess?: (data: any) => void
  initialValues?: Partial<EquityInvestmentRoundFormValues>
}

const EquityInvestmentRoundForm: React.FC<EquityInvestmentRoundFormProps> = ({
  accessToken,
  additionalData,
  onSuccess,
  initialValues,
  ...businessAppContext
}) => {
  // Extract round ID from multiple sources (following standard pattern)
  const equityInvestmentRoundId =
    initialValues?.id ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.equityInvestmentRoundId ||
    additionalData?.equityInvestmentRoundId ||
    additionalData?.entityId ||
    additionalData?.targetEntityId ||
    additionalData?.roundId ||
    additionalData?.id

  // Standard mode detection pattern (like other investment forms)
  const isUpdateMode = !!equityInvestmentRoundId

  // State for loading existing round data in update mode
  const [loadingRoundData, setLoadingRoundData] = useState(isUpdateMode)

  // Get equity investments hook with state management
  const {
    options: equityInvestmentOptions,
    loading: equityInvestmentsLoading,
    hasMore: equityInvestmentsHasMore,
    search: searchEquityInvestments,
    loadMore: loadMoreEquityInvestments,
    initialize: initializeEquityInvestments
  } = useGetEquityInvestments(
    { accessToken, additionalData, ...businessAppContext },
    { withState: true, autoFetch: false, pageSize: 50, mapToSelectOptions: true }
  )

  // Get opportunities hook - declarative list hook (matching OpportunityForm pattern)
  const useOpportunities = useInvestmentOpportunitiesList(
    { accessToken, additionalData, ...businessAppContext },
    { limit: 50 }
  )

  // Get equity investment ID from various sources (try all possible keys)
  // IMPORTANT: Check task payload first, then fallback to direct additionalData
  const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters
  const mainInvestmentId =
    additionalData?.investmentId ||
    additionalData?.mainInvestmentId ||
    taskPayload?.investmentId ||
    taskPayload?.mainInvestmentId
  const equityInvestmentId =
    taskPayload?.equityInvestmentId ||
    taskPayload?.targetEquityInvestmentId ||
    taskPayload?.customEquityId ||
    taskPayload?.entityId ||
    taskPayload?.parentEntityId ||
    taskPayload?.equityInvestment ||
    additionalData?.equityInvestmentId ||
    additionalData?.targetEquityInvestmentId ||
    additionalData?.customEquityId ||
    additionalData?.parentEntityId ||
    additionalData?.equityInvestment

  // Extract opportunity ID from context (for opportunity-to-round conversion)
  const investmentOpportunityId =
    taskPayload?.investmentOpportunityId ||
    taskPayload?.opportunityId ||
    additionalData?.investmentOpportunityId ||
    additionalData?.opportunityId

  // Determine if we're in "opportunity conversion" mode (opportunity ID present, no equity investment pre-selected)
  const isOpportunityConversionMode = !!investmentOpportunityId && !equityInvestmentId && !mainInvestmentId

  // Show opportunity selection when no opportunityId is provided from context OR in update mode (allows viewing/changing linked opportunity)
  const showOpportunitySelection = !investmentOpportunityId || isUpdateMode

  // Fallback: If no equity investment ID found, use main investment ID as last resort
  // But NOT in opportunity conversion mode - user must select equity investment
  const finalEquityInvestmentId = isOpportunityConversionMode ? undefined : equityInvestmentId || mainInvestmentId
  const finalLoadingEquityId = !finalEquityInvestmentId && !isOpportunityConversionMode

  // Production-safe ID resolution validation
  React.useEffect(() => {
    // ID resolution validation effect for potential production telemetry
    // No sensitive data logged to console in production
  }, [
    equityInvestmentId,
    mainInvestmentId,
    finalEquityInvestmentId,
    finalLoadingEquityId,
    isUpdateMode,
    investmentOpportunityId,
    isOpportunityConversionMode,
    additionalData,
    taskPayload
  ])

  // Defer rendering decision until after hooks
  // Allow form to render if we have either equity investment ID OR opportunity ID (for conversion mode)
  const isMissingRequiredContext = !finalEquityInvestmentId && !isOpportunityConversionMode && !isUpdateMode

  // Initialize form with initialValues support (following standard pattern)
  const form = useForm<EquityInvestmentRoundFormValues>({
    resolver: zodResolver(equityInvestmentRoundSchema),
    defaultValues: {
      name: initialValues?.name || '',
      year: initialValues?.year || '2025', // Default to 2025 as requested
      preValue: initialValues?.preValue || '',
      investmentVolume: initialValues?.investmentVolume || '',
      roundSharePercentage: initialValues?.roundSharePercentage || '',
      currencyRef: initialValues?.currencyRef || '',
      equityInvestment: finalEquityInvestmentId || '',
      investmentOpportunityId: investmentOpportunityId || '',
      id: initialValues?.id || equityInvestmentRoundId,
      version: initialValues?.version
    }
  })

  // Function to load existing round data in update mode
  const loadExistingRoundData = useCallback(async () => {
    if (!isUpdateMode || !equityInvestmentRoundId) {
      setLoadingRoundData(false)
      return
    }

    try {
      setLoadingRoundData(true)
      // TODO: Implement GraphQL query to fetch existing round data
      // Use actual round data from task payload if available
      const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters || additionalData
      const roundData = taskPayload?.roundData || additionalData?.roundData

      if (roundData) {
        // Extract existing opportunity ID from round data
        const existingOpportunityId =
          roundData.investmentOpportunity?.id || roundData.investmentOpportunityId || investmentOpportunityId || ''

        // Note: The existing opportunity will be available in useOpportunities.opportunities
        // from the declarative hook's auto-fetch, so no need to manually add it to options

        const existingData = {
          id: equityInvestmentRoundId,
          name: roundData.name || '',
          year: roundData.year ? new Date(roundData.year).getFullYear().toString() : '2025',
          preValue: roundData.preValue?.toString() || '',
          investmentVolume: roundData.investmentVolume?.toString() || '',
          roundSharePercentage: roundData.roundSharePercentage?.toString() || '',
          currencyRef: roundData.currency?.id || 'Currency:v1:EUR',
          version: roundData.version || 0,
          investmentOpportunityId: existingOpportunityId
        }

        // Round data loaded

        // Pre-fill form with existing data
        form.reset({
          name: existingData.name,
          year: existingData.year,
          preValue: existingData.preValue,
          investmentVolume: existingData.investmentVolume,
          roundSharePercentage: existingData.roundSharePercentage,
          currencyRef: existingData.currencyRef,
          equityInvestment: finalEquityInvestmentId || '',
          investmentOpportunityId: existingData.investmentOpportunityId,
          id: existingData.id,
          version: existingData.version
        })
      }
    } catch {
      // Error loading existing round data
    } finally {
      setLoadingRoundData(false)
    }
  }, [isUpdateMode, equityInvestmentRoundId, additionalData, form, finalEquityInvestmentId, investmentOpportunityId])

  // Load existing round data on mount if in update mode
  useEffect(() => {
    if (isUpdateMode) {
      loadExistingRoundData()
    }
  }, [isUpdateMode, loadExistingRoundData])

  // Initialize equity investments on mount (only in opportunity conversion mode)
  const equityInvestmentsInitializedRef = React.useRef(false)
  useEffect(() => {
    if (isOpportunityConversionMode && accessToken && !equityInvestmentsInitializedRef.current) {
      equityInvestmentsInitializedRef.current = true
      initializeEquityInvestments()
    }
  }, [isOpportunityConversionMode, accessToken, initializeEquityInvestments])

  // Transform opportunities to SelectOption format (matching OpportunityForm pattern)
  const opportunityOptions = useMemo(() => {
    if (!useOpportunities?.opportunities) return []
    return useOpportunities.opportunities.map(opp => ({
      value: opp.id || '',
      label: opp.name || opp.id || 'Unknown'
    }))
  }, [useOpportunities?.opportunities])

  // Simple search wrapper that calls refetch (matching OpportunityForm pattern)
  const searchOpportunities = useCallback(
    (searchTerm: string) => {
      if (useOpportunities?.refetch) {
        useOpportunities.refetch({ search: searchTerm, offset: 0 })
      }
    },
    [useOpportunities?.refetch]
  )

  // Get selected equity investment ID from form
  const selectedEquityInvestmentId = form.watch('equityInvestment')

  // Handle form submission for AppActionForm
  const handleSubmit = async (data: EquityInvestmentRoundFormValues) => {
    // In opportunity conversion mode, require user to select an equity investment
    const effectiveEquityInvestmentId = data.equityInvestment || finalEquityInvestmentId

    if (!effectiveEquityInvestmentId) {
      return null // guarded by validateForm/disableFormSubmission
    }

    // Prepare the mutation payload - structure based on API requirements (following standard pattern)
    const equityInvestmentRoundPayload: any = {
      name: data.name,
      year: `${data.year}-01-01T00:00:00.000Z`, // Convert year to timestamp format (e.g., "2025" -> "2025-01-01T00:00:00.000Z")
      preValue: parseFloat(data.preValue),
      investmentVolume: parseFloat(data.investmentVolume),
      roundSharePercentage: parseFloat(data.roundSharePercentage),
      currencyRef: data.currencyRef,
      equityInvestment: effectiveEquityInvestmentId,
      businessKey: isUpdateMode ? `equity-round-update-${Date.now()}` : `equity-round-${Date.now()}`,
      additionalProperties: {}
    }

    // Include opportunity reference if provided from context or manually selected
    const effectiveOpportunityId = investmentOpportunityId || data.investmentOpportunityId
    if (effectiveOpportunityId) {
      equityInvestmentRoundPayload.investmentOpportunity = effectiveOpportunityId
    }

    // Include ID and version for updates (following standard pattern)
    if (isUpdateMode) {
      equityInvestmentRoundPayload.id = equityInvestmentRoundId
      equityInvestmentRoundPayload.version = form.getValues().version || 0
    }

    const payload = {
      equityInvestmentRound: equityInvestmentRoundPayload
    }

    return payload
  }

  // Form validation for AppActionForm
  const validateForm = (data: any): string[] | null => {
    const errors: string[] = []

    // In opportunity conversion mode, require user to select equity investment
    const effectiveEquityInvestmentId = data.equityInvestment || finalEquityInvestmentId

    if (!effectiveEquityInvestmentId && !isOpportunityConversionMode) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.validation.equityInvestmentIdRequired',
          'Equity Investment ID is required'
        )
      )
    }

    if (isOpportunityConversionMode && !data.equityInvestment) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.validation.selectEquityInvestment',
          'Please select an equity investment'
        )
      )
    }

    if (isUpdateMode && !equityInvestmentRoundId) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.validation.roundIdRequired',
          'Round ID is required for update'
        )
      )
    }

    if (!data.name?.trim()) {
      errors.push(
        getTranslationFromI18nKeyAndLabel('investment.rounds.validation.nameRequired', 'Round name is required')
      )
    }

    if (!data.year?.trim()) {
      errors.push(getTranslationFromI18nKeyAndLabel('investment.rounds.validation.yearRequired', 'Year is required'))
    }

    if (!data.currencyRef?.trim()) {
      errors.push(
        getTranslationFromI18nKeyAndLabel('investment.rounds.validation.currencyRequired', 'Currency is required')
      )
    }

    if (!data.preValue || parseFloat(data.preValue) < 0) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.validation.preValuePositive',
          'Pre-value must be a positive number'
        )
      )
    }

    if (!data.investmentVolume || parseFloat(data.investmentVolume) < 0) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.validation.investmentVolumePositive',
          'Investment volume must be a positive number'
        )
      )
    }

    if (
      !data.roundSharePercentage ||
      parseFloat(data.roundSharePercentage) < 0 ||
      parseFloat(data.roundSharePercentage) > 100
    ) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'investment.rounds.validation.sharePercentageRange',
          'Share percentage must be between 0 and 100'
        )
      )
    }

    return errors.length > 0 ? errors : null
  }

  // Success handler
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess(form.getValues())
    }
  }

  if (isMissingRequiredContext) {
    return (
      <Alert variant="destructive" data-testid="equity-investment-round-form-error-alert">
        {getTranslationFromI18nKeyAndLabel(
          'investments:rounds.create.missingInvestmentId',
          'Equity Investment ID or Opportunity ID is required to create investment rounds'
        )}
      </Alert>
    )
  }

  // Determine if form submission should be disabled
  const isFormSubmissionDisabled =
    loadingRoundData ||
    equityInvestmentsLoading ||
    (isOpportunityConversionMode && !selectedEquityInvestmentId) ||
    (!isOpportunityConversionMode && finalLoadingEquityId)

  return (
    <AppActionForm
      form={form}
      formData={form.getValues()}
      processType={isUpdateMode ? 'update' : 'create'}
      submitButtonText={
        isUpdateMode
          ? getTranslationFromI18nKeyAndLabel('investment.rounds.updateRound', 'Update Round')
          : getTranslationFromI18nKeyAndLabel('investment.rounds.createRound', 'Create Round')
      }
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      validateForm={validateForm}
      businessAppContext={{ accessToken, additionalData, ...businessAppContext }}
      disableFormSubmission={isFormSubmissionDisabled}
      data-testid={prefixDataTestId}
    >
      <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
        {/* Form Title */}
        <div>
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'Title')}
          >
            {isUpdateMode
              ? getTranslationFromI18nKeyAndLabel('investment.rounds.updateInvestmentRound', 'Update Investment Round')
              : getTranslationFromI18nKeyAndLabel('investment.rounds.createInvestmentRound', 'Create Investment Round')}
          </h2>
          {(finalLoadingEquityId || loadingRoundData || equityInvestmentsLoading || useOpportunities?.loading) && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
              <Spinner size="sm" />
              {loadingRoundData
                ? getTranslationFromI18nKeyAndLabel('investment.rounds.loadingRoundData', 'Loading round data...')
                : equityInvestmentsLoading
                  ? getTranslationFromI18nKeyAndLabel(
                      'investment.rounds.loadingEquityInvestments',
                      'Loading equity investments...'
                    )
                  : useOpportunities?.loading
                    ? getTranslationFromI18nKeyAndLabel(
                        'investment.rounds.loadingOpportunities',
                        'Loading opportunities...'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'investment.rounds.loadingInvestmentData',
                        'Loading investment data...'
                      )}
            </div>
          )}
        </div>

        <CatalogSelect.Provider form={form} accessToken={accessToken}>
          <Form {...form}>
            <div className="gba:space-y-4">
              {/* Opportunity Selection - Show when no opportunityId provided from context (optional linking) */}
              {showOpportunitySelection && (
                <FormField
                  control={form.control}
                  name="investmentOpportunityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('investment.rounds.sourceOpportunity', 'Source Opportunity')}
                        <span className="gba:text-muted-foreground gba:text-xs gba:ml-1">
                          ({getTranslationFromI18nKeyAndLabel('common.optional', 'Optional')})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          options={opportunityOptions}
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'investment.rounds.selectOpportunity',
                            'Select opportunity to link...'
                          )}
                          searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                            'investment.rounds.searchOpportunities',
                            'Search opportunities...'
                          )}
                          emptyText={
                            useOpportunities?.loading
                              ? getTranslationFromI18nKeyAndLabel('common.loading', 'Loading...')
                              : getTranslationFromI18nKeyAndLabel(
                                  'investment.rounds.noOpportunitiesFound',
                                  'No opportunities found'
                                )
                          }
                          disabled={useOpportunities?.loading}
                          loading={useOpportunities?.loading}
                          onSearch={searchOpportunities}
                          data-testid={formatDataTestId(prefixDataTestId, 'OpportunitySelect')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Equity Investment Selection - Only show in opportunity conversion mode */}
              {isOpportunityConversionMode && (
                <FormField
                  control={form.control}
                  name="equityInvestment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('investment.rounds.equityInvestment', 'Equity Investment')}{' '}
                        <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          options={(
                            equityInvestmentOptions as Array<{ id: string; value: string; label: string; name: string }>
                          ).map(eq => ({
                            value: eq.value,
                            label: eq.label
                          }))}
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'investment.rounds.selectEquityInvestment',
                            'Select equity investment...'
                          )}
                          searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                            'investment.rounds.searchEquityInvestments',
                            'Search equity investments...'
                          )}
                          emptyText={getTranslationFromI18nKeyAndLabel(
                            'investment.rounds.noEquityInvestmentsFound',
                            'No equity investments found'
                          )}
                          disabled={equityInvestmentsLoading && equityInvestmentOptions.length === 0}
                          loading={equityInvestmentsLoading}
                          onSearch={searchEquityInvestments}
                          onLoadMore={loadMoreEquityInvestments}
                          hasMore={equityInvestmentsHasMore}
                          data-testid={formatDataTestId(prefixDataTestId, 'EquityInvestmentSelect')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Round Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.roundName', 'Round Name')}{' '}
                      <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'investment.rounds.roundNamePlaceholder',
                          'Enter round name (e.g., Series A, Seed Round)'
                        )}
                        data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.year', 'Year')}{' '}
                      <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1900"
                        max="2100"
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'investment.rounds.yearPlaceholder',
                          'Enter year'
                        )}
                        data-testid={formatDataTestId(prefixDataTestId, 'YearInput')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency Selection */}
              <FormField
                control={form.control}
                name="currencyRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.currency', 'Currency')}{' '}
                      <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={CURRENCY_CATALOG}
                        variant="combobox"
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Financial Fields Row */}
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                {/* Pre Value */}
                <FormField
                  control={form.control}
                  name="preValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'investment.rounds.preMoneyValuation',
                          'Pre-Money Valuation'
                        )}{' '}
                        <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          data-testid={formatDataTestId(prefixDataTestId, 'PreValueInput')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Investment Volume */}
                <FormField
                  control={form.control}
                  name="investmentVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentVolume', 'Investment Volume')}{' '}
                        <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          data-testid={formatDataTestId(prefixDataTestId, 'InvestmentVolumeInput')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Share Percentage */}
              <FormField
                control={form.control}
                name="roundSharePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.sharePercentage', 'Share Percentage')}{' '}
                      <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0.00"
                        data-testid={formatDataTestId(prefixDataTestId, 'SharePercentageInput')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CatalogSelect.Provider>
      </div>
    </AppActionForm>
  )
}

export default EquityInvestmentRoundForm
