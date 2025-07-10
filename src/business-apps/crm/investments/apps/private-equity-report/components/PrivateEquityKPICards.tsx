import React from 'react';
import { Card, Typography } from 'antd';
import { FundOutlined, BarChartOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';
import { PrivateEquityInvestmentKPIs } from '../types';

const { Text } = Typography;

interface PrivateEquityKPICardsProps {
  kpis: PrivateEquityInvestmentKPIs;
  prefixDataTestId?: string;
}

export const PrivateEquityKPICards: React.FC<PrivateEquityKPICardsProps> = ({ 
  kpis, 
  prefixDataTestId = 'PrivateEquityKPICards' 
}) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
      gap: '16px',
      marginBottom: '24px'
    }}>
      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalPEValue')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#eb2f96', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <FundOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalPEValue', 'Total PE Value')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatCurrency(kpis.totalPEValue)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-InvestmentCount')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#1890ff', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <BarChartOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.investmentCount', 'Investment Count')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatNumber(kpis.investmentCount)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageStake')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#52c41a', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <TeamOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.averageStake', 'Average Stake')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatPercentage(kpis.averageStake)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-ActiveDeals')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            backgroundColor: '#fa8c16', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'white'
          }}>
            <RiseOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.activeDeals', 'Active Deals')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {formatNumber(kpis.activeDeals)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}; 