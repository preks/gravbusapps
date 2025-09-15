import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system';
import { Spin, Alert, DatePicker } from 'antd';
import { FilterIcon, FlipHorizontalIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  useGetInvestmentReports
} from '@/common/data/investment/hooks/useInvestmentReports';
import { type InvestmentReportQueryVariables } from '@/common/data/investment/queries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { RangePicker } = DatePicker;

interface ColumnDefinition {
  key: string;
  title: string;
  width?: string;
  sortable?: boolean;
  render: (record: any) => React.ReactElement;
}

interface InvestmentReportsTabProps extends BusinessAppContextProps {
  investmentId: string;
  // Component decides what filters to apply - no more complex reportType logic
  investmentGroupIds?: string[]; // Filter by investment groups (e.g., ['InvestmentGroup:v1:EQUITY'])
  specificInvestmentId?: string; // For filtering by specific equity/liquidFund/realEstate investment ID
  'data-testid'?: string;
}

const InvestmentReportsTab: React.FC<InvestmentReportsTabProps> = ({
  investmentId,
  investmentGroupIds,
  specificInvestmentId,
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'investment-reports-tab'
}) => {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'>('DESC_NULLS_LAST');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [isTransposed, setIsTransposed] = useState(false);

  const { fetchInvestmentReports } = useGetInvestmentReports({ accessToken, userInfo } as BusinessAppContextProps);

  const loadReports = useCallback(async () => {
    if (!investmentId) return;
    setIsLoading(true);
    setError(null);
    
    try {
      // Simple approach - build parameters and let the component decide what it needs
      const params: InvestmentReportQueryVariables = {
        investmentIds: [investmentId],
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: [{ field: sortField, direction: sortOrder }]
      };

      // Add investment group filtering if specified (component decides)
      // Note: This would need to be added to InvestmentReportQueryVariables interface
      // For now, we'll handle filtering in the GraphQL query or client-side
      if (investmentGroupIds?.length) {
        // TODO: Add investmentGroupIds to InvestmentReportQueryVariables interface
        // Investment group filtering requested
      }

      // Add specific investment ID filters if needed
      if (specificInvestmentId) {
        // Component can decide which type of specific ID to use
        params.equityInvestmentIds = [specificInvestmentId];
        params.liquidFundInvestmentIds = [specificInvestmentId];
        params.realEstateInvestmentIds = [specificInvestmentId];
      }

      // Handle date filtering
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.reportDateFrom = dateRange[0].format('YYYY-MM-DD');
        params.reportDateTo = dateRange[1].format('YYYY-MM-DD');
      } else if (timeFilter !== 'all') {
        const now = dayjs();
        let startDate: dayjs.Dayjs | null = null;
        switch (timeFilter) {
          case 'last7days': startDate = now.subtract(7, 'days'); break;
          case 'last30days': startDate = now.subtract(30, 'days'); break;
          case 'last3months': startDate = now.subtract(3, 'months'); break;
          case 'last6months': startDate = now.subtract(6, 'months'); break;
          case 'lastyear': startDate = now.subtract(1, 'year'); break;
          default: startDate = null;
        }
        if (startDate) {
          params.reportDateFrom = startDate.format('YYYY-MM-DD');
        }
      }

      const response = await fetchInvestmentReports(params);
      
      // Simple - just use the InvestmentReport objects as they are
      // The component can extract nested data if needed for display
      setReports(response.InvestmentReport || []);
      setTotal(response.InvestmentReportAggregate?.aggregate?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, investmentGroupIds, specificInvestmentId, currentPage, pageSize, sortField, sortOrder, dateRange, timeFilter, fetchInvestmentReports]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Helper functions for formatting
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    return dayjs(date).format('MMM DD, YYYY');
  };

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC_NULLS_LAST' ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST');
    } else {
      setSortField(field);
      setSortOrder('ASC_NULLS_LAST');
    }
    setCurrentPage(1);
  };

  // Simple column definitions - just show the main InvestmentReport data
  const columns: ColumnDefinition[] = useMemo(() => {
    const dateColumn: ColumnDefinition = {
      key: 'date',
      title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.date', 'Date'),
      sortable: true,
      render: (record: any) => <span>{formatDate(record.date)}</span>,
    };

    const marketValueColumn: ColumnDefinition = {
      key: 'investmentMarketValue',
      title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.marketValue', 'Market Value'),
      sortable: true,
      render: (record: any) => <span>{formatCurrency(record.investmentMarketValue)}</span>,
    };

    const revenueColumn: ColumnDefinition = {
      key: 'forecastedRevenueAmount',
      title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.revenue', 'Forecasted Revenue'),
      sortable: true,
      render: (record: any) => <span>{formatCurrency(record.forecastedRevenueAmount)}</span>,
    };

    const profitColumn: ColumnDefinition = {
      key: 'forecastedProfitAmount',
      title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.profit', 'Forecasted Profit'),
      sortable: true,
      render: (record: any) => <span>{formatCurrency(record.forecastedProfitAmount)}</span>,
    };

    const actionsColumn: ColumnDefinition = {
      key: 'actions',
      title: 'ACTIONS',
      width: '60px',
      render: (record: any) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <AppActionButton
            data-testid={`${dataTestId}-update-report-button-${record.id}`}
            size="icon"
            contextsArray={[FlowContextName.investmentEntity]}
            externalContextData={{ entityId: record.id }}
            prefixDataTestId={`${dataTestId}-update-report`}
            accessToken={accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
    };

    return [dateColumn, marketValueColumn, revenueColumn, profitColumn, actionsColumn];
  }, [dataTestId, accessToken]);

  // Transpose functionality
  const renderTransposedTable = () => {
    const visibleReports = reports.slice(0, 10); // Limit for readability
    const dataColumns = columns.filter(col => col.key !== 'actions' && col.key !== 'date');

    return (
      <Table className="gba:w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-48 gba:text-left gba:font-semibold">Field</TableHead>
            {visibleReports.map((report) => (
              <TableHead key={report.id} className="gba:min-w-32 gba:text-center">
                {formatDate(report.date)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataColumns.map((column) => (
            <TableRow key={column.key}>
              <TableCell className="gba:w-48 gba:text-left gba:font-semibold gba:align-middle">
                {column.title}
              </TableCell>
              {visibleReports.map((report) => (
                <TableCell key={report.id} className="gba:min-w-32 gba:text-center gba:align-middle">
                  {column.render(report)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid={`${dataTestId}-error`}>
        <Alert
          message="Error Loading Reports"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="sm" onClick={loadReports}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      {/* Filters Section */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:p-4 gba:bg-gray-50 gba:rounded-lg">
        <div className="gba:flex gba:items-center gba:gap-2">
          <FilterIcon className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm gba:font-medium gba:text-gray-700">Filters:</span>
        </div>

        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="gba:w-40">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="last7days">Last 7 Days</SelectItem>
            <SelectItem value="last30days">Last 30 Days</SelectItem>
            <SelectItem value="last3months">Last 3 Months</SelectItem>
            <SelectItem value="last6months">Last 6 Months</SelectItem>
            <SelectItem value="lastyear">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="YYYY-MM-DD"
          placeholder={['Start Date', 'End Date']}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTimeFilter('all');
            setDateRange(null);
            setCurrentPage(1);
          }}
        >
          Reset
        </Button>
      </div>

      {/* Reports Table */}
      <div className="gba:bg-white gba:rounded-lg gba:border gba:shadow-sm">
        <div className="gba:p-4 gba:border-b">
          <div className="gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-lg gba:font-semibold">
              Investment Reports ({total})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransposed(!isTransposed)}
            >
              <FlipHorizontalIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Transpose
            </Button>
          </div>
        </div>

        <div className="gba:p-4">
          {isTransposed ? (
            renderTransposedTable()
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={column.sortable ? "gba:cursor-pointer gba:select-none" : ""}
                      onClick={() => column.sortable && handleSort(column.key)}
                      style={{ width: column.width }}
                    >
                      <div className="gba:flex gba:items-center gba:gap-1">
                        {column.title}
                        {column.sortable && sortField === column.key && (
                          <span className="gba:text-xs">
                            {sortOrder === 'ASC_NULLS_LAST' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="gba:text-center gba:py-8 gba:text-gray-500">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render(report)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentReportsTab;