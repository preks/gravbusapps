import React from 'react';
import { Row, Col, Card, Typography, Statistic } from 'antd';
import { formatCurrency } from '../utils/formatters';

const { Text } = Typography;

interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  currentLabel: string;
  previousLabel: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  currentValue,
  previousValue,
  currentLabel,
  previousLabel,
}) => {
  const max = Math.max(currentValue, previousValue);

  return (
    <Card title={title} data-testid={`comparison-card-${title.toLowerCase().replace(' ', '-')}`}>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: '16px' }}>
        <Col span={12}>
          <Statistic
            data-testid="current-period-statistic"
            title={currentLabel}
            value={currentValue}
            precision={2}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{ color: '#108ee9' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            data-testid="previous-period-statistic"
            title={previousLabel}
            value={previousValue}
            precision={2}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Col>
      </Row>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', marginTop: '20px' }} data-testid="comparison-chart">
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            data-testid="current-period-bar"
            style={{
              width: '60px',
              height: `${max > 0 ? Math.min(90, Math.max(10, (currentValue / max) * 90)) : 10}px`,
              backgroundColor: '#1890ff',
              marginBottom: '8px',
            }}
          ></div>
          <Text>Current</Text>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            data-testid="previous-period-bar"
            style={{
              width: '60px',
              height: `${max > 0 ? Math.min(90, Math.max(10, (previousValue / max) * 90)) : 10}px`,
              backgroundColor: '#d9d9d9',
              marginBottom: '8px',
            }}
          ></div>
          <Text>Previous</Text>
        </div>
      </div>
    </Card>
  );
};

export default ComparisonCard;
