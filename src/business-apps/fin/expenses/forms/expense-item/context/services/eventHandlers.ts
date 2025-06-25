import { showToast } from "../../utils/notificationUtils";
import { API, DEFAULT_POSITION, DEFAULT_EXPENSE_STATUS, DEFAULT_EXPENSE_SOURCE } from "../constants";
import { formatDateToISOString } from "../../utils/dateUtils";
import { calculateTotalAmount } from "../../utils/calculationUtils";
import { fetchExpenseTypes, fetchCustomFields } from "./dataFetchers";
import { initiateFlow, getOpenedTaskFlow, completeTaskFlow } from "./flowHandlers";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";

/**
 * Uploads documents to the file server
 * @param fileList Array of file objects to upload
 * @param accessToken Access token for authentication
 * @param employeeId Employee ID for the folder path
 * @param t Translation function
 * @returns Promise with the formatted file data or empty array if no files to upload
 */
export const uploadDocuments = async (
  fileList: any[],
  accessToken: string,
  employeeId: string,
  t: (key: string, fallback: string) => string
): Promise<Array<{ fileType: string; fileUrl: string; fileName: string }>> => {
  if (!fileList || fileList.length === 0) {
    return [];
  }

  if (!employeeId) {
    showToast(
      t("lowcoder:create_expense_type_item.document_upload_error_missing_employee_data", "Cannot upload files: missing employee data"),
      "error"
    );
    return [];
  }

  try {
    const files = fileList.map(f => f.originFileObj).filter(Boolean);
    
    if (files.length === 0) {
      showToast(
        t("lowcoder:create_expense_type_item.document_upload_error_missing_files", "No valid files to upload"),
        "info"
      );
      return [];
    }

    const uploadPromises = files.map(async (file: File) => {
      const folderPath = encodeURIComponent(`/expenseItemsDocuments/${employeeId}`);
      const mimeType = encodeURIComponent(file.type);
      const url = `${API.BASE_URL}${API.FILES_ENDPOINT}?appName=expenses&folderPath=${folderPath}&mimeType=${mimeType}`;
      const formData = new FormData();
      formData.append('fileContent', file);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`File upload failed for ${file.name}: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    });
    
    const results = await Promise.all(uploadPromises);
    const formattedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }> = [];
    
    results.forEach((element: any) => {
      if (element && element.fileInfo) {
        formattedFiles.push({
          fileType: element.fileInfo.fileMetadata.mimeType,
          fileUrl: "/api/v1" + "/tenant/files/" + element.fileInfo.fileId,
          fileName: element.fileInfo.fileMetadata.originalFileName
        });
      } else if (element && element.fileId) {
        formattedFiles.push({
          fileType: element.fileMetadata?.mimeType || 'application/octet-stream',
          fileUrl: "/api/v1/tenant/files/" + element.fileId,
          fileName: element.fileMetadata?.originalFileName || 'file'
        });
      }
    });
    
    return formattedFiles;
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.document_upload_error_files", "Error uploading files"),
      "error"
    );
    return [];
  }
};


export const handleExpenseGroupChange = async (
  value: string,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void,
  expenseTypes: { [classId: string]: any[] },
  employeeRuleId: string | null | object,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  t: (key: string, fallback: string) => string,
  form?: any
) => {
  try {

    const updatedPositions = [...positions];
    updatedPositions[positionIndex].expenseGroup = value;
    updatedPositions[positionIndex].expenseType = "";
    updatedPositions[positionIndex].customField = "";
    setPositions(updatedPositions);

    if (form) {

      form.setFieldsValue({
        [`expenseType-${positionIndex}`]: undefined
      });
    }
    const hasExpenseTypesForGroup = Object.keys(expenseTypes).includes(value);
    if (!hasExpenseTypesForGroup) {
      await fetchExpenseTypes(value, positions, employeeRuleId, graphqlClient, setExpenseTypes, t);
    }
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.process_error_expense_types", "Error processing expense types"),
      "error"
    );
  }
};


export const handleExpenseTypeChange = async (
  value: string,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void,
  customFields: { [expenseTypeId: string]: any[] },
  graphqlClient: any,
  setCustomFields: (fields: any) => void,
  t: (key: string, fallback: string) => string,
  form?: any
) => {
  try {

    const updatedPositions = [...positions];
    updatedPositions[positionIndex].expenseType = value;
    updatedPositions[positionIndex].customField = "";
    setPositions(updatedPositions);
    

    if (form) {

      const prevExpenseType = positions[positionIndex]?.expenseType;
      
      if (prevExpenseType && customFields[prevExpenseType]) {

        const fieldsToReset: Record<string, undefined> = {};
        
        customFields[prevExpenseType].forEach(field => {

          fieldsToReset[`customField-${positionIndex}-${field.id}`] = undefined;
        });
        
        if (Object.keys(fieldsToReset).length > 0) {
          form.setFieldsValue(fieldsToReset);
        }
      }
    }

    const hasCustomFieldsForType = Object.keys(customFields).includes(value);


    if (!hasCustomFieldsForType && value) {

      const expenseTypeIds = positions
        .map((position) => position.expenseType)
        .filter((id) => id && id.length > 0);


      if (!expenseTypeIds.includes(value)) {
        expenseTypeIds.push(value);
      }

      await fetchCustomFields(expenseTypeIds, graphqlClient, setCustomFields, t);
    }
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.process_error_expense_custom_groups","Error processing custom groups"),
      "error"
    );
  }
};


export const handleAddPosition = (
  positions: any[],
  setPositions: (positions: any[]) => void,
  defaultCostCenter?: string,
  form?: any
) => {
  const newPosition = {
    ...DEFAULT_POSITION,
    id: `position-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    costCenter: defaultCostCenter || "",
    amount: 0,
  };
  
  const newPositions = [...positions, newPosition];
  setPositions(newPositions);
  
  if (form && defaultCostCenter) {
    const newPositionIndex = newPositions.length - 1;
    form.setFieldsValue({
      [`costCenter-${newPositionIndex}`]: defaultCostCenter
    });
  }
};


export const handleRemovePosition = (
  positionId: string,
  positions: any[],
  setPositions: (positions: any[]) => void,
  t: (key: string, fallback: string) => string
) => {
  if (positions.length === 1) {
    showToast(
      t("lowcoder:create_expense_type_item.position_deletion_warning", "At least one position is required"),
      "warning"
    );
    return;
  }

  setPositions(positions.filter((position) => position.id !== positionId));
};


export const handleAmountChange = (
  value: number,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void
) => {
  const updatedPositions = [...positions];
  updatedPositions[positionIndex].amount = value;
  setPositions(updatedPositions);
};


export const handleSubmit = async (
  form: any,
  positions: any[],
  customFields: { [expenseTypeId: string]: any[] },
  employeeRuleId: string | null | object,
  generalDataResponse: any,
  multiPosition: boolean,
  setPositions: (positions: any[]) => void,
  setFileList: (files: any[]) => void,
  setCurrentStep: (step: "start" | "form") => void,
  setLoading: (loading: boolean) => void,
  t: (key: string, fallback: string) => string,
  fileList?: any[],
  accessToken?: string,
  employeeId?: string,
  additionalData?: any,
  userInfo?: any,
  isEditMode?: boolean
) => {
  try {
    setLoading(true);

    await form.validateFields();

    const values = form.getFieldsValue();

    let uploadedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }> = [];
    if (fileList && fileList.length > 0 && accessToken && employeeId) {
      uploadedFiles = await uploadDocuments(fileList, accessToken, employeeId, t);
    }
    
    const hasExpenseRequest = additionalData?.psi_taskPayload?.initialParameters?.expenseRequest;
    
    let flowProcessId: string | null = null;
    let taskId: string | null = null;
    let taskName: string | null = null;
    
    if (accessToken && employeeId && hasExpenseRequest) {
      try {
        const flowResult = await initiateFlow(accessToken, employeeId, t);
        if (flowResult && flowResult && flowResult.id) {
          flowProcessId = flowResult.id;
          const userId = userInfo?.id || "c813b143-360d-491f-a8f5-a4ac6b769fe9";

          const tasksResult = await getOpenedTaskFlow(
            accessToken,
            userId,
            flowProcessId as string,
            t
          );
          
          if (tasksResult && Array.isArray(tasksResult) && tasksResult.length > 0) {
            const firstTask = tasksResult[0];
            if (firstTask && typeof firstTask.id === 'string' && typeof firstTask.name === 'string') {
              taskId = firstTask.id;
              taskName = firstTask.name;
            }
          }
        }
      } catch (flowError) {
        showToast(
          t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
          "error"
        );
      }
    }

    const formattedPositions = positions.map((position, index) => {
      const customFieldsArray = [];
      if (
        position.expenseType &&
        customFields[position.expenseType] &&
        position.customField
      ) {
        const customFieldData = customFields[position.expenseType][0];
        if (customFieldData) {
          customFieldsArray.push({
            id: customFieldData.id,
            infoValue: customFieldData.infoValue,
            mandatory: customFieldData.mandatory || false,
            value: position.customField,
          });
        }
      }

      return {
        expenseGroupRef: position.expenseGroup,
        expenseTypeRef: position.expenseType,
        totalAmount: position.amount || 0,
        positionOrder: index + 1,
        expenseRuleGeneralExpense: position.expenseType,
        costCenter: position.costCenter,
        reimbursable: position.isReimbursable,
        additionalProperties: {
          customFields: customFieldsArray,
        },
        source: DEFAULT_EXPENSE_SOURCE,
        expenseRule: employeeRuleId as string,
      };
    });
    const submitData = {
      expenseItem: {
        title: values.title,
        expenseDate: values.date
          ? formatDateToISOString(values.date)
          : formatDateToISOString(new Date()),
        totalAmount: calculateTotalAmount(positions),
        source: DEFAULT_EXPENSE_SOURCE,
        currencyRef: values.currency || "Currency:v1:EUR",
        costCenter: positions[0]?.costCenter || "",
        reimbursable: positions[0]?.isReimbursable || false,
        expenseClassRef: "ExpenseClass:v1:EXPENSE",
        status: DEFAULT_EXPENSE_STATUS,
        multiplePositions: multiPosition,
        expenseRequest: values.expenseRequest || "",
        employee: generalDataResponse?.data?.Employee?.[0]?.id || employeeId || "",
        expenseRule: employeeRuleId as string,
      },
      event: "pse_submit",
      expensePositions: {
        expensePositions: formattedPositions,
      },
      expenseItemFiles: {
        expenseFiles: uploadedFiles.map(element => ({
          fileType: element.fileType,
          fileUrl: element.fileUrl,
          fileName: element.fileName
        })),
      },
    };

    if (flowProcessId && taskId && taskName && hasExpenseRequest && accessToken) {
      try {
        const userId = userInfo?.id || "2999c7b5-1b62-4887-ae86-2efb10909246";
        await completeTaskFlow(
          accessToken,
          userId,
          flowProcessId as string,
          taskName as string,
          taskId as string,
          submitData,
          t
        );
      } catch (completeError) {
        showToast(
          t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
          "error"
        );
      }
    }

    if(accessToken && employeeId && !hasExpenseRequest){
      dispatchProcessContinueEvent('APPROVE_EXPENSE', submitData);
    }

    showToast(
      t("lowcoder:create_expense_type_item.created_item_notification_message", "Expense item created successfully!"),
      "success"
    );

    form.resetFields();
    setPositions([DEFAULT_POSITION]);
    setFileList([]);
    setCurrentStep("start");
  } catch (error) {
    showToast(
      t("lowcoder:create_expense_type_item.error_flows", "Error in flow process"),
      "error"
    );
  } finally {
    setLoading(false);
  }
};
