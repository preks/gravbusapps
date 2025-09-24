import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system';
import { 
  FilterIcon,
  CalendarIcon
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { RealEstateAnalyticsTable } from './components/RealEstateAnalyticsTable';
import { useRealEstateInvestmentTypes } from './hooks/useRealEstateInvestmentTypes';
import { useGetInvestmentCatalogData } from '@/business-apps/crm/investments/forms/investment-form/queries/InvestmentCatalogQueries';
import type { RealEstateReportFilters } from './types';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Using individual DatePicker components for start and end dates

interface RealEstateReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const RealEstateReport: React.FC<RealEstateReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics'
}) => {
  // Fetch dynamic real estate investment types from catalog
  const { investmentTypes, loading: typesLoading, error: typesError, catalogData } = useRealEstateInvestmentTypes(accessToken);

  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes;
  
  // Sub-tab management - start with first investment type
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  // Get initial investment type from URL parameter
  const getInitialInvestmentType = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const investmentTypeFromUrl = urlParams.get('investmentType');
    
    if (effectiveInvestmentTypes.length === 0) {
      return '';
    }
    
    // Validate against available investment types
    if (investmentTypeFromUrl && effectiveInvestmentTypes.some(type => type.code === investmentTypeFromUrl)) {
      return investmentTypeFromUrl;
    }
    
    // Fall back to first available investment type
    return effectiveInvestmentTypes[0].code;
  }, [effectiveInvestmentTypes]);

  // Update URL when activeSubTab changes using platform navigation utilities
  const updateUrl = useCallback((investmentType: string) => {
    try {
      const currentUrl = new URL(window.location.href);
      const params: Record<string, string> = {};
      
      // Preserve existing query parameters
      currentUrl.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Update investmentType parameter
      params.investmentType = investmentType;
      
      // Use platform URL builder for safe navigation
      const newUrl = buildPlatformUrl(currentUrl.pathname, params);
      
      // Use safe history manipulation
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newUrl);
      }
    } catch (error) {
      console.warn('Failed to update URL:', error);
      // Fallback: just update the state without URL manipulation
    }
  }, []);

  // Unified handler for activeSubTab changes
  const handleSetActiveSubTab = useCallback((code: string) => {
    setActiveSubTab(code);
    updateUrl(code);
  }, [updateUrl]);

  // Initialize tab from URL when investment types are loaded
  useEffect(() => {
    if (!activeSubTab) {
      // Wait for loading to complete before making decisions
      if (typesLoading) {
        return;
      }
      
      if (effectiveInvestmentTypes.length === 0) {
        setActiveSubTab('overview');
        updateUrl('overview');
        return;
      }
      const initialType = getInitialInvestmentType();
      if (initialType) {
        setActiveSubTab(initialType);
        updateUrl(initialType);
      }
    }
  }, [effectiveInvestmentTypes, activeSubTab, getInitialInvestmentType, updateUrl, typesLoading]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType();
      if (currentType) {
        setActiveSubTab(currentType);
        // Do not call updateUrl when handling popstate to avoid creating additional history entries
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [getInitialInvestmentType]);

  // Filter states - Use same pattern as individual investment record reports
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{from?: Date, to?: Date} | undefined>(undefined);

  // Calculate date strings using same logic as individual investment record reports
  const { startDateString, endDateString } = useMemo(() => {
    if (dateRange && dateRange.from && dateRange.to) {
      return {
        startDateString: dayjs(dateRange.from).format('YYYY-MM-DD'),
        endDateString: dayjs(dateRange.to).format('YYYY-MM-DD')
      };
    } else if (timeFilter !== 'all') {
      const now = dayjs();
      let calculatedStartDate: dayjs.Dayjs | null = null;
      switch (timeFilter) {
        case 'last7days': calculatedStartDate = now.subtract(7, 'days'); break;
        case 'last30days': calculatedStartDate = now.subtract(30, 'days'); break;
        case 'last3months': calculatedStartDate = now.subtract(3, 'months'); break;
        case 'last6months': calculatedStartDate = now.subtract(6, 'months'); break;
        case 'lastyear': calculatedStartDate = now.subtract(1, 'year'); break;
        default: calculatedStartDate = null;
      }
      if (calculatedStartDate) {
        return {
          startDateString: calculatedStartDate.format('YYYY-MM-DD'),
          endDateString: now.format('YYYY-MM-DD')
        };
      }
    }
    
    // Default to show recent data if no filter is set
    return {
      startDateString: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
      endDateString: dayjs().format('YYYY-MM-DD')
    };
  }, [dateRange, timeFilter]);

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    return effectiveInvestmentTypes.find(type => type.code === activeSubTab);
  }, [activeSubTab, effectiveInvestmentTypes]);

  // Create filters for real estate analytics (with investment type filtering)
  const realEstateAnalyticsFilters = useMemo((): RealEstateReportFilters => {
    const filters = {
      startDate: startDateString,
      endDate: endDateString,
      investmentType: selectedInvestmentType?.code || undefined
    };

    return filters;
  }, [startDateString, endDateString, selectedInvestmentType]);

  // Filter change handlers matching record reports pattern
  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    if (value !== 'all') {
      setDateRange(undefined); // Clear date range when using time filter
    }
  };

  const handleDateRangeChange = (range: {from?: Date, to?: Date} | undefined) => {
    setDateRange(range);
    if (range && range.from && range.to) {
      setTimeFilter('all'); // Clear time filter when using date range
    }
  };

  const handleClearFilters = () => {
    setTimeFilter('all');
    setDateRange(undefined);
  };

  // Show loading state while investment types are being fetched
  const showLoadingWarning = typesLoading && !typesError;
  const showErrorWarning = typesError && effectiveInvestmentTypes.length === 0;

  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* Warning messages */}
      {showLoadingWarning && (
        <Alert variant="default" data-testid={`${dataTestId}-types-loading-alert`}>
          {getTranslationFromI18nKeyAndLabel('realEstate.analytics.loadingTypes', 'Loading investment types from catalog... Showing Overview only.')}
        </Alert>
      )}
      
      {showErrorWarning && (
        <Alert variant="destructive" data-testid={`${dataTestId}-types-error-alert`}>
          {getTranslationFromI18nKeyAndLabel('realEstate.analytics.typesError', 'Unable to load investment types from catalog. Showing Overview only.')}
        </Alert>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Configure time period and currency for the real estate analytics view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:mb-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Time Period:</label>
              <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
                <SelectTrigger className="gba:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last3months">Last 3 Months</SelectItem>
                  <SelectItem value="last6months">Last 6 Months</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Date Range:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="gba:w-[280px] gba:justify-start gba:text-left gba:font-normal"
                    data-testid={`${dataTestId}-date-range-trigger`}
                  >
                    <CalendarIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                    {dateRange && dateRange.from && dateRange.to
                      ? `${dayjs(dateRange.from).format('DD/MM/YYYY')} - ${dayjs(dateRange.to).format('DD/MM/YYYY')}`
                      : 'Select date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="gba:w-auto gba:p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    data-testid={`${dataTestId}-date-range-calendar`}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            
            <Button 
              onClick={handleClearFilters}
              variant="outline"
              className="gba:ml-auto"
              data-testid={`${dataTestId}-clear-filters`}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real Estate Analytics Tables with Dynamic Sub-tabs */}
      {/*
        Use a synthetic "overview" tab if no catalog types are available.
      */}
      <Tabs value={activeSubTab} onValueChange={handleSetActiveSubTab} className="gba:w-full" data-testid={`${dataTestId}-tabs`}>
        {(() => {
          const typesForTabs =
            effectiveInvestmentTypes.length > 0
              ? effectiveInvestmentTypes
              : [{ code: 'overview', value: getTranslationFromI18nKeyAndLabel('common.overview', 'Overview') }];
          return (
            <>
              <TabsList className="gba:grid gba:w-full" style={{ gridTemplateColumns: `repeat(${Math.max(typesForTabs.length, 1)}, minmax(0, 1fr))` }}>
                {typesForTabs.map((type) => (
                  <TabsTrigger 
                    key={type.code}
                    value={type.code}
                    data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab`}
                  >
                    {type.value}
                  </TabsTrigger>
                ))}
              </TabsList>
              {typesForTabs.map((type) => (
                <TabsContent key={type.code} value={type.code} className="gba:mt-6">
                  <RealEstateAnalyticsTable
                    accessToken={accessToken}
                    userInfo={userInfo}
                    filters={realEstateAnalyticsFilters}
                    investmentType={type.code === 'overview' ? '' : type.code}
                    investmentTypeValue={type.value}
                    title={`${type.value} Analytics`}
                    catalogData={catalogData}
                    data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
                  />
                </TabsContent>
              ))}
            </>
          );
        })()}
        </Tabs>
    </div>
  );
};

export default RealEstateReport;
