import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Alert
} from '@newwork/nw-design-system';
import { toast } from 'sonner';
import { DatePicker } from 'antd';
import { 
  FilterIcon
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { EquityAnalyticsFilters } from './types';
import dayjs from 'dayjs';
import { EquityAnalyticsTable } from './components/EquityAnalyticsTable';
import { useEquityInvestmentTypes } from './hooks/useEquityInvestmentTypes';
import { useGetInvestmentCatalogData } from '@/business-apps/crm/investments/forms/investment-form/queries/InvestmentCatalogQueries';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';

// Using individual DatePicker components for start and end dates

interface EquityReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const EquityReport: React.FC<EquityReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'equity-analytics'
}) => {
  // Fetch dynamic equity investment types from catalog
  const { investmentTypes, loading: typesLoading, error: typesError } = useEquityInvestmentTypes(accessToken);
  
  // Fetch catalog data for dynamic columns
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData({ accessToken, userInfo });
  const [catalogData, setCatalogData] = useState<any>(null);
  
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const data = await fetchInvestmentCatalogData();
        setCatalogData(data);
      } catch (error) {
        console.error('Error loading catalog data:', error);
      }
    };
    
    if (accessToken) {
      loadCatalogData();
    }
  }, [accessToken, fetchInvestmentCatalogData]);
  
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
      } else {
        // Browser doesn't support history manipulation
        throw new Error('Browser does not support history manipulation');
      }
    } catch (error) {
      console.error('Failed to update URL:', error);
      
      // Provide user feedback about the navigation issue
      toast.warning('Unable to update the page URL. The view will still function normally, but bookmarking may not work as expected.', {
        duration: 5000,
        description: 'Navigation error occurred'
      });
      
      // Continue with state updates - application should remain functional
      // even if URL manipulation fails
    }
  }, []);

  // Unified handler for activeSubTab changes
  const handleSetActiveSubTab = useCallback((code: string) => {
    setActiveSubTab(code);
    updateUrl(code);
  }, [updateUrl]);

  // Initialize tab from URL when investment types are loaded
  useEffect(() => {
    if (effectiveInvestmentTypes.length > 0 && !activeSubTab) {
      const initialType = getInitialInvestmentType();
      if (initialType) {
        setActiveSubTab(initialType);
        updateUrl(initialType);
      }
    }
  }, [effectiveInvestmentTypes, activeSubTab, getInitialInvestmentType, updateUrl]);

  // Restore tab from URL on browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType();
      if (currentType) setActiveSubTab(currentType);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialInvestmentType]);

  // Filter states - Only time period filtering
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Calculate date strings using same logic as individual investment record reports
  const { startDateString, endDateString } = useMemo(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      return {
        startDateString: dateRange[0].format('YYYY-MM-DD'),
        endDateString: dateRange[1].format('YYYY-MM-DD')
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
    
    // Default to show all data if no filter is set (same as individual reports)
    return {
      startDateString: undefined,
      endDateString: undefined
    };
  }, [dateRange, timeFilter]);

  // Filter change handlers matching record reports pattern
  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    if (value !== 'all') {
      setDateRange(null); // Clear date range when using time filter
    }
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateRange(dates);
    if (dates && dates[0] && dates[1]) {
      setTimeFilter('all'); // Clear time filter when using date range
    }
  };

  const handleClearFilters = () => {
    setTimeFilter('all');
    setDateRange(null);
  };

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    if (activeSubTab === 'overview') return undefined;
    return effectiveInvestmentTypes.find(type => type.code === activeSubTab);
  }, [activeSubTab, effectiveInvestmentTypes]);

  // Create filters for equity analytics (with investment type filtering)
  const equityAnalyticsFilters = useMemo((): EquityAnalyticsFilters => {
    const filters = {
      startDate: startDateString,
      endDate: endDateString,
      investmentType: selectedInvestmentType?.code || undefined
    };

    return filters;
  }, [startDateString, endDateString, selectedInvestmentType, activeSubTab]);



  // Show loading state while investment types are being fetched
  const showLoadingWarning = typesLoading && !typesError;
  const showErrorWarning = typesError && effectiveInvestmentTypes.length === 0;

  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* Warning messages */}
      {showLoadingWarning && (
        <Alert variant="default" data-testid={`${dataTestId}-types-loading-alert`}>
          {getTranslationFromI18nKeyAndLabel('equity.analytics.loadingTypes', 'Loading investment types from catalog... Showing Overview only.')}
        </Alert>
      )}
      
      {showErrorWarning && (
        <Alert variant="destructive" data-testid={`${dataTestId}-types-error-alert`}>
          {getTranslationFromI18nKeyAndLabel('equity.analytics.typesError', 'Unable to load investment types from catalog. Showing Overview only.')}
        </Alert>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('filters.title', 'Filters')}
          </CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel('equity.analytics.filters.description', 'Configure time period for the equity analytics view')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:mb-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('filters.timePeriod', 'Time Period:')}</label>
              <Select value={timeFilter} onValueChange={handleTimeFilterChange} data-testid={`${dataTestId}-time-period-select`}>
                <SelectTrigger className="gba:w-[150px]" data-testid={`${dataTestId}-time-period-trigger`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-testid={`${dataTestId}-time-period-content`}>
                  <SelectItem value="all" data-testid={`${dataTestId}-time-period-item-all`}>{getTranslationFromI18nKeyAndLabel('filters.timePeriod.allTime', 'All Time')}</SelectItem>
                  <SelectItem value="last7days" data-testid={`${dataTestId}-time-period-item-last7days`}>{getTranslationFromI18nKeyAndLabel('filters.timePeriod.last7Days', 'Last 7 Days')}</SelectItem>
                  <SelectItem value="last30days" data-testid={`${dataTestId}-time-period-item-last30days`}>{getTranslationFromI18nKeyAndLabel('filters.timePeriod.last30Days', 'Last 30 Days')}</SelectItem>
                  <SelectItem value="last3months" data-testid={`${dataTestId}-time-period-item-last3months`}>{getTranslationFromI18nKeyAndLabel('filters.timePeriod.last3Months', 'Last 3 Months')}</SelectItem>
                  <SelectItem value="last6months" data-testid={`${dataTestId}-time-period-item-last6months`}>{getTranslationFromI18nKeyAndLabel('filters.timePeriod.last6Months', 'Last 6 Months')}</SelectItem>
                  <SelectItem value="lastyear" data-testid={`${dataTestId}-time-period-item-lastyear`}>{getTranslationFromI18nKeyAndLabel('filters.timePeriod.lastYear', 'Last Year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('filters.dateRange', 'Date Range:')}</label>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
                placeholder={[
                  getTranslationFromI18nKeyAndLabel('filters.dateRange.startDate', 'Start Date'),
                  getTranslationFromI18nKeyAndLabel('filters.dateRange.endDate', 'End Date')
                ]}
                allowClear={true}
              />
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
        </CardContent>
      </Card>

      {/* Equity Analytics Tables with Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={handleSetActiveSubTab} className="gba:w-full" data-testid={`${dataTestId}-tabs`}>
        <TabsList className="gba:grid gba:w-full" style={{ gridTemplateColumns: `repeat(${effectiveInvestmentTypes.length}, minmax(0, 1fr))` }} data-testid={`${dataTestId}-tabs-list`}>
          {effectiveInvestmentTypes.map((type) => (
            <TabsTrigger 
              key={type.code} 
              value={type.code} 
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab-trigger`}
            >
              {type.value}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {effectiveInvestmentTypes.map((type) => (
          <TabsContent key={type.code} value={type.code} className="gba:mt-6" data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab-panel`}>
            <EquityAnalyticsTable
              accessToken={accessToken}
              userInfo={userInfo}
              filters={equityAnalyticsFilters}
              investmentType={type.code}
              investmentTypeValue={type.value}
              title={`${type.value} Analytics`}
              catalogData={catalogData}
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EquityReport;
