import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Button, Input } from '@newwork/nw-design-system';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { Spin, Alert } from 'antd';
import { BarChart3, Home, Briefcase, DollarSign, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { EquityMetricsCards, RealEstateMetricsCards, PrivateEquityMetricsCards, LiquidFundsMetricsCards } from './components';
import EquityTable from './components/EquityTable';
import RealEstateTable from './components/RealEstateTable';
import PrivateEquityTable from './components/PrivateEquityTable';
import LiquidFundsTable from './components/LiquidFundsTable';
import { useInvestmentDataIntegration } from './hooks';
import { getStatusBadge } from './utils/helpers';

interface InvestmentsProps extends BusinessAppContextProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const Investments: React.FC<InvestmentsProps> = (props) => {
  const { initialSubTab = 'overview', onSubTabChange } = props;
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Sorting state for overview table
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');

  // Pagination state for overview table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Sorting state for individual table components
  const [equitySortField, setEquitySortField] = useState<string>('');
  const [equitySortOrder, setEquitySortOrder] = useState<'ASC' | 'DESC' | ''>('');
  
  const [realEstateSortField, setRealEstateSortField] = useState<string>('');
  const [realEstateSortOrder, setRealEstateSortOrder] = useState<'ASC' | 'DESC' | ''>('');
  
  const [privateEquitySortField, setPrivateEquitySortField] = useState<string>('');
  const [privateEquitySortOrder, setPrivateEquitySortOrder] = useState<'ASC' | 'DESC' | ''>('');
  
  const [liquidFundsSortField, setLiquidFundsSortField] = useState<string>('');
  const [liquidFundsSortOrder, setLiquidFundsSortOrder] = useState<'ASC' | 'DESC' | ''>('');

  // Pagination state for individual table components
  const [equityCurrentPage, setEquityCurrentPage] = useState(1);
  const [equityPageSize, setEquityPageSize] = useState(20);
  const [equityTotal, setEquityTotal] = useState(0);

  const [realEstateCurrentPage, setRealEstateCurrentPage] = useState(1);
  const [realEstatePageSize, setRealEstatePageSize] = useState(20);
  const [realEstateTotal, setRealEstateTotal] = useState(0);

  const [privateEquityCurrentPage, setPrivateEquityCurrentPage] = useState(1);
  const [privateEquityPageSize, setPrivateEquityPageSize] = useState(20);
  const [privateEquityTotal, setPrivateEquityTotal] = useState(0);

  const [liquidFundsCurrentPage, setLiquidFundsCurrentPage] = useState(1);
  const [liquidFundsPageSize, setLiquidFundsPageSize] = useState(20);
  const [liquidFundsTotal, setLiquidFundsTotal] = useState(0);

  // Update internal state when external state changes
  React.useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const handleSubTabChange = (newSubTab: string) => {
    setActiveSubTab(newSubTab);
    onSubTabChange?.(newSubTab);
  };

  // Navigation function to go to investment record
  const handleInvestmentClick = (investmentId: string) => {
    window.location.href = `/platform/irm/investment-record?investmentId=${investmentId}`;
  };

  // Debounce search term to avoid too many API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle column sorting with 3 states: none -> ASC -> DESC -> none
  const handleSort = (fieldName: string) => {
    if (sortField !== fieldName) {
      // New field, start with ASC
      setSortField(fieldName);
      setSortOrder('ASC');
    } else {
      // Same field, cycle through states
      if (sortOrder === '') {
        setSortOrder('ASC');
      } else if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else {
        // DESC -> reset to no sorting
        setSortField('');
        setSortOrder('');
      }
    }
  };

  // Sorting handlers for individual tables
  const handleEquitySort = (field: string, order: 'ASC' | 'DESC' | '') => {
    setEquitySortField(field);
    setEquitySortOrder(order);
  };

  const handleRealEstateSort = (field: string, order: 'ASC' | 'DESC' | '') => {
    setRealEstateSortField(field);
    setRealEstateSortOrder(order);
  };

  const handlePrivateEquitySort = (field: string, order: 'ASC' | 'DESC' | '') => {
    setPrivateEquitySortField(field);
    setPrivateEquitySortOrder(order);
  };

  const handleLiquidFundsSort = (field: string, order: 'ASC' | 'DESC' | '') => {
    setLiquidFundsSortField(field);
    setLiquidFundsSortOrder(order);
  };

  // Pagination handlers for overview table
  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page when page size changes
    }
  };

  // Pagination handlers for individual table components
  const handleEquityPaginationChange = (page: number, newPageSize?: number) => {
    setEquityCurrentPage(page);
    if (newPageSize && newPageSize !== equityPageSize) {
      setEquityPageSize(newPageSize);
      setEquityCurrentPage(1);
    }
  };

  const handleRealEstatePaginationChange = (page: number, newPageSize?: number) => {
    setRealEstateCurrentPage(page);
    if (newPageSize && newPageSize !== realEstatePageSize) {
      setRealEstatePageSize(newPageSize);
      setRealEstateCurrentPage(1);
    }
  };

  const handlePrivateEquityPaginationChange = (page: number, newPageSize?: number) => {
    setPrivateEquityCurrentPage(page);
    if (newPageSize && newPageSize !== privateEquityPageSize) {
      setPrivateEquityPageSize(newPageSize);
      setPrivateEquityCurrentPage(1);
    }
  };

  const handleLiquidFundsPaginationChange = (page: number, newPageSize?: number) => {
    setLiquidFundsCurrentPage(page);
    if (newPageSize && newPageSize !== liquidFundsPageSize) {
      setLiquidFundsPageSize(newPageSize);
      setLiquidFundsCurrentPage(1);
    }
  };

  // Get sort icon for column header
  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) {
      return null;
    }
    
    if (sortOrder === 'ASC') {
      return <ChevronUp className="gba:h-4 gba:w-4 gba:ml-1" />;
    } else if (sortOrder === 'DESC') {
      return <ChevronDown className="gba:h-4 gba:w-4 gba:ml-1" />;
    }
    
    return null;
  };

  // Create sortable header component
  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
      onClick={() => handleSort(field)}
      data-testid={`sort-header-${field}`}
    >
      <div className="gba:flex gba:items-center">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );
   
  // Get the current active sorting and pagination based on which tab is selected
  const getCurrentSortingAndPagination = () => {
    switch (activeSubTab) {
      case 'equity':
        return { 
          sortBy: equitySortField || undefined, 
          sortOrder: equitySortOrder || undefined,
          currentPage: equityCurrentPage,
          pageSize: equityPageSize
        };
      case 'real-estate':
        return { 
          sortBy: realEstateSortField || undefined, 
          sortOrder: realEstateSortOrder || undefined,
          currentPage: realEstateCurrentPage,
          pageSize: realEstatePageSize
        };
      case 'private-equity':
        return { 
          sortBy: privateEquitySortField || undefined, 
          sortOrder: privateEquitySortOrder || undefined,
          currentPage: privateEquityCurrentPage,
          pageSize: privateEquityPageSize
        };
      case 'liquid-funds':
        return { 
          sortBy: liquidFundsSortField || undefined, 
          sortOrder: liquidFundsSortOrder || undefined,
          currentPage: liquidFundsCurrentPage,
          pageSize: liquidFundsPageSize
        };
      case 'overview':
      default:
        return { 
          sortBy: sortField || undefined, 
          sortOrder: sortOrder || undefined,
          currentPage: currentPage,
          pageSize: pageSize
        };
    }
  };

  const currentSortingAndPagination = getCurrentSortingAndPagination();
  
  const { 
    investments, 
    metrics, 
    typeMetrics, 
    isLoading, 
    error, 
    refetch,
    totalCounts 
  } = useInvestmentDataIntegration(props, {
    searchTerm: debouncedSearchTerm,
    sortBy: currentSortingAndPagination.sortBy,
    sortOrder: currentSortingAndPagination.sortOrder,
    currentPage: currentSortingAndPagination.currentPage,
    pageSize: currentSortingAndPagination.pageSize
  });

  // Refetch data when active tab changes to apply correct sorting
  React.useEffect(() => {
    refetch();
  }, [activeSubTab, refetch]);

  // Update total counts when data changes
  React.useEffect(() => {
    if (totalCounts) {
      setTotal(totalCounts.total);
      setEquityTotal(totalCounts.equity);
      setRealEstateTotal(totalCounts.realEstate);
      setPrivateEquityTotal(totalCounts.privateEquity);
      setLiquidFundsTotal(totalCounts.liquidFunds);
    }
  }, [totalCounts]);

  // No more client-side filtering - data is already filtered by the query
  const filteredInvestments = investments;

  // Get investments by type
  const equityInvestments = investments.filter(inv => inv.type === 'Equity');
  const realEstateInvestments = investments.filter(inv => inv.type === 'Real Estate');
  const privateEquityInvestments = investments.filter(inv => inv.type === 'Private Equity');
  const liquidFundsInvestments = investments.filter(inv => inv.type === 'Liquid Funds');

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="investments-loading-spinner">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="investments-error">
        <Alert
          message="Error Loading Investments"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={refetch}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="investments-container">
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="gba:grid gba:w-full gba:grid-cols-5" data-testid="investments-tabs">
          <TabsTrigger value="overview" data-testid="investments-overview-tab">Overview</TabsTrigger>
          <TabsTrigger value="equity" data-testid="investments-equity-tab">Equity</TabsTrigger>
          <TabsTrigger value="real-estate" data-testid="investments-real-estate-tab">Real Estate</TabsTrigger>
          <TabsTrigger value="private-equity" data-testid="investments-private-equity-tab">Private Equity</TabsTrigger>
          <TabsTrigger value="liquid-funds" data-testid="investments-liquid-funds-tab">Liquid Funds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="investments-overview-content">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <div className="gba:relative gba:flex-1 gba:max-w-sm">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-gray-400 gba:h-4 gba:w-4" />
              <Input
                placeholder="Search investments..."
                className="gba:pl-10 gba:pr-4 gba:py-2 gba:!pl-[32px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="investments-overview-search"
              />
            </div>
            <Button variant="outline" className="gba:flex gba:items-center gba:gap-2" data-testid="investments-overview-filters-button">
              <Filter className="gba:h-4 gba:w-4" />
              Filters
            </Button>
          </div>

          {filteredInvestments.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid="investments-no-investments-message">
              {searchTerm ? 'No investments match your search.' : 'No investments found.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <SortableHeader field="name">INVESTMENT</SortableHeader>
                    <SortableHeader field="initialInvestmentAmount">AMOUNT</SortableHeader>
                    <SortableHeader field="bookValue">BOOK VALUE</SortableHeader>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">EXPECTED ROI</TableHead>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">STATUS</TableHead>
                    <SortableHeader field="acquisitionDate">DATE ACQUIRED</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestments.map((investment, index) => (
                    <TableRow 
                      key={investment.id} 
                      className="gba:border-b gba:hover:gba:bg-gray-50 gba:transition-colors gba:cursor-pointer" 
                      data-testid={`investments-overview-row-${index + 1}`}
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
            </>
          )}
        </TabsContent>

        <TabsContent value="equity" data-testid="investments-equity-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-blue-500 gba:rounded-lg">
                <BarChart3 className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1">Equity Investments</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {equityInvestments.length} Equity Investments
                </p>
              </div>
            </div>

            <EquityMetricsCards 
              investments={equityInvestments} 
              data-testid="investments-equity-metrics" 
            />
            
            <EquityTable 
              investments={equityInvestments} 
              onRowClick={(equityId) => {
                const investment = equityInvestments.find(inv => inv.id === equityId);
                if (investment) {
                  handleInvestmentClick(investment.rawData.investment.id);
                }
              }}
              sortField={equitySortField}
              sortOrder={equitySortOrder}
              onSortChange={handleEquitySort}
              currentPage={equityCurrentPage}
              pageSize={equityPageSize}
              total={equityTotal}
              onPaginationChange={handleEquityPaginationChange}
              data-testid="investments-equity-table"
            />
          </div>
        </TabsContent>

        <TabsContent value="real-estate" data-testid="investments-real-estate-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-green-500 gba:rounded-lg">
                <Home className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1">Real Estate Investments</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {realEstateInvestments.length} Real Estate Investments
                </p>
              </div>
            </div>

            <RealEstateMetricsCards 
              investments={realEstateInvestments} 
              data-testid="investments-real-estate-metrics"
            />
            
            <RealEstateTable 
              investments={realEstateInvestments} 
              onRowClick={(realEstateId) => {
                const investment = realEstateInvestments.find(inv => inv.id === realEstateId);
                if (investment) {
                  handleInvestmentClick(investment.rawData.investment.id);
                }
              }}
              sortField={realEstateSortField}
              sortOrder={realEstateSortOrder}
              onSortChange={handleRealEstateSort}
              currentPage={realEstateCurrentPage}
              pageSize={realEstatePageSize}
              total={realEstateTotal}
              onPaginationChange={handleRealEstatePaginationChange}
              data-testid="investments-real-estate-table"
            />
          </div>
        </TabsContent>

        <TabsContent value="private-equity" data-testid="investments-private-equity-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-purple-500 gba:rounded-lg">
                <Briefcase className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1">Private Equity Investments</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {privateEquityInvestments.length} Private Equity Investments
                </p>
              </div>
            </div>

            <PrivateEquityMetricsCards 
              investments={privateEquityInvestments} 
              data-testid="investments-private-equity-metrics"
            />
            
            <PrivateEquityTable 
              investments={privateEquityInvestments} 
              onRowClick={(privateEquityId) => {
                const investment = privateEquityInvestments.find(inv => inv.id === privateEquityId);
                if (investment) {
                  handleInvestmentClick(investment.rawData.investment.id);
                }
              }}
              sortField={privateEquitySortField}
              sortOrder={privateEquitySortOrder}
              onSortChange={handlePrivateEquitySort}
              currentPage={privateEquityCurrentPage}
              pageSize={privateEquityPageSize}
              total={privateEquityTotal}
              onPaginationChange={handlePrivateEquityPaginationChange}
              data-testid="investments-private-equity-table"
            />
          </div>
        </TabsContent>

        <TabsContent value="liquid-funds" data-testid="investments-liquid-funds-content">
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
              <div className="gba:p-3 gba:bg-yellow-500 gba:rounded-lg">
                <DollarSign className="gba:h-6 gba:w-6 gba:text-white" />
              </div>
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1">Liquid Fund Investments</h2>
                <p className="gba:text-sm gba:text-gray-600">
                  {liquidFundsInvestments.length} Liquid Fund Investments
                </p>
              </div>
            </div>

            <LiquidFundsMetricsCards 
              investments={liquidFundsInvestments} 
              data-testid="investments-liquid-funds-metrics"
            />
            
            <LiquidFundsTable 
              investments={liquidFundsInvestments} 
              onRowClick={(liquidFundId) => {
                const investment = liquidFundsInvestments.find(inv => inv.id === liquidFundId);
                if (investment) {
                  handleInvestmentClick(investment.rawData.investment.id);
                }
              }}
              sortField={liquidFundsSortField}
              sortOrder={liquidFundsSortOrder}
              onSortChange={handleLiquidFundsSort}
              currentPage={liquidFundsCurrentPage}
              pageSize={liquidFundsPageSize}
              total={liquidFundsTotal}
              onPaginationChange={handleLiquidFundsPaginationChange}
              data-testid="investments-liquid-funds-table"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Investments; 