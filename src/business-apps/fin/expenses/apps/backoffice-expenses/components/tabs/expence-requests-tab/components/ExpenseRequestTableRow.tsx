import React from 'react'
import { TableCell, TableRow, Checkbox, Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../../utils/currencyUtils'
import { extractCurrencyCode } from '../../../../utils/sharedUtils'
import { getExpenseRequestStatusDisplay } from '../../../../utils/utils'
import { ExpenseData } from '../../../../types'
import ExpenseRequestTableActions from './ExpenseRequestTableActions'
import type { ExpenseRequestActionHandlers } from '../../../../types/expenseRequestActionHandlers'

interface ExpenseRequestTableRowProps extends ExpenseRequestActionHandlers {
  record: ExpenseData
  accessToken: string
  onRowClick: (record: ExpenseData) => void
  isSelected?: boolean
  onSelectRecord?: (record: ExpenseData, checked: boolean) => void
  transferInProgress?: boolean
}

const ExpenseRequestTableRow: React.FC<ExpenseRequestTableRowProps> = ({
  record,
  accessToken,
  onRowClick,
  onNavigateToExpenseRequest,
  onDownloadAccountingNote,
  onTriggerCSV,
  onPrintExpenseRequest,
  onTransferPayment,
  isSelected = false,
  onSelectRecord,
  transferInProgress = false
}) => {
  const currencyCode = extractCurrencyCode(record.currency?.code)
  const renderEllipsisCell = (config: {
    cellClassName?: string
    value: string | undefined
    title: string
    testId: string
  }) => (
    <TableCell className={config.cellClassName}>
      <div
        className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
        title={config.title}
        data-testid={config.testId}
      >
        {config.value}
      </div>
    </TableCell>
  )
  const ellipsisColumns: Array<{
    key: string
    cellClassName?: string
    value: string | undefined
    title: string
    testId: string
  }> = [
    {
      key: 'employee',
      cellClassName: 'gba:w-[22%]',
      value: record.employee,
      title: record.employee || '',
      testId: `expense-request-employee-${record.id}`
    },
    {
      key: 'employeeCode',
      cellClassName: 'gba:w-[16%]',
      value: record.employeeCode,
      title: record.employeeCode || '',
      testId: `expense-request-employee-code-${record.id}`
    },
    {
      key: 'sapNumber',
      cellClassName: 'gba:w-[16%]',
      value: record.sapNumber,
      title: record.sapNumber || '',
      testId: `expense-request-sap-number-${record.id}`
    },
    {
      key: 'requestCode',
      cellClassName: 'gba:w-[16%]',
      value: record.code,
      title: record.code || '',
      testId: `expense-request-code-${record.id}`
    },
    {
      key: 'title',
      value: record.title,
      title: record.title || '',
      testId: `expense-request-title-${record.id}`
    },
    {
      key: 'startDate',
      cellClassName: 'gba:w-[14%]',
      value: record.startDate,
      title: record.startDate || '',
      testId: `expense-request-start-date-${record.id}`
    },
    {
      key: 'endDate',
      cellClassName: 'gba:w-[14%]',
      value: record.endDate,
      title: record.endDate || '',
      testId: `expense-request-end-date-${record.id}`
    },
    {
      key: 'creationDate',
      cellClassName: 'gba:w-[14%]',
      value: record.creationDate,
      title: record.creationDate || '',
      testId: `expense-request-creation-date-${record.id}`
    }
  ]

  return (
    <TableRow onClick={() => onRowClick(record)} className="gba:cursor-pointer gba:hover:bg-accent">
      <TableCell className="gba:py-4 gba:px-3">
        {onSelectRecord && record.status === 'BOOKED' && (
          <div className="gba:flex gba:items-center gba:justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={checked => onSelectRecord(record, checked as boolean)}
              onClick={e => e.stopPropagation()}
              data-testid={`select-record-checkbox-${record.id}`}
              className="gba:cursor-pointer"
            />
          </div>
        )}
      </TableCell>
      <TableCell>
        <ExpenseRequestTableActions
          record={record}
          accessToken={accessToken}
          transferInProgress={transferInProgress}
          onNavigateToExpenseRequest={onNavigateToExpenseRequest}
          onDownloadAccountingNote={onDownloadAccountingNote}
          onTriggerCSV={onTriggerCSV}
          onPrintExpenseRequest={onPrintExpenseRequest}
          onTransferPayment={onTransferPayment}
        />
      </TableCell>
      {ellipsisColumns.map(column => (
        <React.Fragment key={`${record.id}-${column.key}`}>{renderEllipsisCell(column)}</React.Fragment>
      ))}
      <TableCell className="gba:w-[22%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap gba:w-full gba:flex gba:justify-center"
          data-testid={`expense-request-status-${record.id}`}
        >
          <Badge variant={getExpenseRequestStatusDisplay(record.status).badgeVariant || 'outline'}>
            {getExpenseRequestStatusDisplay(record.status).label}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="gba:w-[18%] gba:text-right">
        <span data-testid={`expense-request-remaining-amount-${record.id}`}>
          {(() => {
            const remainingAmount = Number(record.totalRemainingAmount) || 0
            return remainingAmount > 0
              ? formatCurrency(remainingAmount, currencyCode)
              : getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.not_applicable', '-')
          })()}
        </span>
      </TableCell>
      <TableCell className="gba:w-[20%] gba:text-right">
        <span data-testid={`expense-request-total-amount-${record.id}`}>
          {formatCurrency(record.reimbursableAmount, currencyCode)}
        </span>
      </TableCell>
    </TableRow>
  )
}

export default ExpenseRequestTableRow
