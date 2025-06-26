import { flowClient } from "@/common/network/flows/FlowClient";
import { showToast } from "../../utils/notificationUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

// Constants for flow domain and process name
const FLOW_DOMAIN = "employee-expense";
const FLOW_PROCESS_NAME = "changeExpenseItem";

/**
 * Initiates a workflow process for expense item changes
 * @param accessToken Access token for authentication
 * @param employeeId Employee ID for the process
 * @returns Promise with the process initiation result
 */
export const initiateFlow = async (
  accessToken: string,
  employeeId: string
): Promise<any> => {
  if (!employeeId) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:create_expense_type_item.document_upload_error_missing_employee_data", 
        "Cannot upload files: missing employee data"
      ),
      "error"
    );
    return null;
  }

  try {
    flowClient.setAccessToken(accessToken);
    return await flowClient.initiateFlow(FLOW_DOMAIN, FLOW_PROCESS_NAME, { employeeId });
  } catch (error) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:create_expense_type_item.error_flows", 
        "Error in flow process"
      ),
      "error"
    );
    return null;
  }
};

/**
 * Gets the opened task flow for a specific process instance
 * @param accessToken Access token for authentication
 * @param userId User ID for the tasks
 * @param processInstanceId Process instance ID from initiateFlow
 * @returns Promise with the opened task flow result
 */
export const getOpenedTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string
): Promise<any> => {
  if (!processInstanceId) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:create_expense_type_item.error_flows", 
        "Error in flow process"
      ),
      "error"
    );
    return null;
  }

  try {
    flowClient.setAccessToken(accessToken);
    return await flowClient.getOpenedTaskFlow(FLOW_DOMAIN, FLOW_PROCESS_NAME, processInstanceId, userId);
  } catch (error) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:create_expense_type_item.error_flows", 
        "Error in flow process"
      ),
      "error"
    );
    return null;
  }
};

/**
 * Completes a task in the workflow process
 * @param accessToken Access token for authentication
 * @param userId User ID for the task
 * @param processInstanceId Process instance ID from initiateFlow
 * @param taskName Task name from getOpenedTaskFlow
 * @param taskId Task ID from getOpenedTaskFlow
 * @param submitData Data to submit with the task completion
 * @returns Promise with the task completion result
 */
export const completeTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  taskName: string,
  taskId: string,
  submitData: any
): Promise<any> => {
  if (!processInstanceId || !taskId || !taskName) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:create_expense_type_item.error_flows", 
        "Error in flow process"
      ),
      "error"
    );
    return null;
  }

  try {
    flowClient.setAccessToken(accessToken);
    return await flowClient.completeTaskFlow(
      FLOW_DOMAIN, 
      FLOW_PROCESS_NAME, 
      processInstanceId, 
      taskName, 
      taskId, 
      userId, 
      submitData
    );
  } catch (error) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        "lowcoder:create_expense_type_item.error_flows", 
        "Error in flow process"
      ),
      "error"
    );
    return null;
  }
};
