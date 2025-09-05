import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { Building2, Calendar, BarChart3, DollarSign, Target, AlertCircle } from 'lucide-react';
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
import { useRealEstateAnalyticsIntegration } from "../hooks/useRealEstateAnalyticsIntegration";

export const OthersTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  filters,
  propertyType,
  title,
  'data-testid': dataTestId = 'others-table'
}) => {
  // Create stable filters object to prevent infinite loops
  const stableFilters = useMemo(() => ({
    ...filters,
    investmentType: 'Others'
  }), [filters.startDate, filters.endDate, filters.currency]);

  // Use the central analytics integration hook
  const {
    data: analyticsData,
    totalCount,
    loading: isLoading,
    error,
    refetch
  } = useRealEstateAnalyticsIntegration({
    accessToken,
    userInfo,
    filters: stableFilters
  });

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
      investmentId,
      fromView: 'reports',
      fromSubView: 'real-estate'
    });
    navigateTo(detailsUrl);
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <AlertCircle className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4" />
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
          <AlertCircle className="gba:h-5 gba:w-5 gba:text-gray-600" />
          {title}
          <Badge variant="outline">{totalCount} investments</Badge>
        </CardTitle>
        <div className="gba:text-sm gba:text-gray-600">
          Report data from other real estate investment records in the selected time period
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Investment Name</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Investment Type</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Acquisition Date</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Target Exit</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Total Investment</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Current Value</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Performance</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-12">
                    <div className="gba:flex gba:justify-center">
                      Loading other investments...
                    </div>
                  </TableCell>
                </TableRow>
              ) : analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <AlertCircle className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No Other Investments Found</p>
                      <p className="gba:text-sm">No other real estate investments are available in the selected time period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                analyticsData.map((report) => {
                  const performanceAmount = (report.totalInvestment || 0) - (report.totalInvestment || 0); // Placeholder calculation
                  const performancePercent = report.totalInvestment > 0 ? (performanceAmount / report.totalInvestment) * 100 : 0;

                  return (
                    <TableRow key={report.id} className="gba:cursor-pointer gba:border-b gba:hover:bg-gray-50" onClick={() => handleRowClick(report.investmentId)}>
                      <TableCell className="gba:py-3 gba:px-4">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span className="gba:font-medium">{report.propertyName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4">
                        <Badge variant="secondary" className="gba:text-xs">
                          {report.investmentType || 'Other Real Estate'}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                        <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                          <Calendar className="gba:h-3 gba:w-3 gba:text-gray-500" />
                          <span className="gba:text-sm">
                            {report.acquisitionDate ? formatDate(report.acquisitionDate) : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                        <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                          <Target className="gba:h-3 gba:w-3 gba:text-gray-500" />
                          <span className="gba:text-sm">
                            {report.plannedExitDate ? formatDate(report.plannedExitDate) : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                        <div className="gba:font-mono gba:font-medium gba:text-blue-600">
                          {formatCurrency(report.totalInvestment, report.currency)}
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                        <div className="gba:font-mono gba:font-medium gba:text-green-600">
                          {formatCurrency(report.totalInvestment, report.currency)} {/* Using same value for now */}
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                        <div className={`gba:font-mono gba:font-medium ${performancePercent >= 0 ? 'gba:text-green-600' : 'gba:text-red-600'}`}>
                          {performancePercent >= 0 ? '+' : ''}{performancePercent.toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                        <Badge variant={performancePercent > 10 ? 'destructive' : performancePercent > 5 ? 'default' : 'secondary'}>
                          {performancePercent > 10 ? 'High' : performancePercent > 5 ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};