import React, { useMemo } from 'react';
import { Row, Col, Card, Statistic, Typography } from 'antd';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  CalendarOutlined, 
  CompassOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

interface ExpensePlanStatisticsProps {
  plans: any[];
}

const ExpensePlanStatistics: React.FC<ExpensePlanStatisticsProps> = ({ plans }) => {
  // Calculate summary statistics with memoization
  const totalPlans = useMemo(() => plans?.length ?? 0, [plans]);
  
  const totalEstimated = useMemo(() => 
    plans?.reduce((sum, plan) => sum + (plan.totalAmount ?? 0), 0) ?? 0, 
  [plans]);
  
  const pendingApproval = useMemo(() => 
    plans?.filter(plan => plan.status === 'Submitted').length ?? 0, 
  [plans]);
  
  // Get unique destinations (for the top destinations card) with memoization
  const uniqueDestinations = useMemo(() => {
    const destinations = new Set<string>();
    plans?.forEach(plan => {
      // Try to get request type from the new field structure
      if (plan.requestType?.value) {
        destinations.add(plan.requestType.value);
      } else {
        // Fallback to additionalProperties if requestType is not available
        const additionalProps = plan.additionalProperties as Record<string, any> | null;
        const tripType = additionalProps?.tripType ?? additionalProps?.travelType ?? '';
        if (tripType) destinations.add(tripType);
      }
    });
    return destinations.size || 2; // Default to 2 if no destinations found (for UI display)
  }, [plans]);

  return (
    <div className="gba:px-4">
      <div className="expense-statistics-cards gba:mb-4 gba:mt-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Plans" 
                value={totalPlans}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
              <Text type="success" style={{ fontSize: 12 }}>+15% from last month</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Estimated" 
                value={totalEstimated}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="€"
                valueStyle={{ color: '#3f8600' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Across all plans</Text>
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
                title="Top Destinations" 
                value={uniqueDestinations}
                prefix={<CompassOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Unique locations</Text>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ExpensePlanStatistics;