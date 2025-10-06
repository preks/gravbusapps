import React, { useCallback, useMemo } from 'react';
import {
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
import { Building2 } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { TableStateWrapper } from "../../components/shared";
import { RealEstateReportFilters } from '../types';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { createInvestmentReportColumns } from '@/business-apps/crm/investments/apps/investment-record/components/shared/columnDefinitions';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import type { InvestmentReportQueryVariables } from '@/common/data/investment-report/queries/investmentReportQueries';
import { useState, useEffect } from 'react';

interface RealEstateAnalyticsTableProps extends BusinessAppContextProps {
  'data-testid'?: string;
  filters: RealEstateReportFilters;
  investmentType: string;
  investmentTypeValue: string; // User-friendly name for display
  title: string;
  catalogData: any; // Required for dynamic columns
  isTransposed?: boolean; // Toggle for transposed table view
  visibleColumns?: string[]; // Column visibility control
}

export const RealEstateAnalyticsTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics-table',
  filters,
  investmentType,
  investmentTypeValue,
  title,
  catalogData,
  isTransposed = false,
  visibleColumns = ['investment', 'date'] // Default to showing investment and date columns
}) => {
  // State management
  const [reports, setReports] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use common data layer
  const { fetchInvestmentReports } = useGetInvestmentReports({ accessToken, userInfo });

  // Fetch data function
  const loadReports = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const variables: InvestmentReportQueryVariables = {
        investmentGroupIds: ['InvestmentGroup:v1:REAL_ESTATE'],
        limit: 1000,
        offset: 0,
        orderBy: [{ field: 'date', direction: 'DESC' }]
      };

      if (filters.startDate) {
        variables.reportDateFrom = filters.startDate;
      }
      if (filters.endDate) {
        variables.reportDateTo = filters.endDate;
      }
      if (investmentType && investmentType !== 'all') {
        variables.investmentTypeIds = [`InvestmentType:v1:${investmentType}`];
      }

      const { reports: fetchedReports, total } = await fetchInvestmentReports(variables);

      // Get latest report per investment
      const latestReportsByInvestment = new Map<string, any>();
      fetchedReports.forEach((report: any) => {
        const investmentId = report.investment?.id;
        if (!investmentId) return;

        const existingReport = latestReportsByInvestment.get(investmentId);
        if (!existingReport || new Date(report.date) > new Date(existingReport.date)) {
          latestReportsByInvestment.set(investmentId, report);
        }
      });

      const latestReports = Array.from(latestReportsByInvestment.values());
      setReports(latestReports);
      
      // Derive totalCount from actual visible data to match what user sees
      // (accounts for client-side deduping)
      setTotalCount(latestReports.length || total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load reports'));
      console.error('Error loading real estate reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, filters.startDate, filters.endDate, investmentType, fetchInvestmentReports]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const refetch = loadReports;

  // Create dynamic columns using the same pattern as EquityAnalyticsTable
  const columns = useMemo(() => {
    // First add the static Investment column
    const staticColumns = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        render: (record: any) => (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--nw-spacing-2)'
          }}>
            <Building2 style={{
              width: 'var(--nw-spacing-4)',
              height: 'var(--nw-spacing-4)',
              color: 'var(--nw-muted-foreground)'
            }} />
            <span className="gba:font-medium">{record.investment?.name || 'N/A'}</span>
          </div>
        )
      }
    ];

    // Don't create dynamic columns if catalog data isn't ready
    if (!catalogData) {
      return staticColumns;
    }

    // Then add dynamic columns from catalog data
    // For reports-view, we don't have a specific mainInvestment/typeSpecificData
    // since we're showing multiple investments, so we pass undefined for those parameters

    // For reports-view, provide investment group context for correct column logic
    // Real estate investments should use group-level form fields
    const mockInvestmentForContext = {
      investmentGroup: { code: 'REAL_ESTATE' } // Provide real estate group context for correct column logic
    };
    
    const dynamicColumns = createInvestmentReportColumns(
      investmentType, // investment type code
      undefined, // liquidFundTypeCode - not applicable for real estate
      catalogData,
      undefined, // Remove accessToken to exclude actions column
      mockInvestmentForContext, // Provide investment group context
      undefined  // mainTypeSpecificData - not applicable for reports-view
    );

    return [...staticColumns, ...dynamicColumns];
  }, [investmentType, catalogData, accessToken]);

  // Filter columns based on visibility settings
  const visibleColumnsArray = useMemo(() => {
    // Simple ID-based matching since column keys match the column IDs from parent
    const visibleSet = new Set(visibleColumns);
    return columns.filter(column => visibleSet.has(column.key));
  }, [columns, visibleColumns]);

  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'reports',
      fromSubView: 'real-estate'
    });
    navigateTo(detailsUrl);
  }, []);

  return (
    <TableStateWrapper
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      dataTestId={dataTestId}
      icon={<Building2 />}
    >
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
          <Building2 style={{ height: 'var(--nw-spacing-5)', width: 'var(--nw-spacing-5)', color: 'var(--nw-color-success-500)' }} />
          {title}
          <Badge variant="outline">{getTranslationFromI18nKeyAndLabel('real-estate-analytics.properties-count', `${totalCount} properties`)}</Badge>
        </CardTitle>
        <CardDescription>
          {getTranslationFromI18nKeyAndLabel('real-estate-analytics.description', `Property analysis for ${investmentTypeValue.toLowerCase()} real estate investments`)}
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
                      {visibleColumnsArray.map((column) => (
                        <TableHead 
                          key={column.key}
                          style={{ 
                            textAlign: 'left',
                            width: column.width,
                            fontWeight: 'var(--nw-font-weight-semibold)', 
                            fontFamily: 'var(--nw-font-family-base)', 
                            color: 'var(--nw-color-text-primary)', 
                            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' 
                          }}
                        >
                          {column.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumnsArray.length} style={{
                          textAlign: 'center',
                          padding: 'var(--nw-spacing-12) 0',
                          color: 'var(--nw-muted-foreground)'
                        }}>
                          <div className="gba:flex gba:flex-col gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                            <Building2 style={{ height: 'var(--nw-spacing-12)', width: 'var(--nw-spacing-12)', color: 'var(--nw-muted-foreground)' }} />
                            <p style={{ fontSize: 'var(--nw-text-lg)', fontWeight: 'var(--nw-font-weight-medium)' }}>No {investmentTypeValue} Data Found</p>
                            <p style={{ fontSize: 'var(--nw-text-sm)' }}>No real estate investment reports are available for {investmentTypeValue.toLowerCase()} in the selected time period.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.map((report) => (
                        <TableRow
                          key={report.id}
                          className="gba:cursor-pointer"
                          style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                          data-testid={`${dataTestId}-row-${report.id}`}
                        >
                          {visibleColumnsArray.map((column) => (
                            <TableCell 
                              key={column.key}
                              style={{ padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' }}
                            >
                              {column.render(report)}
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
                  <TableRow style={{
                    borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)',
                    backgroundColor: 'var(--nw-color-surface-secondary)'
                  }}>
                    <TableHead style={{
                      fontWeight: 'var(--nw-font-weight-semibold)',
                      textAlign: 'left',
                      padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                      width: '200px',
                      color: 'var(--nw-color-text-primary)'
                    }}>
                      Field
                    </TableHead>
                    {reports.map((report, index) => (
                      <TableHead 
                        key={report.id || index}
                        style={{
                          fontWeight: 'var(--nw-font-weight-semibold)',
                          textAlign: 'left',
                          padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                          color: 'var(--nw-color-text-primary)',
                          cursor: 'pointer'
                        }}
                        onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                      >
                        {report.investment?.name || `Investment ${index + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={reports.length + 1} style={{
                        textAlign: 'center',
                        padding: 'var(--nw-spacing-12) 0',
                        color: 'var(--nw-muted-foreground)'
                      }}>
                        <div className="gba:flex gba:flex-col gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                          <Building2 style={{ height: 'var(--nw-spacing-12)', width: 'var(--nw-spacing-12)', color: 'var(--nw-muted-foreground)' }} />
                          <p style={{ fontSize: 'var(--nw-text-lg)', fontWeight: 'var(--nw-font-weight-medium)' }}>No {investmentTypeValue} Data Found</p>
                          <p style={{ fontSize: 'var(--nw-text-sm)' }}>No real estate investment reports are available for {investmentTypeValue.toLowerCase()} in the selected time period.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleColumnsArray.map((column) => (
                        <TableRow
                          key={column.key}
                          style={{
                            borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)'
                          }}
                        >
                          <TableCell style={{
                            fontWeight: 'var(--nw-font-weight-semibold)',
                            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                            backgroundColor: 'var(--nw-color-surface-secondary)'
                          }}>
                            {column.title}
                          </TableCell>
                          {reports.map((report, index) => (
                            <TableCell 
                              key={report.id || index}
                              style={{
                                padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                                cursor: 'pointer'
                              }}
                              onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {column.render(report)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </div>
      </CardContent>
    </TableStateWrapper>
  );
};