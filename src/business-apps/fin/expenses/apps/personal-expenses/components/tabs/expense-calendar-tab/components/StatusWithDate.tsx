import React from 'react'
import type { Dayjs } from 'dayjs'
import { Tooltip } from 'antd'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'
import {
  getExpenseItemStatusDisplayT,
  getExpensePlanStatusDisplayT,
  getExpenseRequestStatusDisplayT
} from '../../../../utils'
import personalTranslations from '../../../../_i18n'

export interface StatusWithDateProps {
  type: 'expense' | 'plan' | 'request'
  status: string
  value: Dayjs
}

const StatusWithDate: React.FC<StatusWithDateProps> = ({ type, status, value }) => {
  const { t } = useTranslation(personalTranslations)
  const statusConfig =
    type === 'plan'
      ? getExpensePlanStatusDisplayT(t, status)
      : type === 'request'
        ? getExpenseRequestStatusDisplayT(t, status)
        : getExpenseItemStatusDisplayT(t, status)

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
