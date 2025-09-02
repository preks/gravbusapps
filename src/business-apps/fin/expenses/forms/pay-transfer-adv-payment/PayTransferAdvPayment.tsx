import React, { useState, useEffect } from "react";
import {
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
} from "@newwork/nw-design-system";

import { useGetAdvancePaymentForApproval } from "./queries";
import { AdvancePaymentData } from "./types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

// Component imports
import PaymentHeader from "./components/PaymentHeader";
import EmployeeInfoSection from "./components/EmployeeInfoSection";
import SupervisorInfoSection from "./components/SupervisorInfoSection";
import TransactionSection from "./components/TransactionSection";
import ActionButtons from "./components/ActionButtons";

const PayTransferAdvPaymentContent: React.FC<BusinessAppContextProps> = ({
  additionalData,
  accessToken,
  userInfo,
  ...contextProps
}) => {
  const [paymentData, setPaymentData] = useState<AdvancePaymentData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [extractedPaymentId, setExtractedPaymentId] = useState<string>("");

  const { fetchAdvancePaymentData } =
    useGetAdvancePaymentForApproval(accessToken);

  const formatDateToISO = (dateString: string): string => {
    if (!dateString) {
      return new Date().toISOString();
    }

    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateString)) {
        return new Date().toISOString();
      }

      const dateWithTime = dateString + "T00:00:00";
      const date = new Date(dateWithTime);

      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }

      return date.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  };

  useEffect(() => {
    if (!extractedPaymentId) {
      const paymentId = additionalData?.psi_taskPayload?.advancePayment?.id;
      if (paymentId) {
        setExtractedPaymentId(paymentId);
      }
    }
  }, [extractedPaymentId, additionalData]);

  useEffect(() => {
    if (extractedPaymentId) {
      fetchPaymentData();
    }
  }, [extractedPaymentId]);

  const fetchPaymentData = async () => {
    if (!extractedPaymentId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAdvancePaymentData(extractedPaymentId);

      if (data) {
        setPaymentData(data);
      } else {
        setError("No payment data received from server");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("429")) {
        setError(
          "API rate limit exceeded. Please wait a moment and try again."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to fetch payment data"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    setTransactionDate(todayString);
  }, []);

  const handleConfirm = async () => {
    if (!userInfo?.employeeDetails?.employeeId) {
      return;
    }

    if (!transactionDate) {
      setError("Transaction date is required");
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(transactionDate)) {
      setError("Please enter a valid transaction date (YYYY-MM-DD)");
      return;
    }

    if (!confirmationChecked) {
      setError("Please confirm the payment transfer");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const formattedTransactionDate = formatDateToISO(transactionDate);

      const payload = {
        advancePayment: {
          id: extractedPaymentId,
          version: paymentData?.version,
          amount: paymentData?.amount,
          transactionDate: formattedTransactionDate,
          transactionConfirmed: confirmationChecked,
          transactionConfirmedByEmployee: userInfo.employeeDetails.employeeId,
        },
      };

      window.dispatchEvent(
        new CustomEvent("com.newwork.process.continue", {
          detail: {
            event: "pse_approve",
            payload,
          },
        })
      );
    } catch (error) {
      setError("Failed to confirm payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="pay-transfer-adv-payment-loading"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="pay-transfer-adv-payment-error">
        <AlertTitle>Error Loading Payment Data</AlertTitle>
        <AlertDescription>
          {error}
          {error.includes("rate limit") && (
            <div style={{ marginTop: "var(--nw-spacing-md)" }}>
              <Button
                onClick={() => {
                  fetchPaymentData();
                }}
                variant="outline"
                size="sm"
                data-testid="retry-button"
              >
                Retry
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!paymentData) {
    return (
      <Alert data-testid="pay-transfer-adv-payment-no-data">
        <AlertTitle>No Payment Data</AlertTitle>
        <AlertDescription>
          Unable to load payment information. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const { expensePlan } = paymentData;
  const { employee } = expensePlan;

  const handleTransactionDateChange = (value: string) => {
    setTransactionDate(value);
  };

  const handleConfirmationChange = (checked: boolean) => {
    setConfirmationChecked(checked);
  };

  return (
    <div
      className="gba:border-0"
      data-testid="pay-transfer-adv-payment-container"
    >
      <PaymentHeader />

      <EmployeeInfoSection
        employee={employee}
        amount={paymentData.amount}
        currency={paymentData.currency}
        status={paymentData.status}
        expensePlan={expensePlan}
        accessToken={accessToken}
      />

      <SupervisorInfoSection
        supervisor={employee.employeePosition.supervisor}
      />

      <TransactionSection
        transactionDate={transactionDate}
        confirmationChecked={confirmationChecked}
        onTransactionDateChange={handleTransactionDateChange}
        onConfirmationChange={handleConfirmationChange}
      />

      <ActionButtons
        onConfirm={handleConfirm}
        isLoading={isLoading}
        confirmationChecked={confirmationChecked}
      />
    </div>
  );
};

/**
 * Pay Transfer Advance Payment component
 * @param props - Business app context props
 * @returns Pay Transfer Advance Payment component
 */
const PayTransferAdvPayment: React.FC<BusinessAppContextProps> = (props) => {
  return (
    <div data-testid="pay-transfer-adv-payment-wrapper">
      <PayTransferAdvPaymentContent {...props} />
    </div>
  );
};

export default PayTransferAdvPayment;
