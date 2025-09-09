import React, { useCallback, useMemo } from 'react';
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
  Badge,
  Button
} from '@newwork/nw-design-system';
import { Spin } from 'antd';
import { 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEquityAnalyticsIntegration } from "../hooks/useEquityAnalyticsIntegration";
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
  // Create stable filters object to prevent infinite loops
  const stableFilters = useMemo(() => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    currency: filters.currency,
    fundManagerName: filters.fundManagerName,
    investmentType: investmentType
  }), [filters.startDate, filters.endDate, filters.currency, filters.fundManagerName, investmentType]);

  // Use the new report-based data source
  const {
    analyticsData,
    totalCount,
    isLoading,
    error,
    refetch
  } = useEquityAnalyticsIntegration({
    accessToken,
    userInfo,
    filters: stableFilters
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

  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'reports',
      fromSubView: 'equity'
    });
    navigateTo(detailsUrl);
  }, []);

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
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <PieChart className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4" />
            <p className="gba:font-medium">{error}</p>
            <Button onClick={refetch} className="gba:mt-4">
              <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
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
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Unrealized Gain</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">EBITDA Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <PieChart className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No {investmentType} Data Found</p>
                      <p className="gba:text-sm">No equity investment reports are available for {investmentType.toLowerCase()} in the selected time period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {analyticsData.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className="gba:cursor-pointer gba:border-b gba:hover:gba:bg-gray-50"
                      onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                      data-testid={`${dataTestId}-row-${index + 1}`}
                    >
                      <TableCell className="gba:font-medium gba:text-left gba:py-3 gba:px-4">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <TrendingUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span className="gba:font-medium">{row.investmentName}</span>
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
      </CardContent>
    </Card>
  );
};
