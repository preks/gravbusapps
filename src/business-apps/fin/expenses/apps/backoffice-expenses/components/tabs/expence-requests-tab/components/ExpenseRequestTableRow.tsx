import React from 'react'
import { TableCell, TableRow, Checkbox, Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../../utils/currencyUtils'
import { getExpenseRequestStatusDisplay } from '../../../../utils/utils'
import { ExpenseData } from '../../../../types'
import ExpenseRequestTableActions from './ExpenseRequestTableActions'

interface ExpenseRequestTableRowProps {
  record: ExpenseData
  accessToken: string
  onRowClick: (record: ExpenseData) => void
  onNavigateToExpenseRequest: (record: ExpenseData) => void
  onDownloadAccountingNote: (record: ExpenseData) => void
  onTriggerCSV: (record: ExpenseData) => void
  onPrintExpenseRequest: (record: ExpenseData) => void
  onTransferPayment: (record: ExpenseData) => void
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
  // Extract ISO currency code from record.currency.code (handles "Currency:v1:EUR" format)
  const currencyCode = record.currency?.code?.split(':').pop() || 'EUR'

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
      <TableCell className="gba:w-[22%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.employee || ''}
          data-testid={`expense-request-employee-${record.id}`}
        >
          {record.employee}
        </div>
      </TableCell>
      <TableCell className="gba:w-[16%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.employeeCode || ''}
          data-testid={`expense-request-employee-code-${record.id}`}
        >
          {record.employeeCode}
        </div>
      </TableCell>
      <TableCell className="gba:w-[16%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.sapNumber || ''}
          data-testid={`expense-request-sap-number-${record.id}`}
        >
          {record.sapNumber}
        </div>
      </TableCell>
      <TableCell className="gba:w-[16%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.code || ''}
          data-testid={`expense-request-code-${record.id}`}
        >
          {record.code}
        </div>
      </TableCell>
      <TableCell>
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.title || ''}
          data-testid={`expense-request-title-${record.id}`}
        >
          {record.title}
        </div>
      </TableCell>
      <TableCell className="gba:w-[14%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.startDate || ''}
          data-testid={`expense-request-start-date-${record.id}`}
        >
          {record.startDate}
        </div>
      </TableCell>
      <TableCell className="gba:w-[14%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.endDate || ''}
          data-testid={`expense-request-end-date-${record.id}`}
        >
          {record.endDate}
        </div>
      </TableCell>
      <TableCell className="gba:w-[14%]">
        <div
          className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
          title={record.creationDate || ''}
          data-testid={`expense-request-creation-date-${record.id}`}
        >
          {record.creationDate}
        </div>
      </TableCell>
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
          {formatCurrency(record.totalAmount, currencyCode)}
        </span>
      </TableCell>
    </TableRow>
  )
}

export default ExpenseRequestTableRow
