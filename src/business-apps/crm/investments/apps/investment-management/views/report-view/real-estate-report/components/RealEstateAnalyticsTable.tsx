import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@newwork/nw-design-system';
import { Building2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@newwork/nw-design-system';
import type { RealEstateAnalyticsTableProps } from '../types';
import { useRealEstateAnalyticsIntegration } from '../hooks/useRealEstateAnalyticsIntegration';

export const RealEstateAnalyticsTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  filters,
  propertyType,
  title,
  'data-testid': dataTestId = 'real-estate-analytics-table'
}) => {
  const {
    data,
    loading,
    error,
    totalCount,
    refetch
  } = useRealEstateAnalyticsIntegration({
    accessToken,
    userInfo,
    filters
  });

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Format number
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Handle investment navigation
  const handleInvestmentClick = (investmentId: string, investmentName: string) => {
    console.log('Investment clicked:', { investmentId, investmentName });
    const url = buildPlatformUrl('/platform/irm/investment-record', { investmentId });
    console.log('Navigating to:', url);
    navigateTo(url);
  };

  // Check if we have data to display
  const hasData = data.length > 0;
  
  // Check if filters have been applied (at least one date filter)
  const hasAppliedFilters = filters.startDate || filters.endDate;

  if (error) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <Building2 className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4" />
            <p className="gba:font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Building2 className="gba:h-5 gba:w-5" />
          {title}
          <Badge variant="outline">{totalCount} investments</Badge>
        </CardTitle>
        <div className="gba:text-sm gba:text-gray-600">
          Showing {data.length} of {totalCount} real estate reports for {propertyType.toLowerCase()}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid={`${dataTestId}-empty-state`}>
            <Building2 className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
            <p className="gba:text-lg gba:font-medium gba:mb-2">No Real Estate Reports Found</p>
            <p className="gba:text-sm">
              No real estate reports are available for {propertyType.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="gba:overflow-x-auto">
            <Table data-testid={`${dataTestId}-table`}>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Property</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Date</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Annual Net Rent</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Occupancy</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Units</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Expenses</TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Funding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((report) => (
                  <TableRow key={report.id} className="gba:border-b gba:hover:bg-gray-50">
                    <TableCell className="gba:py-3 gba:px-4">
                      <div className="gba:font-medium">
                        <div>{report.propertyName}</div>
                        {report.investmentId ? (
                          <button
                            onClick={() => handleInvestmentClick(report.investmentId!, report.investmentName!)}
                            className="gba:text-xs gba:text-blue-600 hover:gba:text-blue-800 hover:gba:underline gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0 gba:text-left"
                            data-testid={`${dataTestId}-investment-link-${report.id}`}
                          >
                            🔗 {report.investmentName} <ExternalLink className="gba:inline gba:h-3 gba:w-3 gba:ml-1" />
                          </button>
                        ) : (
                          <div className="gba:text-xs gba:text-gray-500">
                            ❌ {report.investmentName || 'Unknown Investment'} (No ID: {JSON.stringify(report.investmentId)})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4">
                      <span className="gba:text-sm">{report.date}</span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <div className="gba:font-mono gba:font-medium gba:text-green-600">
                        {formatCurrency(report.annualNetColdRent, report.currency)}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        {report.occupancyPercent >= 95 ? (
                          <TrendingUp className="gba:h-3 gba:w-3 gba:text-green-600" />
                        ) : report.occupancyPercent >= 85 ? (
                          <TrendingUp className="gba:h-3 gba:w-3 gba:text-yellow-600" />
                        ) : (
                          <TrendingDown className="gba:h-3 gba:w-3 gba:text-red-600" />
                        )}
                        <span className={`gba:font-medium ${
                          report.occupancyPercent >= 95 ? 'gba:text-green-600' : 
                          report.occupancyPercent >= 85 ? 'gba:text-yellow-600' : 'gba:text-red-600'
                        }`}>
                          {formatPercentage(report.occupancyPercent)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <span className="gba:text-sm">{formatNumber(report.numberOfUnits)}</span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      {report.actualAnnualExpenses !== undefined ? (
                        <span className="gba:font-mono gba:font-medium gba:text-red-600">
                          -{formatCurrency(report.actualAnnualExpenses, report.currency)}
                        </span>
                      ) : (
                        <span className="gba:font-mono gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      {report.funding !== undefined ? (
                        <span className="gba:font-mono gba:font-medium gba:text-blue-600">
                          {formatCurrency(report.funding, report.currency)}
                        </span>
                      ) : (
                        <span className="gba:font-mono gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealEstateAnalyticsTable;
