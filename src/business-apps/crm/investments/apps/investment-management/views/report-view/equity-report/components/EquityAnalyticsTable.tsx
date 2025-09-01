import React from 'react';
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
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart,
  ExternalLink
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEquityAnalyticsIntegration } from '../hooks';
import { EquityAnalyticsFilters } from '../types';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';

interface EquityAnalyticsTableProps extends BusinessAppContextProps {
  'data-testid'?: string;
  filters: EquityAnalyticsFilters;
  investmentType: string;
  title: string;
}

export const EquityAnalyticsTable: React.FC<EquityAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'equity-analytics-table',
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
  } = useEquityAnalyticsIntegration({
    accessToken,
    userInfo,
    filters,
    options: {
      page: 1,
      pageSize: 1000, // Load all available data without artificial limits
      sortBy: 'date',
      sortOrder: 'DESC'
    }
  });

  const formatCurrency = (amount: number, currency: string = filters.currency || 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number): React.ReactNode => {
    if (value === 0) {
      return <span className="gba:text-gray-500">0%</span>;
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
        <span>{Math.abs(value).toFixed(1)}%</span>
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

  const formatGain = (amount: number, currency: string = filters.currency || 'EUR'): React.ReactNode => {
    const icon = amount >= 0 
      ? <TrendingUp className="gba:h-3 gba:w-3 gba:text-green-600" />
      : <TrendingDown className="gba:h-3 gba:w-3 gba:text-red-600" />;
    
    const colorClass = amount >= 0 
      ? 'gba:text-green-600' 
      : 'gba:text-red-600';

    return (
      <div className={`gba:flex gba:items-center gba:gap-1 ${colorClass}`}>
        {icon}
        <span>{formatCurrency(Math.abs(amount), currency)}</span>
      </div>
    );
  };

  const handleInvestmentClick = (investmentId: string) => {
    try {
      // Navigate to investment record view
      const investmentUrl = buildPlatformUrl('/platform/irm/investment-record', {
        investmentId: investmentId
      });
      navigateTo(investmentUrl);
    } catch (error) {
      console.error('Error navigating to investment detail:', error);
    }
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
          message="Error Loading Equity Analytics Data"
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
          <PieChart className="gba:h-5 gba:w-5" />
          {title}
          <Badge variant="outline">{totalCount} investments</Badge>
        </CardTitle>
        <CardDescription>
          Performance analysis for {investmentType.toLowerCase()} investments and fund performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid={`${dataTestId}-empty-state`}>
            <PieChart className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
            <p className="gba:text-lg gba:font-medium gba:mb-2">No {investmentType} Data Found</p>
            <p className="gba:text-sm">
              No equity investment reports are available in the database.
              Contact your administrator if you expect to see equity data here.
            </p>
          </div>
        ) : (
          <div className="gba:overflow-x-auto">
            <Table data-testid={`${dataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Investment</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Fund Manager</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Currency</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Acquisition Date</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Market Value</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">EBITDA</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Forecasted Revenue</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Unrealized Gain</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">EBITDA Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <PieChart className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No data available</p>
                      <p className="gba:text-sm">No equity investments found for the selected criteria.</p>
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
                      <TableCell className="gba:font-medium gba:text-left gba:py-3 gba:px-4">
                        <div>
                          {row.investmentId ? (
                            <button
                              onClick={() => handleInvestmentClick(row.investmentId!)}
                              className="gba:text-xs gba:text-blue-600 hover:gba:text-blue-800 hover:gba:underline gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0 gba:text-left"
                              data-testid={`${dataTestId}-investment-link-${row.id}`}
                            >
                              🔗 {row.investmentName} <ExternalLink className="gba:inline gba:h-3 gba:w-3 gba:ml-1" />
                            </button>
                          ) : (
                            <div>
                              <div className="gba:font-medium">{row.investmentName}</div>
                              <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                                ❌ No Investment ID Available
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4">{row.fundManagerName}</TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4">
                        <Badge variant="outline">{row.currency}</Badge>
                      </TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4">
                        {formatDate(row.acquisitionDate)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:font-medium gba:py-3 gba:px-4">
                        {formatCurrency(row.currentMarketValue, row.currency)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.currentEbitda, row.currency)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatCurrency(row.forecastedRevenue, row.currency)}
                      </TableCell>
                      <TableCell className="gba:text-right gba:font-mono gba:py-3 gba:px-4">
                        {formatGain(row.unrealizedGain, row.currency)}
                      </TableCell>
                      <TableCell className="gba:text-center gba:py-3 gba:px-4">
                        {formatPercentage(row.ebitdaMargin)}
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
