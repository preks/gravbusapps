import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@newwork/nw-design-system';
import { DatePicker } from 'antd';
import { FilterIcon } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useReportFilters, UseReportFiltersReturn } from './hooks/useReportFilters';

export interface ReportFilterPanelProps {
  /**
   * Controls for the filters (passed from useReportFilters hook)
   */
  filters: UseReportFiltersReturn;
  
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
 * Provides consistent time period and date range filtering functionality.
 */
export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  filters,
  variant = 'card',
  title,
  description,
  'data-testid': dataTestId = 'report-filter-panel',
  className = ''
}) => {
  const {
    timeFilter,
    startDate,
    endDate,
    handleTimeFilterChange,
    handleStartDateChange,
    handleEndDateChange,
    handleClearFilters
  } = filters;

  // Default titles and descriptions if not provided
  const defaultTitle = getTranslationFromI18nKeyAndLabel('filters.title', 'Filters');
  const defaultDescription = getTranslationFromI18nKeyAndLabel('filters.description', 'Configure time period for the analytics view');

  const filterContent = (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:mb-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <label className="gba:text-sm gba:font-medium">
          {getTranslationFromI18nKeyAndLabel('filters.timePeriod', 'Time Period:')}
        </label>
        <Select 
          value={timeFilter} 
          onValueChange={handleTimeFilterChange}
          data-testid={`${dataTestId}-time-period-select`}
        >
          <SelectTrigger 
            style={{ width: variant === 'card' ? 'var(--nw-spacing-40)' : 'var(--nw-spacing-48)' }}
            data-testid={`${dataTestId}-time-period-trigger`}
          >
            <SelectValue 
              placeholder={getTranslationFromI18nKeyAndLabel('filters.selectPeriod', 'Select period')} 
            />
          </SelectTrigger>
          <SelectContent data-testid={`${dataTestId}-time-period-content`}>
            <SelectItem value="all" data-testid={`${dataTestId}-time-period-item-all`}>
              {getTranslationFromI18nKeyAndLabel('filters.timePeriod.allTime', 'All Time')}
            </SelectItem>
            <SelectItem value="last7days" data-testid={`${dataTestId}-time-period-item-last7days`}>
              {getTranslationFromI18nKeyAndLabel('filters.timePeriod.last7Days', 'Last 7 Days')}
            </SelectItem>
            <SelectItem value="last30days" data-testid={`${dataTestId}-time-period-item-last30days`}>
              {getTranslationFromI18nKeyAndLabel('filters.timePeriod.last30Days', 'Last 30 Days')}
            </SelectItem>
            <SelectItem value="last3months" data-testid={`${dataTestId}-time-period-item-last3months`}>
              {getTranslationFromI18nKeyAndLabel('filters.timePeriod.last3Months', 'Last 3 Months')}
            </SelectItem>
            <SelectItem value="last6months" data-testid={`${dataTestId}-time-period-item-last6months`}>
              {getTranslationFromI18nKeyAndLabel('filters.timePeriod.last6Months', 'Last 6 Months')}
            </SelectItem>
            <SelectItem value="lastyear" data-testid={`${dataTestId}-time-period-item-lastyear`}>
              {getTranslationFromI18nKeyAndLabel('filters.timePeriod.lastYear', 'Last Year')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
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
      </div>
      
      <Button 
        onClick={handleClearFilters}
        variant="outline"
        className="gba:ml-auto"
        data-testid={`${dataTestId}-clear-filters`}
      >
        {getTranslationFromI18nKeyAndLabel('filters.clearFilters', 'Clear Filters')}
      </Button>
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
