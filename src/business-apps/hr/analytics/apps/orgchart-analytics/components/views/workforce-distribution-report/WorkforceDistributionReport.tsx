import React, { useState } from 'react';
import { Typography, Tabs, Alert, Spin, Button, Space, Row, Col } from 'antd';
import { ReloadOutlined, BarChartOutlined, PieChartOutlined, TableOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
import { useWorkforceDataIntegration } from './hooks/useWorkforceDataIntegration';
import WorkforceStatisticsDashboard from './components/WorkforceStatisticsDashboard';
import DistributionPieChart from './components/DistributionPieChart';
import DistributionBarChart from './components/DistributionBarChart';

const { Title } = Typography;
const { TabPane } = Tabs;

interface WorkforceDistributionReportProps extends BusinessAppContextProps {}

const WorkforceDistributionReport: React.FC<WorkforceDistributionReportProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  
  const prefixDataTestId = 'WorkforceDistributionReport';
  
  const {
    distribution,
    statistics,
    isLoading,
    error,
    refetch
  } = useWorkforceDataIntegration(context);

  if (isLoading) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-Loading`}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-Error`}>
        <Alert
          message="Error Loading Workforce Data"
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

  const renderGeographicDistribution = () => {
    const ChartComponent = chartType === 'pie' ? DistributionPieChart : DistributionBarChart;
    
    return (
      <div>
        <Space style={{ marginBottom: '16px' }}>
          <Button
            icon={<PieChartOutlined />}
            onClick={() => setChartType('pie')}
            type={chartType === 'pie' ? 'primary' : 'default'}
          >
            Pie Charts
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setChartType('bar')}
            type={chartType === 'bar' ? 'primary' : 'default'}
          >
            Bar Charts
          </Button>
        </Space>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <ChartComponent
              data={distribution.geographic.byCountry}
              title="Distribution by Country"
              dataTestId={`${prefixDataTestId}-CountryChart`}
            />
          </Col>
          <Col xs={24} lg={8}>
            <ChartComponent
              data={distribution.geographic.byRegion}
              title="Distribution by Region"
              dataTestId={`${prefixDataTestId}-RegionChart`}
            />
          </Col>
          <Col xs={24} lg={8}>
            <ChartComponent
              data={distribution.geographic.bySiteLocation}
              title="Distribution by Site Location"
              dataTestId={`${prefixDataTestId}-SiteChart`}
            />
          </Col>
        </Row>
      </div>
    );
  };

  const renderOrganizationalDistribution = () => {
    const ChartComponent = chartType === 'pie' ? DistributionPieChart : DistributionBarChart;
    
    return (
      <div>
        <Space style={{ marginBottom: '16px' }}>
          <Button
            icon={<PieChartOutlined />}
            onClick={() => setChartType('pie')}
            type={chartType === 'pie' ? 'primary' : 'default'}
          >
            Pie Charts
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setChartType('bar')}
            type={chartType === 'bar' ? 'primary' : 'default'}
          >
            Bar Charts
          </Button>
        </Space>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ChartComponent
              data={distribution.organizational.byDepartment}
              title="Distribution by Department"
              dataTestId={`${prefixDataTestId}-DepartmentChart`}
            />
          </Col>
          <Col xs={24} lg={12}>
            <ChartComponent
              data={distribution.organizational.byJobLevel}
              title="Distribution by Job Level"
              dataTestId={`${prefixDataTestId}-JobLevelChart`}
            />
          </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={12}>
            <ChartComponent
              data={distribution.organizational.byCompany}
              title="Distribution by Company"
              dataTestId={`${prefixDataTestId}-CompanyChart`}
            />
          </Col>
          <Col xs={24} lg={12}>
            <ChartComponent
              data={distribution.organizational.byCostCenter}
              title="Distribution by Cost Center"
              dataTestId={`${prefixDataTestId}-CostCenterChart`}
            />
          </Col>
        </Row>
      </div>
    );
  };

  const renderDemographicDistribution = () => {
    const ChartComponent = chartType === 'pie' ? DistributionPieChart : DistributionBarChart;
    
    return (
      <div>
        <Space style={{ marginBottom: '16px' }}>
          <Button
            icon={<PieChartOutlined />}
            onClick={() => setChartType('pie')}
            type={chartType === 'pie' ? 'primary' : 'default'}
          >
            Pie Charts
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setChartType('bar')}
            type={chartType === 'bar' ? 'primary' : 'default'}
          >
            Bar Charts
          </Button>
        </Space>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <ChartComponent
              data={distribution.demographic.byGender}
              title="Distribution by Gender"
              dataTestId={`${prefixDataTestId}-GenderChart`}
            />
          </Col>
          <Col xs={24} lg={8}>
            <ChartComponent
              data={distribution.demographic.byAgeGroup}
              title="Distribution by Age Group"
              dataTestId={`${prefixDataTestId}-AgeGroupChart`}
            />
          </Col>
          <Col xs={24} lg={8}>
            <ChartComponent
              data={distribution.demographic.byTenure}
              title="Distribution by Tenure"
              dataTestId={`${prefixDataTestId}-TenureChart`}
            />
          </Col>
        </Row>
      </div>
    );
  };

  const renderEmploymentDistribution = () => {
    const ChartComponent = chartType === 'pie' ? DistributionPieChart : DistributionBarChart;
    
    return (
      <div>
        <Space style={{ marginBottom: '16px' }}>
          <Button
            icon={<PieChartOutlined />}
            onClick={() => setChartType('pie')}
            type={chartType === 'pie' ? 'primary' : 'default'}
          >
            Pie Charts
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setChartType('bar')}
            type={chartType === 'bar' ? 'primary' : 'default'}
          >
            Bar Charts
          </Button>
        </Space>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ChartComponent
              data={distribution.employment.byEmploymentType}
              title="Distribution by Employment Type"
              dataTestId={`${prefixDataTestId}-EmploymentTypeChart`}
            />
          </Col>
          <Col xs={24} lg={12}>
            <ChartComponent
              data={distribution.employment.byStartYear}
              title="Distribution by Start Year"
              dataTestId={`${prefixDataTestId}-StartYearChart`}
            />
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div
      data-testid={`${prefixDataTestId}-WorkforceDistributionReport`}
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
        <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
          Workforce Distribution Report
        </Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={refetch}
          >
            Refresh Data
          </Button>
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabPosition="top"
        size="large"
      >
        <TabPane 
          tab={
            <span>
              <TableOutlined />
              Overview
            </span>
          } 
          key="overview"
        >
          <WorkforceStatisticsDashboard 
            statistics={statistics}
            dataTestId={`${prefixDataTestId}-StatisticsDashboard`}
          />
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Geographic
            </span>
          } 
          key="geographic"
        >
          {renderGeographicDistribution()}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Organizational
            </span>
          } 
          key="organizational"
        >
          {renderOrganizationalDistribution()}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Demographics
            </span>
          } 
          key="demographics"
        >
          {renderDemographicDistribution()}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Employment
            </span>
          } 
          key="employment"
        >
          {renderEmploymentDistribution()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default WorkforceDistributionReport; 