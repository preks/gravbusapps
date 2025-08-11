import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button
} from '@newwork/nw-design-system';
import { MoreHorizontal } from 'lucide-react';
import { ExpenseData } from '../../../../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ExpenseRequestTableActionsProps {
  record: ExpenseData;
  onNavigateToExpenseRequest: (record: ExpenseData) => void;
  onDownloadAccountingNote: (record: ExpenseData) => void;
  onTriggerCSV: (record: ExpenseData) => void;
  onPrintExpenseRequest: (record: ExpenseData) => void;
  onTransferPayment: (record: ExpenseData) => void;
}

const ExpenseRequestTableActions: React.FC<ExpenseRequestTableActionsProps> = ({
  record,
  onNavigateToExpenseRequest,
  onDownloadAccountingNote,
  onTriggerCSV,
  onPrintExpenseRequest,
  onTransferPayment
}) => {
  const canPrint = (record.status === 'PAID' ||
    record.status === 'BOOKED' ||
    record.status === 'APPROVED' ||
    record.status === 'VERIFIED' ||
    record.status === 'TRANSFERRED') &&
    record.employeeDocumentId !== null;

  const canTransferPayment = record.status === 'BOOKED';

  return (
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
              onNavigateToExpenseRequest(record);
            }}
            data-testid={`view-expense-request-${record.id}`}
          >
          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',   'View Request Details')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDownloadAccountingNote(record);
            }}
            data-testid={`download-accounting-note-${record.id}`}
          >
          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.download_text',   'Download Accounting Note')}
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onTriggerCSV(record);
            }}
            data-testid={`trigger-csv-${record.id}`}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.trigger_csv',   'Trigger CSV')}
          </DropdownMenuItem>
          {canTransferPayment && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onTransferPayment(record);
              }}
              data-testid={`transfer-payment-${record.id}`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:transfer_expense_request.info_message_container.transfer_payment',   'Transfer Payment')}
            </DropdownMenuItem>
          )}
          {canPrint && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPrintExpenseRequest(record);
              }}
              data-testid={`print-expense-request-${record.id}`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.print',   'Print')} 
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ExpenseRequestTableActions; 