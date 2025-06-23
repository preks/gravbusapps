import { showToast } from "../../utils/notificationUtils";
import { TFunction } from "i18next";

/**
 * Parse uploaded files and send them to the invoice extraction API
 * @param files Array of files to upload
 * @param accessToken Access token for API authorization
 * @param aiGroupsAndTypes Expense type definitions for AI processing
 * @param t Translation function
 * @returns API response or null if error
 */
export const parseFileUpload = async (
  files: File[],
  accessToken: string,
  aiGroupsAndTypes: any[],
  t: TFunction
) => {
  if (!files || files.length === 0) {
    showToast(
      t("lowcoder:create_expense_type_item.document_upload_error_missing_files", "No valid files to upload"),
      "error"
    );
    return null;
  }

  try {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append(`file`, file);
    });
    
    formData.append("expense_type_definition", JSON.stringify(aiGroupsAndTypes));
    

    
    const response = await fetch(
      "https://dev.newwork.com/docs-engine/api/v1/invoices/from-file",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      showToast(
        t("lowcoder:create_expense_type_item.process_error_receipt_processing", "Error processing receipt data"),
        "error"
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.process_error_receipt_processing", "Error processing receipt data"),
      "error"
    );
    return null;
  }
};
