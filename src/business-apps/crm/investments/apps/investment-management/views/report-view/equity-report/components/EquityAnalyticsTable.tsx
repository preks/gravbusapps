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
  Button,
  Spinner
} from '@newwork/nw-design-system';
import { 
  RefreshCw,
  PieChart,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEquityReportsData } from "../hooks/useEquityReportsData";
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
  } = useEquityReportsData({
    accessToken,
    userInfo,
    filters: stableFilters
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
          <div className="gba:flex gba:items-center gba:gap-2">
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
      accessToken,
      mockInvestmentForContext, // Provide investment group context
      undefined  // mainTypeSpecificData - not applicable for reports-view
    );

    return [...staticColumns, ...dynamicColumns];
  }, [investmentType, catalogData, accessToken]);

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
      return <span style={{ color: 'var(--nw-color-text-secondary)' }}>0%</span>;
    }

    const positiveColor = 'var(--nw-color-success-500)';
    const negativeColor = 'var(--nw-color-danger-500)';
    
    const icon = value > 0 
      ? <TrendingUp className="gba:h-3 gba:w-3" style={{ color: positiveColor }} />
      : <TrendingDown className="gba:h-3 gba:w-3" style={{ color: negativeColor }} />;
    
    const textColor = value > 0 ? positiveColor : negativeColor;

    return (
      <div className="gba:flex gba:items-center gba:gap-1" style={{ color: textColor }}>
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
    const positiveColor = 'var(--nw-color-success-500)';
    const negativeColor = 'var(--nw-color-danger-500)';
    
    const icon = amount >= 0 
      ? <TrendingUp className="gba:h-3 gba:w-3" style={{ color: positiveColor }} />
      : <TrendingDown className="gba:h-3 gba:w-3" style={{ color: negativeColor }} />;
    
    const textColor = amount >= 0 ? positiveColor : negativeColor;

    return (
      <div className="gba:flex gba:items-center gba:gap-1" style={{ color: textColor }}>
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

  const hasData = !isLoading && !error && reports.length > 0;

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center" style={{ color: 'var(--nw-color-danger-500)' }}>
            <PieChart className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4" style={{ color: 'var(--nw-color-danger-500)' }} />
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
              <TableRow className="gba:border-b" style={{ backgroundColor: 'var(--nw-color-surface-secondary)' }}>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className="gba:font-semibold gba:text-left gba:py-3 gba:px-4"
                    style={{ 
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
                  <TableCell colSpan={columns.length} className="gba:text-center gba:py-12" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <PieChart className="gba:h-12 gba:w-12" style={{ color: 'var(--nw-muted-foreground)' }} />
                      <p className="gba:text-lg gba:font-medium">No {investmentTypeValue} Data Found</p>
                      <p className="gba:text-sm">No equity investment reports are available for {investmentTypeValue.toLowerCase()} in the selected time period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {reports.map((report, index) => (
                    <TableRow
                      key={report.id}
                      className="gba:cursor-pointer gba:border-b"
                      style={{
                        '&:hover': {
                          backgroundColor: 'var(--nw-color-surface-secondary)'
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                      }}
                      onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                      data-testid={report.id ? `${dataTestId}-row-${report.id}` : `${dataTestId}-row-${index + 1}`}
                    >
                      {columns.map((column) => (
                        <TableCell 
                          key={column.key}
                          className="gba:py-3 gba:px-4"
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
    </Card>
  );
};
