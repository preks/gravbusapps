import React from 'react'
import { Label, Input } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { useOpportunitySearchHandling } from '../../hooks/useOpportunitySearchHandling'
import { useOpportunityFormFieldClearing } from '../../hooks/useOpportunityFormFieldClearing'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'InvestmentOpportunityForm'

const OpportunityInvestmentSelectionSection: React.FC = () => {
  const {
    formValues,
    investmentGroupsLoading,
    investmentGroupsError,
    investmentGroupsHasMore,
    searchInvestmentGroups,
    loadMoreInvestmentGroups,
    dependentInvestmentTypesLoading,
    dependentInvestmentTypesError
  } = useOpportunityFormContext()

  const { filteredInvestmentGroups, filteredInvestmentTypes, handleInvestmentGroupSearch, handleInvestmentTypeSearch } =
    useOpportunitySearchHandling()

  const { handleInputChange } = useOpportunityFormFieldClearing()

  return (
    <div className="gba:space-y-6">
      {/* Investment Name - Full width */}
      <div className="gba:space-y-2">
        <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">Investment Name</Label>
        <Input
          type="text"
          value={formValues.investmentName || ''}
          onChange={e => handleInputChange('investmentName', e.target.value)}
          placeholder="Enter investment name..."
          className="gba:border-gray-300 gba:bg-white"
          data-testid={formatDataTestId(prefixDataTestId, 'investment-name')}
        />
      </div>

      {/* Investment Group and Investment Type - Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Investment Group */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">Investment Group</Label>
          <SearchableSelect
            label=""
            name="investmentGroup"
            value={formValues.investmentGroupRef}
            onChange={value => {
              handleInputChange('investmentGroupRef', value)
              // Clear investment type when group changes
              handleInputChange('investmentTypeRef', '')
            }}
            options={filteredInvestmentGroups}
            loading={investmentGroupsLoading}
            error={investmentGroupsError}
            hasMore={investmentGroupsHasMore}
            onSearch={handleInvestmentGroupSearch}
            onLoadMore={loadMoreInvestmentGroups}
            placeholder="Please select..."
            data-testid={formatDataTestId(prefixDataTestId, 'investment-group')}
          />
        </div>

        {/* Investment Type */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">Investment Type</Label>
          <SearchableSelect
            label=""
            name="investmentType"
            value={formValues.investmentTypeRef}
            onChange={value => {
              handleInputChange('investmentTypeRef', value)
            }}
            options={filteredInvestmentTypes}
            loading={dependentInvestmentTypesLoading}
            error={dependentInvestmentTypesError}
            hasMore={false} // Dependent types don't have pagination
            onSearch={handleInvestmentTypeSearch}
            onLoadMore={() => {}} // Dependent types don't have load more
            placeholder="Please select..."
            disabled={!formValues.investmentGroupRef || dependentInvestmentTypesLoading}
            data-testid={formatDataTestId(prefixDataTestId, 'investment-type')}
          />
        </div>
      </div>
    </div>
  )
}

export default OpportunityInvestmentSelectionSection
