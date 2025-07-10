import React from 'react';
import { Card, Typography, Row, Col, Progress, Statistic } from 'antd';
import { TrophyOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { WinRateMetrics } from '../types/dashboardTypes';
import { formatPercentage } from '../utils/dashboardUtils';

const { Title, Text } = Typography;

export interface WinRateKpisProps {
  winRateMetrics: WinRateMetrics;
  pipelineId: string;
}

export const WinRateKpis: React.FC<WinRateKpisProps> = ({
  winRateMetrics,
  pipelineId
}) => {
  const getProgressColor = (winRate: number) => {
    if (winRate >= 70) return '#52c41a'; // Green
    if (winRate >= 50) return '#faad14'; // Orange
    return '#ff4d4f'; // Red
  };

  const getTrendIcon = (winRate: number) => {
    if (winRate >= 60) return <RiseOutlined style={{ color: '#52c41a' }} />;
    if (winRate >= 40) return null;
    return <FallOutlined style={{ color: '#ff4d4f' }} />;
  };

  return (
    <Card
      data-testid={`win-rate-kpis-${pipelineId}`}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrophyOutlined />
          <span>Win Rate Performance</span>
        </div>
      }
    >
      <Row gutter={[16, 16]}>
        {/* Month to Date */}
        <Col xs={24} sm={12}>
          <Card 
            size="small" 
            style={{ 
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
              border: '1px solid #91d5ff'
            }}
          >
            <div data-testid={`win-rate-month-${pipelineId}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text strong style={{ fontSize: '14px' }}>Month to Date</Text>
                {getTrendIcon(winRateMetrics.monthToDate.winRate)}
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getProgressColor(winRateMetrics.monthToDate.winRate) }}>
                  {formatPercentage(winRateMetrics.monthToDate.winRate)}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Win Rate</Text>
              </div>

              <Progress
                percent={winRateMetrics.monthToDate.winRate}
                strokeColor={getProgressColor(winRateMetrics.monthToDate.winRate)}
                trailColor="#e6f7ff"
                size="small"
                showInfo={false}
                style={{ marginBottom: '8px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#52c41a' }}>
                  Won: {winRateMetrics.monthToDate.won}
                </span>
                <span style={{ color: '#ff4d4f' }}>
                  Lost: {winRateMetrics.monthToDate.lost}
                </span>
              </div>
            </div>
          </Card>
        </Col>

        {/* Quarter to Date */}
        <Col xs={24} sm={12}>
          <Card 
            size="small" 
            style={{ 
              background: 'linear-gradient(135deg, #f6ffed 0%, #f9fff6 100%)',
              border: '1px solid #b7eb8f'
            }}
          >
            <div data-testid={`win-rate-quarter-${pipelineId}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text strong style={{ fontSize: '14px' }}>Quarter to Date</Text>
                {getTrendIcon(winRateMetrics.quarterToDate.winRate)}
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getProgressColor(winRateMetrics.quarterToDate.winRate) }}>
                  {formatPercentage(winRateMetrics.quarterToDate.winRate)}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Win Rate</Text>
              </div>

              <Progress
                percent={winRateMetrics.quarterToDate.winRate}
                strokeColor={getProgressColor(winRateMetrics.quarterToDate.winRate)}
                trailColor="#f6ffed"
                size="small"
                showInfo={false}
                style={{ marginBottom: '8px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#52c41a' }}>
                  Won: {winRateMetrics.quarterToDate.won}
                </span>
                <span style={{ color: '#ff4d4f' }}>
                  Lost: {winRateMetrics.quarterToDate.lost}
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Performance Indicators */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: '#fafafa',
        borderRadius: '6px'
      }}>
        <Row gutter={16}>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              {winRateMetrics.monthToDate.won + winRateMetrics.quarterToDate.won}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>Total Won</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d4f' }}>
              {winRateMetrics.monthToDate.lost + winRateMetrics.quarterToDate.lost}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>Total Lost</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
              {((winRateMetrics.monthToDate.winRate + winRateMetrics.quarterToDate.winRate) / 2).toFixed(1)}%
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>Avg Rate</Text>
          </Col>
        </Row>
      </div>
    </Card>
  );
}; 