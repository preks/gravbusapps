import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { FileText } from 'lucide-react';
import type { LiquidFundInvestmentData } from '../types';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(weekday);
dayjs.extend(localeData);

interface LiquidFundReportsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const LiquidFundReports: React.FC<LiquidFundReportsProps> = ({ liquidFundData }) => {
  const reports = liquidFundData?.liquidFundInvestment?.liquidFundInvestmentReport as
    | Array<{
        id: string;
        date?: string | null;
        interestRate?: number | null;
        maturityDate?: string | null;
      }>
    | undefined;

  const sortedReports = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    return [...reports].sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });
  }, [reports]);

  const formatDate = (value?: string | null) => (value ? dayjs(value).format('L') : '-');
  const formatPercent = (value?: number | null) => (value === null || value === undefined ? '-' : `${(value * 100).toFixed(2)}%`);

  return (
    <Card data-testid="liquid-fund-reports-card">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <FileText className="gba:h-5 gba:w-5 gba:text-gray-700" />
          Reports
          <Badge className="gba:ml-2" variant="secondary">{Array.isArray(sortedReports) ? sortedReports.length : 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedReports.length === 0 ? (
          <div className="gba:text-sm gba:text-gray-600" data-testid="reports-empty-state">-</div>
        ) : (
          <div className="gba:divide-y gba:divide-gray-200" data-testid="reports-list">
            {sortedReports.map((r) => (
              <div key={r.id} className="gba:py-3 gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid={`report-row-${r.id}`}>
                <div>
                  <div className="gba:text-xs gba:text-gray-500">Date</div>
                  <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{formatDate(r.date)}</div>
                </div>
                <div>
                  <div className="gba:text-xs gba:text-gray-500">Interest Rate</div>
                  <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{formatPercent(r.interestRate)}</div>
                </div>
                <div>
                  <div className="gba:text-xs gba:text-gray-500">Maturity Date</div>
                  <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{formatDate(r.maturityDate)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiquidFundReports;


