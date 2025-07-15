import React from 'react';
import { Row, Col, Card, Statistic, Progress } from 'antd';
import { 
  TeamOutlined, 
  GlobalOutlined, 
  BankOutlined, 
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  PieChartOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import type { WorkforceStatistics } from '../types/workforceTypes';

interface WorkforceStatisticsDashboardProps {
  statistics: WorkforceStatistics;
  dataTestId?: string;
}

const WorkforceStatisticsDashboard: React.FC<WorkforceStatisticsDashboardProps> = ({
  statistics,
  dataTestId = 'workforce-statistics-dashboard'
}) => {
  const statisticsData = [
    {
      title: 'Total Employees',
      value: statistics.totalEmployees,
      icon: <TeamOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff'
    },
    {
      title: 'Countries',
      value: statistics.countries,
      icon: <GlobalOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a'
    },
    {
      title: 'Companies',
      value: statistics.companies,
      icon: <BankOutlined style={{ color: '#722ed1' }} />,
      color: '#722ed1'
    },
    {
      title: 'Departments',
      value: statistics.departments,
      icon: <UserOutlined style={{ color: '#fa541c' }} />,
      color: '#fa541c'
    },
    {
      title: 'Average Age',
      value: statistics.averageAge,
      suffix: 'years',
      icon: <CalendarOutlined style={{ color: '#eb2f96' }} />,
      color: '#eb2f96'
    },
    {
      title: 'Average Tenure',
      value: statistics.averageTenure,
      suffix: 'years',
      icon: <ClockCircleOutlined style={{ color: '#13c2c2' }} />,
      color: '#13c2c2'
    },
    {
      title: 'Gender Diversity',
      value: statistics.genderDiversityIndex,
      suffix: '%',
      icon: <PieChartOutlined style={{ color: '#f5222d' }} />,
      color: '#f5222d'
    },
    {
      title: 'Site Locations',
      value: statistics.siteLocations,
      icon: <EnvironmentOutlined style={{ color: '#faad14' }} />,
      color: '#faad14'
    }
  ];

  return (
    <div data-testid={dataTestId}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {statisticsData.map((stat, index) => (
          <Col xs={24} sm={12} md={6} lg={6} xl={3} key={index}>
            <Card
              hoverable
              style={{ 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                border: '1px solid #e8e8e8',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {stat.icon}
              </div>
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix}
                valueStyle={{ 
                  color: stat.color, 
                  fontSize: '20px', 
                  fontWeight: 'bold' 
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Progress indicators for diversity and geographic spread */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card
            title="Gender Diversity Index"
            style={{ borderRadius: '8px' }}
            headStyle={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #e8e8e8' }}
          >
            <Progress
              percent={statistics.genderDiversityIndex}
              strokeColor={{
                '0%': '#f5222d',
                '50%': '#faad14',
                '100%': '#52c41a',
              }}
              format={(percent?: number) => `${percent}%`}
            />
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
              Higher values indicate more balanced gender distribution
            </p>
          </Card>
        </Col>
        
        <Col xs={24} sm={12}>
          <Card
            title="Geographic Distribution"
            style={{ borderRadius: '8px' }}
            headStyle={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #e8e8e8' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Statistic
                  title="Countries"
                  value={statistics.countries}
                  valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                />
              </div>
              <div>
                <Statistic
                  title="Regions"
                  value={statistics.regions}
                  valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                />
              </div>
              <div>
                <Statistic
                  title="Sites"
                  value={statistics.siteLocations}
                  valueStyle={{ color: '#722ed1', fontSize: '24px' }}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* Additional metrics */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12}>
          <Card
            title="Organizational Structure"
            style={{ borderRadius: '8px' }}
            headStyle={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #e8e8e8' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Job Levels"
                  value={statistics.jobLevels}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#fa541c' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Cost Centers"
                  value={statistics.costCenters}
                  prefix={<BankOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} sm={12}>
          <Card
            title="Workforce Demographics"
            style={{ borderRadius: '8px' }}
            headStyle={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #e8e8e8' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Avg Age"
                  value={statistics.averageAge}
                  suffix="years"
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Avg Tenure"
                  value={statistics.averageTenure}
                  suffix="years"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#13c2c2' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkforceStatisticsDashboard; 