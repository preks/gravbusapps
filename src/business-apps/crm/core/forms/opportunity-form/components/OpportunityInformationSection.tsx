import React, { useEffect, useRef } from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../context/OpportunityFormContext'
import OwnerSelector from './OwnerSelector'
import SearchableSelect from './SearchableSelect'
import { useCurrenciesGraphQL } from '../hooks/useCurrenciesGraphQL'
import { useAccountsGraphQL } from '../hooks/useAccountsGraphQL'

const prefixDataTestId = 'OpportunityForm'

const OpportunityInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    error,
    opportunityStatuses,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    pipelines,
    salesPipelineStages,
    refetchStages,

    // Business app context
    businessAppContext
  } = useOpportunityFormContext()

  // Ref to track previous pipeline to detect changes
  const previousPipelineRef = useRef<string>(formValues.pipeline)

  // Simple currencies hook (like Account form countries)
  const {
    options: simpleCurrencies,
    loading: simpleCurrenciesLoading,
    error: simpleCurrenciesError,
    hasMore: simpleCurrenciesHasMore,
    search: searchSimpleCurrencies,
    loadMore: loadMoreSimpleCurrencies
  } = useCurrenciesGraphQL({
    accessToken: businessAppContext.accessToken
  })

  // Simple accounts hook (like Lead form)
  const {
    options: simpleAccounts,
    loading: simpleAccountsLoading,
    error: simpleAccountsError,
    hasMore: simpleAccountsHasMore,
    search: searchSimpleAccounts,
    loadMore: loadMoreSimpleAccounts
  } = useAccountsGraphQL({
    accessToken: businessAppContext.accessToken
  })

  // Auto-select "Standard" pipeline option if not already selected, fallback to first option
  useEffect(() => {
    if (pipelines.length > 0 && !formValues.pipeline) {
      console.log('🎯 Auto-selecting pipeline from', pipelines.length, 'options')

      // First try to find "Standard" pipeline (case-insensitive)
      const standardPipeline = pipelines.find(
        pipeline =>
          pipeline.label?.toLowerCase().includes('standard') ||
          pipeline.name?.toLowerCase().includes('standard') ||
          pipeline.value?.toLowerCase().includes('standard') ||
          pipeline.id?.toLowerCase().includes('standard')
      )

      // Select Standard if found, otherwise select first option
      const selectedPipeline = standardPipeline || pipelines[0]
      setFormValues({ pipeline: selectedPipeline.value })
    }
  }, [pipelines.length, formValues.pipeline])

  // Handle pipeline changes: load stages for new pipeline
  useEffect(() => {
    const currentPipeline = formValues.pipeline
    const previousPipeline = previousPipelineRef.current

    console.log('🔍 Pipeline changed:', {
      currentPipeline,
      previousPipeline,
      hasRefetchStages: !!refetchStages
    })

    if (currentPipeline && refetchStages) {
      console.log('📡 Loading stages for pipeline:', currentPipeline)
      refetchStages(currentPipeline)
    }

    // Update the ref to track current pipeline
    previousPipelineRef.current = currentPipeline
  }, [formValues.pipeline, refetchStages])

  // When stages are loaded, ALWAYS set first stage as selected
  useEffect(() => {
    if (formValues.pipeline && salesPipelineStages.length > 0) {
      const firstStage = salesPipelineStages[0]
      console.log('🎯 Setting first stage:', firstStage.label, 'Value:', firstStage.value)
      setFormValues({ salesPipelineStage: firstStage.value })
    }
  }, [formValues.pipeline, salesPipelineStages.length])

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent"
      style={{
        border: '0',
        borderWidth: '0',
        borderStyle: 'none',
        borderColor: 'transparent',
        boxShadow: 'none',
        padding: '0',
        background: 'transparent'
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: '0',
          borderWidth: '0',
          borderStyle: 'none',
          borderColor: 'transparent',
          padding: '0'
        }}
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Owner */}
        <div>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Owner <span className="gba:text-red-500">*</span>
          </label>
          <OwnerSelector
            value={formValues.owner}
            onChange={(value: string) => setFormValues({ owner: value })}
            employees={employeePositions}
            loading={employeePositionsLoading}
            hasMore={employeePositionsHasMore}
            onLoadMore={loadMoreEmployeePositions}
            onSearch={(searchTerm: string) => {
              searchEmployeePositions(searchTerm)
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
          />
        </div>

        {/* Opportunity Name */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            Opportunity Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            name="name"
            value={formValues.name || ''}
            onChange={e => setFormValues({ name: e.target.value })}
            placeholder="Please Enter..."
            required
            className="gba:border-gray-300 gba:bg-hsl(var(--background))"
            data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
          />
        </div>

        {/* Account Name */}
        <div className="gba:space-y-2">
          <SearchableSelect
            label="Account Name *"
            name="companyName"
            value={formValues.companyName}
            placeholder="Please Select..."
            options={simpleAccounts}
            loading={simpleAccountsLoading}
            hasMore={simpleAccountsHasMore}
            onSearch={searchSimpleAccounts}
            onLoadMore={loadMoreSimpleAccounts}
            onChange={value => {
              // Find the selected account to get both ID and name
              const selectedAccount = simpleAccounts.find(account => account.value === value || account.id === value)
              if (selectedAccount) {
                setFormValues({
                  companyName: selectedAccount.name, // Store name for display
                  accountId: selectedAccount.value // Store ID for backend
                })
              }
            }}
            error={simpleAccountsError}
            data-testid={formatDataTestId(prefixDataTestId, 'CompanySelect')}
          />
        </div>

        {/* Pipeline and Sales Pipeline Stage - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Pipeline <span className="gba:text-red-500">*</span>
            </Label>
            <Select
              value={formValues.pipeline}
              onValueChange={value => setFormValues({ pipeline: value })}
              data-testid={formatDataTestId(prefixDataTestId, 'PipelineSelect')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {pipelines.map(option => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Sales Pipeline Stage <span className="gba:text-red-500">*</span>
            </Label>
            <Select
              value={formValues.salesPipelineStage}
              onValueChange={value => setFormValues({ salesPipelineStage: value })}
              onOpenChange={() => {
                if (formValues.pipeline && refetchStages) {
                  refetchStages(formValues.pipeline)
                }
              }}
              data-testid={formatDataTestId(prefixDataTestId, 'SalesPipelineStageSelect')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                <SelectValue
                  placeholder={
                    !formValues.pipeline
                      ? 'Select Pipeline First...'
                      : salesPipelineStages.length === 0
                        ? 'No Stages Available'
                        : 'Please Select...'
                  }
                />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {salesPipelineStages.length === 0 ? (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                    {!formValues.pipeline ? 'Please select a pipeline first' : 'No stages available for this pipeline'}
                  </div>
                ) : (
                  salesPipelineStages.map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Opportunity Status */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Opportunity Status</Label>
          <Select
            value={formValues.opportunityStatus}
            onValueChange={value => setFormValues({ opportunityStatus: value })}
            data-testid={formatDataTestId(prefixDataTestId, 'StatusSelect')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
              <SelectValue placeholder="Please Select..." />
            </SelectTrigger>
            <SelectContent
              className="gba:max-h-[200px] gba:overflow-y-auto"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {opportunityStatuses.map(option => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estimated Amount and Currency - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Estimated Amount <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              name="estimatedAmount"
              type="number"
              min="0"
              step="0.01"
              value={formValues.estimatedAmount || ''}
              onChange={e => setFormValues({ estimatedAmount: e.target.value })}
              placeholder="0.00"
              required
              className="gba:border-gray-300 gba:bg-hsl(var(--background))"
              data-testid={formatDataTestId(prefixDataTestId, 'EstimatedAmountInput')}
            />
          </div>

          <div className="gba:space-y-2">
            <SearchableSelect
              label="Currency *"
              name="currency"
              value={formValues.currency}
              placeholder="Please Select..."
              options={simpleCurrencies}
              loading={simpleCurrenciesLoading}
              hasMore={simpleCurrenciesHasMore}
              onSearch={searchSimpleCurrencies}
              onLoadMore={loadMoreSimpleCurrencies}
              onChange={value => setFormValues({ currency: value })}
              error={simpleCurrenciesError}
              data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OpportunityInformationSection
