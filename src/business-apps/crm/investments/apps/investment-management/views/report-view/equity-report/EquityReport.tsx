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
      currency: appliedCurrency,
      investmentType: selectedInvestmentType?.code || undefined,
      fundManagerName: appliedFundManager && appliedFundManager !== 'All' ? appliedFundManager : undefined
    };

    return filters;
  }, [startDateString, endDateString, appliedCurrency, appliedFundManager, selectedInvestmentType, activeSubTab]);



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
