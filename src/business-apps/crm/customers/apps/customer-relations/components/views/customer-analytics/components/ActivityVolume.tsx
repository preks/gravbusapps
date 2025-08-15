import React from 'react';
import { Card, Typography, Row, Col, Progress, Statistic } from 'antd';
import { BarChartOutlined, PhoneOutlined, MailOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { ActivityVolumeMetrics } from '../types/dashboardTypes';

const { Title, Text } = Typography;

export interface ActivityVolumeProps {
  activityVolume: ActivityVolumeMetrics;
  pipelineId: string;
}

export const ActivityVolume: React.FC<ActivityVolumeProps> = ({
  activityVolume,
  pipelineId
}) => {
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <ArrowUpOutlined style={{ color: 'var(--nw-success)' }} />;
    } else if (current < previous) {
      return <ArrowDownOutlined style={{ color: 'var(--nw-destructive)' }} />;
    }
    return null;
  };

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getActivityIcon = (type: 'calls' | 'emails' | 'meetings') => {
    switch (type) {
      case 'calls': return <PhoneOutlined style={{ color: 'var(--nw-info)' }} />;
      case 'emails': return <MailOutlined style={{ color: 'var(--nw-success)' }} />;
      case 'meetings': return <CalendarOutlined style={{ color: 'var(--nw-warning)' }} />;
    }
  };

  const getActivityColor = (type: 'calls' | 'emails' | 'meetings') => {
    switch (type) {
      case 'calls': return 'var(--nw-info)';
      case 'emails': return 'var(--nw-success)';
      case 'meetings': return 'var(--nw-warning)';
    }
  };

  return (
    <Card
      data-testid={`activity-volume-${pipelineId}`}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChartOutlined />
          <span>Activity Volume</span>
        </div>
      }
    >
      {/* Overview Comparison */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12}>
          <Card>
            <div data-testid={`activity-7days-${pipelineId}`}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Last 7 Days</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nw-info)', margin: '4px 0' }}>
                {activityVolume.last7Days.total}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {getTrendIcon(activityVolume.last7Days.total, Math.round(activityVolume.last30Days.total / 4.3))}
                <Text style={{ fontSize: '11px' }}>
                  {getTrendPercentage(activityVolume.last7Days.total, Math.round(activityVolume.last30Days.total / 4.3))}% vs avg
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <div data-testid={`activity-30days-${pipelineId}`}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Last 30 Days</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nw-success)', margin: '4px 0' }}>
                {activityVolume.last30Days.total}
              </div>
              <Text style={{ fontSize: '11px' }}>
                Daily Avg: {Math.round(activityVolume.last30Days.total / 30)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Activity Breakdown */}
      <div style={{ marginBottom: '16px' }}>
        <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
          Activity Breakdown (7 vs 30 days)
        </Text>
        
        {(['calls', 'emails', 'meetings'] as const).map((activityType) => {
          const current7Days = activityVolume.last7Days[activityType];
          const total30Days = activityVolume.last30Days[activityType];
          const avg30Days = Math.round(total30Days / 4.3); // 30 days / 7 days
          const maxValue = Math.max(current7Days, avg30Days);
          const progress7Days = maxValue > 0 ? (current7Days / maxValue) * 100 : 0;
          const progressAvg = maxValue > 0 ? (avg30Days / maxValue) * 100 : 0;

          return (
            <div key={activityType} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getActivityIcon(activityType)}
                  <Text style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                    {activityType}
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Text style={{ fontSize: '12px' }}>
                    7d: <strong>{current7Days}</strong>
                  </Text>
                  <Text style={{ fontSize: '12px', color: 'var(--nw-muted-foreground)' }}>
                    30d avg: {avg30Days}
                  </Text>
                </div>
              </div>
              
              {/* 7 Days Progress */}
              <div style={{ marginBottom: '2px' }}>
                <Progress
                  percent={progress7Days}
                  strokeColor={getActivityColor(activityType)}
                  trailColor="var(--nw-muted)"
                  size="small"
                  showInfo={false}
                />
              </div>
              
              {/* 30 Days Average Progress */}
              <div style={{ marginBottom: '4px' }}>
                <Progress
                  percent={progressAvg}
                  strokeColor={{ '0%': 'var(--nw-border)', '100%': 'var(--nw-muted-foreground)' }}
                  trailColor="var(--nw-accent)"
                  size="small"
                  showInfo={false}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--nw-muted-foreground)' }}>
                <span>Recent week</span>
                <span>30-day average</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Summary */}
      <div style={{ 
        padding: '12px', 
        backgroundColor: 'var(--nw-muted)',
        borderRadius: '6px'
      }}>
        <Row gutter={8}>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--nw-info)' }}>
              {Math.round((activityVolume.last7Days.total / 7) * 10) / 10}
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>Daily Avg (7d)</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--nw-success)' }}>
              {Math.round((activityVolume.last30Days.total / 30) * 10) / 10}
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>Daily Avg (30d)</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--nw-warning)' }}>
              {getTrendPercentage(activityVolume.last7Days.total, Math.round(activityVolume.last30Days.total / 4.3))}%
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>Change</Text>
          </Col>
        </Row>
      </div>
    </Card>
  );
}; 