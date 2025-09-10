import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { Building2, Calendar, Ruler, Percent, DollarSign, User, Clock } from 'lucide-react';
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

export const ExistingPropertiesTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  filters,
  propertyType,
  title,
  'data-testid': dataTestId = 'existing-properties-table'
}) => {
  // Create stable filters object to prevent infinite loops
  const stableFilters = useMemo(() => ({
    ...filters,
    investmentType: 'Existing Properties'
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

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
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
          <Building2 className="gba:h-5 gba:w-5 gba:text-green-600" />
          {title}
          <Badge variant="outline">{totalCount} properties</Badge>
        </CardTitle>
        <div className="gba:text-sm gba:text-gray-600">
          Report data from existing properties investment records in the selected time period
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Property</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Building Year</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Size</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Occupancy %</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Total Investment</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Annual Net Rent</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Funding</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Investment Role</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Stake %</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Holding Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="gba:text-center gba:py-12">
                    <div className="gba:flex gba:justify-center">
                      Loading existing properties...
                    </div>
                  </TableCell>
                </TableRow>
              ) : analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <Building2 className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No Existing Properties Found</p>
                      <p className="gba:text-sm">No existing properties are available in the selected time period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                analyticsData.map((report) => (
                  <TableRow key={report.id} className="gba:cursor-pointer gba:border-b gba:hover:bg-gray-50" onClick={() => handleRowClick(report.investmentId)}>
                    <TableCell className="gba:py-3 gba:px-4">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium">{report.propertyName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Calendar className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm">{report.buildingYear || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Ruler className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm">
                          {report.size > 0 ? `${report.size.toLocaleString()} ${report.sizeMeasurementUnit}` : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Percent className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm gba:font-medium gba:text-green-600">
                          {formatPercentage(report.occupancyPercent)}
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
                        {formatCurrency(report.annualNetRent, report.currency)}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <span className="gba:font-mono gba:font-medium gba:text-purple-600">
                        {formatCurrency(report.funding, report.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <User className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <Badge variant="secondary" className="gba:text-xs">{report.investmentRole}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Percent className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm gba:font-medium">
                          {report.stakePercentage > 0 ? `${report.stakePercentage.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Clock className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm">{report.holdingPeriod}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};