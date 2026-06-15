import React from 'react'
import Pill, { type PillType } from '@/components/pill'

interface ExpenseRecordHeaderSummaryProps {
  title: string | null | undefined
  code: string | null | undefined
  costCenterLabel: string
  costCenterName: string | null | undefined
  statusType: PillType
  statusLabel: string
  costCenterTestId: string
  statusTestId: string
  titleActions?: React.ReactNode
}

/**
 * Summary block for expense record side panels (~w-1/4 cards).
 * Title on its own row; code and status pill share the row below; cost center is full width under that.
 */
export function ExpenseRecordHeaderSummary({
  title,
  code,
  costCenterLabel,
  costCenterName,
  statusType,
  statusLabel,
  costCenterTestId,
  statusTestId,
  titleActions
}: Readonly<ExpenseRecordHeaderSummaryProps>) {
  return (
    <div className="gba:mb-4 gba:w-full">
      <div className="gba:mb-1 gba:flex gba:items-start gba:justify-between gba:gap-2">
        <h4 className="gba:m-0 gba:min-w-0 gba:flex-1 gba:text-lg gba:font-semibold gba:leading-snug gba:line-clamp-3">
          {title ?? '-'}
        </h4>
        {titleActions ? <div className="gba:shrink-0 gba:-mt-1">{titleActions}</div> : null}
      </div>

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        {code ? (
          <span className="gba:min-w-0 gba:flex-1 gba:text-gray-500 gba:break-all">{code}</span>
        ) : (
          <span className="gba:flex-1" />
        )}
        <Pill type={statusType} label={statusLabel} className="gba:shrink-0 gba:text-base" data-testid={statusTestId} />
      </div>

      <div className="gba:mt-1 gba:w-full" data-testid={costCenterTestId}>
        <span className="gba:block gba:text-gray-500">{costCenterLabel}:</span>
        <span className="gba:block gba:leading-snug">{costCenterName ?? '-'}</span>
      </div>
    </div>
  )
}
