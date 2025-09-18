import React, { useState, useMemo } from 'react';
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
import { AnalyticsFilters } from './types';
import dayjs from 'dayjs';
import { AnalyticsTable } from './components/LiquidFundReportTable';

// Using individual DatePicker components for start and end dates

interface LiquidFundReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const LiquidFundReport: React.FC<LiquidFundReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-fund-analytics'
}) => {
  // Sub-tab management - Start with Bank Deposits since Overview is removed
  const [activeSubTab, setActiveSubTab] = useState<string>('tab1');

  // FIXED: Filter states - Use same pattern as individual investment record reports
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');

  // Available currencies
  const availableCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];

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

  // Create filters for specific investment types (Overview removed)
  const bankDepositFilters = useMemo((): AnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: selectedCurrency,
    investmentType: 'Bank Deposit'
  }), [startDateString, endDateString, selectedCurrency]);

  const fixedTermDepositFilters = useMemo((): AnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: selectedCurrency,
    investmentType: 'Fixed-Term Deposit'
  }), [startDateString, endDateString, selectedCurrency]);

  const multipleTypesFilters = useMemo((): AnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: selectedCurrency,
    investmentType: 'Money Market Funds,Pension Fund,Equity,Bond' // Multiple types separated by comma
  }), [startDateString, endDateString, selectedCurrency]);

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




  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* FIXED: Filters Section - Using same pattern as record reports */}
      <div className="gba:bg-white gba:rounded-lg gba:border gba:shadow-sm gba:mb-6">
        <div className="gba:p-4 gba:border-b">
          <div className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:w-4 gba:h-4" />
            <h3 className="gba:text-sm gba:font-medium">Filters</h3>
          </div>
        </div>
        <div className="gba:p-4">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Time Period:</label>
              <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
                <SelectTrigger className="gba:w-[180px]">
                  <SelectValue placeholder="Select period" />
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
                placeholder={["Start Date", "End Date"]}
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
            
            <Button 
              onClick={handleClearFilters}
              variant="outline"
              className="gba:ml-auto"
              data-testid={`${dataTestId}-clear-filters`}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Tables with Sub-tabs - Overview removed */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
          <TabsTrigger value="tab1" data-testid={`${dataTestId}-tab1`}>
            Bank Deposits
          </TabsTrigger>
          <TabsTrigger value="tab2" data-testid={`${dataTestId}-tab2`}>
            Fixed-Term Deposits
          </TabsTrigger>
          <TabsTrigger value="tab3" data-testid={`${dataTestId}-tab3`}>
            Multiple Types
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tab1" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={bankDepositFilters}
            investmentType="Bank Deposits"
            title="Liquid Fund Analytics - Bank Deposits"
            data-testid={`${dataTestId}-bank-deposits-table`}
          />
        </TabsContent>
        
        <TabsContent value="tab2" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={fixedTermDepositFilters}
            investmentType="Fixed-Term Deposits"
            title="Liquid Fund Analytics - Fixed-Term Deposits"
            data-testid={`${dataTestId}-fixed-term-deposits-table`}
          />
        </TabsContent>
        
        <TabsContent value="tab3" className="gba:mt-6">
          <AnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={multipleTypesFilters}
            investmentType="Multiple Investment Types"
            title="Liquid Fund Analytics - Money Market, Pension, Equity & Bond"
            data-testid={`${dataTestId}-multiple-types-table`}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default LiquidFundReport;