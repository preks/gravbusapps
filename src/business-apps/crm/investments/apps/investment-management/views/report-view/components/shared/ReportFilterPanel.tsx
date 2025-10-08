import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@newwork/nw-design-system';
import { DatePicker, Select } from 'antd';
import { FilterIcon, ArrowLeftRight } from 'lucide-react';
import { PiColumns, PiEye, PiEyeClosed } from 'react-icons/pi';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { UseReportFiltersReturn } from './hooks/useReportFilters';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export interface ReportFilterPanelProps {
  /**
   * Controls for the filters (passed from useReportFilters hook)
   */
  filters: UseReportFiltersReturn;
  
  /**
   * Access token for API calls
   */
  accessToken: string;
  
  /**
   * Available currency IDs from current filtered data
   * Only these currencies will be shown in the dropdown
   * If not provided, will query all currencies from reports
   */
  availableCurrencyIds?: string[];
  
  /**
   * Component appearance style
   * - 'card': Wrapped in Card component (Real Estate & Equity reports)
   * - 'simple': Plain div with border (Liquid Fund report)
   */
  variant?: 'card' | 'simple';
  
  /**
   * Title for the filter panel
   */
  title?: string;
  
  /**
   * Description text below the title
   */
  description?: string;
  
  /**
   * Data test ID prefix for testing
   */
  'data-testid'?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Shared filter panel component used across all investment report types.
 * Provides consistent date range filtering and table transpose functionality.
 */
export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  filters,
  accessToken,
  availableCurrencyIds,
  variant = 'card',
  title,
  description,
  'data-testid': dataTestId = 'report-filter-panel',
  className = ''
}) => {
  const {
    startDate,
    endDate,
    isTransposed,
    columnConfig,
    selectedCurrencies,
    handleStartDateChange,
    handleEndDateChange,
    handleTransposeToggle,
    handleColumnVisibilityChange,
    handleCurrencyChange,
    handleClearFilters
  } = filters;

  // Currency catalog integration
  const catalogClient = useCatalogManagerClient(accessToken);
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);

  // Fetch currency catalog data based on available currency IDs from filtered data
  const fetchCurrencies = useCallback(async () => {
    if (!accessToken || !availableCurrencyIds || availableCurrencyIds.length === 0) {
      setCurrencyOptions([]);
      return;
    }

    setCurrenciesLoading(true);
    try {
      // Fetch currency catalog entries
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Currency',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );

      if (response?.data && Array.isArray(response.data)) {
        // Filter catalog to only show currencies that exist in current filtered data
        const availableSet = new Set(availableCurrencyIds);
        const options = response.data
          .filter(entry => availableSet.has(entry.id))
          .map(entry => ({
            value: entry.id,
            label: `${entry.value} (${entry.code})`
          }));

        setCurrencyOptions(options);
      } else {
        setCurrencyOptions([]);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      setCurrencyOptions([]);
    } finally {
      setCurrenciesLoading(false);
    }
  }, [accessToken, availableCurrencyIds, catalogClient]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const visibleCount = columnConfig.filter(col => col.visible).length;
  const totalCount = columnConfig.length;

  // Default title if not provided
  const defaultTitle = getTranslationFromI18nKeyAndLabel('filters.title', 'Filters');

  const filterContent = (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:mb-4">
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <label className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('filters.startDate', 'Start Date:')}
          </label>
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
            placeholder={getTranslationFromI18nKeyAndLabel('common.select', 'Select')}
            format="DD/MM/YYYY"
            allowClear
            className="gba:w-[140px]"
            data-testid={`${dataTestId}-start-date-picker`}
          />
        </div>
        
        <div className="gba:flex gba:items-center gba:gap-2">
          <label className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('filters.endDate', 'End Date:')}
          </label>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            placeholder={getTranslationFromI18nKeyAndLabel('common.select', 'Select')}
            format="DD/MM/YYYY"
            allowClear
            className="gba:w-[140px]"
            data-testid={`${dataTestId}-end-date-picker`}
          />
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          <label className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('filters.currency', 'Currency:')}
          </label>
          <Select
            mode="multiple"
            value={selectedCurrencies}
            onChange={handleCurrencyChange}
            options={currencyOptions}
            placeholder={getTranslationFromI18nKeyAndLabel('filters.selectCurrencies', 'Select currencies')}
            loading={currenciesLoading}
            style={{ width: 200 }}
            allowClear
            data-testid={`${dataTestId}-currency-select`}
          />
        </div>
      </div>
      
      <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`${dataTestId}-column-visibility-trigger`}
            >
              <PiColumns className="gba:h-4 gba:w-4" />
              <span>{getTranslationFromI18nKeyAndLabel('filters.columns', 'Columns')}</span>
              <span className="gba:text-xs gba:text-gray-500">
                ({visibleCount}/{totalCount})
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="gba:w-56"
            data-testid={`${dataTestId}-column-visibility-content`}
          >
            <div className="gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:text-gray-700 gba:border-b">
              {getTranslationFromI18nKeyAndLabel('filters.toggleColumns', 'Toggle Columns')}
            </div>
            {columnConfig.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.visible}
                disabled={column.disabled}
                onCheckedChange={(checked) => handleColumnVisibilityChange(column.id, checked)}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${dataTestId}-column-item-${column.id}`}
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                  {column.visible ? (
                    <PiEye className="gba:h-4 gba:w-4 gba:text-green-600" />
                  ) : (
                    <PiEyeClosed className="gba:h-4 gba:w-4 gba:text-gray-400" />
                  )}
                  <span className={column.disabled ? 'gba:text-gray-400' : ''}>
                    {column.label}
                  </span>
                  {column.disabled && (
                    <span className="gba:text-xs gba:text-gray-400 gba:ml-auto">
                      {getTranslationFromI18nKeyAndLabel('filters.required', '(Required)')}
                    </span>
                  )}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
            <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-gray-500 gba:border-t">
              {getTranslationFromI18nKeyAndLabel('filters.columnsVisible', `${visibleCount} of ${totalCount} columns visible`)}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          onClick={handleTransposeToggle}
          variant={isTransposed ? "default" : "outline"}
          size="sm"
          data-testid={`${dataTestId}-transpose-toggle`}
        >
          <ArrowLeftRight className="gba:w-4 gba:h-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('filters.transpose', 'Transpose Table')}
        </Button>
        
        <Button 
          onClick={handleClearFilters}
          variant="outline"
          size="sm"
          data-testid={`${dataTestId}-clear-filters`}
        >
          {getTranslationFromI18nKeyAndLabel('filters.clearFilters', 'Clear Filters')}
        </Button>
      </div>
    </div>
  );

  if (variant === 'simple') {
    // Liquid Fund report style - plain div with border
    return (
      <div className={`gba:bg-white gba:rounded-lg gba:border gba:shadow-sm gba:mb-6 ${className}`} data-testid={dataTestId}>
        <div className="gba:p-4 gba:border-b">
          <div className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:w-4 gba:h-4" />
            <h3 className="gba:text-sm gba:font-medium">{title || defaultTitle}</h3>
          </div>
        </div>
        <div className="gba:p-4">
          {filterContent}
        </div>
      </div>
    );
  }

  // Default card style - Real Estate & Equity reports
  return (
    <Card className={className} data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <FilterIcon className="gba:h-5 gba:w-5" />
          {title || defaultTitle}
        </CardTitle>
        {description && (
          <CardDescription>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {filterContent}
      </CardContent>
    </Card>
  );
};
