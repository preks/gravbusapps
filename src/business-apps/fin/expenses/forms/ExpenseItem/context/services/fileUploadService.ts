import { message } from "antd";
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
    message.error(t("expense_item.no_files", "No files selected for upload"));
    return null;
  }

  try {
    const formData = new FormData();
    
    // Add files to form data
    files.forEach(file => {
      formData.append(`file`, file);
    });
    
    // Add expense type definitions for AI processing
    formData.append("expense_type_definition", JSON.stringify(aiGroupsAndTypes));
    

    
    // Make API call to invoice extraction endpoint
    const response = await fetch(
      "https://dev.newwork.com/docs-engine/api/v1/invoices/from-file",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          // Do not set Content-Type header as it will be set automatically with the boundary
        },
        body: formData,
      }
    );

    if (!response.ok) {
      console.error("Error uploading file:", response.statusText);
      message.error(t("expense_item.upload_error", "Error processing receipt. Continuing without receipt data."));
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error uploading file:", error);
    message.error(t("expense_item.upload_error", "Error processing receipt. Continuing without receipt data."));
    return null;
  }
};
