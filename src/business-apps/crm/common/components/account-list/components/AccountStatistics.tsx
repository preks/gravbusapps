import React from 'react';
import { Card, Row, Col, Statistic, Alert, Button, Space } from 'antd';
import { 
  BankOutlined,
  TrophyOutlined,
  DollarOutlined,
  TeamOutlined,
  BuildOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { AccountStatisticsData } from '../types';

interface AccountStatisticsProps {
  statistics: AccountStatisticsData;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const AccountStatistics: React.FC<AccountStatisticsProps> = ({
  statistics,
  isLoading,
  error,
  onRetry
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  if (error) {
    return (
      <Alert
        message="Error Loading Statistics"
        description={error.message}
        type="error"
        showIcon
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            Retry
          </Button>
        }
        data-testid="account-statistics-error"
      />
    );
  }

  return (
    <div data-testid="account-statistics-container">
      {/* Main Statistics Cards */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Recent Accounts"
              value={statistics.recentAccounts}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              Past 2 weeks
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Active Accounts"
              value={statistics.activeAccounts}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              Currently active
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Total Revenue"
              value={formatCurrency(statistics.totalRevenue)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              Estimated total
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="This Year"
              value={statistics.totalAccountsThisYear}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              New accounts
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12}>
          <Card size="small" loading={isLoading}>
            <Space>
              <BuildOutlined />
              <div>
                <div className="gba:font-medium">Most Common Industry</div>
                <div className="gba:text-gray-500">
                  {statistics.mostCommonIndustry}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" loading={isLoading}>
            <Space>
              <FileTextOutlined />
              <div>
                <div className="gba:font-medium">Most Common Legal Form</div>
                <div className="gba:text-gray-500">
                  {statistics.mostCommonLegalForm}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AccountStatistics; 