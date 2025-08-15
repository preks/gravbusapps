import React from 'react';
import { Card, Typography, List, Avatar, Progress, Tag } from 'antd';
import { TrophyOutlined, CrownOutlined, StarOutlined, UserOutlined } from '@ant-design/icons';
import { SalesRepPerformance } from '../types/dashboardTypes';
import { formatCurrency, formatPercentage } from '../utils/dashboardUtils';
import { EmptyState } from './EmptyState';

const { Title, Text } = Typography;

export interface SalesLeaderboardProps {
  leaderboard: SalesRepPerformance[];
  pipelineId: string;
}

export const SalesLeaderboard: React.FC<SalesLeaderboardProps> = ({
  leaderboard,
  pipelineId
}) => {
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <CrownOutlined style={{ color: 'var(--nw-ext-5)', fontSize: '16px' }} />;
      case 1: return <TrophyOutlined style={{ color: 'var(--nw-muted-foreground)', fontSize: '14px' }} />;
      case 2: return <StarOutlined style={{ color: 'var(--nw-ext-6)', fontSize: '14px' }} />;
      default: return <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--nw-muted-foreground)' }}>#{index + 1}</span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'var(--nw-ext-5)';
      case 1: return 'var(--nw-muted-foreground)';
      case 2: return 'var(--nw-ext-6)';
      default: return 'var(--nw-muted)';
    }
  };

  const getPerformanceColor = (winRate: number) => {
    if (winRate >= 70) return 'var(--nw-success)';
    if (winRate >= 50) return 'var(--nw-warning)';
    return 'var(--nw-destructive)';
  };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card
        data-testid={`sales-leaderboard-${pipelineId}`}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrophyOutlined />
            <span>Sales Leaderboard</span>
          </div>
        }
      >
        <EmptyState
          title="No Sales Data"
          description="No sales performance data available"
        />
      </Card>
    );
  }

  // Take top 5 performers
  const topPerformers = leaderboard.slice(0, 5);
  const maxValue = Math.max(...topPerformers.map(rep => rep.totalValue));

  return (
    <Card
      data-testid={`sales-leaderboard-${pipelineId}`}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrophyOutlined />
            <span>Sales Leaderboard</span>
          </div>
          <Tag color="gold">Top {topPerformers.length}</Tag>
        </div>
      }
    >
      <List
        dataSource={topPerformers}
        renderItem={(rep, index) => {
          const progressPercent = maxValue > 0 ? (rep.totalValue / maxValue) * 100 : 0;
          
          return (
            <List.Item
              key={rep.employeeId}
              data-testid={`leaderboard-item-${rep.employeeId}`}
              style={{ 
                padding: '12px 0',
                borderBottom: index === topPerformers.length - 1 ? 'none' : '1px solid var(--nw-border)'
              }}
            >
              <div style={{ width: '100%' }}>
                {/* Rep Info Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar 
                        size="small" 
                        icon={<UserOutlined />}
                        style={{ 
                          backgroundColor: index < 3 ? getRankColor(index) : 'var(--nw-muted)',
                          color: index < 3 ? 'var(--nw-primary-foreground)' : 'var(--nw-muted-foreground)'
                        }}
                      />
                      <div style={{ 
                        position: 'absolute', 
                        top: '-4px', 
                        right: '-4px',
                        background: 'var(--nw-background)',
                        borderRadius: '50%',
                        padding: '1px'
                      }}>
                        {getRankIcon(index)}
                      </div>
                    </div>
                    <div>
                      <Text strong style={{ fontSize: '13px' }}>
                        {rep.displayName}
                      </Text>
                      <div style={{ fontSize: '11px', color: 'var(--nw-muted-foreground)' }}>
                        {rep.dealsWon + rep.dealsLost} deals • {rep.activitiesCount} activities
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--nw-info)' }}>
                      {formatCurrency(rep.totalValue)}
                    </div>
                    <div style={{ fontSize: '11px', color: getPerformanceColor(rep.winRate) }}>
                      {formatPercentage(rep.winRate)} win rate
                    </div>
                  </div>
                </div>

                {/* Performance Progress Bar */}
                <div style={{ marginBottom: '4px' }}>
                  <Progress
                    percent={progressPercent}
                    strokeColor={getRankColor(index)}
                    trailColor="var(--nw-muted)"
                    size="small"
                    showInfo={false}
                  />
                </div>

                {/* Performance Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--nw-muted-foreground)' }}>
                  <span>
                    Won: {rep.dealsWon} | Lost: {rep.dealsLost}
                  </span>
                  <span>
                    Avg Deal: {formatCurrency(rep.dealsWon > 0 ? rep.totalValue / rep.dealsWon : 0)}
                  </span>
                </div>
              </div>
            </List.Item>
          );
        }}
      />

      {/* Leaderboard Summary */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: 'var(--nw-muted)',
        borderRadius: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Total Team Performance:</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <div>
            <Text strong style={{ color: 'var(--nw-info)' }}>
              {formatCurrency(topPerformers.reduce((sum, rep) => sum + rep.totalValue, 0))}
            </Text>
            <br />
            <Text type="secondary">Total Value</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ color: 'var(--nw-success)' }}>
              {topPerformers.reduce((sum, rep) => sum + rep.dealsWon, 0)}
            </Text>
            <br />
            <Text type="secondary">Deals Won</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text strong style={{ color: 'var(--nw-warning)' }}>
              {formatPercentage(
                topPerformers.length > 0 
                  ? topPerformers.reduce((sum, rep) => sum + rep.winRate, 0) / topPerformers.length 
                  : 0
              )}
            </Text>
            <br />
            <Text type="secondary">Avg Win Rate</Text>
          </div>
        </div>
      </div>

      {/* Performance Badges */}
      {topPerformers.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {topPerformers[0] && (
            <Tag color="gold" style={{ fontSize: '10px' }}>
              🏆 Top Performer: {topPerformers[0].displayName}
            </Tag>
          )}
          {topPerformers.find(rep => rep.winRate === Math.max(...topPerformers.map(r => r.winRate))) && (
            <Tag color="green" style={{ fontSize: '10px' }}>
              🎯 Best Win Rate: {formatPercentage(Math.max(...topPerformers.map(r => r.winRate)))}
            </Tag>
          )}
          {topPerformers.find(rep => rep.activitiesCount === Math.max(...topPerformers.map(r => r.activitiesCount))) && (
            <Tag color="blue" style={{ fontSize: '10px' }}>
              ⚡ Most Active: {Math.max(...topPerformers.map(r => r.activitiesCount))} activities
            </Tag>
          )}
        </div>
      )}
    </Card>
  );
}; 