import React, { useState } from 'react';
import { 
  Input, 
  Label, 
  Button, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useFilterData } from '../../hooks/useFilterData';

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
    department: 'all',
    currency: 'all',
    dateFrom: '',
    dateTo: '',
    additionalFilters: {}
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Convert "all" values to empty strings for the parent component
    const filtersForParent = {
      ...newFilters,
      department: newFilters.department === 'all' ? '' : newFilters.department,
      currency: newFilters.currency === 'all' ? '' : newFilters.currency,
    };
    onFiltersChange(filtersForParent);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      department: 'all',
      currency: 'all',
      dateFrom: '',
      dateTo: '',
      additionalFilters: {}
    };
    setFilters(clearedFilters);
    
    // Send empty strings to parent for cleared state
    const clearedFiltersForParent = {
      department: '',
      currency: '',
      dateFrom: '',
      dateTo: '',
      additionalFilters: {}
    };
    onFiltersChange(clearedFiltersForParent);
  };

  const hasActiveFilters = (filters.department && filters.department !== 'all') || 
    (filters.currency && filters.currency !== 'all') || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div 
      className="gba:flex gba:items-center gba:gap-4 gba:py-4 gba:px-6 gba:bg-gray-50 gba:border-b gba:border-gray-200"
      data-testid={dataTestId}
    >
      {/* Filters - Horizontal Layout */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
        {/* Department Filter */}
        <Select
          value={filters.department || ''}
          onValueChange={(value) => handleFilterChange('department', value)}
          disabled={filterDataLoading}
          data-testid="department-filter-select"
        >
          <SelectTrigger className="gba:w-[180px] gba:border-gray-300">
            <SelectValue placeholder={filterDataLoading ? "Loading..." : "Filter by department"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {organizationalUnits.map((orgUnit) => (
              <SelectItem key={orgUnit.id} value={orgUnit.id}>
                {orgUnit.displayName || orgUnit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Currency Filter */}
        <Select
          value={filters.currency || ''}
          onValueChange={(value) => handleFilterChange('currency', value)}
          disabled={filterDataLoading}
          data-testid="currency-filter-select"
        >
          <SelectTrigger className="gba:w-[140px] gba:border-gray-300">
            <SelectValue placeholder={filterDataLoading ? "Loading..." : "Filter by currency"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            {currencies.map((currency) => (
              <SelectItem key={currency.currencyRef} value={currency.currencyRef}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="gba:w-36 gba:border-gray-300"
            data-testid="expense-filter-date-from"
            placeholder="From date"
          />
          <span className="gba:text-gray-400">to</span>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="gba:w-36 gba:border-gray-300"
            data-testid="expense-filter-date-to"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          onClick={clearAllFilters}
          className="gba:text-gray-500 gba:hover:text-gray-700 gba:px-3 gba:py-2"
          data-testid="clear-filters-button"
        >
          Clear
        </Button>
      )}
    </div>
  );
};

export default ExpenseFilterBar;
