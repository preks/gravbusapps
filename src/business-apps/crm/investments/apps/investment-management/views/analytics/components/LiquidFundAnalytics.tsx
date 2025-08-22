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
import { AnalyticsFilters } from '../types';
import dayjs from 'dayjs';
import { AnalyticsTable } from './AnalyticsTable';

// Using individual DatePicker components for start and end dates

interface LiquidFundAnalyticsProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const LiquidFundAnalytics: React.FC<LiquidFundAnalyticsProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-fund-analytics'
}) => {
  // Sub-tab management
  const [activeSubTab, setActiveSubTab] = useState<string>('tab1');

  // Filter states - Updated to 2023 where actual data exists
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    dayjs('2023-01-01') // January 1st, 2023 (where actual data exists)
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs('2023-12-31') // December 31st, 2023
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
  
  // Applied filters state (only updates when Apply button is clicked)
  const [appliedStartDate, setAppliedStartDate] = useState<dayjs.Dayjs | null>(
    dayjs('2023-01-01')
  );
  const [appliedEndDate, setAppliedEndDate] = useState<dayjs.Dayjs | null>(
    dayjs('2023-12-31')
  );
  const [appliedCurrency, setAppliedCurrency] = useState<string>('EUR');

  // Available currencies
  const availableCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];

  // Create stable date strings from APPLIED filters (not current filter state)
  const startDateString = useMemo(() => 
    appliedStartDate?.format('YYYY-MM-DD') || '2023-01-01',
    [appliedStartDate?.valueOf()]
  );
  const endDateString = useMemo(() => 
    appliedEndDate?.format('YYYY-MM-DD') || '2023-12-31',
    [appliedEndDate?.valueOf()]
  );

  // Apply filters handler
  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedCurrency(selectedCurrency);
  };

  // Check if filters have changed (to show/hide Apply button)
  const filtersChanged = useMemo(() => {
    const currentStart = startDate?.format('YYYY-MM-DD');
    const currentEnd = endDate?.format('YYYY-MM-DD');
    const appliedStart = appliedStartDate?.format('YYYY-MM-DD');
    const appliedEnd = appliedEndDate?.format('YYYY-MM-DD');
    
    return currentStart !== appliedStart || 
           currentEnd !== appliedEnd || 
           selectedCurrency !== appliedCurrency;
  }, [startDate, endDate, appliedStartDate, appliedEndDate, selectedCurrency, appliedCurrency]);

  // Create filters for Tab 1 (Bank Deposits), Tab 2 (Fixed-Term Deposits), and Tab 3 (Multiple Types)
  const bankDepositFilters = useMemo((): AnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: appliedCurrency,
    investmentType: 'Bank Deposit'
  }), [startDateString, endDateString, appliedCurrency]);

  const fixedTermDepositFilters = useMemo((): AnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: appliedCurrency,
    investmentType: 'Fixed-Term Deposit'
  }), [startDateString, endDateString, appliedCurrency]);

  const multipleTypesFilters = useMemo((): AnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: appliedCurrency,
    investmentType: 'Money Market Funds,Pension Fund,Equity,Bond' // Multiple types separated by comma
  }), [startDateString, endDateString, appliedCurrency]);



  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date);
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };



  return (
    <div className="gba:space-y-6 gba:p-6" data-testid={dataTestId}>
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Configure time period and currency for the analytics view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:mb-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Start Date:</label>
              <DatePicker
                value={startDate}
                onChange={handleStartDateChange}
                format="DD/MM/YYYY"
                placeholder="Start Date"
                allowClear={false}
              />
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">End Date:</label>
              <DatePicker
                value={endDate}
                onChange={handleEndDateChange}
                format="DD/MM/YYYY"
                placeholder="End Date"
                allowClear={false}
              />
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Currency:</label>
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
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
          </div>
          
          {/* Apply Filter Button - main button style */}
          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button 
              onClick={handleApplyFilters}
              className="gba:bg-black hover:gba:bg-gray-800 gba:text-white gba:border-black"
              data-testid={`${dataTestId}-apply-filters`}
            >
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tables with Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
          <TabsTrigger value="tab1" data-testid={`${dataTestId}-tab1`}>
            Tab 1
          </TabsTrigger>
          <TabsTrigger value="tab2" data-testid={`${dataTestId}-tab2`}>
            Tab 2
          </TabsTrigger>
          <TabsTrigger value="tab3" data-testid={`${dataTestId}-tab3`}>
            Tab 3
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

export default LiquidFundAnalytics;