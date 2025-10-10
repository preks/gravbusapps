import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { useOpportunityFormFieldClearing } from '../../hooks/useOpportunityFormFieldClearing'
import { useCurrenciesGraphQL } from '../../hooks/useCurrenciesGraphQL'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'InvestmentOpportunityForm'

const AmountDateSection: React.FC = () => {
  const { formValues, businessAppContext } = useOpportunityFormContext()

  const { handleInputChange } = useOpportunityFormFieldClearing()

  // Simple currencies hook
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

  return (
    <div className="gba:space-y-6">
      {/* Estimated Amount and Currency - Same Row */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <div className="gba:space-y-2">
          <Label htmlFor="estimatedAmount" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            Estimated Amount <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            id="estimatedAmount"
            type="number"
            value={formValues.estimatedAmount || ''}
            onChange={e => handleInputChange('estimatedAmount', e.target.value)}
            placeholder="Please enter estimated amount..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, 'estimated-amount')}
          />
        </div>

        <div className="gba:space-y-2">
          <SearchableSelect
            label="Currency *"
            name="currency"
            value={formValues.currency}
            onChange={value => handleInputChange('currency', value)}
            options={simpleCurrencies}
            loading={simpleCurrenciesLoading}
            error={simpleCurrenciesError}
            hasMore={simpleCurrenciesHasMore}
            onSearch={searchSimpleCurrencies}
            onLoadMore={loadMoreSimpleCurrencies}
            placeholder="Please Select..."
            data-testid={formatDataTestId(prefixDataTestId, 'currency')}
          />
        </div>
      </div>

      {/* Close Date - 50% width */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2">
        <div className="gba:space-y-2">
          <Label htmlFor="closeDate" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            Expected Close Date
          </Label>
          <Input
            id="closeDate"
            type="date"
            value={formValues.closeDate || ''}
            onChange={e => handleInputChange('closeDate', e.target.value)}
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, 'close-date')}
          />
        </div>
        {/* Empty div to take up the other 50% */}
        <div></div>
      </div>
    </div>
  )
}

export default AmountDateSection
