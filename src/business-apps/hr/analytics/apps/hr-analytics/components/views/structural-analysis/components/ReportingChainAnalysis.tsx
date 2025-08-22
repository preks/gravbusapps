import React from 'react';
import { Card, Typography, Table, Tag, List, Avatar } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { UserOutlined, AlertOutlined } from '@ant-design/icons';
import { ReportingChainData, ReportingChainSummary } from '../types/structuralTypes';
import { chartColors } from '../utils/structuralUtils';

const { Title, Text } = Typography;

interface ReportingChainAnalysisProps {
  chains: ReportingChainData[];
  summary: ReportingChainSummary;
  prefixDataTestId?: string;
}

export const ReportingChainAnalysis: React.FC<ReportingChainAnalysisProps> = ({
  chains,
  summary,
  prefixDataTestId = 'StructuralAnalysis'
}) => {
  // Table columns for reporting chains
  const chainColumns = [
    {
      title: 'Chain ID',
      dataIndex: 'chainId',
      key: 'chainId',
      width: 120
    },
    {
      title: 'Top Manager',
      dataIndex: 'topManager',
      key: 'topManager',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Levels',
      dataIndex: 'levels',
      key: 'levels',
      width: 100,
      align: 'center' as const,
      render: (levels: number) => {
        let color = 'green';
        if (levels > 6) color = 'red';
        else if (levels > 4) color = 'orange';
        
        return <Tag color={color}>{levels} levels</Tag>;
      }
    },
    {
      title: 'Total Employees',
      dataIndex: 'totalEmployees',
      key: 'totalEmployees',
      width: 120,
      align: 'center' as const,
      render: (value: number) => (
        <Text strong style={{ fontSize: '16px' }}>{value}</Text>
      )
    },
    {
      title: 'Avg. Span of Control',
      dataIndex: 'averageSpanOfControl',
      key: 'averageSpanOfControl',
      width: 140,
      align: 'center' as const,
      render: (value: number) => value.toFixed(1)
    },
    {
      title: 'Bottlenecks',
      dataIndex: 'bottlenecks',
      key: 'bottlenecks',
      render: (bottlenecks: string[]) => (
        <div style={{ maxWidth: '200px' }}>
          {bottlenecks.length > 0 ? (
            <div>
              {bottlenecks.slice(0, 2).map((bottleneck, index) => (
                <div key={index} style={{ fontSize: '12px', color: '#666' }}>
                  {bottleneck}
                </div>
              ))}
              {bottlenecks.length > 2 && (
                <div style={{ fontSize: '12px', color: '#999' }}>
                  +{bottlenecks.length - 2} more
                </div>
              )}
            </div>
          ) : (
            <Text style={{ color: '#666' }}>None</Text>
          )}
        </div>
      )
    },
    {
      title: 'Efficiency',
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 100,
      align: 'center' as const,
      render: (efficiency: number) => {
        let color = 'green';
        if (efficiency < 60) color = 'red';
        else if (efficiency < 80) color = 'orange';
        
        return <Tag color={color}>{efficiency}%</Tag>;
      }
    }
  ];

  // Prepare data for chain distribution chart
  const distributionData = summary.chainDistribution.map(item => ({
    chainLength: `${item.length} levels`,
    count: item.count,
    percentage: item.percentage
  }));

  return (
    <div data-testid={`${prefixDataTestId}-ReportingChainAnalysis`}>
      {/* Summary Statistics */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
          Reporting Chain Summary
        </Title>
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '16px' 
          }}
        >
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {summary.averageChainLength.toFixed(1)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Average Chain Length</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {summary.maxChainLength}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Max Chain Length</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {summary.minChainLength}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Min Chain Length</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: chartColors.status.warning }}>
              {summary.bottlenecks.length}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Bottlenecks Identified</div>
          </div>
        </div>
      </Card>

      {/* Chain Distribution Chart */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
          Chain Length Distribution
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="chainLength" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill={chartColors.primary[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottlenecks Analysis */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
          <AlertOutlined style={{ marginRight: '8px', color: chartColors.status.warning }} />
          Bottleneck Managers
        </Title>
        <List
          dataSource={summary.bottlenecks}
          renderItem={(bottleneck) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={bottleneck.managerName}
                description={
                  <div>
                    <Text>
                      {bottleneck.chainsThroughManager} reporting chains pass through this manager
                    </Text>
                    <br />
                    <Tag color="orange">Impact Score: {bottleneck.impact}</Tag>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No significant bottlenecks identified' }}
        />
      </Card>

      {/* Detailed Reporting Chains Table */}
      <Card>
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
          Detailed Reporting Chains
        </Title>
        <Table
          dataSource={chains}
          columns={chainColumns}
          rowKey="chainId"
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} chains`
          }}
          size="small"
          scroll={{ x: 1000 }}
          rowClassName={(record) => {
            if (record.levels > 6) return 'gba:bg-red-50';
            if (record.levels > 4) return 'gba:bg-orange-50';
            return '';
          }}
        />
      </Card>
    </div>
  );
}; 