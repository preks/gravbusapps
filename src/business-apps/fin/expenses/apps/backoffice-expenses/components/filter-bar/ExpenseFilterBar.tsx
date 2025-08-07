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
import { X } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useFilterData } from '../../hooks/useFilterData';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

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

  const clearFilter = (filterKey: keyof FilterOptions) => {
    const newFilters = { ...filters };
    
    // Set appropriate default values for each filter type
    switch (filterKey) {
      case 'department':
        newFilters.department = 'all';
        break;
      case 'currency':
        newFilters.currency = ''; // Let dashboard handle default
        break;
      case 'period':
        newFilters.period = 'monthly';
        break;
      default:
        delete newFilters[filterKey];
    }
    
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


  return (
    <div 
      className="gba:flex gba:items-center gba:gap-4 gba:py-4 gba:px-6 gba:bg-gray-50 gba:border-b gba:border-gray-200"
      data-testid={dataTestId}
    >
      {/* Filters - Horizontal Layout */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
                 {/* Department Filter */}
         <div className="gba:relative gba:flex gba:items-center">
           <Select
             value={filters.department || ''}
             onValueChange={(value) => handleFilterChange('department', value)}
             disabled={filterDataLoading}
             data-testid="department-filter-select"
           >
             <SelectTrigger className="gba:w-[180px] gba:border-gray-300">
               <SelectValue placeholder={filterDataLoading ? "Loading..." : getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_request_filter.expense_department_title', "Filter by department")} />
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
           {filters.department && filters.department !== 'all' && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => clearFilter('department')}
               className="gba:ml-1 gba:p-1 gba:h-6 gba:w-6 gba:min-w-0"
               data-testid="clear-department-filter"
             >
               <X className="gba:h-3 gba:w-3" />
             </Button>
           )}
         </div>

                 {/* Currency Filter */}
         <div className="gba:relative gba:flex gba:items-center">
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
                       {filters.currency && filters.currency !== mostUsedCurrency && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => clearFilter('currency')}
               className="gba:ml-1 gba:p-1 gba:h-6 gba:w-6 gba:min-w-0"
               data-testid="clear-currency-filter"
             >
               <X className="gba:h-3 gba:w-3" />
             </Button>
           )}
         </div>

                 {/* Period Filter */}
         <div className="gba:relative gba:flex gba:items-center">
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
               <SelectItem value="monthly">{getTranslationFromI18nKeyAndLabel('lowcoder:cards.monthly', "Monthly")}</SelectItem>
               <SelectItem value="quarterly">{getTranslationFromI18nKeyAndLabel('lowcoder:cards.quarterly', "Quarterly")}</SelectItem>
               <SelectItem value="yearly">{getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.mileage_rule_list.mileage_expense_module.rule_period_yearly', "Yearly")}</SelectItem>
             </SelectContent>
           </Select>
           {filters.period && filters.period !== 'monthly' && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => clearFilter('period')}
               className="gba:ml-1 gba:p-1 gba:h-6 gba:w-6 gba:min-w-0"
               data-testid="clear-period-filter"
             >
               <X className="gba:h-3 gba:w-3" />
             </Button>
           )}
         </div>
      </div>

      
    </div>
  );
};

export default ExpenseFilterBar;
