import React, { useMemo } from 'react';
import { Card, Spinner, Alert, Badge } from '@newwork/nw-design-system';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGapRateByOrgUnit } from '../../../../../hooks/useGapRateByOrgUnit';

interface GapRateByOrgUnitChartProps {
  accessToken: string;
}

/**
 * Bar chart component for displaying gap rate across organizational units
 * Gap Rate = (Vacant Positions / Total Positions) * 100
 */
const GapRateByOrgUnitChart: React.FC<GapRateByOrgUnitChartProps> = ({ accessToken }) => {
  const { data, loading, error } = useGapRateByOrgUnit(accessToken);
  const prefixDataTestId = 'GapRateByOrgUnitChart';
  
  // Transform data for the bar chart - limit to top 10 org units with highest gap rates
  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => b.gapRate - a.gapRate).slice(0, 10);
    return sortedData.map(item => ({
      orgUnit: item.name,
      gapRate: item.gapRate,
      vacantPositions: item.vacantPositions,
      totalPositions: item.totalPositions
    }));
  }, [data]);

  // Prepare colors for the bars based on gap rate values
  const getBarColor = (gapRate: number) => {
    if (gapRate >= 50) return '#f5222d'; // High gap rate - Red
    if (gapRate >= 30) return '#fa8c16'; // Medium-high gap rate - Orange
    if (gapRate >= 15) return '#faad14'; // Medium gap rate - Amber
    return '#52c41a'; // Low gap rate - Green
  };

  // Format org unit names for display (truncate if too long)
  const formatXAxis = (value: string) => {
    if (value.length > 20) {
      return value.substring(0, 20) + '...';
    }
    return value;
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }
    
    const data = payload[0].payload;
    
    return (
      <div className="gba:p-4 gba:bg-white gba:rounded-lg gba:shadow-lg gba:border gba:border-gray-200">
        <p className="gba:text-lg gba:font-semibold gba:border-b gba:border-gray-200 gba:pb-2 gba:mb-3">
          {label}
        </p>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate', 'Gap Rate')}
          </span>
          <span className="gba:text-black gba:font-medium">
            {data.gapRate}%
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_vacant_positions', 'Vacant Positions')}
          </span>
          <span className="gba:text-black gba:font-medium">
            {data.vacantPositions}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_total_positions', 'Total Positions')}
          </span>
          <span className="gba:text-black gba:font-medium">
            {data.totalPositions}
          </span>
        </div>
      </div>
    );
  };

  // Custom label renderer for the bars
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (!value || width < 40) return null;
    
    return (
      <text
        x={x + width + 10}
        y={y + height / 2}
        fill="#374151"
        textAnchor="start"
        dy={4}
        fontSize={12}
        fontWeight="600"
      >
        {value.toFixed(1)}%
      </text>
    );
  };

  if (loading) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_by_org', 'Gap Rate by Organizational Unit')}
          </h3>
          <p className="gba:text-gray-600 gba:text-sm gba:mt-1">
            Shows the percentage of vacant positions relative to total positions across organizational units
          </p>
        </div>
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spinner className="gba:w-8 gba:h-8" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-error`}>
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_by_org', 'Gap Rate by Organizational Unit')}
          </h3>
          <p className="gba:text-gray-600 gba:text-sm gba:mt-1">
            Shows the percentage of vacant positions relative to total positions across organizational units
          </p>
        </div>
        <Alert variant="destructive">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-chart`}>
      <div className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_by_org', 'Gap Rate by Organizational Unit')}
          </h3>
          <Badge variant="outline" className="gba:text-xs">
            Position gaps
          </Badge>
        </div>
        <p className="gba:text-gray-600 gba:text-sm">
          Shows the percentage of vacant positions relative to total positions across organizational units
        </p>
      </div>

      {data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96 gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
        </div>
      ) : (
        <>
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                barSize={20}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: '#374151', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  label={{
                    value: getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_percent', 'Gap Rate (%)'),
                    position: 'insideBottom',
                    offset: -10,
                    style: {
                      textAnchor: 'middle',
                      fill: '#6b7280',
                      fontSize: 12,
                      fontWeight: 500
                    }
                  }}
                />
                <YAxis 
                  dataKey="orgUnit"
                  type="category"
                  width={160}
                  tickFormatter={formatXAxis}
                  tick={{ fill: '#374151', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <RechartsTooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Bar 
                  name={getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate', 'Gap Rate')}
                  dataKey="gapRate" 
                  radius={[0, 6, 6, 0]}
                  animationDuration={1200}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry.gapRate)}
                    />
                  ))}
                  <LabelList 
                    dataKey="gapRate" 
                    position="right"
                    content={renderCustomBarLabel}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Display footnote about showing only top 10 */}
          {data.length > 10 && (
            <div className="gba:text-center gba:text-sm gba:text-gray-500 gba:mt-4" data-testid={`${prefixDataTestId}-footnote`}>
              {getTranslationFromI18nKeyAndLabel(
                'hr_analytics_top_org_units_note', 
                `Showing top 10 organizational units with highest gap rates out of ${data.length} total`
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default GapRateByOrgUnitChart; 