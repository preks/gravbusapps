import React, { useState } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Typography } from 'antd';
import { PiChartBar, PiCurrencyDollar, PiUsers, PiClipboardText, PiListChecks, PiChartLineUp, PiFileText, PiShieldCheck } from 'react-icons/pi';
import { useGetExpenseDashboard } from '../../../hooks/useGetExpenseDashboard';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import ExpenseTrendsChart from './components/ExpenseTrendsChart';
import { ApprovalsModal, ExpenseReportsModal, TeamSpendingAnalyticsModal } from '../../modals';
import { formatAmount } from '../../../utils/currencyUtils';

const { Title, Text } = Typography;

export interface ExpenseDashboardTabProps extends BusinessAppContextProps {}

// Define a type for recent requests if not already available from the hook
interface RecentRequestItem {
  id: string;
  title: string;
  totalAmount: number | string;
  requestDate: string;
  status: string;
  employeeName: string;
}

const getErrorMessage = (err: unknown): string => {
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'An unknown error occurred';
};

const ExpenseDashboardTab: React.FC<BusinessAppContextProps> = (props) => {
  const { dashboardData, isLoading, error } = useGetExpenseDashboard(props);
  const [approvalsModalVisible, setApprovalsModalVisible] = useState<boolean>(false);
  const [reportsModalVisible, setReportsModalVisible] = useState<boolean>(false);
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState<boolean>(false);
  
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
        description={getErrorMessage(error)}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          {/* Log dashboard data for debugging */}
          {(() => { 
            console.log('Dashboard Data in UI:', { 
              teamMembersCount: dashboardData?.teamMembersCount,
              pendingApprovalsCount: dashboardData?.pendingApprovalsCount,
              monthlyExpensesAmount: dashboardData?.monthlyExpensesAmount,
              expenseCategoriesCount: dashboardData?.expenseCategoriesCount
            }); 
            return null; 
          })()}
          <Card className="gba:h-full">
            <Statistic
              title="Team Members"
              value={dashboardData?.teamMembersCount ?? 0}
              prefix={<PiUsers className="gba:mr-2" />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="gba:h-full">
            <Statistic
              title="Pending Approvals"
              value={dashboardData?.pendingApprovalsCount ?? 0}
              prefix={<PiClipboardText className="gba:mr-2" />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="gba:h-full">
            <Statistic
              title="Monthly Expenses"
              value={dashboardData?.monthlyExpensesAmount ?? 0}
              formatter={(value) => formatAmount(Number(value))}
              prefix={<PiCurrencyDollar className="gba:mr-2" />}
              suffix="€"
              data-testid="monthly-expenses-statistic"
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          {/* Log expense categories data for debugging */}
          {(() => { 
            console.log('Expense Categories - value:', dashboardData?.expenseCategoriesCount); 
            console.log('Monthly Expenses - value:', dashboardData?.monthlyExpensesAmount); 
            return null; 
          })()}
          <Card className="gba:h-full">
            <Statistic
              title="Expense Categories"
              value={dashboardData?.expenseCategoriesCount ?? 0}
              prefix={<PiChartBar className="gba:mr-2" />}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Quick Actions Section */}
      <Title level={5} className="gba:mt-8 gba:mb-4">Quick Actions</Title>
      <Row gutter={[16, 16]}>
        {
          [
            {
              key: 'approvals',
              title: 'Review Approvals',
              description: 'Process pending expense requests.',
              icon: <PiListChecks className="gba:text-2xl gba:text-blue-500" />,
              onClick: () => setApprovalsModalVisible(true),
              'data-testid': 'review-approvals-action',
            },
            {
              key: 'analysis',
              title: 'Team Spending Analysis',
              description: 'View spending trends and reports.',
              icon: <PiChartLineUp className="gba:text-2xl gba:text-green-500" />,
              onClick: () => setAnalyticsModalVisible(true),
              'data-testid': 'team-spending-analysis-action',
            },
            {
              key: 'reports',
              title: 'Expense Reports',
              description: 'Generate or view team expense reports.',
              icon: <PiFileText className="gba:text-2xl gba:text-purple-500" />,
              onClick: () => setReportsModalVisible(true),
              'data-testid': 'expense-reports-action'
            }
          ].map(action => (
            <Col xs={24} sm={12} lg={6} key={action.key}>
              <Card 
                hoverable 
                className="gba:h-full gba:flex gba:flex-col" 
                onClick={action.onClick || (() => { /* Navigate to action.link */ })} 
                data-testid={`quick-action-${action.key}`}
              >
                <div className="gba:flex gba:items-center gba:mb-2">
                  {action.icon}
                  <Title level={5} className="gba:ml-3 gba:mb-0">{action.title}</Title>
                </div>
                <Text type="secondary">{action.description}</Text>
              </Card>
            </Col>
          ))
        }
      </Row>

      {/* Additional dashboard content can be added here */}
      <Row gutter={[16, 16]} className="gba:mt-6">
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Expense Requests"
            className="gba:h-full"
            data-testid="recent-expense-requests-card"
          >
            {(dashboardData?.recentRequests && dashboardData.recentRequests.length > 0) ? (
              <ul className="gba:list-none gba:p-0">
                {dashboardData.recentRequests.map((request: RecentRequestItem) => (
                  <li key={request.id} className="gba:py-3 gba:border-b gba:border-gray-100 gba:last:border-0">
                    <div className="gba:flex gba:justify-between gba:mb-1">
                      <div>
                        <Text strong>{request.title}</Text>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Text type="secondary">{request.employeeName}</Text>
                          <span className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-gray-100">
                            {request.status}
                          </span>
                        </div>
                      </div>
                      <div className="gba:text-right">
                        <Text className="gba:font-medium">€{typeof request.totalAmount === 'number' ? formatAmount(request.totalAmount) : request.totalAmount}</Text>
                        <div><Text type="secondary">{request.requestDate}</Text></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="gba:py-8 gba:text-center">
                <Text type="secondary">No recent expense requests</Text>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="Team Budget Status"
            className="gba:h-full"
          >
            {dashboardData?.teamBudget ? (
              <div>
                <Statistic
                  title="Budget Used"
                  value={dashboardData.teamBudget.total > 0 ? ((dashboardData.teamBudget.used / dashboardData.teamBudget.total) * 100) : 0}
                  precision={1}
                  suffix="%"
                />
                <div className="gba:mt-4">
                  <div className="gba:flex gba:justify-between gba:mb-1">
                    <Text>Used: €{formatAmount(dashboardData.teamBudget?.used ?? 0)}</Text>
                    <Text>Total: €{formatAmount(dashboardData.teamBudget?.total ?? 0)}</Text>
                  </div>
                  <div className="gba:bg-gray-200 gba:rounded-full gba:h-2">
                    <div 
                      className="gba:bg-blue-500 gba:h-2 gba:rounded-full" 
                      style={{ width: `${dashboardData.teamBudget.total > 0 ? Math.min(((dashboardData.teamBudget.used / dashboardData.teamBudget.total) * 100), 100) : 0}%` }}
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

      {/* Expense Trends Chart */}
      <Row gutter={[16, 16]} className="gba:mt-6">
        <Col xs={24}>
          <ExpenseTrendsChart 
            data={dashboardData?.monthlyTrends || []} 
            title="Monthly Expense Trends"
          />
        </Col>
      </Row>
      
      {/* Approvals Modal */}
      <ApprovalsModal 
        visible={approvalsModalVisible}
        onCancel={() => setApprovalsModalVisible(false)}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
      
      {/* Expense Reports Modal */}
      <ExpenseReportsModal
        visible={reportsModalVisible}
        onCancel={() => setReportsModalVisible(false)}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
      
      {/* Team Spending Analytics Modal */}
      <TeamSpendingAnalyticsModal
        visible={analyticsModalVisible}
        onCancel={() => setAnalyticsModalVisible(false)}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
      
    </div>
  );
};

export default ExpenseDashboardTab;
