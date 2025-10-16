import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { HomeOutlined, BarChartOutlined, DollarOutlined, BuildOutlined } from '@ant-design/icons'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { formatNumber, formatPercentage } from '@/common/data/investment'
import { formatCurrencyCompact } from '../../../../utils/currencyUtils'

// Typography components removed - using native HTML elements with nw-design-system styling

interface RealEstateKPICardsProps {
  kpis: {
    totalPropertyValue: number
    averageOccupancyRate: number
    totalUnits: number
    totalAnnualExpenses: number
  }
  prefixDataTestId: string
}

export const RealEstateKPICards: React.FC<RealEstateKPICardsProps> = ({ kpis, prefixDataTestId }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}
    >
      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalPropertyValue')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'var(--nw-color-warning-500)',
              borderRadius: '8px',
              padding: '12px',
              color: 'var(--nw-color-white)'
            }}
          >
            <HomeOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalPropertyValue', 'Total Property Value')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nw-color-gray-900)' }}>
              {formatCurrencyCompact(kpis.totalPropertyValue)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageOccupancyRate')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'var(--nw-color-success-500)',
              borderRadius: '8px',
              padding: '12px',
              color: 'var(--nw-color-white)'
            }}
          >
            <BarChartOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate', 'Average Occupancy Rate')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nw-color-gray-900)' }}>
              {formatPercentage(kpis.averageOccupancyRate)}
            </div>
          </div>
        </div>
      </Card>

      <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalUnits')} style={{ borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'var(--nw-color-primary-500)',
              borderRadius: '8px',
              padding: '12px',
              color: 'var(--nw-color-white)'
            }}
          >
            <BuildOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalUnits', 'Total Units')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nw-color-gray-900)' }}>
              {formatNumber(kpis.totalUnits)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalAnnualExpenses')}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'var(--nw-color-purple-500)',
              borderRadius: '8px',
              padding: '12px',
              color: 'var(--nw-color-white)'
            }}
          >
            <DollarOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalAnnualExpenses', 'Total Annual Expenses')}
            </Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nw-color-gray-900)' }}>
              {formatCurrencyCompact(kpis.totalAnnualExpenses)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
