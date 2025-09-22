import React, { useMemo, useCallback } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { useLiquidFundAnalyticsIntegration } from '../hooks';
import { useInvestmentLiquidFundReportCatalog } from '../hooks/useInvestmentLiquidFundReportCatalog';
import { AnalyticsFilters } from '../types';
import { DynamicTableColumn } from '../utils/liquidFundReportColumnTransformer';

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

  // Use catalog integration for dynamic columns - following existing pattern
  const {
    catalogData,
    isLoading: catalogLoading,
    error: catalogError,
    getDynamicColumnsForType
  } = useInvestmentLiquidFundReportCatalog({ accessToken, userInfo });

  // All formatting is now handled by the dynamic column getValue functions

  // All columns are now dynamic - no more hardcoded conditional columns

  // Determine dynamic columns based on the data and investment type filter
  const dynamicColumns: DynamicTableColumn[] = useMemo(() => {
    // Debug information removed for production

    if (!catalogData) return [];

    // Strategy 1: Try to detect from data if we have it
    if (analyticsData.length > 0) {
      const liquidFundTypeCodes = Array.from(
        new Set(
          analyticsData
            .map(row => {
              return (
                row.liquidFundInvestment?.[0]?.investmentLiquidFundType?.code ||
                row.liquidFundReport?.investmentLiquidFundType?.code ||
                row.investment?.liquidFundInvestment?.[0]?.investmentLiquidFundType?.code ||
                row.liquidFundInvestment?.[0]?.investmentLiquidFundTypeRef?.split(':')?.pop() ||
                row.liquidFundReport?.investmentLiquidFundTypeRef?.split(':')?.pop()
              );
            })
            .filter(Boolean)
        )
      );

      if (liquidFundTypeCodes.length > 0) {
        const primaryTypeCode = liquidFundTypeCodes[0];
        const columns = getDynamicColumnsForType(primaryTypeCode);
        if (columns.length > 0) {
          return columns;
        }
      }
    }

    // Strategy 2: Use tab-based mapping when no data (empty tabs)
    const tabToTypeMapping: Record<string, string> = {
      'Bank Deposit': 'BANK_DEPOSITE',
      'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT', 
      'Money Market Funds': 'MONEY_MARKET_FUNDS',
      'Pension Fund': 'PENSION_FUNDS',
      'Equity': 'EQUITY',
      'Bond': 'BONDS'
    };

    // Try to map investment type filter to liquid fund type
    const mappedType = tabToTypeMapping[filters.investmentType || ''] || 
                      Object.values(tabToTypeMapping).find(type => 
                        (filters.investmentType || '').toLowerCase().includes(type.toLowerCase().replace('_', '-'))
                      );

    if (mappedType) {
      const columns = getDynamicColumnsForType(mappedType);
      if (columns.length > 0) {
        return columns;
      }
    }

    // Strategy 3: Fallback to first available type
    if (catalogData.investmentLiquidFundTypes?.length > 0) {
      const firstAvailableType = catalogData.investmentLiquidFundTypes[0];
      const columns = getDynamicColumnsForType(firstAvailableType.code);
      if (columns.length > 0) {
        return columns;
      }
    }

    return [];
  }, [catalogData, analyticsData, getDynamicColumnsForType, investmentType, filters.investmentType]);

  // Determine if we should show dynamic columns (when we have consistent liquid fund types)
  const shouldShowDynamicColumns = dynamicColumns.length > 0 && !catalogLoading;

  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'reports',
      fromSubView: 'liquid-fund'
    });
    navigateTo(detailsUrl);
  }, []);

  const isLoadingAny = isLoading || catalogLoading;
  const hasError = error || catalogError;

  if (isLoadingAny) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-error`}>
        <Alert
          message="Error Loading Analytics Data"
          description={error || catalogError}
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
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Proprietor</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">Original Currency</TableHead>
                {/* Dynamic columns from catalog - replace ALL hardcoded columns */}
                {shouldShowDynamicColumns && dynamicColumns.map((column) => (
                  <TableHead 
                    key={column.id}
                    className={`gba:font-semibold gba:text-gray-700 gba:py-3 gba:px-4 ${column.className || 'gba:text-left'}`}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={
                    // Calculate total columns: base + dynamic only
                    2 + // Base: Proprietor, Original Currency 
                    (shouldShowDynamicColumns ? dynamicColumns.length : 0) // All other columns are dynamic
                  } className="gba:text-center gba:py-12 gba:text-gray-500">
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <DollarSign className="gba:h-12 gba:w-12 gba:text-gray-300" />
                      <p className="gba:text-lg gba:font-medium">No {investmentType} Data Found</p>
                      <p className="gba:text-sm">No liquid fund portfolios are available for {investmentType.toLowerCase()} in the selected time period.</p>
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
                      <TableCell className="gba:py-3 gba:px-4">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <DollarSign className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span className="gba:font-medium">{row.proprietorName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4">
                        <Badge variant="outline">{row.originalCurrency}</Badge>
                      </TableCell>
                      {/* Dynamic columns from catalog - replace ALL hardcoded columns */}
                      {shouldShowDynamicColumns && dynamicColumns.map((column) => (
                        <TableCell 
                          key={column.id}
                          className={`gba:py-3 gba:px-4 ${column.className || 'gba:text-left'}`}
                        >
                          {column.getValue(row)}
                        </TableCell>
                      ))}
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