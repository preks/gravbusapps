import React from 'react';
import { Card, Typography } from 'antd';
import { BankOutlined, PercentageOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';
import { LiquidFundInvestmentKPIs } from '../types';

const { Text } = Typography;

interface LiquidFundKPICardsProps {
  kpis: LiquidFundInvestmentKPIs;
  prefixDataTestId?: string;
}

export const LiquidFundKPICards: React.FC<LiquidFundKPICardsProps> = ({ 
  kpis, 
  prefixDataTestId = 'LiquidFundKPICards' 
}) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
      gap: '16px',
      marginBottom: '24px'
    }}>
      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalFundValue')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#1890ff', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <BankOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Total Fund Value
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatCurrency(kpis.totalFundValue)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageInterestRate')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#52c41a', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <PercentageOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Average Interest Rate
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatPercentage(kpis.averageInterestRate)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-MaturingSoon')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#faad14', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <CalendarOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Maturing Soon
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatNumber(kpis.maturingSoon)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-EarlyTerminationAllowed')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#722ed1', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <CheckCircleOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Early Termination Allowed
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatNumber(kpis.earlyTerminationAllowed)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}; 