import React, { useMemo } from 'react';
import { Card, Typography, Spin, Empty, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Pie } from '@ant-design/plots';
import { BusinessAppContextProps } from '@/business-apps/types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useContractTypeDistribution } from '../../hooks/useContractTypeDistribution';

const { Title } = Typography;

/**
 * ContractTypePieChart component shows the distribution of employee contract types as a pie chart
 * With a center statistic showing total employee count and custom tooltips
 */
export const ContractTypePieChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  // Fetch contract type distribution data
  const { distribution: data, loading, error } = useContractTypeDistribution(accessToken);

  // Transform data for pie chart
  const chartData = useMemo(() => {
    return data.map(item => ({
      type: item.name,
      value: item.count,
      percentage: parseFloat(item.percentage.toFixed(1))
    }));
  }, [data]);

  // Config for the pie chart - simplified configuration with optimized styling
  const config = {
    // Add padding for chart spacing
    appendPadding: [10, 10, 10, 10], // [top, right, bottom, left]
    data: chartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'outer',
      content: '{name} {value} ({percentage}%)',
      style: {
        fontSize: 18,
        fontWeight: 600,
        fill: '#000000'
      }
    },
    // Simplified tooltip configuration that works correctly with Ant Design Plots
    tooltip: {
      title: (datum: any) => datum.type,
      formatter: (datum: any) => {
        return [
          { name: 'Count', value: datum.value.toLocaleString() },
          { name: 'Percentage', value: `${datum.percentage}%` }
        ];
      },
      domStyles: {
        'g2-tooltip': {
          backgroundColor: '#fff',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          padding: '12px 16px',
          fontSize: '16px',
          borderRadius: '4px',
          border: '1px solid #eaeaea'
        },
        'g2-tooltip-title': {
          fontWeight: '700',
          fontSize: '18px',
          color: '#000',
          marginBottom: '10px',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '6px'
        },
        'g2-tooltip-list': {
          paddingLeft: '0'
        },
        'g2-tooltip-list-item': {
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
          alignItems: 'center',
          fontSize: '15px'
        },
        'g2-tooltip-marker': {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          display: 'inline-block',
          marginRight: '6px'
        },
        'g2-tooltip-value': {
          marginLeft: '12px',
          fontWeight: '600',
          fontSize: '16px'
        }
      }
    },
    interactions: [
      { type: 'element-selected' },
      { type: 'element-active' }
    ],
    statistic: {
      title: {
        style: {
          fontWeight: 600,
          fontSize: 22,
          color: '#333'
        },
        formatter: () => getTranslationFromI18nKeyAndLabel('hr_analytics_contract_types', 'Contract Types')
      },
      content: {
        style: {
          fontWeight: 700,
          fontSize: 28,
          color: '#000'
        },
        formatter: () => {
          // Sum all contract types for total employee count
          return data.reduce((sum, item) => sum + item.count, 0).toLocaleString();
        }
      }
    },
    // Completely disable the built-in legend since we're using a custom one below
    legend: false,
  };

  return (
    <Card 
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {getTranslationFromI18nKeyAndLabel('hr_analytics_contract_types', 'Contract Types')}
          </Title>
          <Tooltip title={getTranslationFromI18nKeyAndLabel(
            'hr_analytics_contract_types_tooltip', 
            'Distribution of employees by contract types such as permanent, fixed-term, etc.'
          )}>
            <InfoCircleOutlined className="gba:ml-2" />
          </Tooltip>
        </div>
      }
      className="gba:shadow-lg gba:rounded-lg gba:mb-6 gba:overflow-hidden gba:border-0" 
      style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f2f5)' }}
      data-testid="contract-type-pie-chart"
    >
      <div 
        className="gba:flex gba:flex-col gba:w-full gba:transition-all gba:duration-500" 
        style={{ 
          width: '100%', 
          position: 'relative', 
          margin: '0', 
          borderRadius: '12px',
          padding: '30px 20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e8e8e8'
        }}
        data-testid="contract-type-pie-chart-container"
      >
        {/* Chart container with fixed height */}
        <div className="gba:h-[400px] gba:w-full" style={{ height: '400px' }}>
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="contract-type-pie-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-red-500">
              <div data-testid="contract-type-pie-chart-error">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty
                description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
                data-testid="contract-type-pie-chart-empty"
              />
            </div>
          ) : (
            <Pie {...config} data-testid="contract-type-pie-chart-rendered" />
          )}
        </div>
        
        {/* Custom Legend at bottom with proper colors and formatting */}
        {!loading && !error && data.length > 0 && (
          <div 
            className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200" 
            data-testid="contract-type-legend"
            style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 8px 0'  
            }}
          >
            {chartData.map((item, index) => {
              // Standard Ant Design Plots colors to match the chart's default color palette
              const colors = [
                '#1890FF', '#2FC25B', '#FACC14', '#223273', '#8543E0', '#13C2C2', 
                '#3436C7', '#F04864', '#D0021B', '#5B8FF9', '#5AD8A6', '#5D7092',
                '#F6BD16', '#E8684A', '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99'
              ];
              const colorIndex = index % colors.length;
              
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
                      backgroundColor: colors[colorIndex],
                      marginRight: '10px',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div style={{ fontWeight: 500, fontSize: '16px' }}>
                    <span style={{ marginRight: '8px' }}>{item.type}:</span> 
                    <span style={{ fontWeight: 700 }}>
                      {item.value.toLocaleString()} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContractTypePieChart;
