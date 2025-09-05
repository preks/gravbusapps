import React, { useState, useMemo, useCallback } from 'react';
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
import dayjs from 'dayjs';
import { ExistingPropertiesTable } from './components/ExistingPropertiesTable';
import { ProjectDevelopmentTable } from './components/ProjectDevelopmentTable';
import { MezzanineLoansTable } from './components/MezzanineLoansTable';
import { OthersTable } from './components/OthersTable';
import type { RealEstateReportFilters } from './types';
// Removed separate catalog hook - using central data source instead
// import { useInvestmentTypeCatalog } from './hooks/useInvestmentTypeCatalog';

// Using individual DatePicker components for start and end dates

interface RealEstateReportProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const RealEstateReport: React.FC<RealEstateReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics'
}) => {
  // TODO: Replace with central data source approach
  // For now, use hardcoded real estate types until we implement the centralized approach
  const realEstateTypes = [
    { id: 'InvestmentType:v1:EXISTING_PROPERTY', value: 'Existing Properties', additionalValue1: '1' },
    { id: 'InvestmentType:v1:PROJECT_DEVELOPMENT', value: 'Project Development', additionalValue1: '2' },
    { id: 'InvestmentType:v1:MEZZANINE_LOANS', value: 'Mezzanine Loans', additionalValue1: '3' },
    { id: 'InvestmentType:v1:OTHER_REAL_ESTATE', value: 'Others', additionalValue1: '4' }
  ];
  const typesLoading = false;
  const typesError = null;
  
  // Sub-tab management
  const [activeSubTab, setActiveSubTab] = useState<string>('existing-properties');

  // Filter states - Updated to 2024 where actual data exists
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    dayjs('2024-01-01') // January 1st, 2024 (where actual data exists)
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs('2024-12-31') // December 31st, 2024
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
  
  // Applied filters state (only updates when Apply button is clicked)
  // LOAD DATA IMMEDIATELY - Set default applied filters to show data on initial load
  const [appliedStartDate, setAppliedStartDate] = useState<dayjs.Dayjs | null>(
    dayjs('2024-01-01') // AUTO-APPLY: Show data immediately
  );
  const [appliedEndDate, setAppliedEndDate] = useState<dayjs.Dayjs | null>(
    dayjs('2024-12-31') // AUTO-APPLY: Show data immediately  
  );
  const [appliedCurrency, setAppliedCurrency] = useState<string>('EUR');

  // Available currencies
  const availableCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];

  // Create stable date strings from APPLIED filters
  // Return undefined if no applied filters - this prevents data loading until user applies filters
  const startDateString = useMemo(() => 
    appliedStartDate?.format('YYYY-MM-DD'),
    [appliedStartDate?.valueOf()]
  );
  const endDateString = useMemo(() => 
    appliedEndDate?.format('YYYY-MM-DD'),
    [appliedEndDate?.valueOf()]
  );

  // Create dynamic filters for each investment type
  const createInvestmentTypeFilters = useCallback((investmentTypeValue: string): RealEstateReportFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: appliedCurrency,
    investmentType: investmentTypeValue
  }), [startDateString, endDateString, appliedCurrency]);

  // Apply filters handler
  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedCurrency(selectedCurrency);
  };

  // Check if filters have changed (to show/hide Apply button)
  // const filtersChanged = useMemo(() => {
  //   const currentStart = startDate?.format('YYYY-MM-DD');
  //   const currentEnd = endDate?.format('YYYY-MM-DD');
  //   const appliedStart = appliedStartDate?.format('YYYY-MM-DD');
  //   const appliedEnd = appliedEndDate?.format('YYYY-MM-DD');
  //   
  //   return currentStart !== appliedStart || 
  //          currentEnd !== appliedEnd || 
  //          selectedCurrency !== appliedCurrency;
  // }, [startDate, endDate, appliedStartDate, appliedEndDate, selectedCurrency, appliedCurrency]);

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
            Configure time period and currency for the real estate analytics view
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

      {/* Real Estate Analytics Tables with Dynamic Sub-tabs */}
      {typesLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
          <div className="gba:text-gray-500">Loading investment types...</div>
        </div>
      ) : typesError ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
          <div className="gba:text-red-500">Error loading investment types: {typesError}</div>
        </div>
      ) : (
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
          <TabsList className="gba:grid gba:w-full" style={{ gridTemplateColumns: `repeat(${realEstateTypes.length}, minmax(0, 1fr))` }}>
            {realEstateTypes.map((type) => {
              const tabValue = type.value.toLowerCase().replace(/\s+/g, '-');
              return (
                <TabsTrigger 
                  key={type.id} 
                  value={tabValue} 
                  data-testid={`${dataTestId}-${tabValue}-tab`}
                >
                  {type.value}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {realEstateTypes.map((type) => {
            const tabValue = type.value.toLowerCase().replace(/\s+/g, '-');
            const typeFilters = createInvestmentTypeFilters(type.value);
            
            // Select the appropriate table component based on investment type
            const getTableComponent = () => {
              switch (type.value) {
                case 'Existing Properties':
                  return (
                    <ExistingPropertiesTable
                      accessToken={accessToken}
                      userInfo={userInfo}
                      filters={typeFilters}
                      propertyType={`${type.value} Properties`}
                      title={`Real Estate Analytics - ${type.value}`}
                      data-testid={`${dataTestId}-${tabValue}-table`}
                    />
                  );
                case 'Project Development':
                  return (
                    <ProjectDevelopmentTable
                      accessToken={accessToken}
                      userInfo={userInfo}
                      filters={typeFilters}
                      propertyType={`${type.value} Properties`}
                      title={`Real Estate Analytics - ${type.value}`}
                      data-testid={`${dataTestId}-${tabValue}-table`}
                    />
                  );
                case 'Mezzanine Loans':
                  return (
                    <MezzanineLoansTable
                      accessToken={accessToken}
                      userInfo={userInfo}
                      filters={typeFilters}
                      propertyType={`${type.value} Properties`}
                      title={`Real Estate Analytics - ${type.value}`}
                      data-testid={`${dataTestId}-${tabValue}-table`}
                    />
                  );
                case 'Others':
                  return (
                    <OthersTable
                      accessToken={accessToken}
                      userInfo={userInfo}
                      filters={typeFilters}
                      propertyType={`${type.value} Properties`}
                      title={`Real Estate Analytics - ${type.value}`}
                      data-testid={`${dataTestId}-${tabValue}-table`}
                    />
                  );
                default:
                  return (
                    <ExistingPropertiesTable
                      accessToken={accessToken}
                      userInfo={userInfo}
                      filters={typeFilters}
                      propertyType={`${type.value} Properties`}
                      title={`Real Estate Analytics - ${type.value}`}
                      data-testid={`${dataTestId}-${tabValue}-table`}
                    />
                  );
              }
            };
            
            return (
              <TabsContent key={type.id} value={tabValue} className="gba:mt-6">
                {getTableComponent()}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default RealEstateReport;
