import React, { useState, useEffect, useMemo } from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useLeadFormContext } from '../../context/LeadFormContext'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'LeadForm'

const InvestmentSelectionSection: React.FC = () => {
  // State for investment type search
  const [investmentTypeSearchTerm, setInvestmentTypeSearchTerm] = useState('')

  const {
    formValues,
    setFormValues,

    // Investment Groups
    investmentGroupsSearchable,
    searchInvestmentGroups,

    // Dependent Investment Types (filtered by selected investment group)
    dependentInvestmentTypes,
    dependentInvestmentTypesLoading,
    dependentInvestmentTypesError
  } = useLeadFormContext()

  // Filter investment types based on search term
  const filteredInvestmentTypes = useMemo(() => {
    if (!investmentTypeSearchTerm.trim()) {
      return dependentInvestmentTypes
    }

    const searchLower = investmentTypeSearchTerm.toLowerCase()
    return dependentInvestmentTypes.filter(
      type => type.name.toLowerCase().includes(searchLower) || type.label.toLowerCase().includes(searchLower)
    )
  }, [dependentInvestmentTypes, investmentTypeSearchTerm])

  // Handle investment type search
  const handleInvestmentTypeSearch = (searchTerm: string) => {
    setInvestmentTypeSearchTerm(searchTerm)
  }

  // Clear search term when investment group changes
  useEffect(() => {
    setInvestmentTypeSearchTerm('')
  }, [formValues.investmentGroup])

  return (
    <div className="gba:space-y-6">
      {/* Investment Name - Full width */}
      <div className="gba:space-y-2">
        <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Investment Name</Label>
        <Input
          type="text"
          value={formValues.investmentName || ''}
          onChange={e => setFormValues({ investmentName: e.target.value })}
          placeholder="Enter investment name..."
          data-testid={formatDataTestId(prefixDataTestId, 'investment-name-input')}
          className="gba:w-full"
        />
      </div>

      {/* Investment Group and Investment Type - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Investment Group */}
        <div className="gba:space-y-2">
          <SearchableSelect
            label="Investment Group"
            name="investmentGroup"
            value={formValues.investmentGroup}
            placeholder={
              formValues.investmentGroup && formValues.investmentGroup.trim()
                ? 'Search and select investment group...'
                : 'Please Select...'
            }
            options={investmentGroupsSearchable}
            loading={false}
            hasMore={false}
            onSearch={searchInvestmentGroups}
            onChange={value => setFormValues({ investmentGroup: value })}
            error={null}
            data-testid={formatDataTestId(prefixDataTestId, 'investment-group-select')}
            className="gba:w-full"
          />
        </div>

        {/* Investment Type */}
        <div className="gba:space-y-2">
          <SearchableSelect
            label="Investment Type"
            name="investmentType"
            value={formValues.investmentType}
            placeholder={
              !formValues.investmentGroup
                ? 'Please select Investment Group first...'
                : formValues.investmentType && formValues.investmentType.trim()
                  ? 'Search and select investment type...'
                  : 'Please Select...'
            }
            options={filteredInvestmentTypes}
            loading={dependentInvestmentTypesLoading}
            hasMore={false}
            onSearch={handleInvestmentTypeSearch}
            onChange={value => setFormValues({ investmentType: value })}
            error={dependentInvestmentTypesError}
            data-testid={formatDataTestId(prefixDataTestId, 'investment-type-select')}
            className="gba:w-full"
          />
        </div>
      </div>
    </div>
  )
}

export default InvestmentSelectionSection
