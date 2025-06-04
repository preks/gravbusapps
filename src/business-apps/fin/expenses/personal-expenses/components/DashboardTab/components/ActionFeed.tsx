import React from 'react';
import { Card, Button, List, Space, Typography, Tag, Divider, Empty, Spin, Alert } from 'antd';
import { EyeOutlined, CalendarOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { DashboardStats, RecentActivity } from '../types';
import { formatCurrency, getStatusColor } from '../utils/formatters';

const { Text } = Typography;

interface ActionFeedProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const ActionFeed: React.FC<ActionFeedProps> = ({ stats, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card className="gba:action-feed-card">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:action-feed-card">
        <Alert
          message="Error loading action feed"
          description={error.message}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  const recentActivity = stats?.recentActivity || [];
  
  return (
    <Card 
      title="Action Feed" 
      className="gba:action-feed-card"
      extra={
        <Button type="link" icon={<EyeOutlined />}>View All</Button>
      }
    >
      {recentActivity.length > 0 ? (
        <List
          itemLayout="horizontal"
          dataSource={recentActivity}
          renderItem={(item: RecentActivity) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.title}</Text>
                    <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical">
                    <Space>
                      <CalendarOutlined /> {item.updatedAt}
                      <Divider type="vertical" />
                      <DollarCircleOutlined /> {formatCurrency(Number(item.totalAmount))}
                    </Space>
                    {item.expenseType && <Tag color="blue">{item.expenseType}</Tag>}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No recent activity" />
      )}
    </Card>
  );
};

export default ActionFeed;
