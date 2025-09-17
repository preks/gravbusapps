// Investment Reports Tab - Refactored for Size Compliance
import React, { useCallback, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from '@newwork/nw-design-system';
import { Spin, Alert } from 'antd';
import { FlipHorizontalIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentReports } from '@/common/data/investment/hooks/useInvestmentReports';
import { type InvestmentReportQueryVariables } from '@/common/data/investment/queries';
import { createInvestmentReportColumns, ColumnDefinition } from './utils/columnDefinitions';
import TransposedTable from './components/TransposedTable';
import ReportFilters from './components/ReportFilters';

interface InvestmentReportsTabProps extends BusinessAppContextProps {
  investmentId: string;
  investmentGroupIds?: string[];
  specificInvestmentId?: string;
  customColumns?: ColumnDefinition[];
  investmentType?: string;
  'data-testid'?: string;
}

const InvestmentReportsTab: React.FC<InvestmentReportsTabProps> = ({
  investmentId,
  investmentGroupIds,
  specificInvestmentId,
  customColumns,
  investmentType,
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
      const params: InvestmentReportQueryVariables = {
        investmentIds: [investmentId],
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: [{ field: sortField, direction: sortOrder }]
      };

      if (investmentGroupIds?.length) {
        // TODO: Add investmentGroupIds to InvestmentReportQueryVariables interface
      }

      if (specificInvestmentId) {
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC_NULLS_LAST' ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST');
    } else {
      setSortField(field);
      setSortOrder('ASC_NULLS_LAST');
    }
    setCurrentPage(1);
  };

  // Generate columns using the factory function
  const columns: ColumnDefinition[] = React.useMemo(() => {
    if (customColumns && customColumns.length > 0) {
      return customColumns;
    }
    return createInvestmentReportColumns(investmentType, accessToken);
  }, [customColumns, investmentType, accessToken]);

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateRange(dates);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setTimeFilter('all');
    setDateRange(null);
    setCurrentPage(1);
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
          action={<Button size="sm" onClick={loadReports}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      {/* Filters */}
      <ReportFilters
        timeFilter={timeFilter}
        dateRange={dateRange}
        onTimeFilterChange={handleTimeFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onClearFilters={handleClearFilters}
        data-testid={`${dataTestId}-filters`}
      />

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
            <TransposedTable 
              columns={columns} 
              reports={reports} 
              data-testid={`${dataTestId}-transposed`}
            />
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
