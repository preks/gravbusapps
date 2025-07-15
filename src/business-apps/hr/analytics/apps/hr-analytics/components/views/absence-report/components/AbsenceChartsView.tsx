import React from 'react';
import { Card, Row, Col, Typography, Tag } from 'antd';
import { Line, Bar, Pie } from '@ant-design/plots';
import { AbsenceChartData } from '../types/absenceTypes';

const { Title, Text } = Typography;

interface AbsenceChartsViewProps {
  chartData: AbsenceChartData;
  isLoading: boolean;
  dataTestId: string;
}

const AbsenceChartsView: React.FC<AbsenceChartsViewProps> = ({
  chartData,
  isLoading,
  dataTestId
}) => {
  // Transform data for the multi-line chart
  const transformedMonthlyData = chartData.monthlyUsageByGroup.flatMap(item => {
    const entries = Object.entries(item).filter(([key]) => key !== 'month');
    return entries.map(([type, days]) => ({
      month: item.month,
      days: days as number,
      type: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1'),
    }));
  });

  const monthlyLineConfig = {
    data: transformedMonthlyData,
    xField: 'month',
    yField: 'days',
    seriesField: 'type',
    point: {
      size: 4,
      shape: 'diamond',
    },
    smooth: true,
    height: 300,
    legend: {
      position: 'top-right' as const,
    },
    // Use dynamic colors based on data
    color: (datum: any) => {
      const colorMap: Record<string, string> = {
        'Vacation': '#1890ff',
        'Sick Leave': '#ff4d4f', 
        'Special Leave': '#722ed1',
        'Work Leave': '#52c41a',
      };
      return colorMap[datum.type] || '#13c2c2';
    },
  };

  const totalAbsenceBarConfig = {
    data: chartData.totalAbsenceDays,
    xField: 'month',
    yField: 'days',
    color: '#1890ff',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    height: 300,
    label: {
      position: 'top' as const,
      style: {
        fill: '#666',
        fontSize: 11,
      },
    },
  };

  const absenceByGroupPieConfig = {
    data: chartData.absenceByGroup,
    angleField: 'days',
    colorField: 'group',
    radius: 0.8,
    label: {
      type: 'spider',
      labelHeight: 28,
      content: '{name}\n{percentage}%',
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
    height: 300,
    color: chartData.absenceByGroup.map(item => item.color),
  };

  const absenceByTypePieConfig = {
    data: chartData.absenceByType.slice(0, 8), // Show top 8 types
    angleField: 'days',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'spider',
      labelHeight: 28,
      content: '{name}\n{percentage}%',
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
    height: 300,
  };

  // Transform department data for stacked bar chart
  const transformedDepartmentData = chartData.departmentBreakdown.flatMap(dept => {
    const entries = Object.entries(dept).filter(([key]) => 
      key !== 'department' && key !== 'total' && typeof dept[key as keyof typeof dept] === 'number'
    );
    return entries.map(([type, days]) => ({
      department: dept.department,
      days: days as number,
      type: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1'),
    }));
  });

  const departmentStackedBarConfig = {
    data: transformedDepartmentData,
    xField: 'department',
    yField: 'days',
    seriesField: 'type',
    isStack: true,
    height: 300,
    color: ['#1890ff', '#ff4d4f', '#722ed1', '#52c41a'],
    legend: {
      position: 'top-right' as const,
    },
    label: {
      position: 'middle' as const,
      style: {
        fill: '#fff',
        fontSize: 10,
      },
    },
  };

  return (
    <div data-testid={`${dataTestId}-charts-view`}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Monthly Usage Trend</span>
                <Tag color="blue">
                  {chartData.monthlyUsageByGroup.length} months
                </Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-monthly-usage-chart`}
          >
            <Line {...monthlyLineConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Total Absence Days</span>
                <Tag color="green">
                  {chartData.totalAbsenceDays.reduce((sum, item) => sum + item.days, 0)} days
                </Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-total-absence-chart`}
          >
            <Bar {...totalAbsenceBarConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Absence by Group</span>
                <Tag color="purple">
                  {chartData.absenceByGroup.length} groups
                </Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-absence-by-group-chart`}
          >
            <Pie {...absenceByGroupPieConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Top Absence Types</span>
                <Tag color="orange">
                  {chartData.absenceByType.length} types
                </Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-absence-by-type-chart`}
          >
            <Pie {...absenceByTypePieConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Department Breakdown</span>
                <Tag color="red">
                  {chartData.departmentBreakdown.length} departments
                </Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-department-breakdown-chart`}
          >
            <Bar {...departmentStackedBarConfig} />
          </Card>
        </Col>
      </Row>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card title="Chart Summary" data-testid={`${dataTestId}-chart-summary`}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#1890ff' }}>
                    {chartData.absenceByGroup.length}
                  </div>
                  <Text type="secondary">Active Groups</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#ff4d4f' }}>
                    {chartData.absenceByType.length}
                  </div>
                  <Text type="secondary">Absence Types</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#722ed1' }}>
                    {chartData.departmentBreakdown.length}
                  </div>
                  <Text type="secondary">Departments</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#52c41a' }}>
                    {chartData.totalAbsenceDays.reduce((sum, item) => sum + item.days, 0)}
                  </div>
                  <Text type="secondary">Total Days</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AbsenceChartsView; 