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

  // Create dynamic filters for each investment type
  const createInvestmentTypeFilters = useCallback((investmentTypeValue: string): RealEstateReportFilters => ({
    startDate: startDateString,
    endDate: endDateString,
    currency: selectedCurrency,
    investmentType: investmentTypeValue
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
