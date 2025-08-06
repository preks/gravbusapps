import React from 'react';
import { TableCell, TableRow, Checkbox } from '@newwork/nw-design-system';
import { formatNumberFunction, formatDate } from '@/common/utils/windowUtils';
import { getExpenseRequestStatusDisplay } from '../../../../utils/utils';
import Pill from '@/components/pill/Pill';
import { ExpenseData } from '../../../../types';
import ExpenseRequestTableActions from './ExpenseRequestTableActions';

interface ExpenseRequestTableRowProps {
  record: ExpenseData;
  onRowClick: (record: ExpenseData) => void;
  onNavigateToExpenseRequest: (record: ExpenseData) => void;
  onDownloadAccountingNote: (record: ExpenseData) => void;
  onTriggerCSV: (record: ExpenseData) => void;
  onPrintExpenseRequest: (record: ExpenseData) => void;
  onTransferPayment: (record: ExpenseData) => void;
  isSelected?: boolean;
  onSelectRecord?: (record: ExpenseData, checked: boolean) => void;
}

const ExpenseRequestTableRow: React.FC<ExpenseRequestTableRowProps> = ({
  record,
  onRowClick,
  onNavigateToExpenseRequest,
  onDownloadAccountingNote,
  onTriggerCSV,
  onPrintExpenseRequest,
  onTransferPayment,
  isSelected = false,
  onSelectRecord
}) => {
  return (
    <TableRow 
      onClick={() => onRowClick(record)}
      className="gba:cursor-pointer gba:hover:bg-gray-50"
    >
      <TableCell className="gba:w-[50px]">
        {onSelectRecord && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectRecord(record, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
            data-testid={`select-record-checkbox-${record.id}`}
          />
        )}
      </TableCell>
      <TableCell className="gba:w-[60px]">
        <ExpenseRequestTableActions
          record={record}
          onNavigateToExpenseRequest={onNavigateToExpenseRequest}
          onDownloadAccountingNote={onDownloadAccountingNote}
          onTriggerCSV={onTriggerCSV}
          onPrintExpenseRequest={onPrintExpenseRequest}
          onTransferPayment={onTransferPayment}
        />
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-employee-${record.id}`}>
          {record.employee}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-employee-code-${record.id}`}>
          {record.employeeCode}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-sap-number-${record.id}`}>
          {record.sapNumber}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-code-${record.id}`}>
          {record.code}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-title-${record.id}`}>
          {record.title}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-start-date-${record.id}`}>
          {record.startDate && record.startDate !== 'N/A' ? formatDate(record.startDate, 'date.short') : '-'}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-end-date-${record.id}`}>
          {record.endDate && record.endDate !== 'N/A' ? formatDate(record.endDate, 'date.short') : '-'}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-creation-date-${record.id}`}>
          {record.creationDate && record.creationDate !== 'N/A' ? formatDate(record.creationDate, 'date.short') : '-'}
        </div>
      </TableCell>
      <TableCell>
        <div data-testid={`expense-request-status-${record.id}`}>
          <Pill
            label={getExpenseRequestStatusDisplay(record.status).label}
            type={getExpenseRequestStatusDisplay(record.status).type}
          />
        </div>
      </TableCell>
      <TableCell className="gba:text-right">
        <span data-testid={`expense-request-remaining-amount-${record.id}`}>
          {(() => {
            const remainingAmount = Number(record.totalRemainingAmount) || 0;
            const currencyCode = record.currency?.code || '';
            return remainingAmount > 0 ? `${formatNumberFunction(String(remainingAmount))} ${currencyCode}` : '-';
          })()}
        </span>
      </TableCell>
      <TableCell className="gba:text-right">
        <span data-testid={`expense-request-total-amount-${record.id}`}>
          {formatNumberFunction(String(record.totalAmount))} {record.currency?.code || ''}
        </span>
      </TableCell>
    </TableRow>
  );
};

export default ExpenseRequestTableRow; 