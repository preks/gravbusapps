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
        <div className="ant-statistic-title gba:text-sm gba:text-muted-foreground">{label}</div>
        <div className="ant-statistic-content gba:flex-grow gba:flex gba:items-center">
          <span className="ant-statistic-content-prefix gba:mr-2 gba:text-2xl gba:inline-flex gba:items-center">
            {icon}
          </span>
          <span className="ant-statistic-content-value gba:text-2xl gba:font-semibold">{value}</span>
        </div>
        {subLabel && <Typography.Text className="gba:text-xs">{subLabel}</Typography.Text>}
      </div>
    </Card>
  )
}

export default KpiCard
