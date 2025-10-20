import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useLeadFormContext } from '../../context/LeadFormContext'
import { useInvestmentTypeDetection } from '../../hooks/useInvestmentTypeDetection'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'LeadForm'

const FinancialFieldsSection: React.FC = () => {
  const {
    formValues,
    setFormValues,

    // Investment Roles (for equity types)
    investmentRolesSearchable,
    searchInvestmentRoles,

    // Investment Stake Types (for equity groups)
    investmentStakeTypesSearchable,
    searchInvestmentStakeTypes,

    // Measurement Units (for real estate size)
    measurementUnitsSearchable,
    searchMeasurementUnits
  } = useLeadFormContext()

  const {
    isEquityGroup,
    isRealEstateGroup,
    isExistingPropertiesType,
    isMezzanineLoansType,
    isProjectDevelopmentType,
    isOthersType,
    shouldShowInvestmentRole
  } = useInvestmentTypeDetection()

  return (
    <div className="gba:space-y-6">
      {/* Investment Role and Building Year - Conditional */}
      {shouldShowInvestmentRole && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          {/* Investment Role */}
          <div className="gba:space-y-2">
            <SearchableSelect
              label="Investment Role"
              name="investmentRole"
              value={formValues.investmentRole}
              placeholder={
                formValues.investmentRole && formValues.investmentRole.trim()
                  ? 'Search and select investment role...'
                  : 'Please Select...'
              }
              options={investmentRolesSearchable}
              loading={false}
              hasMore={false}
              onSearch={searchInvestmentRoles}
              onChange={value => setFormValues({ investmentRole: value })}
              error={null}
              data-testid={formatDataTestId(prefixDataTestId, 'investment-role-select')}
              className="gba:w-full"
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
                onChange={e => setFormValues({ buildingYear: e.target.value })}
                placeholder="e.g. 2020"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'BuildingYearInput')}
              />
            </div>
          )}

          {/* Investment Stake Type - Only show if Investment Group is equity */}
          {isEquityGroup && (
            <div className="gba:space-y-2">
              <SearchableSelect
                label="Investment Stake Type"
                name="investmentStakeType"
                value={formValues.investmentStakeType}
                placeholder={
                  formValues.investmentStakeType && formValues.investmentStakeType.trim()
                    ? 'Search and select stake type...'
                    : 'Please Select...'
                }
                options={investmentStakeTypesSearchable}
                loading={false}
                hasMore={false}
                onSearch={searchInvestmentStakeTypes}
                onChange={value => setFormValues({ investmentStakeType: value })}
                error={null}
                data-testid={formatDataTestId(prefixDataTestId, 'investment-stake-type-select')}
                className="gba:w-full"
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
                onChange={e => setFormValues({ stakePercentage: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'StakePercentageInput')}
              />
            </div>

            {/* Entity Market Value */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Entity Market Value</Label>
              <Input
                name="marketValue"
                type="number"
                value={formValues.marketValue || ''}
                onChange={e => setFormValues({ marketValue: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'MarketValueInput')}
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
                onChange={e => setFormValues({ initialInvestmentAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'InitialInvestmentInput')}
              />
            </div>
            {/* Empty div to take up the other 50% */}
            <div></div>
          </div>
        </div>
      )}

      {/* Real Estate Fields - Only show if Real Estate Group + Existing Properties Type */}
      {isRealEstateGroup && isExistingPropertiesType && (
        <div className="gba:space-y-6">
          {/* Row 1: Size and Measurement Unit */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Size */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Size</Label>
              <Input
                name="size"
                type="number"
                value={formValues.size || ''}
                onChange={e => setFormValues({ size: e.target.value })}
                placeholder="e.g. 150.5"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'SizeInput')}
              />
            </div>

            {/* Measurement Unit */}
            <div className="gba:space-y-2">
              <SearchableSelect
                label="Measurement Unit"
                name="measurementUnit"
                value={formValues.measurementUnit}
                placeholder={
                  formValues.measurementUnit && formValues.measurementUnit.trim()
                    ? 'Search and select measurement unit...'
                    : 'Please Select...'
                }
                options={measurementUnitsSearchable}
                loading={false}
                hasMore={false}
                onSearch={searchMeasurementUnits}
                onChange={value => setFormValues({ measurementUnit: value })}
                error={null}
                data-testid={formatDataTestId(prefixDataTestId, 'measurement-unit-select')}
                className="gba:w-full"
              />
            </div>
          </div>

          {/* Row 2: Annual Net Cold Rent and Initial Investment Amount */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Annual Net Cold Rent */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Annual Net Cold Rent</Label>
              <Input
                name="annualNetColdRent"
                type="number"
                value={formValues.annualNetColdRent || ''}
                onChange={e => setFormValues({ annualNetColdRent: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'AnnualNetColdRentInput')}
              />
            </div>

            {/* Initial Investment Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Initial Investment Amount</Label>
              <Input
                name="initialInvestmentAmount"
                type="number"
                value={formValues.initialInvestmentAmount || ''}
                onChange={e => setFormValues({ initialInvestmentAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'InitialInvestmentAmountInput')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real Estate Mezzanine Loans Fields - Only show if Real Estate Group + Mezzanine Loans Type */}
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
                onChange={e => setFormValues({ loanAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'LoanAmountInput')}
              />
            </div>

            {/* Loan Interest Rate */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Loan Interest Rate (%)</Label>
              <Input
                name="loanInterestRate"
                type="number"
                value={formValues.loanInterestRate || ''}
                onChange={e => setFormValues({ loanInterestRate: e.target.value })}
                placeholder="e.g. 5.5"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'LoanInterestRateInput')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real Estate Project Development Fields - Only show if Real Estate Group + Project Development Type */}
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
                onChange={e => setFormValues({ requiredCapitalAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'RequiredCapitalAmountInput')}
              />
            </div>

            {/* Forecasted Profit Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Forecasted Profit Amount</Label>
              <Input
                name="forecastedProfitAmount"
                type="number"
                value={formValues.forecastedProfitAmount || ''}
                onChange={e => setFormValues({ forecastedProfitAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'ForecastedProfitAmountInput')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real Estate Others Fields - Only show if Real Estate Group + Others Type */}
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
                onChange={e => setFormValues({ initialInvestmentAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'InitialInvestmentAmountInput')}
              />
            </div>

            {/* Forecasted Profit Amount */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Forecasted Profit Amount</Label>
              <Input
                name="forecastedProfitAmount"
                type="number"
                value={formValues.forecastedProfitAmount || ''}
                onChange={e => setFormValues({ forecastedProfitAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'ForecastedProfitAmountInput')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialFieldsSection
