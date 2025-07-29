import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Label } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useOpportunityFormContext } from '../context/OpportunityFormContext';
import OwnerSelector from '../../account-form/components/OwnerSelector';

const prefixDataTestId = 'OpportunityForm';

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
  } = useOpportunityFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <div className="gba:p-6 gba:space-y-6">
        {error && (
          <div className="gba:text-red-700 gba:text-sm gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg">
            {error}
          </div>
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
              searchEmployeePositions(searchTerm);
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
          />
        </div>

        {/* Opportunity Name */}
        <div>
          <Label htmlFor="opportunityName" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Opportunity Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            id="opportunityName"
            name="opportunityName"
            value={formValues.name}
            onChange={(e) => setFormValues({ name: e.target.value })}
            placeholder="Please Enter..."
            data-testid={formatDataTestId(prefixDataTestId, 'OpportunityNameInput')}
          />
        </div>

        {/* Opportunity Status */}
        <div>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Opportunity Status <span className="gba:text-red-500">*</span>
          </label>
          <Select
            value={formValues.opportunityStatus}
            onValueChange={(value) => setFormValues({ opportunityStatus: value })}
            data-testid={formatDataTestId(prefixDataTestId, 'OpportunityStatusSelect')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Please Select..." />
            </SelectTrigger>
            <SelectContent>
              {opportunityStatuses.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default OpportunityInformationSection; 