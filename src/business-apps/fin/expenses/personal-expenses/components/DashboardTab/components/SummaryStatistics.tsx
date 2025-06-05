import React from 'react';
import { Row, Col, Card, Typography, Statistic, Tooltip, Spin, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined, WarningOutlined, GlobalOutlined } from '@ant-design/icons';
import { PiCurrencyCircleDollar } from 'react-icons/pi';
import { formatCurrency, calculatePercentChange } from '../utils/formatters';
import { DashboardStats } from '../types';

const { Text } = Typography;

interface SummaryStatisticsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const SummaryStatistics: React.FC<SummaryStatisticsProps> = ({ stats, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card className="gba:summary-stats-card">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:summary-stats-card">
        <Alert
          message="Error loading statistics"
          description={error.message}
          type="error"
          showIcon
        />
      </Card>
    );
  }
  
  if (!stats) return null;
  
  const currentTotal = stats.currentMonthExpenses?.total || 0;
  const previousTotal = stats.lastMonthExpenses?.total || 0;
  const percentChange = calculatePercentChange(currentTotal, previousTotal);
  const isPositiveChange = percentChange >= 0;

  return (
    <Card title="Summary Statistics" className="gba:summary-stats-card">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Current Month Expenses"
              value={currentTotal}
              precision={2}
              valueStyle={{ color: isPositiveChange ? '#cf1322' : '#3f8600' }}
              prefix={<PiCurrencyCircleDollar size={24} />}
              suffix={
                <Tooltip title={`${Math.abs(percentChange).toFixed(1)}% ${isPositiveChange ? 'increase' : 'decrease'} from last month`}>
                  {isPositiveChange ? 
                    <ArrowUpOutlined style={{ fontSize: '16px', color: '#cf1322' }} /> : 
                    <ArrowDownOutlined style={{ fontSize: '16px', color: '#3f8600' }} />
                  }
                </Tooltip>
              }
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Text type="secondary">{stats?.currentMonthExpenses?.count || 0} expense items</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Pending Payouts"
              value={stats?.pendingPayouts || 0}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Text type="secondary">Awaiting payment</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Flagged Items"
              value={stats?.flaggedItems || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
            <Text type="secondary">Requiring attention</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Upcoming Trips"
              value={stats?.upcomingTrips || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<GlobalOutlined />}
            />
            <Text type="secondary">Planned business trips</Text>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default SummaryStatistics;
