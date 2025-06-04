import React, { useMemo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ExpenseRequestStatisticsProps {
  requests: any[];
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({ requests }) => {
  const stats = useMemo(() => {
    if (!requests || requests.length === 0) {
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        totalAmount: 0,
        pendingAmount: 0
      };
    }

    return requests.reduce((acc, request) => {
      // Count by status
      if (request.status === 'PENDING') {
        acc.pending += 1;
        acc.pendingAmount += (request.amount || 0);
      } else if (request.status === 'APPROVED') {
        acc.approved += 1;
      } else if (request.status === 'REJECTED') {
        acc.rejected += 1;
      }

      // Total amount
      acc.totalAmount += (request.amount || 0);

      return acc;
    }, {
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0,
      pendingAmount: 0
    });
  }, [requests]);

  return (
    <div className="gba:py-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} size="small">
            <Statistic
              title="Pending Requests"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} size="small">
            <Statistic
              title="Approved Requests"
              value={stats.approved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} size="small">
            <Statistic
              title="Rejected Requests"
              value={stats.rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} size="small">
            <Statistic
              title="Pending Amount"
              value={stats.pendingAmount}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
              prefix="€"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExpenseRequestStatistics;
