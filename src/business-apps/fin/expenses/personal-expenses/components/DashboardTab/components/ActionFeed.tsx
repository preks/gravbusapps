import React from 'react';
import { Card, Button, List, Space, Typography, Tag, Empty, Spin, Alert } from 'antd';
import { EyeOutlined, DollarCircleOutlined } from '@ant-design/icons';
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
      size="small"
      bodyStyle={{ padding: '6px 8px' }}
      headStyle={{ paddingTop: '6px', paddingBottom: '6px', fontSize: '14px' }}
      extra={
        <Button type="link" icon={<EyeOutlined />} size="small" style={{ fontSize: '12px', height: '22px', padding: '0 4px' }}>View All</Button>
      }
    >
      {recentActivity.length > 0 ? (
        <List
          size="small"
          itemLayout="horizontal"
          dataSource={recentActivity}
          split={false}
          renderItem={(item: RecentActivity) => (
            <List.Item style={{ padding: '4px 0' }}>
              <Space size={4} style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: '13px' }}>{item.title}</Text>
                <Space size={4}>
                  <Tag color={getStatusColor(item.status)} style={{ margin: 0, padding: '0 4px', fontSize: '11px', lineHeight: '16px' }}>
                    {item.status}
                  </Tag>
                  {item.expenseType && 
                    <Tag color="blue" style={{ margin: 0, padding: '0 4px', fontSize: '11px', lineHeight: '16px' }}>
                      {item.expenseType}
                    </Tag>
                  }
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <DollarCircleOutlined /> {formatCurrency(Number(item.totalAmount))}
                  </Text>
                </Space>
              </Space>
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
