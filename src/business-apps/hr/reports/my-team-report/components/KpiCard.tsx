import React from 'react'
import { Card, Typography } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface KpiCardProps extends BusinessAppContextProps {
  icon: React.ReactNode
  value: number | string
  label: string
  kpiKey: string
  subLabel?: string
  active?: boolean
  onClick?: () => void
  'data-testid'?: string
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, value, label, subLabel, onClick, 'data-testid': dataTestid }) => {
  const cardStyle: React.CSSProperties = {
    height: '140px',
    cursor: onClick ? 'pointer' : 'auto',
    background: 'white'
  }

  const bodyStyle: React.CSSProperties = {
    padding: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  }

  return (
    <Card
      hoverable
      size="small"
      style={cardStyle}
      bodyStyle={bodyStyle}
      onClick={onClick}
      data-testid={dataTestid}
      className="gba:overflow-hidden"
    >
      <div className="gba:flex gba:flex-col gba:gap-2 gba:h-full">
        <div className="ant-statistic-title" style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
          {label}
        </div>
        <div className="ant-statistic-content gba:flex-grow" style={{ display: 'flex', alignItems: 'center' }}>
          <span
            className="ant-statistic-content-prefix"
            style={{ marginRight: '8px', fontSize: '24px', display: 'inline-flex', alignItems: 'center' }}
          >
            {icon}
          </span>
          <span className="ant-statistic-content-value" style={{ fontSize: '24px', fontWeight: 600 }}>
            {value}
          </span>
        </div>
        {subLabel && <Typography.Text style={{ fontSize: '12px' }}>{subLabel}</Typography.Text>}
      </div>
    </Card>
  )
}

export default KpiCard
