import React, { useState, useEffect } from 'react';
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
  period?: 'monthly' | 'quarterly' | 'yearly';
  additionalFilters?: Record<string, any>;
}

interface ExpenseFilterBarProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  onFiltersChange: (filters: FilterOptions) => void;
  currentFilters?: FilterOptions; // Add controlled filters prop
  'data-testid'?: string;
}

const ExpenseFilterBar: React.FC<ExpenseFilterBarProps> = ({
  accessToken,
  onFiltersChange,
  currentFilters,
  'data-testid': dataTestId = 'expense-filter-bar'
}) => {
  // Fetch real organizational units and currencies
  const { organizationalUnits, currencies, mostUsedCurrency, loading: filterDataLoading, error } = useFilterData({ accessToken });
  

  
  // Use controlled filters from parent, or fallback to internal state
  const [internalFilters, setInternalFilters] = useState<FilterOptions>({
    department: 'all',
    currency: '', // Will be set by user selection only
    period: 'monthly' as const, // Default to monthly
    additionalFilters: {}
  });
  
  // Use parent's filters if provided, otherwise use internal state
  const filters = currentFilters || internalFilters;

  // ⚡ REMOVED: Automatic currency setting to prevent override of user selections
  // The dashboard will handle all currency initialization

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value } as FilterOptions;
    
    // Update internal state if not controlled by parent
    if (!currentFilters) {
      setInternalFilters(newFilters);
    }
    
    // Convert "all" values to empty strings for the parent component
    const filtersForParent = {
      ...newFilters,
      department: newFilters.department === 'all' ? '' : newFilters.department,
      currency: newFilters.currency === 'all' ? '' : newFilters.currency,
    };
    onFiltersChange(filtersForParent);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      department: 'all',
      currency: '', // Reset to empty, let dashboard handle default
      period: 'monthly' as const, // Reset to default
      additionalFilters: {}
    };
    
    // Update internal state if not controlled by parent
    if (!currentFilters) {
      setInternalFilters(clearedFilters);
    }
    
    // Send cleared state to parent
    const clearedFiltersForParent = {
      department: '',
      currency: '', // Let dashboard handle default
      period: 'monthly' as const,
      additionalFilters: {}
    };
    onFiltersChange(clearedFiltersForParent);
  };

  const hasActiveFilters = (filters.department && filters.department !== 'all') || 
    (filters.currency && filters.currency !== mostUsedCurrency) || 
    filters.period !== 'monthly';

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
            {currencies.map((currency) => (
              <SelectItem key={currency.currencyRef} value={currency.currencyRef}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period Filter */}
        <Select
          value={filters.period || ''}
          onValueChange={(value) => handleFilterChange('period', value)}
          disabled={filterDataLoading}
          data-testid="period-filter-select"
        >
          <SelectTrigger className="gba:w-[140px] gba:border-gray-300">
            <SelectValue placeholder={filterDataLoading ? "Loading..." : "Filter by period"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
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
