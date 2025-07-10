import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Button, Input } from '@newwork/nw-design-system';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { Spin, Alert } from 'antd';
import { BarChart3, Home, Briefcase, DollarSign, Search, Filter } from 'lucide-react';
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

  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    investments, 
    metrics, 
    typeMetrics, 
    isLoading, 
    error, 
    refetch 
  } = useInvestmentDataIntegration(props);

  // Filter investments based on search term
  const filteredInvestments = investments.filter(investment =>
    investment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investment.subType.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        data-testid="investments-error-alert"
      />
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="investments-content">
      {/* Investment list tabs */}
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="gba:bg-gray-100">
          <TabsTrigger value="overview" data-testid="investments-overview-tab">Overview</TabsTrigger>
          <TabsTrigger value="equity" data-testid="investments-equity-tab">
            <BarChart3 className="gba:h-4 gba:w-4 gba:mr-2" />
            Equity
          </TabsTrigger>
          <TabsTrigger value="real-estate" data-testid="investments-real-estate-tab">
            <Home className="gba:h-4 gba:w-4 gba:mr-2" />
            Real Estate
          </TabsTrigger>
          <TabsTrigger value="private-equity" data-testid="investments-private-equity-tab">
            <Briefcase className="gba:h-4 gba:w-4 gba:mr-2" />
            Private Equity
          </TabsTrigger>
          <TabsTrigger value="liquid-funds" data-testid="investments-liquid-funds-tab">
            <DollarSign className="gba:h-4 gba:w-4 gba:mr-2" />
            Liquid Funds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="investments-overview-content">
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
              data-testid="investments-liquid-funds-table"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Investments; 