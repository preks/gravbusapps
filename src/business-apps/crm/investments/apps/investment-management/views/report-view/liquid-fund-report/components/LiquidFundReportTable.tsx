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
  Badge,
  Spinner,
  Button,
  Alert
} from '@newwork/nw-design-system';
import { 
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { useLiquidFundReports } from '../hooks/useLiquidFundReports';
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
  isTransposed?: boolean;
  visibleColumns?: string[];
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'analytics-table',
  filters,
  investmentType,
  title,
  isTransposed = false,
  visibleColumns = ['investment', 'date'] // Default to showing investment and date columns
}) => {
  // Format date to match other investment report tables
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

  // Use the dedicated liquid fund reports hook
  const {
    analyticsData,
    isLoading,
    error,
    totalCount,
    refetch
  } = useLiquidFundReports(
    { accessToken, userInfo },
    {
      startDate: filters.startDate,
      endDate: filters.endDate,
      currencyIds: filters.currencyIds,
      investmentType: filters.investmentType
    }
  );

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
    if (analyticsData && analyticsData.length > 0) {
      const liquidFundTypeCodes = Array.from(
        new Set(
          (analyticsData || [])
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
      'Bank Deposits': 'BANK_DEPOSITE',
      'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT',
      'Fixed-Term Deposits': 'FIXED_TERM_DEPOSIT',
      'Money Market Funds': 'MONEY_MARKET_FUNDS',
      'Pension Fund': 'PENSION_FUNDS',
      'Equity': 'EQUITY',
      'Bond': 'BONDS',
      'Multiple Investment Types': 'MONEY_MARKET_FUNDS' // Default to first type for multiple
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

  // Filter dynamic columns based on visibility settings
  const visibleDynamicColumns = useMemo(() => {
    if (!shouldShowDynamicColumns) return [];
    
    // Simple ID-based matching since column IDs now match exactly between parent and table
    const visibleSet = new Set(visibleColumns);
    return dynamicColumns.filter(column => visibleSet.has(column.id));
  }, [dynamicColumns, shouldShowDynamicColumns, visibleColumns]);

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
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }} data-testid={`${dataTestId}-loading`}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }} data-testid={`${dataTestId}-error`}>
        <Alert variant="destructive">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div style={{ fontWeight: 'var(--nw-font-weight-medium)' }}>Error Loading Analytics Data</div>
              {(error || catalogError) && (
                <div style={{ fontSize: 'var(--nw-text-sm)', marginTop: 'var(--nw-spacing-1)', color: 'var(--nw-color-text-secondary)' }}>
                  {typeof error === 'string' ? error : error?.message || 'Unknown error'}
                  {catalogError && ` | ${catalogError}`}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw style={{ height: 'var(--nw-spacing-4)', width: 'var(--nw-spacing-4)' }} />
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
          <DollarSign style={{ height: 'var(--nw-spacing-5)', width: 'var(--nw-spacing-5)' }} />
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
            {!isTransposed ? (
              // Normal table view
              <>
                <TableHeader>
                  <TableRow style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)', backgroundColor: 'var(--nw-color-surface-secondary)' }}>
                    {/* Static columns that are consistent across all investment report tabs */}
                    {visibleColumns.includes('investment') && (
                      <TableHead 
                        style={{ 
                          textAlign: 'left',
                          fontWeight: 'var(--nw-font-weight-semibold)', 
                          fontFamily: 'var(--nw-font-family-base)', 
                          color: 'var(--nw-color-text-primary)', 
                          padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' 
                        }}
                      >
                        Investment
                      </TableHead>
                    )}
                    {visibleColumns.includes('date') && (
                      <TableHead 
                        style={{ 
                          textAlign: 'center',
                          fontWeight: 'var(--nw-font-weight-semibold)', 
                          fontFamily: 'var(--nw-font-family-base)', 
                          color: 'var(--nw-color-text-primary)', 
                          padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' 
                        }}
                      >
                        Date
                      </TableHead>
                    )}
                    {/* Dynamic columns based on catalog configuration */}
                    {shouldShowDynamicColumns && visibleDynamicColumns.map((column) => {
                      const textAlign = column.className?.includes('text-center') ? 'center' : column.className?.includes('text-right') ? 'right' : 'left';
                      
                      return (
                        <TableHead 
                          key={column.id}
                          style={{ 
                            textAlign,
                            fontWeight: 'var(--nw-font-weight-semibold)', 
                            fontFamily: 'var(--nw-font-family-base)', 
                            color: 'var(--nw-color-text-primary)', 
                            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' 
                          }}
                        >
                          {column.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!analyticsData || analyticsData.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={
                        (visibleColumns.includes('investment') ? 1 : 0) + 
                        (visibleColumns.includes('date') ? 1 : 0) + 
                        (shouldShowDynamicColumns ? visibleDynamicColumns.length : 0)
                      } style={{
                        textAlign: 'center',
                        padding: 'var(--nw-spacing-12) 0',
                        color: 'var(--nw-muted-foreground)'
                      }}>
                        <div className="gba:flex gba:flex-col gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                          <DollarSign style={{ height: 'var(--nw-spacing-12)', width: 'var(--nw-spacing-12)', color: 'var(--nw-muted-foreground)' }} />
                          <p style={{ fontSize: 'var(--nw-text-lg)', fontWeight: 'var(--nw-font-weight-medium)' }}>No {investmentType} Data Found</p>
                          <p style={{ fontSize: 'var(--nw-text-sm)' }}>No liquid fund portfolios are available for {investmentType.toLowerCase()} in the selected time period.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (analyticsData || []).map((row, index) => (
                        <TableRow
                          key={row.id}
                          className="gba:cursor-pointer"
                          style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                          data-testid={`${dataTestId}-row-${index + 1}`}
                        >
                          {/* Static columns that are consistent across all investment report tabs */}
                          {visibleColumns.includes('investment') && (
                            <TableCell style={{ padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' }}>
                              <div className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                                <DollarSign style={{ width: 'var(--nw-spacing-4)', height: 'var(--nw-spacing-4)', color: 'var(--nw-color-text-secondary)' }} />
                                <span style={{ fontWeight: 'var(--nw-font-weight-medium)' }}>{row.investmentName}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('date') && (
                            <TableCell style={{
                              textAlign: 'center',
                              padding: 'var(--nw-spacing-3) var(--nw-spacing-4)'
                            }}>
                              {row.reportDate ? formatDate(row.reportDate) : '-'}
                            </TableCell>
                          )}
                          {/* Dynamic columns based on catalog configuration */}
                          {shouldShowDynamicColumns && visibleDynamicColumns.map((column) => (
                            <TableCell 
                              key={column.id}
                              style={{ 
                                textAlign: column.className?.includes('text-center') ? 'center' : column.className?.includes('text-right') ? 'right' : 'left',
                                padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' 
                              }}
                            >
                              {column.getValue(row)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </>
            ) : (
              // Transposed table view
              <>
                <TableHeader>
                  <TableRow style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)', backgroundColor: 'var(--nw-color-surface-secondary)' }}>
                    <TableHead style={{
                      fontWeight: 'var(--nw-font-weight-semibold)',
                      textAlign: 'left',
                      padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                      width: '200px',
                      color: 'var(--nw-color-text-primary)'
                    }}>
                      Field
                    </TableHead>
                    {analyticsData && analyticsData.map((row, index) => (
                      <TableHead 
                        key={row.id || index}
                        style={{
                          fontWeight: 'var(--nw-font-weight-semibold)',
                          textAlign: 'left',
                          padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                          color: 'var(--nw-color-text-primary)',
                          cursor: 'pointer'
                        }}
                        onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                      >
                        {row.investmentName || `Investment ${index + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!analyticsData || analyticsData.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={1 + (analyticsData?.length || 0)} style={{
                        textAlign: 'center',
                        padding: 'var(--nw-spacing-12) 0',
                        color: 'var(--nw-muted-foreground)'
                      }}>
                        <div className="gba:flex gba:flex-col gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                          <DollarSign style={{ height: 'var(--nw-spacing-12)', width: 'var(--nw-spacing-12)', color: 'var(--nw-muted-foreground)' }} />
                          <p style={{ fontSize: 'var(--nw-text-lg)', fontWeight: 'var(--nw-font-weight-medium)' }}>No {investmentType} Data Found</p>
                          <p style={{ fontSize: 'var(--nw-text-sm)' }}>No liquid fund portfolios are available for {investmentType.toLowerCase()} in the selected time period.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {/* Date row */}
                      {visibleColumns.includes('date') && (
                        <TableRow style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}>
                          <TableCell style={{
                            fontWeight: 'var(--nw-font-weight-semibold)',
                            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                            backgroundColor: 'var(--nw-color-surface-secondary)'
                          }}>
                            Date
                          </TableCell>
                          {analyticsData.map((row, index) => (
                            <TableCell 
                              key={row.id || index}
                              style={{
                                padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                                cursor: 'pointer',
                                textAlign: 'center'
                              }}
                              onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {row.reportDate ? formatDate(row.reportDate) : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
                      {/* Dynamic columns as rows */}
                      {shouldShowDynamicColumns && visibleDynamicColumns.map((column) => (
                        <TableRow
                          key={column.id}
                          style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
                        >
                          <TableCell style={{
                            fontWeight: 'var(--nw-font-weight-semibold)',
                            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                            backgroundColor: 'var(--nw-color-surface-secondary)'
                          }}>
                            {column.label}
                          </TableCell>
                          {analyticsData.map((row, index) => (
                            <TableCell 
                              key={row.id || index}
                              style={{
                                padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                                cursor: 'pointer',
                                textAlign: column.className?.includes('text-center') ? 'center' : column.className?.includes('text-right') ? 'right' : 'left'
                              }}
                              onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {column.getValue(row)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};