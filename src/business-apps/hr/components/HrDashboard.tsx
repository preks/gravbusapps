import React from 'react'
import { Card, Row, Col, Typography } from 'antd'
import { UsersIcon, FileTextIcon, UserIcon, IdentificationCardIcon } from '@phosphor-icons/react'

const { Title, Text } = Typography

const HrDashboard: React.FC = () => {
  const stats = [
    { title: 'Total Employees', value: '124', icon: <UsersIcon size={24} />, color: 'var(--nw-info)' },
    { title: 'Active Documents', value: '856', icon: <FileTextIcon size={24} />, color: 'var(--nw-success)' },
    { title: 'Open Positions', value: '12', icon: <IdentificationCardIcon size={24} />, color: 'var(--nw-warning)' },
    { title: 'On Leave', value: '8', icon: <UserIcon size={24} />, color: 'var(--nw-destructive)' }
  ]

  return (
    <div className="gba:p-6">
      <Title level={2} className="gba:mb-6">
        HR Dashboard
      </Title>

      <Row gutter={[16, 16]} className="gba:mb-8">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card className="gba:h-full">
              <div className="gba:flex gba:items-center">
                <div
                  className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:w-12 gba:h-12 gba:mr-4"
                  style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                >
                  {React.cloneElement(stat.icon, { style: { fontSize: '24px' } })}
                </div>
                <div>
                  <Text type="secondary" className="gba:block">
                    {stat.title}
                  </Text>
                  <Title level={3} className="gba:mt-1 gba:mb-0">
                    {stat.value}
                  </Title>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="gba:bg-primary-foreground gba:p-6 gba:rounded-lg gba:shadow">
        <Title level={4} className="gba:mb-4">
          Quick Actions
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="gba:text-center">
              <FileTextOutlined style={{ fontSize: '32px', color: 'var(--nw-info)' }} />
              <div className="gba:mt-2">Manage Documents</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="gba:text-center">
              <UserOutlined style={{ fontSize: '32px', color: 'var(--nw-success)' }} />
              <div className="gba:mt-2">Add Employee</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="gba:text-center">
              <IdcardOutlined style={{ fontSize: '32px', color: 'var(--nw-warning)' }} />
              <div className="gba:mt-2">Post Job</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable className="gba:text-center">
              <TeamOutlined style={{ fontSize: '32px', color: 'var(--nw-info)' }} />
              <div className="gba:mt-2">Team Overview</div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default HrDashboard
