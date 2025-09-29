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
import { useUniversalInvestmentReportsAnalytics, TableStateWrapper } from "../../components/shared";
import { RealEstateReportFilters } from '../types';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { createInvestmentReportColumns } from '@/business-apps/crm/investments/apps/investment-record/components/shared/columnDefinitions';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface RealEstateAnalyticsTableProps extends BusinessAppContextProps {
  'data-testid'?: string;
  filters: RealEstateReportFilters;
  investmentType: string;
  investmentTypeValue: string; // User-friendly name for display
  title: string;
  catalogData: any; // Required for dynamic columns
}

export const RealEstateAnalyticsTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics-table',
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

  // Use the universal reports data hook for Real Estate
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
    investmentGroup: 'REAL_ESTATE'
  });

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
            <TableHeader>
              <TableRow style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)', backgroundColor: 'var(--nw-color-surface-secondary)' }}>
                {columns.map((column) => (
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
                  <TableCell colSpan={columns.length} style={{
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
                <>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="gba:cursor-pointer"
                      style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                      data-testid={`${dataTestId}-row-${report.id}`}
                    >
                      {columns.map((column) => (
                        <TableCell 
                          key={column.key}
                          style={{ padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' }}
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