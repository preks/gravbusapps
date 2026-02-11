import React, { memo } from 'react'
import { TableRow, TableCell, Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { ExpenseRequest } from '../../../hooks/useGetExpenseRequests'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'

export interface ExpenseRequestTableRowProps {
  record: ExpenseRequest
  onSelect: (record: ExpenseRequest) => void
  formatShortDateSafe: (dateValue?: string | null) => string
  buildStaticFlowData: (record: ExpenseRequest) => any[]
  accessToken: string | undefined
}

const ExpenseRequestTableRowComponent: React.FC<ExpenseRequestTableRowProps> = ({
  record,
  onSelect,
  formatShortDateSafe,
  buildStaticFlowData,
  accessToken
}) => {
  const statusConfig = getExpenseRequestStatusDisplay(record.status)

  return (
    <TableRow
      className="gba:cursor-pointer gba:hover:bg-accent"
      onClick={() => onSelect(record)}
      data-testid={`expense-requests-row-${record.id}`}
    >
      <TableCell
        className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:py-3 gba:px-4"
        data-testid={`expense-requests-actions-cell-${record.id}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="gba:flex gba:justify-start gba:gap-2">
          <AppActionButton
            onClick={e => e.stopPropagation()}
            data-testid={`expense-requests-update-button-${record.id}`}
            size="icon"
            staticFlowData={buildStaticFlowData(record)}
            prefixDataTestId="expense-requests-update"
            accessToken={accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          />
        </div>
      </TableCell>
      <TableCell className="gba:text-left gba:py-3 gba:px-4 gba:w-[13%]">
        <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate">
          {record.title ?? getTranslationFromI18nKeyAndLabel('lowcoder:common.untitled_request', 'Untitled Request')}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
          {record.code ?? getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
        </div>
      </TableCell>
      <TableCell className="gba:w-[10%] gba:py-4 gba:px-3 gba:text-sm">
        {(record as any)?.expensePlan?.code ??
          getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
      </TableCell>
      <TableCell
        className="gba:text-sm gba:py-3 gba:px-4"
        data-testid={`expense-requests-start-date-cell-${record.id}`}
      >
        {formatShortDateSafe(record.startDate)}
      </TableCell>
      <TableCell className="gba:text-sm gba:py-3 gba:px-4" data-testid={`expense-requests-end-date-cell-${record.id}`}>
        {formatShortDateSafe(record.endDate)}
      </TableCell>
      <TableCell data-testid={`expense-requests-employee-cell-${record.id}`}>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Avatar className="gba:h-6 gba:w-6">
            <AvatarImage
              src={
                record.employee?.pictureThumbnail
                  ? `data:image/gif;base64,${record.employee.pictureThumbnail}`
                  : undefined
              }
              alt={record.employee?.fullName}
            />
            <AvatarFallback>
              {record.employee?.displayName?.charAt(0) || record.employee?.fullName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="gba:font-medium gba:text-sm">{record.employee?.displayName || record.employee?.fullName}</div>
        </div>
      </TableCell>
      <TableCell
        className="gba:text-sm gba:py-3 gba:px-4"
        data-testid={`expense-requests-request-date-cell-${record.id}`}
      >
        {formatShortDateSafe(record.requestDate)}
      </TableCell>
      <TableCell className="gba:text-right gba:text-sm" data-testid={`expense-request-amount-cell-${record.id}`}>
        {typeof record.amount === 'number'
          ? formatCurrencyDisplay(record.amount, record.currency)
          : formatCurrencyDisplay(0, record.currency || 'EUR')}
      </TableCell>
      <TableCell className="gba:pr-6 gba:w-[20%]">
        <Badge
          variant={(statusConfig as any).badgeVariant || 'outline'}
          data-testid={`status-pill-${record.status?.toLowerCase()}`}
        >
          {statusConfig.label}
        </Badge>
      </TableCell>
    </TableRow>
  )
}

export const ExpenseRequestTableRow = memo(ExpenseRequestTableRowComponent)
