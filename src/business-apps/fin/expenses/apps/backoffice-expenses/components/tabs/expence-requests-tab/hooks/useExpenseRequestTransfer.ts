import { useCallback } from "react";
import { startProcess } from "@/common/utils/start-process";
import { useRestClient } from "@/common/network/rest/useRestClient";
import { env } from "@/common/env/EnvUtils";
import { showToast } from "@/business-apps/fin/expenses/utils/notificationUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { ExpenseData } from "../../../../types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export const useExpenseRequestTransfer = (props: BusinessAppContextProps) => {
  const restClient = useRestClient(
    env("NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT")
  );

  const handleTransferPayment = useCallback(async (record: ExpenseData) => {
    try {
      const payload = {
        expenseRequests: [
          {
            id: record.id || "",
            version: record.version || "",
            currencyRef: record.currencyRef || "",
            status: record.status || "",
            requestTypeRef: record.requestTypeRef || "",
            employee: record.employeeId || "",
          },
        ],
      };

      // Try direct REST call first
      try {
        await restClient.post(
          `/employee-expense/temporaryTransferExpenseRequest`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${props.accessToken}`,
            },
          }
        );

        showToast(
          getTranslationFromI18nKeyAndLabel(
            "expense.request.transfer.success",
            "Transfer payment process started successfully"
          ),
          "success"
        );
      } catch (restError) {
        // Fallback to event system
        startProcess({
          domain: "employee-expense",
          processName: "temporaryTransferExpenseRequest",
          payload,
        });

        showToast(
          getTranslationFromI18nKeyAndLabel(
            "expense.request.transfer.success",
            "Transfer payment process started successfully"
          ),
          "success"
        );
      }
    } catch (error) {
      console.error("Failed to start transfer payment process:", error);

      // Show error toast
      showToast(
        getTranslationFromI18nKeyAndLabel(
          "expense.request.transfer.error",
          "Failed to start transfer payment process. Please try again."
        ),
        "error"
      );
    }
  }, []);

  return {
    handleTransferPayment,
  };
};
