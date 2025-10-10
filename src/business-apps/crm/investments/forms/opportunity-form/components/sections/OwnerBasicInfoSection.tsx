import React from 'react'
import { Input, Label } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { useOpportunityFormFieldClearing } from '../../hooks/useOpportunityFormFieldClearing'
import OwnerSelector from '../OwnerSelector'
import AccountSelectionSection from './AccountSelectionSection'

const prefixDataTestId = 'InvestmentOpportunityForm'

const OwnerBasicInfoSection: React.FC = () => {
  const {
    formValues,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions
  } = useOpportunityFormContext()

  const { handleInputChange } = useOpportunityFormFieldClearing()

  return (
    <div className="gba:space-y-6">
      {/* Owner Selection */}
      <div className="gba:space-y-2">
        <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
          Owner <span className="gba:text-red-500">*</span>
        </Label>
        <OwnerSelector
          value={formValues.owner}
          onChange={value => handleInputChange('owner', value)}
          employees={employeePositions}
          loading={employeePositionsLoading}
          error={employeePositionsError}
          hasMore={employeePositionsHasMore}
          onSearch={searchEmployeePositions}
          onLoadMore={loadMoreEmployeePositions}
          data-testid={formatDataTestId(prefixDataTestId, 'owner')}
        />
      </div>

      {/* Opportunity Name */}
      <div className="gba:space-y-2">
        <Label htmlFor="opportunityName" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
          {getTranslationFromI18nKeyAndLabel('opportunity.form.opportunityName', 'Opportunity Name')}{' '}
          <span className="gba:text-red-500">*</span>
        </Label>
        <Input
          id="opportunityName"
          value={formValues.name || ''}
          onChange={e => handleInputChange('name', e.target.value)}
          placeholder={getTranslationFromI18nKeyAndLabel(
            'opportunity.form.opportunityNamePlaceholder',
            'Please enter opportunity name...'
          )}
          className="gba:border-gray-300 gba:bg-white"
          data-testid={formatDataTestId(prefixDataTestId, 'opportunity-name')}
        />
      </div>

      {/* Account Selection */}
      <AccountSelectionSection />
    </div>
  )
}

export default OwnerBasicInfoSection
