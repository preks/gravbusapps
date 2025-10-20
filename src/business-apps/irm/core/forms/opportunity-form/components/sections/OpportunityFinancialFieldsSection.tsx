import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { useOpportunityInvestmentTypeDetection } from '../../hooks/useOpportunityInvestmentTypeDetection'
import { useOpportunitySearchHandling } from '../../hooks/useOpportunitySearchHandling'
import { useOpportunityFormFieldClearing } from '../../hooks/useOpportunityFormFieldClearing'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'InvestmentOpportunityForm'

const OpportunityFinancialFieldsSection: React.FC = () => {
  const {
    formValues,
    investmentRolesLoading,
    investmentRolesError,
    investmentRolesHasMore,
    investmentStakeTypesLoading,
    investmentStakeTypesError,
    investmentStakeTypesHasMore,
    measurementUnitsLoading,
    measurementUnitsError,
    measurementUnitsHasMore
  } = useOpportunityFormContext()

  const {
    isEquityGroup,
    isRealEstateGroup,
    isExistingPropertiesType,
    isMezzanineLoansType,
    isProjectDevelopmentType,
    isOthersType,
    shouldShowInvestmentRole
  } = useOpportunityInvestmentTypeDetection()

  const {
    filteredInvestmentRoles,
    filteredInvestmentStakeTypes,
    filteredMeasurementUnits,
    handleInvestmentRoleSearch,
    handleInvestmentStakeTypeSearch,
    handleMeasurementUnitSearch
  } = useOpportunitySearchHandling()

  const { handleInputChange } = useOpportunityFormFieldClearing()

  return (
    <div className="gba:space-y-6">
      {/* Investment Role and Building Year/Investment Stake Type - Show for equity or real estate + existing properties */}
      {shouldShowInvestmentRole && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          {/* Investment Role */}
          <div className="gba:space-y-2">
            <SearchableSelect
              label="Investment Role"
              name="investmentRole"
              value={formValues.investmentRoleRef}
              placeholder="Please select..."
              options={filteredInvestmentRoles}
              loading={investmentRolesLoading}
              hasMore={investmentRolesHasMore}
              onSearch={handleInvestmentRoleSearch}
              onChange={value => handleInputChange('investmentRoleRef', value)}
              error={investmentRolesError}
              data-testid={formatDataTestId(prefixDataTestId, 'investment-role')}
            />
          </div>

          {/* Building Year - Only show if Real Estate + Existing Properties */}
          {isRealEstateGroup && isExistingPropertiesType && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Building Year</Label>
              <Input
                name="buildingYear"
                type="number"
                value={formValues.buildingYear || ''}
                onChange={e => handleInputChange('buildingYear', e.target.value)}
                placeholder="e.g. 2020"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'building-year')}
              />
            </div>
          )}

          {/* Investment Stake Type - Only show if Investment Group is equity AND NOT real estate */}
          {isEquityGroup && !(isRealEstateGroup && isExistingPropertiesType) && (
            <div className="gba:space-y-2">
              <SearchableSelect
                label="Investment Stake Type"
                name="investmentStakeType"
                value={formValues.investmentStakeTypeRef}
                placeholder="Please select..."
                options={filteredInvestmentStakeTypes}
                loading={investmentStakeTypesLoading}
                hasMore={investmentStakeTypesHasMore}
                onSearch={handleInvestmentStakeTypeSearch}
                onChange={value => handleInputChange('investmentStakeTypeRef', value)}
                error={investmentStakeTypesError}
                data-testid={formatDataTestId(prefixDataTestId, 'investment-stake-type')}
              />
            </div>
          )}
        </div>
      )}

      {/* Financial Fields - Only show if Investment Group is equity */}
      {isEquityGroup && (
        <div className="gba:space-y-6">
          {/* Row 1: Stake Percentage and Entity Market Value */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Stake Percentage */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Stake Percentage (%)</Label>
              <Input
                name="stakePercentage"
                type="number"
                value={formValues.stakePercentage || ''}
                onChange={e => handleInputChange('stakePercentage', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'stake-percentage')}
              />
            </div>

            {/* Entity Market Value */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Entity Market Value</Label>
              <Input
                name="marketValue"
                type="number"
                value={formValues.marketValue || ''}
                onChange={e => handleInputChange('marketValue', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'market-value')}
              />
            </div>
          </div>

          {/* Row 2: Initial Investment (50% width) */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Initial Investment</Label>
              <Input
                name="initialInvestmentAmount"
                type="number"
                value={formValues.initialInvestmentAmount || ''}
                onChange={e => handleInputChange('initialInvestmentAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'initial-investment')}
              />
            </div>
            {/* Empty div to take up the other 50% */}
            <div></div>
          </div>
        </div>
      )}

      {/* Real Estate Fields - Only show if Real Estate Group + Existing Properties Type (same layout as lead form) */}
      {isRealEstateGroup && isExistingPropertiesType && (
        <div className="gba:space-y-6">
          {/* Row 2: Size and Measurement Unit */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Size */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Size</Label>
              <Input
                name="size"
                type="number"
                value={formValues.size || ''}
                onChange={e => handleInputChange('size', e.target.value)}
                placeholder="e.g. 150.5"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'size')}
              />
            </div>

            {/* Measurement Unit */}
            <div className="gba:space-y-2">
              <SearchableSelect
                label="Measurement Unit"
                name="measurementUnit"
                value={formValues.measurementUnit}
                placeholder="Please select..."
                options={filteredMeasurementUnits}
                loading={measurementUnitsLoading}
                hasMore={measurementUnitsHasMore}
                onSearch={handleMeasurementUnitSearch}
                onChange={value => handleInputChange('measurementUnit', value)}
                error={measurementUnitsError}
                data-testid={formatDataTestId(prefixDataTestId, 'measurement-unit')}
              />
            </div>
          </div>

          {/* Row 3: Annual Net Cold Rent and Initial Investment Amount */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Annual Net Cold Rent */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Annual Net Cold Rent</Label>
              <Input
                name="annualNetColdRent"
                type="number"
                value={formValues.annualNetColdRent || ''}
                onChange={e => handleInputChange('annualNetColdRent', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'annual-net-cold-rent')}
              />
            </div>

            {/* Initial Investment Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Initial Investment Amount</Label>
              <Input
                name="initialInvestmentAmount"
                type="number"
                value={formValues.initialInvestmentAmount || ''}
                onChange={e => handleInputChange('initialInvestmentAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'initial-investment-real-estate')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real Estate Mezzanine Loans Fields - Only show if Real Estate Group + Mezzanine Loans Type (same as lead form) */}
      {isRealEstateGroup && isMezzanineLoansType && (
        <div className="gba:space-y-6">
          {/* Row 1: Loan Amount and Loan Interest Rate */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Loan Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Loan Amount</Label>
              <Input
                name="loanAmount"
                type="number"
                value={formValues.loanAmount || ''}
                onChange={e => handleInputChange('loanAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'loan-amount')}
              />
            </div>

            {/* Loan Interest Rate */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Loan Interest Rate (%)</Label>
              <Input
                name="loanInterestRate"
                type="number"
                value={formValues.loanInterestRate || ''}
                onChange={e => handleInputChange('loanInterestRate', e.target.value)}
                placeholder="e.g. 5.5"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'loan-interest-rate')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real Estate Project Development Fields - Only show if Real Estate Group + Project Development Type (same as lead form) */}
      {isRealEstateGroup && isProjectDevelopmentType && (
        <div className="gba:space-y-6">
          {/* Row 1: Required Capital Amount and Forecasted Profit Amount */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Required Capital Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Required Capital Amount</Label>
              <Input
                name="requiredCapitalAmount"
                type="number"
                value={formValues.requiredCapitalAmount || ''}
                onChange={e => handleInputChange('requiredCapitalAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'required-capital-amount')}
              />
            </div>

            {/* Forecasted Profit Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Forecasted Profit Amount</Label>
              <Input
                name="forecastedProfitAmount"
                type="number"
                value={formValues.forecastedProfitAmount || ''}
                onChange={e => handleInputChange('forecastedProfitAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'forecasted-profit-project')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real Estate Others Fields - Only show if Real Estate Group + Others Type (same as lead form) */}
      {isRealEstateGroup && isOthersType && (
        <div className="gba:space-y-6">
          {/* Row 1: Initial Investment Amount and Forecasted Profit Amount */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Initial Investment Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Initial Investment Amount</Label>
              <Input
                name="initialInvestmentAmount"
                type="number"
                value={formValues.initialInvestmentAmount || ''}
                onChange={e => handleInputChange('initialInvestmentAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'initial-investment-others')}
              />
            </div>

            {/* Forecasted Profit Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Forecasted Profit Amount</Label>
              <Input
                name="forecastedProfitAmount"
                type="number"
                value={formValues.forecastedProfitAmount || ''}
                onChange={e => handleInputChange('forecastedProfitAmount', e.target.value)}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'forecasted-profit-others')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OpportunityFinancialFieldsSection
