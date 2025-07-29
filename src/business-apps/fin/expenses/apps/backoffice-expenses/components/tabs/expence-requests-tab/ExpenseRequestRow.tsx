import React, { useCallback } from 'react';
import { 
  TableRow, 
  TableCell,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button
} from '@newwork/nw-design-system';
import { MoreHorizontal } from 'lucide-react';
import { formatNumberFunction, formatDate } from '@/common/utils/windowUtils';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';
import { ExpenseData } from '../../../types';
import { getExpenseRequestStatusDisplay } from '../../../utils/utils';
import Pill from '@/components/pill/Pill';

interface ExpenseRequestRowProps {
  record: ExpenseData;
  onViewDetails: (record: ExpenseData) => void;
  onDownloadAccountingNote: (record: ExpenseData) => void;
  onTriggerCSV: (record: ExpenseData) => void;
  onPrintExpenseRequest: (record: ExpenseData) => void;
}

export const ExpenseRequestRow: React.FC<ExpenseRequestRowProps> = ({
  record,
  onViewDetails,
  onDownloadAccountingNote,
  onTriggerCSV,
  onPrintExpenseRequest
}) => {
  // Handle navigation to expense request record page
  const handleNavigateToRecord = useCallback(() => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { expenseRequestId: record.id });
    console.log('Navigating to expense request record:', url);
    navigateTo(url);
  }, [record.id]);

  return (
    <TableRow 
      key={record.id}
      onClick={() => onViewDetails(record)}
      className="gba:cursor-pointer gba:hover:bg-gray-50"
      data-testid={`expense-request-row-${record.id}`}
    >
      <TableCell className="gba:w-[60px]">
        <div className="gba:flex gba:justify-start gba:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gba:h-8 gba:w-8 p-0"
                data-testid={`expense-request-actions-${record.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="gba:sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('View Request Details clicked for record:', record.id);
                  handleNavigateToRecord();
                }}
                data-testid={`view-expense-request-${record.id}`}
              >
                View Request Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadAccountingNote(record);
                }}
                data-testid={`download-accounting-note-${record.id}`}
              >
                Download Accounting Note
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerCSV(record);
                }}
                data-testid={`trigger-csv-${record.id}`}
              >
                Trigger CSV
              </DropdownMenuItem>
              {((record.status === 'PAID' ||
                 record.status === 'BOOKED' ||
                 record.status === 'APPROVED' ||
                 record.status === 'VERIFIED' ||
                 record.status === 'TRANSFERRED') &&
                record.employeeDocumentId !== null) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrintExpenseRequest(record);
                  }}
                  data-testid={`print-expense-request-${record.id}`}
                >
                  Print
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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