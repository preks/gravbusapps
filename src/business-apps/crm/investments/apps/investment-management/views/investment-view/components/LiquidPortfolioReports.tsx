import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system';
import { Spin, Alert, DatePicker } from 'antd';
import { 
  CalendarIcon, 
  FilterIcon, 
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  RotateCcwIcon
} from 'lucide-react';
import { PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetLiquidFundPortfolioReports } from '../queries/LiquidPortfolioQueries';
import { LiquidFundPortfolioReportResponse } from '../types/LiquidPortfolioTypes';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface LiquidPortfolioReportsProps extends BusinessAppContextProps {
  portfolioId: string;
  'data-testid'?: string;
}

const LiquidPortfolioReports: React.FC<LiquidPortfolioReportsProps> = ({
  portfolioId,
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'liquid-portfolio-reports'
}) => {
  const [reports, setReports] = useState<LiquidFundPortfolioReportResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<string>('reportDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC');

  // Filter states
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  
  // Transpose state
  const [isTransposed, setIsTransposed] = useState<boolean>(false);

  const { fetchLiquidFundPortfolioReports, fetchLiquidFundPortfolioReportsCount } = 
    useGetLiquidFundPortfolioReports({ accessToken, userInfo });

  const loadReports = useCallback(async () => {
    if (!portfolioId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build where clause
      let whereClause: any = {
        liquidFundPortfolioId: { _eq: portfolioId }
      };

      // Add date filtering
      if (dateRange && dateRange[0] && dateRange[1]) {
        whereClause = {
          ...whereClause,
          reportDate: {
            _gte: dateRange[0].format('YYYY-MM-DD'),
            _lte: dateRange[1].format('YYYY-MM-DD')
          }
        };
      } else if (timeFilter !== 'all') {
        const now = dayjs();
        let startDate;
        
        switch (timeFilter) {
          case 'last7days':
            startDate = now.subtract(7, 'days');
            break;
          case 'last30days':
            startDate = now.subtract(30, 'days');
            break;
          case 'last3months':
            startDate = now.subtract(3, 'months');
            break;
          case 'last6months':
            startDate = now.subtract(6, 'months');
            break;
          case 'lastyear':
            startDate = now.subtract(1, 'year');
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          whereClause = {
            ...whereClause,
            reportDate: { _gte: startDate.format('YYYY-MM-DD') }
          };
        }
      }

      // Build order by
      const orderBy = sortField && sortOrder ? 
        [{ [sortField]: sortOrder }] : 
        [{ reportDate: 'DESC' }];

      // Calculate pagination
      const offset = (currentPage - 1) * pageSize;

      // Fetch reports and count in parallel
      const [reportsData, reportsCount] = await Promise.all([
        fetchLiquidFundPortfolioReports({
          where: whereClause,
          orderBy,
          limit: pageSize,
          offset
        }),
        fetchLiquidFundPortfolioReportsCount({
          where: whereClause
        })
      ]);

      setReports(reportsData);
      setTotal(reportsCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, dateRange, timeFilter, currentPage, pageSize, sortField, sortOrder]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSort = (fieldName: string) => {
    if (sortField !== fieldName) {
      setSortField(fieldName);
      setSortOrder('ASC');
    } else {
      if (sortOrder === '') {
        setSortOrder('ASC');
      } else if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else {
        setSortField('');
        setSortOrder('');
      }
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) return null;
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:h-4 gba:w-4 gba:ml-1" />;
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:h-4 gba:w-4 gba:ml-1" />;
    return null;
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
      onClick={() => handleSort(field)}
      data-testid={`${dataTestId}-sort-header-${field}`}
    >
      <div className="gba:flex gba:items-center">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  const formatCurrency = (amount: number, currencyRef: string): string => {
    const currency = currencyRef?.split(':').pop() || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD MMM YYYY');
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getPerformanceIcon = (value: number) => {
    if (value > 0) return <TrendingUpIcon className="gba:h-4 gba:w-4 gba:text-green-600" />;
    if (value < 0) return <TrendingDownIcon className="gba:h-4 gba:w-4 gba:text-red-600" />;
    return <MinusIcon className="gba:h-4 gba:w-4 gba:text-gray-400" />;
  };

  const getPerformanceBadge = (value: number, isPercentage = false) => {
    const isPositive = value >= 0;
    const displayValue = isPercentage ? formatPercentage(value) : value.toFixed(2);
    return (
      <div className="gba:flex gba:items-center gba:gap-1">
        {getPerformanceIcon(value)}
        <span className={`gba:font-medium ${isPositive ? 'gba:text-green-600' : 'gba:text-red-600'}`}>
          {isPositive ? '+' : ''}{displayValue}
        </span>
      </div>
    );
  };

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    setDateRange(null); // Clear custom date range
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
    setTimeFilter('custom');
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDateRange(null);
    setTimeFilter('all');
    setCurrentPage(1);
  };

  const tableFields = [
    { key: 'startDate', label: 'Start Date', formatter: formatDate },
    { key: 'endDate', label: 'End Date', formatter: formatDate },
    { key: 'currencyRef', label: 'Currency', formatter: (value: string) => value?.split(':').pop() || 'EUR' },
    { key: 'cashFlowAmount', label: 'Cash Flow', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'positiveCashFlowAmount', label: 'Positive Cash Flow', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'negativeCashFlowAmount', label: 'Negative Cash Flow', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'netIncomeAmount', label: 'Net Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'incomeAmount', label: 'Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'expensesAmount', label: 'Expenses', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'accruedAmount', label: 'Accrued Amount', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'accruedInterestRate', label: 'Accrued Interest Rate', formatter: formatPercentage },
    { key: 'realizedIncomeAmount', label: 'Realized Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'realizedMarketIncomeAmount', label: 'Realized Market Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'realizedCurrencyExchangeIncomeAmount', label: 'Realized FX Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'unrealizedIncomeAmount', label: 'Unrealized Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'unrealizedMarketIncomeAmount', label: 'Unrealized Market Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'unrealizedCurrencyExchangeIncomeAmount', label: 'Unrealized FX Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'realizedUnrealizedIncomeAmount', label: 'Total Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'realizedUnrealizedMarketIncomeAmount', label: 'Total Market Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'realizedUnrealizedCurrencyExchangeIncomeAmount', label: 'Total FX Income', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'openMarketValueAmount', label: 'Open Market Value', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'closeMarketValueAmount', label: 'Close Market Value', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'changeMarketValueAmount', label: 'Market Value Change', formatter: (value: number, report: LiquidFundPortfolioReportResponse) => formatCurrency(value, report.currencyRef) },
    { key: 'timeWeightCompoundYieldPercent', label: 'Compound Yield %', formatter: formatPercentage },
    { key: 'timeWeightSectorYieldPercent', label: 'Sector Yield %', formatter: formatPercentage },
    { key: 'benchmarkYieldPercent', label: 'Benchmark Yield %', formatter: formatPercentage },
    { key: 'benchmarkNotes', label: 'Benchmark Notes', formatter: (value: string) => value || 'N/A' },
    { key: 'benchmarkDescription', label: 'Benchmark Description', formatter: (value: string) => value || 'N/A' },
    { key: 'benchmarkFromDate', label: 'Benchmark From Date', formatter: formatDate },
    { key: 'benchmarkToDate', label: 'Benchmark To Date', formatter: formatDate },
    { key: 'depositDescription', label: 'Deposit Description', formatter: (value: string) => value || 'N/A' },
    { key: 'maturityDate', label: 'Maturity Date', formatter: formatDate },
    { key: 'interestRate', label: 'Interest Rate', formatter: formatPercentage },
    { key: 'stocksQuantity', label: 'Stocks Quantity', formatter: (value: number) => value?.toLocaleString() || '0' }
  ];

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-error`}>
        <Alert
          message="Error Loading Reports"
          description={error}
          type="error"
          showIcon
          action={<Button onClick={loadReports} size="sm">Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter historical reports by date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Time Period:</label>
              <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
                <SelectTrigger className="gba:w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last3months">Last 3 Months</SelectItem>
                  <SelectItem value="last6months">Last 6 Months</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timeFilter === 'custom' && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <label className="gba:text-sm gba:font-medium">Date Range:</label>
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="DD/MM/YYYY"
                  placeholder={['Start Date', 'End Date']}
                />
              </div>
            )}

            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto">
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <CalendarIcon className="gba:h-5 gba:w-5" />
                Historical Reports
                <Badge variant="outline">{total} reports</Badge>
              </CardTitle>
              <CardDescription>
                Historical performance and financial data for this portfolio
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsTransposed(!isTransposed)}
              variant="outline"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`${dataTestId}-transpose-button`}
            >
              <RotateCcwIcon className="gba:h-4 gba:w-4" />
              {isTransposed ? 'Normal View' : 'Transpose'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid={`${dataTestId}-empty-state`}>
              No reports found for the selected period.
            </div>
          ) : isTransposed ? (
            /* Transposed Table View */
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${dataTestId}-transposed-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:min-w-[200px]">
                      Report Date
                    </TableHead>
                    {[...reports].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()).map((report) => (
                      <TableHead 
                        key={report.id} 
                        className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:min-w-[150px]"
                      >
                        <div className="gba:text-center gba:w-full">
                          {formatDate(report.reportDate)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableFields.map((field, fieldIndex) => {
                    const sortedReports = [...reports].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
                    return (
                      <TableRow 
                        key={field.key}
                        className="gba:border-b gba:hover:gba:bg-gray-50 gba:transition-colors"
                        data-testid={`${dataTestId}-transposed-row-${fieldIndex + 1}`}
                      >
                        <TableCell className="gba:py-4 gba:px-6 gba:font-medium gba:text-gray-900 gba:bg-gray-50">
                          {field.label}
                        </TableCell>
                        {sortedReports.map((report) => (
                          <TableCell 
                            key={`${field.key}-${report.id}`} 
                            className="gba:py-4 gba:px-6 gba:text-center"
                          >
                            <span className="gba:font-medium gba:text-gray-900">
                              {field.key === 'currencyRef' ? (
                                <Badge variant="outline">
                                  {field.formatter(report[field.key as keyof LiquidFundPortfolioReportResponse] as any)}
                                </Badge>
                              ) : field.key === 'changeMarketValueAmount' || 
                                  field.key === 'timeWeightCompoundYieldPercent' || 
                                  field.key === 'timeWeightSectorYieldPercent' || 
                                  field.key === 'benchmarkYieldPercent' ? (
                                <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                                  {field.formatter(
                                    report[field.key as keyof LiquidFundPortfolioReportResponse] as any, 
                                    report
                                  )}
                                  {getPerformanceIcon(report[field.key as keyof LiquidFundPortfolioReportResponse] as number)}
                                </div>
                              ) : (
                                field.formatter(
                                  report[field.key as keyof LiquidFundPortfolioReportResponse] as any, 
                                  report
                                )
                              )}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${dataTestId}-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <SortableHeader field="reportDate">Report Date</SortableHeader>
                    <SortableHeader field="startDate">Start Date</SortableHeader>
                    <SortableHeader field="endDate">End Date</SortableHeader>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Currency</TableHead>
                    <SortableHeader field="cashFlowAmount">Cash Flow</SortableHeader>
                    <SortableHeader field="positiveCashFlowAmount">Positive Cash Flow</SortableHeader>
                    <SortableHeader field="negativeCashFlowAmount">Negative Cash Flow</SortableHeader>
                    <SortableHeader field="netIncomeAmount">Net Income</SortableHeader>
                    <SortableHeader field="incomeAmount">Income</SortableHeader>
                    <SortableHeader field="expensesAmount">Expenses</SortableHeader>
                    <SortableHeader field="accruedAmount">Accrued Amount</SortableHeader>
                    <SortableHeader field="accruedInterestRate">Accrued Interest Rate</SortableHeader>
                    <SortableHeader field="realizedIncomeAmount">Realized Income</SortableHeader>
                    <SortableHeader field="realizedMarketIncomeAmount">Realized Market Income</SortableHeader>
                    <SortableHeader field="realizedCurrencyExchangeIncomeAmount">Realized FX Income</SortableHeader>
                    <SortableHeader field="unrealizedIncomeAmount">Unrealized Income</SortableHeader>
                    <SortableHeader field="unrealizedMarketIncomeAmount">Unrealized Market Income</SortableHeader>
                    <SortableHeader field="unrealizedCurrencyExchangeIncomeAmount">Unrealized FX Income</SortableHeader>
                    <SortableHeader field="realizedUnrealizedIncomeAmount">Total Income</SortableHeader>
                    <SortableHeader field="realizedUnrealizedMarketIncomeAmount">Total Market Income</SortableHeader>
                    <SortableHeader field="realizedUnrealizedCurrencyExchangeIncomeAmount">Total FX Income</SortableHeader>
                    <SortableHeader field="openMarketValueAmount">Open Market Value</SortableHeader>
                    <SortableHeader field="closeMarketValueAmount">Close Market Value</SortableHeader>
                    <SortableHeader field="changeMarketValueAmount">Market Value Change</SortableHeader>
                    <SortableHeader field="timeWeightCompoundYieldPercent">Compound Yield %</SortableHeader>
                    <SortableHeader field="timeWeightSectorYieldPercent">Sector Yield %</SortableHeader>
                    <SortableHeader field="benchmarkYieldPercent">Benchmark Yield %</SortableHeader>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Benchmark Notes</TableHead>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Benchmark Description</TableHead>
                    <SortableHeader field="benchmarkFromDate">Benchmark From Date</SortableHeader>
                    <SortableHeader field="benchmarkToDate">Benchmark To Date</SortableHeader>
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Deposit Description</TableHead>
                    <SortableHeader field="maturityDate">Maturity Date</SortableHeader>
                    <SortableHeader field="interestRate">Interest Rate</SortableHeader>
                    <SortableHeader field="stocksQuantity">Stocks Quantity</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report, index) => (
                    <TableRow
                      key={report.id}
                      className="gba:border-b gba:hover:gba:bg-gray-50 gba:transition-colors"
                      data-testid={`${dataTestId}-row-${index + 1}`}
                    >
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatDate(report.reportDate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatDate(report.startDate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatDate(report.endDate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <Badge variant="outline">{report.currencyRef?.split(':').pop() || 'EUR'}</Badge>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.cashFlowAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.positiveCashFlowAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.negativeCashFlowAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.netIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.incomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.expensesAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.accruedAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatPercentage(report.accruedInterestRate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.realizedIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.realizedMarketIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.realizedCurrencyExchangeIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.unrealizedIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.unrealizedMarketIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.unrealizedCurrencyExchangeIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.realizedUnrealizedIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.realizedUnrealizedMarketIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatCurrency(report.realizedUnrealizedCurrencyExchangeIncomeAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-semibold gba:text-gray-900">{formatCurrency(report.openMarketValueAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-semibold gba:text-gray-900">{formatCurrency(report.closeMarketValueAmount, report.currencyRef)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">{getPerformanceBadge(report.changeMarketValueAmount)}</TableCell>
                      <TableCell className="gba:py-4 gba:px-6">{getPerformanceBadge(report.timeWeightCompoundYieldPercent, true)}</TableCell>
                      <TableCell className="gba:py-4 gba:px-6">{getPerformanceBadge(report.timeWeightSectorYieldPercent, true)}</TableCell>
                      <TableCell className="gba:py-4 gba:px-6">{getPerformanceBadge(report.benchmarkYieldPercent, true)}</TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:text-sm gba:text-gray-600">{report.benchmarkNotes || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:text-sm gba:text-gray-600">{report.benchmarkDescription || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatDate(report.benchmarkFromDate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatDate(report.benchmarkToDate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:text-sm gba:text-gray-600">{report.depositDescription || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatDate(report.maturityDate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{formatPercentage(report.interestRate)}</span>
                      </TableCell>
                      <TableCell className="gba:py-4 gba:px-6">
                        <span className="gba:font-medium gba:text-gray-900">{report.stocksQuantity?.toLocaleString() || '0'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiquidPortfolioReports;


