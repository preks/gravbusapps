import React from 'react'
import type { Dayjs } from 'dayjs'
import { Tooltip } from 'antd'
import { Badge } from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'
import {
  getExpenseItemStatusDisplay,
  getExpensePlanStatusDisplay,
  getExpenseRequestStatusDisplay
} from '../../../../utils'

export interface StatusWithDateProps {
  type: 'expense' | 'plan' | 'request'
  status: string
  value: Dayjs
}

const StatusWithDate: React.FC<StatusWithDateProps> = ({ type, status, value }) => {
  const statusConfig =
    type === 'plan'
      ? getExpensePlanStatusDisplay(status)
      : type === 'request'
        ? getExpenseRequestStatusDisplay(status)
        : getExpenseItemStatusDisplay(status)

  const label = statusConfig.label
  const dateText = (() => {
    try {
      return formatDate(value.toDate(), 'date.short')
    } catch {
      return value.format('L')
    }
  })()

  const tooltipContent = (
    <div>
      <div>{label}</div>
      <div>{dateText}</div>
    </div>
  )

  return (
    <Tooltip title={tooltipContent} placement="topRight">
      <span>
        <Badge
          variant={(statusConfig as any).badgeVariant || 'outline'}
          style={{
            display: 'inline-block',
            maxWidth: '90px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Badge>
      </span>
    </Tooltip>
  )
}

export default StatusWithDate
