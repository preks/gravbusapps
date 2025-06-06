import { message } from "antd";
import { TFunction } from "i18next";
import { parseFileUpload } from "./fileUploadService";
import { calculateTotalAmount } from "../../utils/calculationUtils";

/**
 * Calculate total amount from all positions
 */
export const calculateTotal = (positions: any[]) => {
  return calculateTotalAmount(positions);
};

/**
 * Handle file upload
 */
export const handleFileUpload = async (
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
    // Call the parseFileUpload service to process the files
    const result = await parseFileUpload(files, accessToken, aiGroupsAndTypes, t);
    return result;
  } catch (error) {
    console.error("Error uploading file:", error);
    message.error(t("expense_item.file_upload_error", "Failed to upload receipt"));
    return null;
  }
};
