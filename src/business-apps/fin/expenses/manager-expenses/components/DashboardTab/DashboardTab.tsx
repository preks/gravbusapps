import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Typography } from 'antd';
import { PiChartBar, PiCurrencyDollar, PiUsers, PiClipboardText } from 'react-icons/pi';
import { useGetExpenseDashboard } from '../../hooks/useGetExpenseDashboard';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title, Text } = Typography;

export interface DashboardTabProps extends BusinessAppContextProps {}

const DashboardTab: React.FC<DashboardTabProps> = (props) => {
  const { dashboardData, isLoading, error } = useGetExpenseDashboard(props);
  
  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="gba:p-6">
      <Title level={4} className="gba:mb-6">Team Expenses Dashboard</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="gba:h-full">
            <Statistic
              title="Team Members"
              value={dashboardData?.teamMembersCount || 0}
              prefix={<PiUsers className="gba:mr-2" />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="gba:h-full">
            <Statistic
              title="Pending Approvals"
              value={dashboardData?.pendingApprovalsCount || 0}
              prefix={<PiClipboardText className="gba:mr-2" />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="gba:h-full">
            <Statistic
              title="Monthly Expenses"
              value={dashboardData?.monthlyExpensesTotal || 0}
              precision={2}
              prefix={<PiCurrencyDollar className="gba:mr-2" />}
              suffix="€"
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="gba:h-full">
            <Statistic
              title="Expense Categories"
              value={dashboardData?.expenseCategoriesCount || 0}
              prefix={<PiChartBar className="gba:mr-2" />}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Additional dashboard content can be added here */}
      <Row gutter={[16, 16]} className="gba:mt-6">
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Expense Requests" 
            bordered={false}
            className="gba:h-full"
          >
            {dashboardData?.recentExpenseRequests?.length > 0 ? (
              <ul className="gba:list-none gba:p-0">
                {dashboardData.recentExpenseRequests.map((request) => (
                  <li key={request.id} className="gba:py-2 gba:border-b gba:border-gray-100 gba:last:border-0">
                    <div className="gba:flex gba:justify-between">
                      <div>
                        <Text strong>{request.title}</Text>
                        <div><Text type="secondary">{request.employeeName}</Text></div>
                      </div>
                      <div className="gba:text-right">
                        <Text>{request.amount}€</Text>
                        <div><Text type="secondary">{request.date}</Text></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Text type="secondary">No recent expense requests</Text>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="Team Budget Status" 
            bordered={false}
            className="gba:h-full"
          >
            {dashboardData?.teamBudgetStatus ? (
              <div>
                <Statistic
                  title="Budget Used"
                  value={dashboardData.teamBudgetStatus.usedPercentage || 0}
                  precision={1}
                  suffix="%"
                />
                <div className="gba:mt-4">
                  <div className="gba:flex gba:justify-between gba:mb-1">
                    <Text>Used: {dashboardData.teamBudgetStatus.used}€</Text>
                    <Text>Total: {dashboardData.teamBudgetStatus.total}€</Text>
                  </div>
                  <div className="gba:bg-gray-200 gba:rounded-full gba:h-2">
                    <div 
                      className="gba:bg-blue-500 gba:h-2 gba:rounded-full" 
                      style={{ width: `${Math.min(dashboardData.teamBudgetStatus.usedPercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Text type="secondary">No budget data available</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardTab;
