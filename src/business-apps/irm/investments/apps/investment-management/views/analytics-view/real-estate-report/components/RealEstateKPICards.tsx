import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { HomeOutlined, BarChartOutlined, DollarOutlined, BuildOutlined } from '@ant-design/icons'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { formatCurrency, formatNumber, formatPercentage } from '@/common/data/investment/utils/formatters'

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
            className="gba:bg-warning gba:text-warning-foreground"
            style={{
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <HomeOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalPropertyValue', 'Total Property Value')}
            </Text>
            <div className="gba:text-foreground" style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {formatCurrency(kpis.totalPropertyValue)}
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
            className="gba:bg-success gba:text-success-foreground"
            style={{
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <BarChartOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate', 'Average Occupancy Rate')}
            </Text>
            <div className="gba:text-foreground" style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {formatPercentage(kpis.averageOccupancyRate)}
            </div>
          </div>
        </div>
      </Card>

      <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalUnits')} style={{ borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="gba:bg-primary gba:text-primary-foreground"
            style={{
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <BuildOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalUnits', 'Total Units')}
            </Text>
            <div className="gba:text-foreground" style={{ fontSize: '24px', fontWeight: 'bold' }}>
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
            className="gba:bg-accent gba:text-accent-foreground"
            style={{
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <DollarOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {getTranslationFromI18nKeyAndLabel('kpi.totalAnnualExpenses', 'Total Annual Expenses')}
            </Text>
            <div className="gba:text-foreground" style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {formatCurrency(kpis.totalAnnualExpenses)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
