import { message } from "antd";
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
  fileList: any[],
  t: (key: string, fallback: string) => string
) => {
  if (fileList.length === 0) return null;

  try {
    // File upload logic would go here
    return null;
  } catch (error) {
    console.error("Error uploading file:", error);
    message.error(t("expense_item.file_upload_error", "Failed to upload receipt"));
    return null;
  }
};
