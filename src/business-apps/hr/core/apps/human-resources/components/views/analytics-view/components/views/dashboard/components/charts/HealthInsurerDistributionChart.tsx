import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Card, Typography, Spin, Empty, theme } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/business-apps/types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useHealthInsuranceDistribution } from '../../../../../hooks/useHealthInsuranceDistribution';

const { Title } = Typography;

/**
 * HealthInsurerDistributionChart component shows the distribution of employee health insurers
 * as a pie chart with a center statistic showing total employee count
 */
export const HealthInsurerDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { token } = theme.useToken();
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  
  // Fetch health insurance distribution data
  const { distribution: data, loading, error, totalEmployees } = useHealthInsuranceDistribution(accessToken);

  // Transform data for pie chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      name: item.name,
      value: item.count,
      percentage: parseFloat(item.percentage.toFixed(1)),
      displayValue: `${item.count.toLocaleString()} (${item.percentage.toFixed(1)}%)`
    }));
  }, [data]);

  // Green color palette for health insurer chart
  const COLORS = [
    '#2E8B57', '#3CB371', '#90EE90', '#32CD32', '#00A651', '#4CBB17', 
    '#228B22', '#006400', '#9DC183', '#708238', '#4F7942', '#009B77',
    '#00AF54', '#2AAA8A', '#1B4D3E', '#7CBD1E', '#57A639', '#8FBC8F'
  ];

  // Custom active shape for the pie chart when hovering
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.8}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={innerRadius - 6}
          outerRadius={innerRadius - 2}
          fill={fill}
        />
        <text x={cx} y={cy - 20} textAnchor="middle" fill={token.colorText} fontSize={20} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={token.colorTextSecondary} fontSize={16}>
          {value.toLocaleString()} employees
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill={token.colorPrimary} fontSize={16} fontWeight="600">
          {payload.percentage}%
        </text>
      </g>
    );
  };
  
  // Event handlers for pie slice hover
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  return (
    <Card 
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <Title level={4} style={{ margin: 0 }}>
            {getTranslationFromI18nKeyAndLabel('hr_analytics_health_insurer_distribution', 'Health Insurer Distribution')}
          </Title>
          <div className="gba:flex gba:items-center">
            <InfoCircleOutlined 
              style={{ fontSize: '16px', color: token.colorTextSecondary }}
              data-testid="health-insurer-distribution-info-icon"
            />
          </div>
        </div>
      }
      bordered={false}
      style={{ height: '100%' }}
      data-testid="health-insurer-distribution-chart"
    >
      <div className="gba:h-[450px] gba:flex gba:justify-center gba:items-center">
        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Spin size="large" data-testid="health-insurer-distribution-loading" />
          </div>
        ) : error ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Empty 
              description={getTranslationFromI18nKeyAndLabel('hr_analytics_error_loading', 'Error loading data')}
              data-testid="health-insurer-distribution-error"
            />
          </div>
        ) : data.length === 0 ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Empty 
              description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
              data-testid="health-insurer-distribution-empty"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" className="gba:w-full" data-testid="health-insurer-distribution-rendered">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                innerRadius="60%"
                outerRadius="80%"
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke={token.colorBgContainer} 
                    strokeWidth={2}
                  />
                ))}
                {/* Custom center label */}
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '20px', fill: token.colorText, fontWeight: 600 }}>
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_health_insurers', 'Health Insurers')}
                </text>
                <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '28px', fontWeight: 'bold', fill: token.colorTextHeading }}>
                  {totalEmployees.toLocaleString()}
                </text>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Custom Legend at bottom */}
      {!loading && !error && data.length > 0 && (
        <div 
          className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200" 
          data-testid="health-insurer-distribution-legend"
          style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 8px 0'  
          }}
        >
          {chartData.map((item, index) => {
            const colorIndex = index % COLORS.length;
            
            return (
              <div 
                key={`legend-${index}`} 
                className="gba:flex gba:items-center gba:mb-3"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '4px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div 
                  className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                  style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    backgroundColor: COLORS[colorIndex],
                    marginRight: '10px',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                />
                <div style={{ fontWeight: 500, fontSize: '16px' }}>
                  <span style={{ marginRight: '8px' }}>{item.name}:</span> 
                  <span style={{ fontWeight: 700 }}>
                    {item.value.toLocaleString()} ({item.percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default HealthInsurerDistributionChart;
