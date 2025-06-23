import { message } from "antd";
import { ExpenseType, CustomField } from "../../types";
import { getNewTypes, getCustomFields, fetchExpenseData } from "../../ExpenseItemQueries";
import { prepareExpenseRequestsList } from "../../utils/expenseRequestUtils";
import { getCurrentActiveUserLocale } from "../../../../../../../common/utils/windowUtils";
import dayjs from 'dayjs'

export const fetchExpenseTypes = async (
  groupId: string,
  positions: any[],
  employeeRuleId: string | null | object,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: ExpenseType[] }) => void,
  t: (key: string, fallback: string) => string
) => {
  try {
    if (typeof employeeRuleId === "object" || !employeeRuleId) {
      console.error("Invalid employeeRuleId for fetching expense types");
      return [];
    }

    const expenseGroupIds = positions
      .map((position) => position.expenseGroup)
      .filter((id) => id && id.length > 0);

    if (groupId && !expenseGroupIds.includes(groupId)) {
      expenseGroupIds.push(groupId);
    }

    if (expenseGroupIds.length === 0) {
      return [];
    }

    const response = await graphqlClient.query({
      query: getNewTypes,
      variables: {
        expenseRuleId: employeeRuleId,
        objectFilter: { useInExpense: true },
        expenseGroupId: expenseGroupIds, 
      },
    });

    if (!response?.data?.ExpenseRuleGeneralExpense) {
      console.error("Invalid response structure for expense types");
      return [];
    }

    const expenseTypesList = response.data.ExpenseRuleGeneralExpense.map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        classId: item.expenseGroupRef,
        reimbursable: item.reimbursable,
      })
    );

    const expenseTypesByGroup = expenseTypesList.reduce(
      (acc: { [key: string]: ExpenseType[] }, item: ExpenseType) => {
        if (!acc[item.classId]) {
          acc[item.classId] = [];
        }
        acc[item.classId].push(item);
        return acc;
      },
      {}
    );

    setExpenseTypes(expenseTypesByGroup);

    return expenseTypesList;
  } catch (error) {
    console.error("Error fetching expense types:", error);
    message.error(t("expense_item.error_message", "Failed to load expense types"));
    return [];
  }
};


export const fetchCustomFields = async (
  expenseTypeIds: string[],
  graphqlClient: any,
  setCustomFields: (fields: { [expenseTypeId: string]: CustomField[] } | ((prev: { [expenseTypeId: string]: CustomField[] }) => { [expenseTypeId: string]: CustomField[] })) => void,
  t: (key: string, fallback: string) => string
) => {
  try {
    if (!expenseTypeIds || expenseTypeIds.length === 0) {
      return [];
    }

    const response = await graphqlClient.query({
      query: getCustomFields,
      variables: {
        expenseRuleGeneralId: expenseTypeIds,
      },
    });

    if (!response?.data?.ExpenseRuleOtherInfo) {
      console.error("Invalid response structure for custom fields");
      return [];
    }

    const customFieldsList = response.data.ExpenseRuleOtherInfo.map(
      (item: any) => ({
        id: item.id,
        infoValue: item.infoValue,
        mandatory: item.mandatory,
        source: item.source,
        expenseRuleGeneralExpenseId: item.expenseRuleGeneralExpenseId,
        expenseGroupRef: item.expenseRuleGeneralExpense?.expenseGroupRef,
      })
    );

    const customFieldsByType = customFieldsList.reduce(
      (acc: { [key: string]: CustomField[] }, item: CustomField) => {
        if (!acc[item.expenseRuleGeneralExpenseId]) {
          acc[item.expenseRuleGeneralExpenseId] = [];
        }
        acc[item.expenseRuleGeneralExpenseId].push(item);
        return acc;
      },
      {}
    );

    setCustomFields((prev) => ({
      ...prev,
      ...customFieldsByType,
    }));

    return customFieldsList;
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    message.error(t("expense_item.error_message", "Failed to load custom fields"));
    return [];
  }
};


export const setOnePositionItem = async (
  expenseData: any,
  form: any,
  setPositions: (positions: any[]) => void,
  setMultiPosition: (isMulti: boolean) => void,
  _setExpenseRequests: (requests: any[]) => void, 
  handleExpenseGroupChange: any,
  graphqlClient: any,
  expenseTypes: { [classId: string]: any[] },
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  employeeRuleId: string | null | object,
  t: (key: string, fallback: string) => string
) => {
  if (!expenseData || !expenseData.ExpenseItemByPk) {
    return;
  }

  const item = expenseData.ExpenseItemByPk;
  const position = item.expensePosition?.[0] || {};
  
  form.setFieldsValue({
    title: item.title,
  });
  
  if (item.expenseDate) {
    try {
      const dateObj = dayjs(item.expenseDate);
      if (dateObj.isValid()) {
        form.setFieldsValue({
          date: dateObj.toDate() 
        });
      }
    } catch (error) {
      console.error('Error setting date field:', error);
    }
  }

  const isMultiPosition = item.multiplePositions || (item.expensePosition && item.expensePosition.length > 1);
  setMultiPosition(isMultiPosition);

  if (item.currency?.code) {
    form.setFieldsValue({
      currency: item.currency.code
    });
  }
  
  if (item.expenseRequest) {
 form.setFieldsValue({
      expenseRequestId: item.expenseRequest.id
    });
    
   }
  
  if (position) {
    const newPosition = {
      expenseGroup: position.expenseGroup?.id,
      expenseType: position.expenseRuleGeneralExpenseId,
      amount: position.totalAmount,
      isReimbursable: position.reimbursable !== undefined ? position.reimbursable : true,
      costCenter: position.costCenter?.id || item.costCenter?.id,
      customField: position.additionalProperties?.customFields || [],
    };

    setPositions([newPosition]);

    const formValues = {
      [`expenseGroup-0`]: position.expenseGroup?.id,
      [`amount-0`]: position.totalAmount,
      [`costCenter-0`]: position.costCenter?.id || item.costCenter?.id
    };
    
    form.setFieldsValue(formValues);
    
    if (position.expenseGroup?.id) {
      try {
        const positionsForQuery = [{
          ...newPosition,
          expenseGroup: position.expenseGroup?.id
        }];
        await handleExpenseGroupChange(
          position.expenseGroup.id, 
          0, 
          positionsForQuery, 
          setPositions, 
          expenseTypes,
          employeeRuleId, 
          graphqlClient,
          setExpenseTypes, 
          t,
          form
        );
        
        setTimeout(() => {
          if (position.expenseRuleGeneralExpenseId) {
            form.setFieldsValue({
              [`expenseType-0`]: position.expenseRuleGeneralExpenseId
            });
          }
        }, 1000); 
      } catch (error) {
        console.error('Error fetching expense types:', error);
      }
    }
  }
  
  if (item.costCenter?.id) {
    form.setFieldsValue({
      costCenter: item.costCenter.id
    });
  }
};

export const setMultiPositionItem = async (
  expenseData: any,
  form: any,
  setPositions: (positions: any[]) => void,
  setMultiPosition: (isMulti: boolean) => void,
  handleExpenseGroupChange: any,
  handleExpenseTypeChange: any,
  graphqlClient: any,
  expenseTypes: { [classId: string]: any[] },
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  customFields: { [expenseTypeId: string]: any[] },
  setCustomFields: (fields: any) => void,
  employeeRuleId: string | null | object,
  t: (key: string, fallback: string) => string
) => {
  if (!expenseData || !expenseData.ExpenseItemByPk) {
    return;
  }

  const item = expenseData.ExpenseItemByPk;
  

  form.setFieldsValue({
    title: item.title,
  });
  

  if (item.expenseDate) {
    try {
      const dateObj = dayjs(item.expenseDate);
      if (dateObj.isValid()) {
        form.setFieldsValue({
          date: dateObj.toDate() 
        });
      }
    } catch (error) {
      console.error('Error setting date field:', error);
    }
  }


  setMultiPosition(true);


  if (item.currency?.code) {
    form.setFieldsValue({
      currency: item.currency.code
    });
  }
  
  if (item.expenseRequest) {
    form.setFieldsValue({
      expenseRequestId: item.expenseRequest.id
    });
  }
  

  if (item.expensePosition && item.expensePosition.length > 0) {
    const newPositions = item.expensePosition.map((position: any) => {

      let customFieldValue = "";

      
      if (position.additionalProperties?.customFields && 
          Array.isArray(position.additionalProperties.customFields) && 
          position.additionalProperties.customFields.length > 0) {
        customFieldValue = position.additionalProperties.customFields[0]?.value || "";
      }
      
      return {
        expenseGroup: position.expenseGroup?.id,
        expenseType: position.expenseRuleGeneralExpenseId,
        amount: position.totalAmount,
        isReimbursable: position.reimbursable !== undefined ? position.reimbursable : true,
        costCenter: position.costCenter?.id || item.costCenter?.id,
        customField: customFieldValue,
        id: position.id || `pos-${Math.random().toString(36).substring(2, 9)}`, // Ensure each position has an ID
      };
    });

    setPositions(newPositions);


    newPositions.forEach((pos: any, index: number) => {
      const formValues = {
        [`expenseGroup-${index}`]: pos.expenseGroup,
        [`amount-${index}`]: pos.amount,
        [`costCenter-${index}`]: pos.costCenter,
        [`isReimbursable-${index}`]: pos.isReimbursable
      };
      
      form.setFieldsValue(formValues);
    });
    

    const processExpenseGroups = async () => {
      

      for (let i = 0; i < newPositions.length; i++) {
        const position = newPositions[i];
        if (position.expenseGroup) {
          try {
            await handleExpenseGroupChange(
              position.expenseGroup, 
              i, 
              newPositions, 
              setPositions, 
              expenseTypes,
              employeeRuleId, 
              graphqlClient,
              setExpenseTypes, 
              t,
              form
            );
          } catch (error) {
            console.error(`Error processing expense group for position ${i}:`, error);
          }
        }
      }
      

      setTimeout(() => {

        const originalPositions = item.expensePosition || [];
        
        for (let i = 0; i < originalPositions.length; i++) {
          const position = originalPositions[i];
          if (position.expenseRuleGeneralExpenseId) {
            form.setFieldsValue({
              [`expenseType-${i}`]: position.expenseRuleGeneralExpenseId
            });
            

            if (position.additionalProperties?.customFields && 
                Array.isArray(position.additionalProperties.customFields) && 
                position.additionalProperties.customFields.length > 0) {
              

              const customFieldValue = position.additionalProperties.customFields[0]?.value || "";

              form.setFieldsValue({
                [`customField-${i}`]: customFieldValue
              });
              

              newPositions[i].customField = customFieldValue;
            }
            

            if (position.expenseRuleGeneralExpenseId) {
              handleExpenseTypeChange(
                position.expenseRuleGeneralExpenseId,
                i,
                newPositions,
                setPositions,
                customFields,
                graphqlClient,
                setCustomFields,
                t,
                form
              );
            }
          }
        }
        

        setPositions([...newPositions]);
      }, 1000);
    };
    
    processExpenseGroups();
  }
  

  if (item.costCenter?.id) {
    form.setFieldsValue({
      costCenter: item.costCenter.id
    });
  }
};

export const setByEdit = async (
  expenseId: string,
  graphqlClient: any,
  form: any,
  setPositions: (positions: any[]) => void,
  setMultiPosition: (isMulti: boolean) => void,
  setExpenseRequests: (requests: any[]) => void,
  handleExpenseGroupChange: any,
  handleExpenseTypeChange: any,
  expenseTypes: { [classId: string]: any[] } = {},
  setExpenseTypes: (types: { [classId: string]: any[] }) => void = () => {},
  customFields: { [expenseTypeId: string]: any[] } = {},
  setCustomFields: (fields: any) => void = () => {},
  employeeRuleId: string | null | object = null,
  t: (key: string, fallback: string) => string = (key, fallback) => fallback,
) => {
  try {
    const response = await graphqlClient.query({
      query: fetchExpenseData,
      variables: {
        expenseId,
        activeUserLocale: getCurrentActiveUserLocale(),
      },
    });
    
    if (response.data) {
      const item = response.data.ExpenseItemByPk;
      if (item && item.expensePosition && item.expensePosition.length > 1) {
        await setMultiPositionItem(
          response.data, 
          form, 
          setPositions, 
          setMultiPosition, 
          handleExpenseGroupChange,
          handleExpenseTypeChange,
          graphqlClient,
          expenseTypes,
          setExpenseTypes,
          customFields,
          setCustomFields,
          employeeRuleId,
          t
        );
      } else {
        await setOnePositionItem(
          response.data, 
          form, 
          setPositions, 
          setMultiPosition, 
          setExpenseRequests,
          handleExpenseGroupChange,
          graphqlClient,
          expenseTypes,
          setExpenseTypes,
          employeeRuleId,
          t
        );
      }
    }
    
    return response.data;
  } catch (error) {
    message.error('Failed to load expense data for editing');
    return null;
  }
};

export const addRequests = (
  requestData: any,
  setExpenseRequests: (requests: any[]) => void,
  t: (key: string, fallback: string) => string
) => {
  try {
    if (!requestData || !requestData.data) {
      console.debug('addRequests: catalogueDataResponse or its data property is undefined');
      setExpenseRequests([{
        id: "0",
        name: t("create_expense_type_item.none", "None")
      }]);
      return;
    }
    
    const expenseRequests = requestData.data.ExpenseRequest || [];
    
    const formattedRequests = prepareExpenseRequestsList(
      expenseRequests,
      t("create_expense_type_item.none", "None")
    );
    
    setExpenseRequests(formattedRequests);
  } catch (error) {
    console.error('Error in addRequests:', error);
    setExpenseRequests([{
      id: "0",
      name: t("create_expense_type_item.none", "None")
    }]);
  }
};
