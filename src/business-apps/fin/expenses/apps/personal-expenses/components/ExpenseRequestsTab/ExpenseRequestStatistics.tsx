import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  CalendarOutlined 
} from '@ant-design/icons';
import { ExpenseRequest } from '../../hooks/useGetExpenseRequests';

const { Text } = Typography;

interface ExpenseRequestStatisticsProps {
  items: ExpenseRequest[];
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({ items }) => {
  // Calculate summary statistics with memoization
  const totalRequests = useMemo(() => items?.length ?? 0, [items]);
  
  const totalAmount = useMemo(() => 
    items?.reduce((sum, request) => sum + (request.totalAmount || 0), 0) ?? 0, 
  [items]);
  
  const pendingApproval = useMemo(() => 
    items?.filter(request => request.status === 'Submitted').length ?? 0, 
  [items]);
  
  const reimbursableAmount = useMemo(() => 
    items?.reduce((sum, request) => sum + (request.reimbursableAmount || 0), 0) ?? 0, 
  [items]);

  return (
    <div className="gba:px-4">
      <div className="gba:expense-statistics-cards gba:mb-4 gba:mt-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Requests" 
                value={totalRequests}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
              <Text type="success" style={{ fontSize: 12 }}>+8% from last month</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Amount" 
                value={totalAmount}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="€"
                valueStyle={{ color: '#3f8600' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Across all requests</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Pending Approval" 
                value={pendingApproval}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Requires action</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Reimbursable" 
                value={reimbursableAmount}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="€"
                valueStyle={{ color: '#722ed1' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>To be reimbursed</Text>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ExpenseRequestStatistics;