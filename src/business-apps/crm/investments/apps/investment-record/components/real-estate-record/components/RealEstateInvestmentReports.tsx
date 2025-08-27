import React, { useCallback, useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@newwork/nw-design-system';
import { Spin, Alert, DatePicker } from 'antd';
import { CalendarIcon, FilterIcon, RotateCcwIcon, TrendingDownIcon, TrendingUpIcon, MinusIcon } from 'lucide-react';
import dayjs from 'dayjs';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_REAL_ESTATE_INVESTMENT_REPORTS } from '@/common/data/investment/queries/investmentReportQueries';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

const { RangePicker } = DatePicker;

interface RealEstateInvestmentReportsProps extends BusinessAppContextProps {
  realEstateInvestmentId: string;
  'data-testid'?: string;
}

const RealEstateInvestmentReports: React.FC<RealEstateInvestmentReportsProps> = ({ realEstateInvestmentId, accessToken, 'data-testid': dataTestId = 'real-estate-investment-reports' }) => {
  const client = useGraphQLClient(accessToken);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('DESC');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [isTransposed, setIsTransposed] = useState<boolean>(false);

  const loadReports = useCallback(async () => {
    if (!realEstateInvestmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const query = GET_REAL_ESTATE_INVESTMENT_REPORTS({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: sortField && sortOrder ? [{ field: sortField, direction: sortOrder }] : [{ field: 'date', direction: 'DESC' }],
        reportDateFrom: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        reportDateTo: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        investmentIds: [realEstateInvestmentId]
      });
      const res = await client.request<{ RealEstateInvestmentReport: any[] }>(query);
      const data = res.RealEstateInvestmentReport || [];
      setReports(data);
      setTotal(data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [realEstateInvestmentId, pageSize, currentPage, sortField, sortOrder, dateRange]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSort = (fieldName: string) => {
    if (sortField !== fieldName) {
      setSortField(fieldName);
      setSortOrder('ASC');
    } else {
      if (sortOrder === '') setSortOrder('ASC');
      else if (sortOrder === 'ASC') setSortOrder('DESC');
      else { setSortField(''); setSortOrder(''); }
    }
    setCurrentPage(1);
  };

  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) return null;
    if (sortOrder === 'ASC') return <TrendingUpIcon className="gba:h-4 gba:w-4 gba:ml-1" />;
    if (sortOrder === 'DESC') return <TrendingDownIcon className="gba:h-4 gba:w-4 gba:ml-1" />;
    return <MinusIcon className="gba:h-4 gba:w-4 gba:ml-1" />;
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

  const formatDate = (value?: string | null) => value ? dayjs(value).format('DD MMM YYYY') : 'N/A';
  const formatNumber = (value?: number | null) => value === null || value === undefined ? 'N/A' : new Intl.NumberFormat('de-DE').format(Number(value));
  const formatPercent = (value?: number | null) => value === null || value === undefined ? 'N/A' : `${Number(value).toFixed(2)}%`;

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
        <Alert message="Error Loading Investment Reports" description={error} type="error" showIcon action={<Button onClick={loadReports} size="sm">Retry</Button>} />
      </div>
    );
  }

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FilterIcon className="gba:h-5 gba:w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter real estate investment reports by date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:font-medium">Time Period:</label>
              <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setDateRange(null); setCurrentPage(1); }}>
                <SelectTrigger className="gba:w-[180px]"><SelectValue placeholder="Select period" /></SelectTrigger>
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
                <RangePicker value={dateRange} onChange={(dates) => { setDateRange(dates); setTimeFilter('custom'); setCurrentPage(1); }} format="DD/MM/YYYY" placeholder={["Start Date", "End Date"]} />
              </div>
            )}
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto">
              <Button onClick={() => { setDateRange(null); setTimeFilter('all'); setCurrentPage(1); }} variant="outline" size="sm">Clear Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <CalendarIcon className="gba:h-5 gba:w-5" />
                Investment Reports
                <Badge variant="outline">{total} reports</Badge>
              </CardTitle>
              <CardDescription>Historical data for this real estate investment</CardDescription>
            </div>
            <Button onClick={() => setIsTransposed(!isTransposed)} variant="outline" size="sm" className="gba:flex gba:items-center gba:gap-2" data-testid={`${dataTestId}-transpose-button`}>
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
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${dataTestId}-transposed-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:min-w-[200px]">Report Date</TableHead>
                    {[...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((report: any) => (
                      <TableHead key={report.id} className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:min-w-[150px]">
                        <div className="gba:text-center gba:w-full">{formatDate(report.date)}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { key: 'date', label: 'Report Date' },
                    { key: 'annualNetColdRent', label: 'Annual Net Cold Rent', fmt: formatNumber },
                    { key: 'occupancyPercent', label: 'Occupancy Rate', fmt: formatPercent },
                    { key: 'actualAnnualExpenses', label: 'Actual Annual Expenses', fmt: formatNumber },
                  ].map((field) => (
                    <TableRow key={field.key as string} className="gba:border-b gba:hover:gba:bg-gray-50 gba:transition-colors">
                      <TableCell className="gba:py-4 gba:px-6 gba:font-medium gba:text-gray-900 gba:bg-gray-50">{field.label}</TableCell>
                      {[...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((report: any) => (
                        <TableCell key={`${field.key}-${report.id}`} className="gba:py-4 gba:px-6 gba:text-center">
                          <span className="gba:font-medium gba:text-gray-900">{field.fmt ? field.fmt(report[field.key as keyof any]) : (field.key === 'date' ? formatDate(report[field.key as keyof any] as any) : (report[field.key as keyof any] ?? 'N/A'))}</span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${dataTestId}-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <SortableHeader field="date">Report Date</SortableHeader>
                    <SortableHeader field="annualNetColdRent">Annual Net Cold Rent</SortableHeader>
                    <SortableHeader field="occupancyPercent">Occupancy Rate</SortableHeader>
                    <SortableHeader field="actualAnnualExpenses">Actual Annual Expenses</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any, index: number) => (
                    <TableRow key={report.id} className="gba:border-b gba:hover:gba:bg-gray-50 gba:transition-colors" data-testid={`${dataTestId}-row-${index + 1}`}>
                      <TableCell className="gba:py-4 gba:px-6"><span className="gba:font-medium gba:text-gray-900">{formatDate(report.date)}</span></TableCell>
                      <TableCell className="gba:py-4 gba:px-6"><span className="gba:font-medium gba:text-gray-900">{formatNumber(report.annualNetColdRent)}</span></TableCell>
                      <TableCell className="gba:py-4 gba:px-6"><span className="gba:font-medium gba:text-gray-900">{formatPercent(report.occupancyPercent)}</span></TableCell>
                      <TableCell className="gba:py-4 gba:px-6"><span className="gba:font-medium gba:text-gray-900">{formatNumber(report.actualAnnualExpenses)}</span></TableCell>
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

export default RealEstateInvestmentReports;


