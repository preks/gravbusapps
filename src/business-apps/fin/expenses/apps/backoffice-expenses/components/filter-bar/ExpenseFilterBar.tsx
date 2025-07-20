import React, { useState } from 'react';
import { Input, Label, Button } from '@newwork/nw-design-system';
import { Select } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useFilterData } from '../../hooks/useFilterData';

const { Option } = Select;

export interface FilterOptions {
  department?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  additionalFilters?: Record<string, any>;
}

interface ExpenseFilterBarProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  onFiltersChange: (filters: FilterOptions) => void;
  'data-testid'?: string;
}

const ExpenseFilterBar: React.FC<ExpenseFilterBarProps> = ({
  accessToken,
  onFiltersChange,
  'data-testid': dataTestId = 'expense-filter-bar'
}) => {
  // Fetch real organizational units and currencies
  const { organizationalUnits, currencies, loading: filterDataLoading } = useFilterData({ accessToken });
  const [filters, setFilters] = useState<FilterOptions>({
    department: '',
    currency: '',
    dateFrom: '',
    dateTo: '',
    additionalFilters: {}
  });

  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Check if there are active filters
    const activeFilters = Object.values(newFilters).some(val => 
      val && val !== '' && (!Array.isArray(val) || val.length > 0)
    );
    setHasActiveFilters(activeFilters);
    
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      department: '',
      currency: '',
      dateFrom: '',
      dateTo: '',
      additionalFilters: {}
    };
    setFilters(clearedFilters);
    setHasActiveFilters(false);
    onFiltersChange(clearedFilters);
  };

  return (
    <div 
      className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:mb-6 gba:mx-6 gba:overflow-visible"
      data-testid={dataTestId}
    >
      <div className="gba:flex gba:flex-wrap gba:items-end gba:gap-4">
        {/* Department Filter */}
        <div className="gba:flex gba:flex-col gba:gap-2">
          <Label className="gba:text-xs gba:text-gray-600 gba:font-medium">
            Organizational Unit
          </Label>
          <Select
            value={filters.department}
            onChange={(value) => onFiltersChange({ ...filters, department: value })}
            disabled={filterDataLoading}
            placeholder={filterDataLoading ? "Loading..." : "Select Org Unit"}
            style={{ minWidth: 180 }}
            data-testid="department-filter-select"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          >
            {organizationalUnits.map((orgUnit) => (
              <Option key={orgUnit.id} value={orgUnit.id}>
                {orgUnit.displayName || orgUnit.name} {orgUnit.code && `[${orgUnit.code}]`}
              </Option>
            ))}
          </Select>
        </div>

        {/* Currency Filter */}
        <div className="gba:flex gba:flex-col gba:gap-2">
          <Label className="gba:text-xs gba:text-gray-600 gba:font-medium">
            Currency
          </Label>
          <Select
            value={filters.currency}
            onChange={(value) => onFiltersChange({ ...filters, currency: value })}
            disabled={filterDataLoading}
            placeholder={filterDataLoading ? "Loading..." : "Select Currency"}
            style={{ minWidth: 120 }}
            data-testid="currency-filter-select"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          >
            {currencies.map((currency) => (
              <Option key={currency.currencyRef} value={currency.currencyRef}>
                {currency.code}
              </Option>
            ))}
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-xs gba:text-gray-600 gba:font-medium">
            Date Range
          </Label>
          <div className="gba:flex gba:gap-2">
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="gba:w-32"
              data-testid="expense-filter-date-from"
            />
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="gba:w-32"
              data-testid="expense-filter-date-to"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            className="gba:text-gray-500 gba:hover:text-gray-700"
            data-testid="clear-filters-button"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-gray-100">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
            <span>Active filters:</span>
            <div className="gba:flex gba:gap-2">
              {filters.department && (
                <span className="gba:bg-blue-100 gba:text-blue-800 gba:px-2 gba:py-1 gba:rounded-md gba:text-xs">
                  Department: {filters.department}
                </span>
              )}
              {filters.currency && (
                <span className="gba:bg-green-100 gba:text-green-800 gba:px-2 gba:py-1 gba:rounded-md gba:text-xs">
                  Currency: {filters.currency}
                </span>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <span className="gba:bg-purple-100 gba:text-purple-800 gba:px-2 gba:py-1 gba:rounded-md gba:text-xs">
                  Date: {filters.dateFrom || 'Start'} - {filters.dateTo || 'End'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseFilterBar;
