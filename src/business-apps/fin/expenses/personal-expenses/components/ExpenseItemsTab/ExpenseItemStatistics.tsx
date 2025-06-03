import React, { useMemo } from 'react';
import { Row, Col, Card, Statistic, Typography } from 'antd';

const { Text } = Typography;

interface ExpenseItemStatisticsProps {
  items: any[];
}

const ExpenseItemStatistics: React.FC<ExpenseItemStatisticsProps> = ({ items }) => {
  // Calculate summary statistics
  const totalExpenses = useMemo(() => items?.reduce((sum: number, item) => sum + (item.reimbursableAmount ?? 0), 0) ?? 0, [items]);
  
  const pendingReimbursement = useMemo(() => items?.filter(item => 
    item.status.toLowerCase() === 'pending' || 
    item.status.toLowerCase() === 'submitted' || 
    item.status.toLowerCase() === 'in progress'
  ).reduce((sum: number, item) => sum + (item.reimbursableAmount ?? 0), 0) ?? 0, [items]);
  
  const missingReceipts = useMemo(() => items?.filter(item => !item.additionalProperties?.hasAttachment).length ?? 0, [items]);

  // Get unique categories/types for the counter
  const categoriesCount = useMemo(() => {
    const uniqueCategories = new Set(items?.map(item => item.expenseClass?.value));
    return uniqueCategories.size;
  }, [items]);

  return (
    <div className="gba:px-4">
      <div className="expense-info-cards" style={{ marginBottom: 16, marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Expenses" 
                value={totalExpenses} 
                precision={2} 
                prefix="€"
                suffix={<span style={{ fontSize: '14px', color: '#52c41a' }}>+12.5% from last month</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Pending Reimbursement" 
                value={pendingReimbursement} 
                precision={2} 
                prefix="€" 
              />
              <Text type="secondary">{items?.filter(i => 
                i.status.toLowerCase() === 'pending' || 
                i.status.toLowerCase() === 'submitted' || 
                i.status.toLowerCase() === 'in progress'
              ).length ?? 0} items pending</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Missing Receipts" 
                value={missingReceipts} 
              />
              <Text type="secondary">Action required</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Categories Used" 
                value={categoriesCount} 
              />
              <Text type="secondary">Across all expenses</Text>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ExpenseItemStatistics;
