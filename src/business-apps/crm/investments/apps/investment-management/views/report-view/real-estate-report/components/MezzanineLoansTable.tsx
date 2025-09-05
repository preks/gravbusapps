import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { Building2, User, DollarSign, Percent, Calendar, Target, Banknote } from 'lucide-react';
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

export const MezzanineLoansTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  filters,
  propertyType,
  title,
  'data-testid': dataTestId = 'mezzanine-loans-table'
}) => {
  // Create stable filters object to prevent infinite loops
  const stableFilters = useMemo(() => ({
    ...filters,
    investmentType: 'Mezzanine Loans'
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
            <DollarSign className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4" />
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
          <DollarSign className="gba:h-5 gba:w-5 gba:text-yellow-600" />
          {title}
          <Badge variant="outline">{totalCount} loans</Badge>
        </CardTitle>
        <div className="gba:text-sm gba:text-gray-600">
          Report data from mezzanine loan investment records in the selected time period
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Loan Project</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Borrower</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Principal Amount</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Outstanding Balance</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Interest Rate</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Loan Start</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">Maturity Date</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">Interest Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-12">
                    <div className="gba:flex gba:justify-center">
                      Loading mezzanine loans...
                    </div>
                  </TableCell>
                </TableRow>
              ) : analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <DollarSign className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No Mezzanine Loans Found</p>
                      <p className="gba:text-sm">No mezzanine loan investments are available in the selected time period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                analyticsData.map((report) => (
                  <TableRow key={report.id} className="gba:cursor-pointer gba:border-b gba:hover:bg-gray-50" onClick={() => handleRowClick(report.investmentId)}>
                    <TableCell className="gba:py-3 gba:px-4">
                      <div className="gba:font-medium">
                        <div>{report.propertyName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm gba:font-medium">Prime Development Corp</span> {/* Hardcoded for now */}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <div className="gba:font-mono gba:font-medium gba:text-blue-600">
                        {formatCurrency(report.totalInvestment, report.currency)}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <div className="gba:font-mono gba:font-medium gba:text-orange-600">
                        {formatCurrency(450000, report.currency)} {/* Hardcoded for now */}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Percent className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm gba:font-medium gba:text-green-600">
                          6.75% {/* Hardcoded for now */}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Calendar className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm">Mar 10, 2023</span> {/* Hardcoded for now */}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                        <Calendar className="gba:h-3 gba:w-3 gba:text-gray-500" />
                        <span className="gba:text-sm">Mar 10, 2028</span> {/* Hardcoded for now */}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <div className="gba:font-mono gba:font-medium gba:text-emerald-600">
                        {formatCurrency(189000, report.currency)} {/* Hardcoded for now */}
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