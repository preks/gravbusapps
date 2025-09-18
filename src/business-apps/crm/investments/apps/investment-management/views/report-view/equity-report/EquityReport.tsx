import React, { useState, useMemo, useEffect } from 'react';
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
  TabsTrigger
} from '@newwork/nw-design-system';
import { DatePicker } from 'antd';
import { 
  FilterIcon
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { EquityAnalyticsFilters } from './types';
import dayjs from 'dayjs';
import { EquityAnalyticsTable } from './components/EquityAnalyticsTable';
import { useEquityInvestmentTypes } from './hooks/useEquityInvestmentTypes';

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
  
  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes;
  

  
  // Sub-tab management - start with first investment type
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  // Set initial tab when investment types are loaded
  useEffect(() => {
    if (effectiveInvestmentTypes.length > 0 && !activeSubTab) {
      setActiveSubTab(effectiveInvestmentTypes[0].code);
    }
  }, [effectiveInvestmentTypes, activeSubTab]);

  // FIXED: Filter states - Use same pattern as individual investment record reports
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
  const [selectedFundManager, setSelectedFundManager] = useState<string>('');

  // Available currencies and fund managers
  const availableCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];
  const availableFundManagers = ['All', 'Centauri Partners', 'Ionis Capital'];

  // FIXED: Calculate date strings using same logic as individual investment record reports
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
    
    // Default to show recent data if no filter is set
    return {
      startDateString: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
      endDateString: dayjs().format('YYYY-MM-DD')
    };
  }, [dateRange, timeFilter]);

  // FIXED: Filter change handlers matching record reports pattern
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
      currency: selectedCurrency,
      investmentType: selectedInvestmentType?.code || undefined,
      fundManagerName: selectedFundManager && selectedFundManager !== 'All' ? selectedFundManager : undefined
    };

    return filters;
  }, [startDateString, endDateString, selectedCurrency, selectedFundManager, selectedInvestmentType, activeSubTab]);



  // Show loading state while investment types are being fetched
  const showLoadingWarning = typesLoading && !typesError;
  const showErrorWarning = typesError && effectiveInvestmentTypes.length === 0;

  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* Warning messages */}
      {showLoadingWarning && (
        <Card className="gba:border-yellow-200 gba:bg-yellow-50">
          <CardContent className="gba:p-4">
            <div className="gba:text-sm gba:text-yellow-800">
              ⚠️ Loading investment types from catalog... Showing Overview only.
            </div>
          </CardContent>
        </Card>
      )}
      
      {showErrorWarning && (
        <Card className="gba:border-orange-200 gba:bg-orange-50">
          <CardContent className="gba:p-4">
            <div className="gba:text-sm gba:text-orange-800">
              ⚠️ Unable to load investment types from catalog. Showing Overview only. 
              <br />
              <span className="gba:text-xs">Error: {typesError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Configure time period and currency for the equity analytics view
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
              <DatePicker.RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
                placeholder={['Start Date', 'End Date']}
                allowClear={true}
              />
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Currency:</label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="gba:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Fund Manager:</label>
              <Select value={selectedFundManager} onValueChange={setSelectedFundManager}>
                <SelectTrigger className="gba:w-[200px]">
                  <SelectValue placeholder="All Fund Managers" />
                </SelectTrigger>
                <SelectContent>
                  {availableFundManagers.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Equity Analytics Tables with Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full" style={{ gridTemplateColumns: `repeat(${effectiveInvestmentTypes.length}, minmax(0, 1fr))` }}>
          {effectiveInvestmentTypes.map((type) => (
            <TabsTrigger 
              key={type.code} 
              value={type.code} 
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-tab`}
            >
              {type.value}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {effectiveInvestmentTypes.map((type) => (
          <TabsContent key={type.code} value={type.code} className="gba:mt-6">
            <EquityAnalyticsTable
              accessToken={accessToken}
              userInfo={userInfo}
              filters={equityAnalyticsFilters}
              investmentType={type.value}
              title={`${type.value} Analytics`}
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EquityReport;
