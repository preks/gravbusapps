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
import { PieChart } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useUniversalInvestmentReportsAnalytics, TableStateWrapper } from "../../components/shared";
import { EquityAnalyticsFilters } from '../types';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { createInvestmentReportColumns } from '@/business-apps/crm/investments/apps/investment-record/components/shared/columnDefinitions';

interface EquityAnalyticsTableProps extends BusinessAppContextProps {
  'data-testid'?: string;
  filters: EquityAnalyticsFilters;
  investmentType: string;
  investmentTypeValue: string; // User-friendly name for display
  title: string;
  catalogData: any; // Required for dynamic columns
}

export const EquityAnalyticsTable: React.FC<EquityAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'equity-analytics-table',
  filters,
  investmentType,
  investmentTypeValue,
  title,
  catalogData
}) => {
  // Create stable filters object to prevent infinite loops
  const stableFilters = useMemo(() => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    investmentType: investmentType
  }), [filters.startDate, filters.endDate, investmentType]);

  // Use the new simplified data source
  const {
    reports,
    totalCount,
    isLoading,
    error,
    refetch
  } = useUniversalInvestmentReportsAnalytics({
    accessToken,
    userInfo,
    filters: stableFilters,
    investmentGroup: 'EQUITY'
  });

  // Create dynamic columns using the same pattern as InvestmentReportsTab
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
            <PieChart className="gba:w-4 gba:h-4" style={{ color: 'var(--nw-color-text-secondary)' }} />
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
    // Note: For reports-view, we don't have a specific mainInvestment/typeSpecificData
    // since we're showing multiple investments, so we pass undefined for those parameters

    // For reports-view, provide investment group context for correct column logic
    // Equity investments should use group-level form fields, not type-level
    const mockInvestmentForContext = {
      investmentGroup: { code: 'EQUITY' } // Provide equity group context for correct column logic
    };
    
    const dynamicColumns = createInvestmentReportColumns(
      investmentType, // investment type code
      undefined, // liquidFundTypeCode - not applicable for equity
      catalogData,
      undefined, // Remove accessToken to exclude actions column
      mockInvestmentForContext, // Provide investment group context
      undefined  // mainTypeSpecificData - not applicable for reports-view
    );

    return [...staticColumns, ...dynamicColumns];
  }, [investmentType, catalogData, accessToken]);





  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'reports',
      fromSubView: 'equity'
    });
    navigateTo(detailsUrl);
  }, []);


  return (
    <TableStateWrapper
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      dataTestId={dataTestId}
      icon={<PieChart />}
    >
      <CardHeader>
        <CardTitle style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--nw-spacing-sm)'
        }}>
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
              <TableRow style={{
                borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)',
                backgroundColor: 'var(--nw-color-surface-secondary)'
              }}>
                {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  style={{
                    fontWeight: 'var(--nw-font-weight-semibold)',
                    textAlign: 'left',
                    padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                    width: column.width,
                    color: 'var(--nw-color-text-primary)'
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
                  <TableCell colSpan={columns.length} style={{
                    textAlign: 'center',
                    padding: 'var(--nw-spacing-12) 0',
                    color: 'var(--nw-muted-foreground)'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--nw-spacing-2)'
                    }}>
                      <PieChart style={{
                        height: 'var(--nw-spacing-12)',
                        width: 'var(--nw-spacing-12)',
                        color: 'var(--nw-muted-foreground)'
                      }} />
                      <p style={{
                        fontSize: 'var(--nw-text-lg)',
                        fontWeight: '500'
                      }}>No {investmentTypeValue} Data Found</p>
                      <p style={{
                        fontSize: 'var(--nw-text-sm)'
                      }}>No equity investment reports are available for {investmentTypeValue.toLowerCase()} in the selected time period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {reports.map((report, index) => (
                    <TableRow
                      key={report.id}
                      style={{
                        cursor: 'pointer',
                        borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                      data-testid={report.id ? `${dataTestId}-row-${report.id}` : `${dataTestId}-row-${index + 1}`}
                    >
                      {columns.map((column) => (
                        <TableCell 
                          key={column.key}
                          style={{
                            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)'
                          }}
                        >
                          {column.render(report)}
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
    </TableStateWrapper>
  );
};
