import React from 'react';
import { Card } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useMonthlyHeadcountChanges } from '../../hooks/useMonthlyHeadcountChanges';
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext';

interface HeadcountChangesChartProps extends BusinessAppContextProps {}

// Helper: Calculate monthly headcount for the last 12 months
// function getMonthlyHeadcount(data: any[]): { month: string; headcount: number }[] {
//   const now = new Date();
//   const months = Array.from({ length: 12 }, (_, i) => {
//     const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
//     const label = date.toLocaleString(undefined, { month: 'short', year: '2-digit' });
//     // Count employees hired on or before this month and not exited before this month
//     const headcount = data.filter(wc => {
//       const hire = wc.hireDate ? new Date(wc.hireDate) : null;
//       const exit = wc.exitDate ? new Date(wc.exitDate) : null;
//       return (
//         (!hire || hire <= date) &&
//         (!exit || exit >= date)
//       );
//     }).length;
//     return { month: label, headcount };
//   });
//   return months;
// }

const HeadcountChangesChart: React.FC<HeadcountChangesChartProps> = (props) => {
  const year = new Date().getFullYear();
  const { data, loading } = useMonthlyHeadcountChanges(props, year);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="gba:bg-white gba:shadow-lg gba:rounded gba:p-4" data-testid="headcount-tooltip">
          <div className="gba:font-semibold gba:text-base gba:mb-1">
            {d.month && new Date(d.month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}
          </div>
          <div className="gba:text-green-600 gba:text-sm">
            <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('headcount_new_hires', 'New Hires')}:</span> +{d.newHires}
          </div>
          <div className="gba:text-red-600 gba:text-sm">
            <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('headcount_departures', 'Departures')}:</span> {d.departures === 0 ? '0' : '-' + d.departures}
          </div>
          <div className="gba:text-black gba:text-sm">
            <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('headcount_net_change', 'Net Change')}:</span> {d.netChange > 0 ? '+' : ''}{d.netChange}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6"
      data-testid="headcount-changes-chart"
      title={getTranslationFromI18nKeyAndLabel('headcount_changes_chart', 'Headcount Changes')}
      loading={loading}
    >
      <div className="gba:w-full gba:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" className="gba:text-xs" />
            <YAxis className="gba:text-xs" domain={[0, 'dataMax + 2']} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="newHires" fill="#16a34a" name={getTranslationFromI18nKeyAndLabel('headcount_new_hires', 'New Hires')} data-testid="bar-new-hires" />
            <Bar dataKey="departures" fill="#ef4444" name={getTranslationFromI18nKeyAndLabel('headcount_departures', 'Departures')} data-testid="bar-departures" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default HeadcountChangesChart;
export { HeadcountChangesChart };
