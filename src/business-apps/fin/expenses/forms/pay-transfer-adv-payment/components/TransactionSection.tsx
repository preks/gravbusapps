import React from "react";
import { Input, Checkbox } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface TransactionSectionProps {
  transactionDate: string;
  confirmationChecked: boolean;
  onTransactionDateChange: (value: string) => void;
  onConfirmationChange: (checked: boolean) => void;
}

const TransactionSection: React.FC<TransactionSectionProps> = ({
  transactionDate,
  confirmationChecked,
  onTransactionDateChange,
  onConfirmationChange,
}) => {
  return (
    <div
      className="gba:mb-6 gba:p-3"
      data-testid="pay-transfer-adv-payment-transaction-section"
    >
      <h3
        className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-foreground"
        data-testid="pay-transfer-adv-payment-transaction-title"
      >
        {getTranslationFromI18nKeyAndLabel(
          "lowcoder:pay_advance_payment_cash.pickup_confirmation_text",
          "Pickup Confirmation"
        )}
      </h3>

      <div className="gba:flex gba:flex-col gba:gap-4">
        {/* Transaction Date */}
        <div data-testid="pay-transfer-adv-payment-transaction-date">
          <label className="gba:block gba:mb-2 gba:text-sm gba:font-medium gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:pay_advance_payment_cash.date_of_transfer",
              "Date of transfer"
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

        {/* Confirmation Checkbox */}
        <div
          className="gba:flex gba:items-start gba:gap-2"
          data-testid="pay-transfer-adv-payment-confirmation"
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
              "lowcoder:pay_advance_payment_cash.checkbox_confirmation_message_cash",
              "I confirm that the advance payment has been handed over to the employee."
            )}
          </label>
        </div>
      </div>
    </div>
  );
};

export default TransactionSection;
