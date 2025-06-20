import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { TeamOutlined, FileTextOutlined, UserOutlined, IdcardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const HrDashboard: React.FC = () => {
  const stats = [
    { title: 'Total Employees', value: '124', icon: <TeamOutlined />, color: '#1890ff' },
    { title: 'Active Documents', value: '856', icon: <FileTextOutlined />, color: '#52c41a' },
    { title: 'Open Positions', value: '12', icon: <IdcardOutlined />, color: '#faad14' },
    { title: 'On Leave', value: '8', icon: <UserOutlined />, color: '#f5222d' },
  ];

  return (
    <div className="p-6">
      <Title level={2} className="mb-6">HR Dashboard</Title>
      
      <Row gutter={[16, 16]} className="mb-8">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card className="h-full">
              <div className="flex items-center">
                <div 
                  className="flex items-center justify-center rounded-full w-12 h-12 mr-4"
                  style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                >
                  {React.cloneElement(stat.icon, { style: { fontSize: '24px' } })}
                </div>
                <div>
                  <Text type="secondary" className="block">{stat.title}</Text>
                  <Title level={3} className="mt-1 mb-0">{stat.value}</Title>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="bg-white p-6 rounded-lg shadow">
        <Title level={4} className="mb-4">Quick Actions</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="text-center">
              <FileTextOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <div className="mt-2">Manage Documents</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="text-center">
              <UserOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <div className="mt-2">Add Employee</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="text-center">
              <IdcardOutlined style={{ fontSize: '32px', color: '#faad14' }} />
              <div className="mt-2">Post Job</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="text-center">
              <TeamOutlined style={{ fontSize: '32px', color: '#722ed1' }} />
              <div className="mt-2">Team Overview</div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default HrDashboard;
