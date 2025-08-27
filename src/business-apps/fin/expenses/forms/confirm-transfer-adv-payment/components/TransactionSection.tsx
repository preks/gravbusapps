import React from "react";
import { Input, Checkbox } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface TransactionSectionProps {
  transactionDate: string;
  transactionId: string;
  confirmationChecked: boolean;
  onTransactionDateChange: (value: string) => void;
  onTransactionIdChange: (value: string) => void;
  onConfirmationChange: (checked: boolean) => void;
}

const TransactionSection: React.FC<TransactionSectionProps> = ({
  transactionDate,
  transactionId,
  confirmationChecked,
  onTransactionDateChange,
  onTransactionIdChange,
  onConfirmationChange,
}) => {
  return (
    <div
      className="gba:mb-6 gba:p-3"
      data-testid="confirm-transfer-adv-payment-transaction-section"
    >
      <h3
        className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-foreground"
        data-testid="confirm-transfer-adv-payment-transaction-title"
      >
        {getTranslationFromI18nKeyAndLabel(
          "lowcoder:confirm_transfer_advance_payment.transaction_confirmation_text",
          "Transaction Confirmation"
        )}
      </h3>

      <div className="gba:flex gba:flex-col gba:gap-4">
        {/* Transaction Date */}
        <div data-testid="confirm-transfer-adv-payment-transaction-date">
          <label className="gba:block gba:mb-2 gba:text-sm gba:font-medium gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:confirm_transfer_advance_payment.transaction_date_label",
              "Transaction Date"
            )}
            *
          </label>
          <Input
            type="date"
            value={transactionDate}
            onChange={(e) => onTransactionDateChange(e.target.value)}
            data-testid="transaction-date-input"
          />
        </div>

        {/* Transaction ID */}
        <div data-testid="confirm-transfer-adv-payment-transaction-id">
          <label className="gba:block gba:mb-2 gba:text-sm gba:font-medium gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:confirm_transfer_advance_payment.transaction_id_label",
              "Transaction ID"
            )}
          </label>
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel(
              "lowcoder:confirm_transfer_advance_payment.transaction_id_placeholder",
              "Enter Transaction ID"
            )}
            value={transactionId}
            onChange={(e) => onTransactionIdChange(e.target.value)}
            data-testid="transaction-id-input"
          />
        </div>

        {/* Confirmation Checkbox */}
        <div
          className="gba:flex gba:items-start gba:gap-2"
          data-testid="confirm-transfer-adv-payment-confirmation"
        >
          <Checkbox
            checked={confirmationChecked}
            onCheckedChange={(checked) =>
              onConfirmationChange(checked === true)
            }
            data-testid="confirmation-checkbox"
          />
          <label className="gba:text-sm gba:text-foreground gba:leading-relaxed">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:confirm_transfer_advance_payment.checkbox_confirmation_message",
              "I confirm that the payment has been transferred to the employee's account."
            )}
          </label>
        </div>
      </div>
    </div>
  );
};

export default TransactionSection;
