import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, Typography, Spin } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useMonthlyHeadcountChanges } from '../../../../hooks/useMonthlyHeadcountChanges';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title, Text } = Typography;

interface HeadcountChangesChartProps extends BusinessAppContextProps {}

const HeadcountChangesChart: React.FC<HeadcountChangesChartProps> = (props) => {
  const year = new Date().getFullYear();
  const { data, loading } = useMonthlyHeadcountChanges(props, year);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="gba:bg-white gba:shadow-lg gba:rounded gba:p-4" data-testid="headcount-changes-tooltip">
          <div className="gba:font-semibold gba:text-base gba:mb-1">
            {new Date(d.month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}
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
      className="gba:w-full gba:mb-6 gba:shadow-sm"
      data-testid="headcount-changes-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-gray-800">
          {getTranslationFromI18nKeyAndLabel('headcount_changes_chart', 'Headcount Changes')}
        </Title>
        <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel('headcount_changes_description', 'Monthly workforce changes showing new hires versus departures and net headcount impact')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-72">
          <Spin size="large" />
        </div>
      ) : (
        <div className="gba:h-72">
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
      )}
    </Card>
  );
};

export default HeadcountChangesChart;
export { HeadcountChangesChart };
