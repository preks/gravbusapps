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
    if (winRate >= 70) return 'var(--nw-success)'; // Green
    if (winRate >= 50) return 'var(--nw-warning)'; // Orange
    return 'var(--nw-destructive)'; // Red
  };

  const getTrendIcon = (winRate: number) => {
    if (winRate >= 60) return <RiseOutlined style={{ color: 'var(--nw-success)' }} />;
    if (winRate >= 40) return null;
    return <FallOutlined style={{ color: 'var(--nw-destructive)' }} />;
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
              background: 'var(--nw-info-secondary)',
              border: '1px solid var(--nw-info)'
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
                                  trailColor="var(--nw-info-secondary)"
                size="small"
                showInfo={false}
                style={{ marginBottom: '8px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--nw-success)' }}>
                  Won: {winRateMetrics.monthToDate.won}
                </span>
                <span style={{ color: 'var(--nw-destructive)' }}>
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
              background: 'var(--nw-success-secondary)',
              border: '1px solid var(--nw-success)'
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
                                  trailColor="var(--nw-success-secondary)"
                size="small"
                showInfo={false}
                style={{ marginBottom: '8px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--nw-success)' }}>
                  Won: {winRateMetrics.quarterToDate.won}
                </span>
                <span style={{ color: 'var(--nw-destructive)' }}>
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
        backgroundColor: 'var(--nw-muted)',
        borderRadius: '6px'
      }}>
        <Row gutter={16}>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--nw-info)' }}>
              {winRateMetrics.monthToDate.won + winRateMetrics.quarterToDate.won}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>Total Won</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--nw-destructive)' }}>
              {winRateMetrics.monthToDate.lost + winRateMetrics.quarterToDate.lost}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>Total Lost</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--nw-success)' }}>
              {((winRateMetrics.monthToDate.winRate + winRateMetrics.quarterToDate.winRate) / 2).toFixed(1)}%
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>Avg Rate</Text>
          </Col>
        </Row>
      </div>
    </Card>
  );
}; 