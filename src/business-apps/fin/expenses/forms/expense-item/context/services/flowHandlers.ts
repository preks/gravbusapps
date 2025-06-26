import { showToast } from "../../utils/notificationUtils";
import { PROCESSES_ENDPOINT } from "../constants";

/**
 * Initiates a workflow process for expense item changes
 * @param accessToken Access token for authentication
 * @param employeeId Employee ID for the process
 * @param t Translation function
 * @returns Promise with the process initiation result
 */
export const initiateFlow = async (
  accessToken: string,
  employeeId: string,
  t: (key: string, fallback: string) => string
): Promise<any> => {
  if (!employeeId) {
    showToast(
      t("lowcoder:create_expense_type_item.document_upload_error_missing_employee_data", "Cannot upload files: missing employee data"),
      "error"
    );
    return null;
  }

  try {
    const domain = "employee-expense";
    const processName = "changeExpenseItem";
    const url = `${PROCESSES_ENDPOINT}/${domain}/${processName}`;

    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body:JSON.stringify({employeeId:employeeId})
    });

    if (!response.ok) {
      throw new Error(`Flow initiation failed with status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
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
 * @param t Translation function
 * @returns Promise with the opened task flow result
 */
export const getOpenedTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  t: (key: string, fallback: string) => string
): Promise<any> => {
  if (!processInstanceId) {
    showToast(
      t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
      "error"
    );
    return null;
  }

  try {
    const domain = "employee-expense";
    const processName = "changeExpenseItem";
    const url = `${PROCESSES_ENDPOINT}/${domain}/${processName}/${processInstanceId}/tasks?user=${userId}`;

    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Getting task flow failed with status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
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
 * @param t Translation function
 * @returns Promise with the task completion result
 */
export const completeTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  taskName: string,
  taskId: string,
  submitData: any,
  t: (key: string, fallback: string) => string
): Promise<any> => {
  if (!processInstanceId || !taskId || !taskName) {
    showToast(
      t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
    );
    return null;
  }

  try {
    const domain = "employee-expense";
    const processName = "changeExpenseItem";
    const url = `${PROCESSES_ENDPOINT}/${domain}/${processName}/${processInstanceId}/${taskName}/${taskId}?phase=complete&user=${userId}`;

    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submitData)
    });

    if (!response.ok) {
      throw new Error(`Task completion failed with status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
      "error"
    );
    return null;
  }
};
