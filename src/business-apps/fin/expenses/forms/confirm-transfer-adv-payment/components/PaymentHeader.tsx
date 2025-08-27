import React from "react";
import { Separator } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

const PaymentHeader: React.FC = () => {
  return (
    <div className="gba:mb-6">
      <h1
        className="gba:text-2xl gba:font-bold gba:text-foreground gba:text-center gba:mb-4 gba:pt-6"
        data-testid="confirm-transfer-adv-payment-title"
      >
        {getTranslationFromI18nKeyAndLabel(
          "lowcoder:confirm_transfer_advance_payment.advance_payment_transfer_title",
          "Confirm Advance Payment Transfer"
        )}
      </h1>
      <Separator className="gba:h-px gba:bg-secondary" />
    </div>
  );
};

export default PaymentHeader;
