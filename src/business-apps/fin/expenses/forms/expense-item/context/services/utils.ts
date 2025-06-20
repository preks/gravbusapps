import { showToast } from "../../utils/notificationUtils";
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
    showToast(
      t("expense_item.no_files", "No files selected for upload"),
      "error"
    );
    return null;
  }

  try {
    const result = await parseFileUpload(files, accessToken, aiGroupsAndTypes, t);
    return result;
  } catch (error) {
    showToast(
      t("expense_item.file_upload_error", "Failed to upload receipt"),
      "error"
    );
    return null;
  }
};
