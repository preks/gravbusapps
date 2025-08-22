import React, { useMemo } from 'react';
import { Card, Typography, Spin, Empty, theme } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGapRateByOrgUnit } from '../../../../../hooks/useGapRateByOrgUnit';
import { BusinessAppContextProps } from '@/business-apps/types';

const { Title } = Typography;

interface GapRateByOrgUnitChartProps extends BusinessAppContextProps {}

/**
 * Bar chart component for displaying gap rate across organizational units
 * Gap Rate = (Vacant Positions / Total Positions) * 100
 */
const GapRateByOrgUnitChart: React.FC<GapRateByOrgUnitChartProps> = ({ accessToken }) => {
  // Use the hook to fetch gap rate data
  const { data, loading, error } = useGapRateByOrgUnit(accessToken);
  const { token } = theme.useToken();
  
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
  // Higher gap rates will have more intense colors
  const getBarColor = (gapRate: number) => {
    // Different shades based on gap rate ranges
    if (gapRate >= 50) return '#f5222d'; // High gap rate - Red
    if (gapRate >= 30) return '#fa8c16'; // Medium-high gap rate - Orange
    if (gapRate >= 15) return '#faad14'; // Medium gap rate - Amber
    return '#52c41a'; // Low gap rate - Green
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

  // Function to format X axis labels to prevent long names
  const formatXAxis = (value: string) => {
    return value.length > 20 ? `${value.substring(0, 20)}...` : value;
  };
  
  // Custom label for the bars - positioned to the right of each bar
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value, height } = props;
    const labelOffset = 5; // Space between bar end and label
    
    return (
      <text
        x={x + width + labelOffset}
        y={y + height / 2}
        fill={token.colorText}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={500}
        data-testid="gap-rate-bar-label"
      >
        {`${value}%`}
      </text>
    );
  };

  return (
    <Card 
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <Title level={4} style={{ margin: 0 }}>
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_by_org_unit', 'Gap Rate by Org Unit')}
          </Title>
          <div className="gba:flex gba:items-center">
            <InfoCircleOutlined 
              style={{ fontSize: '16px', color: token.colorTextSecondary }}
              data-testid="gap-rate-by-org-unit-info-icon"
            />
          </div>
        </div>
      }
      bordered={false}
      style={{ height: '100%' }}
      data-testid="gap-rate-by-org-unit-chart"
    >
      <div 
        className="gba:h-full gba:flex gba:flex-col gba:w-full" 
        style={{ 
          height: '450px',
          position: 'relative',
        }}
        data-testid="gap-rate-by-org-unit-chart-container"
      >
        {/* Chart container with full height */}
        <div className="gba:h-full gba:w-full gba:flex-grow">
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="gap-rate-by-org-unit-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-red-500">
              <div data-testid="gap-rate-by-org-unit-chart-error">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty
                description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
                data-testid="gap-rate-by-org-unit-chart-empty"
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" className="gba:w-full" data-testid="gap-rate-by-org-unit-chart-rendered">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                barSize={20}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: token.colorText, fontSize: 12 }}
                  axisLine={{ stroke: token.colorBorderSecondary }}
                  tickLine={{ stroke: token.colorBorderSecondary }}
                  label={{
                    value: getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_percent', 'Gap Rate (%)'),
                    position: 'insideBottom',
                    offset: -10,
                    style: {
                      textAnchor: 'middle',
                      fill: token.colorTextSecondary,
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
                  tick={{ fill: token.colorText, fontSize: 12 }}
                  axisLine={{ stroke: token.colorBorderSecondary }}
                  tickLine={{ stroke: token.colorBorderSecondary }}
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
                  animationEasing="ease-in-out"
                  isAnimationActive={true}
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
          )}
        </div>

        {/* Display footnote about showing only top 10 */}
        {!loading && !error && data.length > 10 && (
          <div className="gba:text-center gba:text-sm gba:text-gray-500 gba:pb-4 gba:px-6" data-testid="gap-rate-chart-footnote">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_top_org_units_note', 
              `Showing top 10 organizational units with highest gap rates out of ${data.length} total`
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default GapRateByOrgUnitChart;
