import { message } from "antd";
import { DEFAULT_POSITION, DEFAULT_EXPENSE_STATUS, DEFAULT_EXPENSE_SOURCE } from "../constants";
import { formatDateToISOString } from "../../utils/dateUtils";
import { calculateTotalAmount } from "../../utils/calculationUtils";
import { fetchExpenseTypes, fetchCustomFields } from "./dataFetchers";


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
    console.error("Error handling expense group change:", error);
    message.error(
      t(
        "expense_item.error_message",
        "Failed to update expense types. Please try again."
      )
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

    // Check if we already have custom fields for this expense type
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
    console.error("Error handling expense type change:", error);
    message.error(
      t(
        "expense_item.error_message",
        "Failed to update custom fields. Please try again."
      )
    );
  }
};


export const handleAddPosition = (
  positions: any[],
  setPositions: (positions: any[]) => void
) => {
  setPositions([
    ...positions,
    DEFAULT_POSITION,
  ]);
};


export const handleRemovePosition = (
  positionId: string,
  positions: any[],
  setPositions: (positions: any[]) => void,
  t: (key: string, fallback: string) => string
) => {
  if (positions.length === 1) {
    message.warning(t("expense_item.at_least_one_position", "At least one position is required"));
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
  t: (key: string, fallback: string) => string
) => {
  setLoading(true);
  try {

    await form.validateFields();


    const values = form.getFieldsValue();


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
        positionOrder: index,
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
        currencyRef: values.currency || "EUR",
        costCenter: positions[0]?.costCenter || "",
        reimbursable: positions[0]?.isReimbursable || false,
        expenseClassRef: "ExpenseClass:v1:EXPENSE",
        status: DEFAULT_EXPENSE_STATUS,
        multiplePositions: multiPosition,
        expenseRequest: values.expenseRequest || "",
        employee: generalDataResponse?.data?.Employee?.[0]?.id || "",
        expenseRule: employeeRuleId as string,
      },
      event: "pse_submit",
      expensePositions: {
        expensePositions: formattedPositions,
      },
      expenseItemFiles: {
        expenseFiles: [],
      },
    };

    console.log("Submitting data:", submitData);


    message.success(
      t("expense_item.success_message", "Expense item created successfully!")
    );


    form.resetFields();
    setPositions([DEFAULT_POSITION]);
    setFileList([]);
    setCurrentStep("start");
  } catch (error) {
    console.error("Submit error:", error);
    message.error(
      t(
        "expense_item.error_message",
        "Failed to create expense item. Please try again."
      )
    );
  } finally {
    setLoading(false);
  }
};
