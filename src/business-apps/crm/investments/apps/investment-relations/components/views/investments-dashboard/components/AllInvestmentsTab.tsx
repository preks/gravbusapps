import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Button, Input } from '@newwork/nw-design-system';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { Spin, Alert } from 'antd';
import { BarChart3, Home, Briefcase, DollarSign, Search, Filter } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { EquityMetricsCards, RealEstateMetricsCards, PrivateEquityMetricsCards, LiquidFundsMetricsCards } from './';
import EquityTable from './EquityTable';
import RealEstateTable from './RealEstateTable';
import PrivateEquityTable from './PrivateEquityTable';
import LiquidFundsTable from './LiquidFundsTable';
import { useInvestmentDataIntegration } from '../hooks';
import { getStatusBadge } from '../utils/helpers';

interface AllInvestmentsTabProps extends BusinessAppContextProps {
  onEquityRowClick: (investmentId: string) => void;
  onRealEstateRowClick: (investmentId: string) => void;
  onPrivateEquityRowClick: (investmentId: string) => void;
  onLiquidFundRowClick: (investmentId: string) => void;
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const AllInvestmentsTab: React.FC<AllInvestmentsTabProps> = (props) => {
  const { onEquityRowClick, onRealEstateRowClick, onPrivateEquityRowClick, onLiquidFundRowClick, initialSubTab = 'overview', onSubTabChange } = props;
  const [allInvestmentsSubTab, setAllInvestmentsSubTab] = useState(initialSubTab);

  // Update internal state when external state changes
  React.useEffect(() => {
    setAllInvestmentsSubTab(initialSubTab);
  }, [initialSubTab]);

  const handleSubTabChange = (newSubTab: string) => {
    setAllInvestmentsSubTab(newSubTab);
    onSubTabChange?.(newSubTab);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Debounce search term to avoid too many API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const { 
    investments, 
    metrics, 
    typeMetrics, 
    isLoading, 
    error, 
    refetch 
  } = useInvestmentDataIntegration(props, {
    searchTerm: debouncedSearchTerm
  });

  // Unified navigation function that uses actual investmentId
  const handleInvestmentClick = (investmentId: string) => {
    // All click handlers now use the same function
    onEquityRowClick(investmentId);
  };

  // No more client-side filtering - data is already filtered by the query
  const filteredInvestments = investments;

  // Get investments by type
  const equityInvestments = investments.filter(inv => inv.type === 'Equity');
  const realEstateInvestments = investments.filter(inv => inv.type === 'Real Estate');
  const privateEquityInvestments = investments.filter(inv => inv.type === 'Private Equity');
  const liquidFundsInvestments = investments.filter(inv => inv.type === 'Liquid Funds');

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="loading-spinner">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Investment Data"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="sm" onClick={refetch}>
            Retry
          </Button>
        }
        data-testid="error-alert"
      />
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="all-investments-content">
      {/* Nested tabs for All Investments */}
      <Tabs value={allInvestmentsSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="gba:bg-gray-100">
          <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
          <TabsTrigger value="equity" data-testid="equity-tab">
            <BarChart3 className="gba:h-4 gba:w-4 gba:mr-2" />
            Equity
          </TabsTrigger>
          <TabsTrigger value="real-estate" data-testid="real-estate-tab">
            <Home className="gba:h-4 gba:w-4 gba:mr-2" />
            Real Estate
          </TabsTrigger>
          <TabsTrigger value="private-equity" data-testid="private-equity-tab">
            <Briefcase className="gba:h-4 gba:w-4 gba:mr-2" />
            Private Equity
          </TabsTrigger>
          <TabsTrigger value="liquid-funds" data-testid="liquid-funds-tab">
            <DollarSign className="gba:h-4 gba:w-4 gba:mr-2" />
            Liquid Funds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="overview-content">
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-2">All Investments</h2>
            <p className="gba:text-sm gba:text-gray-600">
              {filteredInvestments.length} of {investments.length} Investments
            </p>
          </div>

          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:relative gba:flex-1">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
              <Input
                placeholder="Search investments..."
                className="gba:pl-10 gba:pr-4 gba:py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="overview-search"
              />
            </div>
            <Button variant="outline" className="gba:flex gba:items-center gba:gap-2" data-testid="overview-filters-button">
              <Filter className="gba:h-4 gba:w-4" />
              Filters
            </Button>
          </div>

          {filteredInvestments.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid="no-investments-message">
              {searchTerm ? 'No investments match your search.' : 'No investments found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">INVESTMENT</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">AMOUNT</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">BOOK VALUE</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">EXPECTED ROI</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">STATUS</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">DATE ACQUIRED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestments.map((investment, index) => (
                  <TableRow 
                    key={investment.id} 
                    className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer" 
                    data-testid={`overview-row-${index + 1}`}
                    onClick={() => handleInvestmentClick(investment.rawData.investment.id)}
                  >
                    <TableCell className="gba:py-4 gba:px-6">
                      <div>
                        <div className="gba:font-semibold gba:text-gray-900 gba:mb-1">{investment.name}</div>
                        <div className="gba:text-sm gba:text-gray-600">{investment.subType}</div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">{investment.amount}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <div>
                        <div className="gba:font-semibold gba:text-gray-900 gba:mb-1">{investment.bookValue}</div>
                        <div className="gba:text-sm gba:text-green-600 gba:font-medium">{investment.bookValueChange}</div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-green-600">{investment.expectedROI}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      {getStatusBadge(investment.status)}
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investment.dateAcquired}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="equity" data-testid="equity-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-blue-500 gba:rounded-lg">
                <BarChart3 className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Equity</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {equityInvestments.length} of {equityInvestments.length} investments
                </p>
              </div>
            </div>

            <div className="gba:mb-8">
              <EquityMetricsCards investments={investments} />
            </div>

            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:relative gba:flex-1">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
                <Input
                  placeholder="Search equity investments..."
                  className="gba:pl-10 gba:pr-4 gba:py-2"
                  data-testid="equity-search"
                />
              </div>
              <Button variant="outline" className="gba:flex gba:items-center gba:gap-2" data-testid="equity-filters-button">
                <Filter className="gba:h-4 gba:w-4" />
                Filters
              </Button>
            </div>

            <EquityTable investments={investments} onRowClick={handleInvestmentClick} />
          </div>
        </TabsContent>

        <TabsContent value="real-estate" data-testid="real-estate-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-green-500 gba:rounded-lg">
                <Home className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Real Estate</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {realEstateInvestments.length} of {realEstateInvestments.length} investments
                </p>
              </div>
            </div>

            <div className="gba:mb-8">
              <RealEstateMetricsCards investments={investments} />
            </div>

            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:relative gba:flex-1">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
                <Input
                  placeholder="Search properties..."
                  className="gba:pl-10 gba:pr-4 gba:py-2"
                  data-testid="real-estate-search"
                />
              </div>
              <Button variant="outline" className="gba:flex gba:items-center gba:gap-2" data-testid="real-estate-filters-button">
                <Filter className="gba:h-4 gba:w-4" />
                Filters
              </Button>
            </div>

            <RealEstateTable investments={investments} onRowClick={handleInvestmentClick} />
          </div>
        </TabsContent>

        <TabsContent value="private-equity" data-testid="private-equity-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-purple-500 gba:rounded-lg">
                <Briefcase className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Private Equity</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {privateEquityInvestments.length} of {privateEquityInvestments.length} investments
                </p>
              </div>
            </div>

            <div className="gba:mb-8">
              <PrivateEquityMetricsCards investments={investments} />
            </div>

            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:relative gba:flex-1">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
                <Input
                  placeholder="Search PE investments..."
                  className="gba:pl-10 gba:pr-4 gba:py-2"
                  data-testid="private-equity-search"
                />
              </div>
              <Button variant="outline" className="gba:flex gba:items-center gba:gap-2" data-testid="private-equity-filters-button">
                <Filter className="gba:h-4 gba:w-4" />
                Filters
              </Button>
            </div>

            <PrivateEquityTable investments={investments} onRowClick={handleInvestmentClick} />
          </div>
        </TabsContent>

        <TabsContent value="liquid-funds" data-testid="liquid-funds-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-amber-500 gba:rounded-lg">
                <DollarSign className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Liquid Funds</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {liquidFundsInvestments.length} of {liquidFundsInvestments.length} investments
                </p>
              </div>
            </div>

            <div className="gba:mb-8">
              <LiquidFundsMetricsCards investments={investments} />
            </div>

            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:relative gba:flex-1">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
                <Input
                  placeholder="Search liquid funds..."
                  className="gba:pl-10 gba:pr-4 gba:py-2"
                  data-testid="liquid-funds-search"
                />
              </div>
              <Button variant="outline" className="gba:flex gba:items-center gba:gap-2" data-testid="liquid-funds-filters-button">
                <Filter className="gba:h-4 gba:w-4" />
                Filters
              </Button>
            </div>

            <LiquidFundsTable investments={investments} onRowClick={handleInvestmentClick} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AllInvestmentsTab; 