import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Label } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useAccountFormContext } from '../context/AccountFormContext';
import OwnerSelector from './OwnerSelector';

const prefixDataTestId = 'AccountForm';

const AccountInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    error,
    accountTypes,
    accountStatuses,
    priorities,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
  } = useAccountFormContext();

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

        {/* Account Name */}
        <div>
          <Label htmlFor="accountName" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Account Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            id="accountName"
            name="accountName"
            value={formValues.accountName}
            onChange={(e) => setFormValues({ accountName: e.target.value })}
            placeholder="Please Enter..."
            data-testid={formatDataTestId(prefixDataTestId, 'AccountNameInput')}
          />
        </div>

        {/* Account Type and Status - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:w-full">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Account Type <span className="gba:text-red-500">*</span>
            </label>
            <Select
              value={formValues.accountType}
              onValueChange={(value) => setFormValues({ accountType: value })}
              data-testid={formatDataTestId(prefixDataTestId, 'AccountTypeSelect')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:w-full">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Status <span className="gba:text-red-500">*</span>
            </label>
            <Select
              value={formValues.accountStatus}
              onValueChange={(value) => setFormValues({ accountStatus: value })}
              data-testid={formatDataTestId(prefixDataTestId, 'AccountStatusSelect')}
            >
              <SelectTrigger className="gba:w-full">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent>
                {accountStatuses.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Priority
          </label>
          <Select
            value={formValues.priority}
            onValueChange={(value) => setFormValues({ priority: value })}
            data-testid={formatDataTestId(prefixDataTestId, 'PrioritySelect')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Please Select..." />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((option) => (
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

export default AccountInformationSection; 