import React from 'react';
import { Card, Row, Col, Statistic, Alert, Button, Space } from 'antd';
import { 
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TrophyOutlined,
  ContactsOutlined,
  TeamOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ContactStatisticsData } from '../types';

interface ContactStatisticsProps {
  statistics: ContactStatisticsData;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const ContactStatistics: React.FC<ContactStatisticsProps> = ({
  statistics,
  isLoading,
  error,
  onRetry
}) => {
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
        data-testid="contact-statistics-error"
      />
    );
  }

  return (
    <div data-testid="contact-statistics-container">
      {/* Main Statistics Cards */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="Recent Contacts"
              value={statistics.recentContacts}
              prefix={<UserOutlined />}
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
              title="Active Contacts"
              value={statistics.activeContacts}
              prefix={<ContactsOutlined />}
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
              title="Email Engagements"
              value={statistics.totalEmailEngagements}
              prefix={<MailOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              Contacts with email
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" loading={isLoading}>
            <Statistic
              title="This Year"
              value={statistics.totalContactsThisYear}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
            <div className="gba:text-xs gba:text-gray-500">
              New contacts
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12}>
          <Card size="small" loading={isLoading}>
            <Space>
              <TeamOutlined />
              <div>
                <div className="gba:font-medium">Most Common Job Title</div>
                <div className="gba:text-gray-500">
                  {statistics.mostCommonJobTitle}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" loading={isLoading}>
            <Space>
              <PhoneOutlined />
              <div>
                <div className="gba:font-medium">Most Common Source</div>
                <div className="gba:text-gray-500">
                  {statistics.mostCommonContactSource}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ContactStatistics; 