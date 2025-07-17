import React, { useState } from 'react';
import { Typography, Tabs, Alert, Spin, Button, Space, Row, Col, Card, Progress } from 'antd';
import { ReloadOutlined, CalendarOutlined, BarChartOutlined, TableOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
import { useAbsenceDataIntegration } from './hooks/useAbsenceDataIntegration';
import AbsenceStatisticsDashboard from './components/AbsenceStatisticsDashboard';
import AbsenceChartsView from './components/AbsenceChartsView';
import AbsenceDetailsTable from './components/AbsenceDetailsTable';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface AbsenceReportProps extends BusinessAppContextProps {}

const AbsenceReport: React.FC<AbsenceReportProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  const {
    absenceData,
    balanceData,
    absenceTypes,
    absenceGroups,
    statistics,
    chartData,
    tableData,
    isLoading,
    error,
    refetch
  } = useAbsenceDataIntegration(context);

  const prefixDataTestId = 'AbsenceReport';

  if (error) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-error`}
        style={{ 
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px'
        }}
      >
        <Alert
          message="Failed to Load Absence Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch} icon={<ReloadOutlined />}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-loading`}
        style={{ 
          background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
          minHeight: '100%',
          padding: '24px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column'
        }}
      >
        <Spin size="large" />
        <Text style={{ marginTop: '16px', color: '#666' }}>
          Loading absence data and analytics...
        </Text>
      </div>
    );
  }

  return (
    <div
      data-testid={prefixDataTestId}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            Absence Report & Analytics
          </Title>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Card size="small" style={{ padding: '4px 8px' }}>
              <Text strong style={{ color: '#1890ff' }}>
                {statistics.totalEmployees} Employees
              </Text>
            </Card>
            <Card size="small" style={{ padding: '4px 8px' }}>
              <Text strong style={{ color: '#722ed1' }}>
                {absenceTypes.length} Absence Types
              </Text>
            </Card>
            <Card size="small" style={{ padding: '4px 8px' }}>
              <Text strong style={{ color: '#52c41a' }}>
                {statistics.totalAbsenceDays} Total Days
              </Text>
            </Card>
          </div>
        </div>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
        >
          Refresh Data
        </Button>
      </div>

      {/* Main Content */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        size="large"
        style={{ 
          background: '#fff', 
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <TabPane 
          tab={
            <Space>
              <CalendarOutlined />
              <span data-testid={`${prefixDataTestId}-overview-tab`}>
                Overview & Statistics
              </span>
            </Space>
          } 
          key="overview"
        >
          <AbsenceStatisticsDashboard 
            statistics={statistics}
            isLoading={isLoading}
          />
        </TabPane>
        
        <TabPane 
          tab={
            <Space>
              <BarChartOutlined />
              <span data-testid={`${prefixDataTestId}-charts-tab`}>
                Charts & Trends
              </span>
            </Space>
          } 
          key="charts"
        >
          <AbsenceChartsView 
            chartData={chartData}
            isLoading={isLoading}
            dataTestId={prefixDataTestId}
          />
        </TabPane>
        
        <TabPane 
          tab={
            <Space>
              <TableOutlined />
              <span data-testid={`${prefixDataTestId}-details-tab`}>
                Detailed Analysis
              </span>
            </Space>
          } 
          key="details"
        >
          <AbsenceDetailsTable 
            tableData={tableData}
            dataTestId={prefixDataTestId}
          />
        </TabPane>
      </Tabs>

      {/* Footer Summary */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card size="small" style={{ background: '#f0f2f5' }}>
            <Row gutter={[16, 8]} justify="space-between" align="middle">
              <Col>
                <Text type="secondary">
                  Last Updated: {new Date().toLocaleDateString()} • 
                  Data includes {absenceData.length} absence records and {balanceData.length} balance entries
                </Text>
              </Col>
              <Col>
                <Space>
                  {absenceGroups.map((group, index) => (
                    <div key={group.code} style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '12px', 
                        color: ['#1890ff', '#ff4d4f', '#722ed1', '#52c41a'][index % 4] 
                      }}>
                        {group.value}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {statistics.groupStats.find(s => s.groupCode === group.code)?.totalDays || 0} days
                      </div>
                    </div>
                  ))}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AbsenceReport; 