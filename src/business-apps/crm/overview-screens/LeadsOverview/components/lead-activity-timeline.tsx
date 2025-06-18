import React from 'react';
import { Timeline, Typography, Tooltip, Tag } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, CommentOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  title: string;
  date: string;
  user: {
    name: string;
    avatar?: string;
  };
  description?: string;
}

interface LeadActivityTimelineProps {
  activities: Activity[];
  className?: string;
}

export const LeadActivityTimeline: React.FC<LeadActivityTimelineProps> = ({ 
  activities,
  className = ''
}) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'call':
        return <PhoneOutlined style={{ color: '#1890ff' }} />;
      case 'email':
        return <MailOutlined style={{ color: '#52c41a' }} />;
      case 'meeting':
        return <UserOutlined style={{ color: '#722ed1' }} />;
      case 'note':
      default:
        return <CommentOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getActivityTypeLabel = (type: Activity['type']) => {
    switch (type) {
      case 'call':
        return <Tag color="blue">Call</Tag>;
      case 'email':
        return <Tag color="green">Email</Tag>;
      case 'meeting':
        return <Tag color="purple">Meeting</Tag>;
      case 'note':
      default:
        return <Tag color="gold">Note</Tag>;
    }
  };

  return (
    <div className={`gba:lead-activity-timeline ${className}`} data-testid="lead-activity-timeline">
      <Timeline>
        {activities.map((activity) => (
          <Timeline.Item 
            key={activity.id} 
            dot={getActivityIcon(activity.type)}
          >
            <div className="gba:activity-item">
              <div className="gba:activity-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="gba:activity-title">
                  <Text strong>{activity.title}</Text> {getActivityTypeLabel(activity.type)}
                </div>
                <div className="gba:activity-meta">
                  <Tooltip title={`By ${activity.user.name}`}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {activity.date}
                    </Text>
                  </Tooltip>
                </div>
              </div>
              
              {activity.description && (
                <div className="gba:activity-description" style={{ marginTop: '4px' }}>
                  <Text>{activity.description}</Text>
                </div>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
};
