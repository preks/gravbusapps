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
import { EquityAnalyticsFilters } from './types';
import dayjs from 'dayjs';
import { EquityAnalyticsTable } from './components/EquityAnalyticsTable';

// Using individual DatePicker components for start and end dates

interface EquityReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const EquityReport: React.FC<EquityReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'equity-analytics'
}) => {
  // Sub-tab management
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');

  // Filter states - Updated to 2024 where actual equity data exists
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    dayjs('2024-01-01') // January 1st, 2024 (where actual equity data exists)
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs('2024-12-31') // December 31st, 2024
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
  const [selectedFundManager, setSelectedFundManager] = useState<string>('');
  
  // Applied filters state (only updates when Apply button is clicked)
  const [appliedStartDate, setAppliedStartDate] = useState<dayjs.Dayjs | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<dayjs.Dayjs | null>(null);
  const [appliedCurrency, setAppliedCurrency] = useState<string>('EUR');
  const [appliedFundManager, setAppliedFundManager] = useState<string>('');

  // Available currencies and fund managers
  const availableCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];
  const availableFundManagers = ['All', 'Centauri Partners', 'Ionis Capital'];

  // Create stable date strings from APPLIED filters (not current filter state)
  const startDateString = useMemo(() => 
    appliedStartDate?.format('YYYY-MM-DD') || '2024-01-01',
    [appliedStartDate?.valueOf()]
  );
  const endDateString = useMemo(() => 
    appliedEndDate?.format('YYYY-MM-DD') || '2024-12-31',
    [appliedEndDate?.valueOf()]
  );

  // Create filters for equity analytics (with investment type filtering)
  const equityAnalyticsFilters = useMemo((): EquityAnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: appliedCurrency,
    investmentType: activeSubTab === 'private-equity' ? 'Private Equity' : 
                   activeSubTab === 'venture-capital' ? 'Venture Capital' : 
                   activeSubTab === 'public-equity' ? 'Public Equity' : undefined,
    fundManagerName: appliedFundManager && appliedFundManager !== 'All' ? appliedFundManager : undefined
  }), [startDateString, endDateString, appliedCurrency, appliedFundManager, activeSubTab]);

  // Create overview filters (without investment type filtering)
  const overviewFilters = useMemo((): EquityAnalyticsFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: appliedCurrency,
    fundManagerName: appliedFundManager && appliedFundManager !== 'All' ? appliedFundManager : undefined
  }), [startDateString, endDateString, appliedCurrency, appliedFundManager]);

  // Apply filters handler
  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedCurrency(selectedCurrency);
    setAppliedFundManager(selectedFundManager);
  };



  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date);
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  const handleFundManagerChange = (fundManager: string) => {
    setSelectedFundManager(fundManager);
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
            Configure time period and currency for the equity analytics view
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
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Fund Manager:</label>
              <Select value={selectedFundManager} onValueChange={handleFundManagerChange}>
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

      {/* Equity Analytics Tables with Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
          <TabsTrigger value="overview" data-testid={`${dataTestId}-overview-tab`}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="private-equity" data-testid={`${dataTestId}-private-equity-tab`}>
            Private Equity
          </TabsTrigger>
          <TabsTrigger value="venture-capital" data-testid={`${dataTestId}-venture-capital-tab`}>
            Venture Capital
          </TabsTrigger>
          <TabsTrigger value="public-equity" data-testid={`${dataTestId}-public-equity-tab`}>
            Public Equity
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="gba:mt-6">
          <EquityAnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={overviewFilters}
            investmentType="All Equity Investments"
            title="Equity Analytics Overview"
            data-testid={`${dataTestId}-overview-table`}
          />
        </TabsContent>
        
        <TabsContent value="private-equity" className="gba:mt-6">
          <EquityAnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={equityAnalyticsFilters}
            investmentType="Private Equity"
            title="Private Equity Analytics"
            data-testid={`${dataTestId}-private-equity-table`}
          />
        </TabsContent>
        
        <TabsContent value="venture-capital" className="gba:mt-6">
          <EquityAnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={equityAnalyticsFilters}
            investmentType="Venture Capital"
            title="Venture Capital Analytics"
            data-testid={`${dataTestId}-venture-capital-table`}
          />
        </TabsContent>
        
        <TabsContent value="public-equity" className="gba:mt-6">
          <EquityAnalyticsTable
            accessToken={accessToken}
            userInfo={userInfo}
            filters={equityAnalyticsFilters}
            investmentType="Public Equity"
            title="Public Equity Analytics"
            data-testid={`${dataTestId}-public-equity-table`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EquityReport;
