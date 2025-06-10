import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { FileTextOutlined, DollarOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons';
import { AdvancePayment } from '../../hooks/useGetAdvancePayments';

const { Text } = Typography;

interface AdvancePaymentStatisticsProps {
  payments: AdvancePayment[] | undefined;
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({ payments }) => {
  // Calculate summary statistics
  const totalPayments = useMemo(() => payments?.length ?? 0, [payments]);
  
  const totalAmount = useMemo(() => 
    payments?.reduce((sum, item) => sum + (item.amount ?? 0), 0) ?? 0, 
  [payments]);
  
  const pendingPayments = useMemo(() => 
    payments?.filter(item => 
      item.status.toLowerCase() === 'pending' || 
      item.status.toLowerCase() === 'submitted'
    ).length ?? 0, 
  [payments]);
  
  const approvedPayments = useMemo(() => 
    payments?.filter(item => 
      item.status.toLowerCase() === 'approved' || 
      item.status.toLowerCase() === 'paid'
    ).length ?? 0, 
  [payments]);

  return (
    <div className="px-4">
      <div className="advance-payment-statistics" style={{ marginBottom: 16, marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Advance Payments" 
                value={totalPayments}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>All advance payments</Text>
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
              <Text type="secondary" style={{ fontSize: 12 }}>Across all payments</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Pending Payments" 
                value={pendingPayments}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Awaiting approval</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Approved Payments" 
                value={approvedPayments}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Ready for processing</Text>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AdvancePaymentStatistics;