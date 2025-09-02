import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@newwork/nw-design-system';
import { Spin, Alert } from 'antd';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { useLiquidFundAnalyticsIntegration } from '../hooks';
import { AnalyticsRowData, AnalyticsFilters } from '../types';

interface AnalyticsTableProps {
  accessToken: string;
  userInfo?: any;
  'data-testid'?: string;
  filters: AnalyticsFilters;
  investmentType: string;
  title: string;
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'analytics-table',
  filters,
  investmentType,
  title
}) => {
  // Use real data integration hook
  const {
    analyticsData,
    isLoading,
    error,
    totalCount,
    refetch
  } = useLiquidFundAnalyticsIntegration({
    accessToken,
    userInfo,
    filters,
    currentPage: 1,
    pageSize: 1000, // Load all available data without artificial limits
    sortBy: 'proprietorName',
    sortOrder: 'ASC'
  });

  const formatCurrency = (amount: number, currency: string = filters.currency || 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPerformance = (value: number): React.ReactNode => {
    if (value === 0) {
      return <span className="gba:text-gray-500">x%</span>;
    }

    const icon = value > 0 
      ? <TrendingUp className="gba:h-3 gba:w-3 gba:text-green-600" />
      : <TrendingDown className="gba:h-3 gba:w-3 gba:text-red-600" />;
    
    const colorClass = value > 0 
      ? 'gba:text-green-600' 
      : 'gba:text-red-600';

    return (
      <div className={`gba:flex gba:items-center gba:gap-1 ${colorClass}`}>
        {icon}
        <span>{Math.abs(value).toFixed(2)}%</span>
      </div>
    );
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatInterestRate = (rate?: number): string => {
    if (typeof rate !== 'number') return 'N/A';
    return `${rate.toFixed(2)}%`;
  };

  // Check if this is Fixed-Term Deposits to show additional columns
  const isFixedTermDeposits = investmentType.toLowerCase().includes('fixed-term');
  
  // Check if this is Multiple Investment Types (Tab 3) to show additional columns
  const isMultipleInvestmentTypes = investmentType.toLowerCase().includes('multiple');

  const formatQuantity = (quantity?: number): string => {
    if (typeof quantity !== 'number') return 'N/A';
    return quantity.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  };

  // Handle investment navigation
  const handleInvestmentClick = (investmentId: string, investmentName: string) => {
    console.log('Investment clicked:', { investmentId, investmentName });
    const url = buildPlatformUrl('/platform/irm/investment-record', { investmentId });
    console.log('Navigating to:', url);
    navigateTo(url);
  };

  const hasData = !isLoading && !error && analyticsData.length > 0;

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-error`}>
        <Alert
          message="Error Loading Analytics Data"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={refetch} className="gba:text-blue-600 hover:gba:text-blue-800">
              <RefreshCw className="gba:h-4 gba:w-4" />
            </button>
          }
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <DollarSign className="gba:h-5 gba:w-5" />
          {title}
          <Badge variant="outline">{totalCount} investments</Badge>
        </CardTitle>
        <CardDescription>
          Performance analysis for liquid funds categorized as {investmentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid={`${dataTestId}-empty-state`}>
            <DollarSign className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
            <p className="gba:text-lg gba:font-medium gba:mb-2">No {investmentType} Data Found</p>
            <p className="gba:text-sm">
              No liquid fund portfolios are available for {investmentType.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="gba:overflow-x-auto">
            <Table data-testid={`${dataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Proprietor</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Original Currency</TableHead>
                {isMultipleInvestmentTypes && (
                  <>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Deposit Name</TableHead>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">ISIN</TableHead>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Quantity</TableHead>
                  </>
                )}
                {isFixedTermDeposits && (
                  <>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Maturity Date</TableHead>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Interest Rate</TableHead>
                  </>
                )}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Opening Balance</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Incoming</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Outgoing</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Realized Gains/Losses</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Unrealized Gains/Losses</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Closing Balance</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Time-weighted Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isFixedTermDeposits ? 11 : isMultipleInvestmentTypes ? 12 : 9} className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <DollarSign className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No data available</p>
                      <p className="gba:text-sm">No reports found for the selected time period. Try adjusting your date range.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {analyticsData.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className="gba:border-b gba:hover:gba:bg-gray-50"
                      data-testid={`${dataTestId}-row-${index + 1}`}
                    >
                      <TableCell className="gba:py-3 gba:px-4">
                        <div className="gba:font-medium">
                          <div>{row.proprietorName}</div>
                          {row.investmentId ? (
                            <button
                              onClick={() => handleInvestmentClick(row.investmentId!, row.investmentName!)}
                              className="gba:text-xs gba:text-blue-600 hover:gba:text-blue-800 hover:gba:underline gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0 gba:text-left"
                              data-testid={`${dataTestId}-investment-link-${row.id}`}
                            >
                              🔗 {row.investmentName} <ExternalLink className="gba:inline gba:h-3 gba:w-3 gba:ml-1" />
                            </button>
                          ) : (
                            <div className="gba:text-xs gba:text-gray-500">
                              ❌ {row.investmentName || 'Unknown Investment'} (No ID: {JSON.stringify(row.investmentId)})
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4">
                        <Badge variant="outline">{row.originalCurrency}</Badge>
                      </TableCell>
                      {isMultipleInvestmentTypes && (
                        <>
                          <TableCell className="gba:text-left gba:py-3 gba:px-4">
                            {row.depositName || 'N/A'}
                          </TableCell>
                          <TableCell className="gba:text-left gba:py-3 gba:px-4">
                            {row.isin || 'N/A'}
                          </TableCell>
                          <TableCell className="gba:text-left gba:py-3 gba:px-4">
                            {formatQuantity(row.stocksQuantity)}
                          </TableCell>
                        </>
                      )}
                      {isFixedTermDeposits && (
                        <>
                          <TableCell className="gba:text-left gba:py-3 gba:px-4">
                            {formatDate(row.maturityDate)}
                          </TableCell>
                          <TableCell className="gba:text-left gba:py-3 gba:px-4">
                            {formatInterestRate(row.interestRate)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.openingBalance)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.incoming)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.outgoing)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.realizedGainsLosses)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.unrealizedGainsLosses)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:font-medium gba:py-3 gba:px-4">
                        {formatCurrency(row.closingBalance)}
                      </TableCell>
                      <TableCell className="gba:text-center gba:py-3 gba:px-4">
                        {formatPerformance(row.timeWeightedPerformance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};