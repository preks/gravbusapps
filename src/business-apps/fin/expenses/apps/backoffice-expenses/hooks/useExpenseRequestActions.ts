import { useCallback } from "react";
import { useRestClient } from "@/common/network/rest/useRestClient";
import { ResponseType } from "@/common/network/rest/RestClient";
import { startProcess } from "@/common/utils/start-process";
import { showToast } from "@/business-apps/fin/expenses/utils/notificationUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { ExpenseData } from "../types";
import { useExpenseRequestFileService } from "../utils/expenseRequestFileService";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface UseExpenseRequestActionsProps extends BusinessAppContextProps {}

export const useExpenseRequestActions = (
  props: UseExpenseRequestActionsProps
) => {
  const restClient = useRestClient();
  const { printExpenseRequest } = useExpenseRequestFileService(props);

  const handleDownloadAccountingNote = useCallback(
    async (record: ExpenseData) => {
      try {
        const response = await restClient.get(
          `/cs-selgros/expense-sheets/expense-request/${record.id}/csv`,
          {
            responseType: ResponseType.TEXT,
            headers: {
              Authorization: `Bearer ${props.accessToken}`,
            },
          }
        );
        const originalName =
          record.employeeDocument?.name || `accounting-note-${record.code}`;
        const csvFileName = originalName.replace(/\.[^/.]+$/, ".csv");
        const blob = new Blob([response], { type: "text/csv;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = csvFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading accounting note:", error);
      }
    },
    [restClient, props.accessToken]
  );

  const handleTriggerCSV = useCallback(async (record: ExpenseData) => {
    try {
      await startProcess({
        domain: "cs-selgros",
        processName: "createSelgrosExpenseSheetManualTrigger",
        payload: {
          employeeId: record.employeeId,
          expenseRequestId: record.id,
        },
      });
      showToast(
        getTranslationFromI18nKeyAndLabel(
          "expense.request.csv.trigger.success",
          "CSV was generated successfully"
        ),
        "success"
      );
    } catch (error) {
      console.error("Failed to trigger CSV process:", error);
      showToast(
        getTranslationFromI18nKeyAndLabel(
          "expense.request.csv.trigger.error",
          "Failed to generate CSV. Please try again."
        ),
        "error"
      );
    }
  }, []);

  const handlePrintExpenseRequest = useCallback(
    async (record: ExpenseData) => {
      try {
        const result = await printExpenseRequest(record);
        return result;
      } catch (error) {
        console.error("Error printing expense request:", error);
        throw error;
      }
    },
    [printExpenseRequest]
  );

  return {
    handleDownloadAccountingNote,
    handleTriggerCSV,
    handlePrintExpenseRequest,
  };
};
