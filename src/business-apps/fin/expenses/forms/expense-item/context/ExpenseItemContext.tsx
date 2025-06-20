import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { Form, message } from "antd";
import { showToast } from "../utils/notificationUtils";
import {
  ExpensePosition,
  ExpenseType,
  CostCenter,
  Currency,
  ExpenseGroup,
  CustomField,
} from "../types";

import { getCurrentActiveUserLocale } from "../utils/windowUtils";
import { getCatalogValue } from "../utils/windowUtils";
import {
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
  getStructureCostCenter,
  expenseRequestByCurrencyQuery,
} from "../ExpenseItemQueries";
import { fetchEmployeeRule } from "../ExpenseItemQueries";
import { DEFAULT_EMPLOYEE_ID, DEFAULT_POSITION } from "./constants";
import { transformCurrencies } from "../utils/currencyUtils";
import { createGraphQLClient } from "../services/graphqlClient";
import {
  addRequests,
  fetchCustomFields,
  fetchExpenseTypes,
  calculateTotal,
  handleAddPosition,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleRemovePosition,
  handleSubmit,
  handleFileUpload,
  setByEdit,
} from "./services";

interface ExpenseItemContextProps {
  form: any;
  currentStep: "start" | "form";
  setCurrentStep: (step: "start" | "form") => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  fileList: any[];
  setFileList: (files: any[]) => void;
  isProcessingFiles: boolean;
  setIsProcessingFiles: (isProcessing: boolean) => void;
  isFormDisabled: boolean;
  setIsFormDisabled: (isDisabled: boolean) => void;
  multiPosition: boolean;
  setMultiPosition: (isMulti: boolean) => void;
  setCurrentSelectedDate:(date:Date|null)=> void;

  positions: ExpensePosition[];
  setPositions: (positions: ExpensePosition[]) => void;
  expenseGroups: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  customFields: { [expenseTypeId: string]: CustomField[] };
  costCenters: CostCenter[];
  currencies: Currency[];
  expenseRequests: any[];

  employeeRuleId: string | null | object;
  expenseRuleError: string | null;

  calculateTotal: () => number;
  handleFileUpload: (files: File[]) => Promise<any | null>;
  handleSubmit: () => Promise<void>;
  handleExpenseGroupChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleExpenseTypeChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleAddPosition: () => void;
  handleRemovePosition: (positionId: string) => void;
  handleAmountChange: (value: number, positionIndex: number) => void;
  handleCurrencyChange: (currencyId: string) => Promise<void>;
  fetchExpenseTypes: (classId: string) => Promise<ExpenseType[]>;
  fetchCustomFields: (expenseTypeIds: string[]) => Promise<CustomField[]>;
}

interface ExpenseItemProviderProps {
  children: ReactNode;
  accessToken: string;
  userInfo?: any;
  additionalData?: { [k: string]: any };
}

export const ExpenseItemContext = createContext<
  ExpenseItemContextProps | undefined
>(undefined);

export const ExpenseItemProvider: React.FC<ExpenseItemProviderProps> = ({
  children,
  accessToken,
  userInfo,
  additionalData,
}): React.ReactNode => {
  const { t } = useTranslation();

  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<"start" | "form">("start");
  const [loading, setLoading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [isFormDisabled, setIsFormDisabled] = useState<boolean>(false);
  const [multiPosition, setMultiPosition] = useState<boolean>(false);

  const [positions, setPositions] = useState<ExpensePosition[]>([
    DEFAULT_POSITION,
  ]);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{
    [classId: string]: ExpenseType[];
  }>({});
  const [customFields, setCustomFields] = useState<{
    [expenseTypeId: string]: CustomField[];
  }>({});
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);

  const [employeeRuleId, setEmployeeRuleId] = useState<string | null | object>(
    null
  );
  const [firstRunVariable, setFirstRunVariable] = useState<boolean>(false);
  const [expenseRuleError, setExpenseRuleError] = useState<string | null>(null);
  const [rerunRule, setRerunRule] = useState<boolean>(false);

  const [generalDataResponse, setGeneralDataResponse] = useState<any>(null);
  const [catalogueDataResponse, setCatalogueDataResponse] = useState<any>(null);

  const [, setStructureCostCenter] = useState<any>(null);
  const [currentSelectedDate,setCurrentSelectedDate]= useState<Date |null>(null)

  const userInfoMocked ={
    "id": "2999c7b5-1b62-4887-ae86-2efb10909246",
    "userName": "niancu@newwork.com",
    "givenName": "Norbert",
    "familyName": "Iancu",
    "nickName": "",
    "employeeDetails": {
      "employeeId": "86a8317d-34ef-4e04-951b-b0bb9754dea0",
      "firstName": "Norbert",
      "lastName": "Iancu",
      "supervisor": {
        "id": "0f6dc184-70aa-459c-9cc9-586e728ca6a4",
        "firstName": "Mihaela-Diana",
        "lastName": "Lozneanu",
        "userId": "7f94699d-3fd6-422c-8553-ab54da15889c"
      },
      "organizationalUnit": {
        "id": "24dcf339-9959-4ceb-9867-680d3dddd3c4",
        "name": "Quality Assurance"
      }
    }
  }
  const additionalDataMocked = {
    psi_taskPayload: {
      initialParameters: {
        expenseId: "ddcbc304-c9c3-4b5f-b1c2-512985a47c5d",//029a5366-28d0-463f-acaa-9e1a2a97d12b
        expenseRequest:"23017ff9-ecde-442a-8e85-572551b00bff",
        currencyData:"Currency:v1:EUR"
      },
    },
  };

  const graphqlClient = useMemo(
    () => createGraphQLClient(accessToken),
    [accessToken]
  );

  useEffect(() => {

    fetchInitialData();
  }, [accessToken, userInfo, employeeRuleId, firstRunVariable, rerunRule]);

  useEffect(() => {
    if (!accessToken || !generalDataResponse || !catalogueDataResponse || expenseRuleError) {
      return;
    }

    try {
      const expenseRuleGeneralExpense =
        generalDataResponse?.data?.ExpenseRuleGeneralExpense || [];

      const uniqueExpenseGroupRefs = [
        ...new Set(
          typeof employeeRuleId === "object"
            ? []
            : expenseRuleGeneralExpense.map((item: any) => item.expenseGroupRef)
        ),
      ];

      const expenseGroups = catalogueDataResponse?.data?.expenseGroup || [];

      const matchingItems = expenseGroups.filter((item: any) =>
        uniqueExpenseGroupRefs.includes(item.id)
      );

      setExpenseGroups(matchingItems);
    } catch (error) {
      showToast(
        t("expense_item.process_error", "Error processing expense groups"),
        "error"
      );
      setExpenseGroups([]);
    }
  }, [generalDataResponse, catalogueDataResponse, accessToken]);


  useEffect(() => {
    if (catalogueDataResponse && accessToken && !expenseRuleError) {
      addRequestsWrapper();
      form.setFieldsValue({ expenseRequestId: "0" });
    }
  }, [catalogueDataResponse, accessToken]);

  useEffect(()=>{
    if(firstRunVariable===true)
    {
      setRerunRule(true)
      fetchInitialData()
    }
  },[currentSelectedDate])
  const aiGroupsAndTypes = useMemo(() => {

    if (
      typeof employeeRuleId === "object" ||
      !generalDataResponse?.data.ExpenseRuleGeneralExpense
    ) {
      return [];
    }

    const uniqueLabels = new Map<string, boolean>();

    type ExpenseAIItem = {
      expenseCode: string;
      expenseLabel: string;
      expenseGroupCode: string;
      expenseGroupLabel: string;
    };

    const result: ExpenseAIItem[] = [];

    try {
      generalDataResponse.data.ExpenseRuleGeneralExpense.forEach(
        (item: any) => {
          if (!item || !item.name || !item.code || !item.expenseGroup) {
            return;
          }

          let expenseLabel = item.name;

          if (uniqueLabels.has(expenseLabel.toLowerCase())) {
            expenseLabel = `${item.name} (${item.code})`;
          }

          if (
            uniqueLabels.has(expenseLabel.toLowerCase()) &&
            item.expenseGroup.code
          ) {
            expenseLabel = `${item.name} (${item.code}-${item.expenseGroup.code})`;
          }

          uniqueLabels.set(expenseLabel.toLowerCase(), true);

          const expenseGroupCode = item.expenseGroup?.code || "";
          const expenseGroupLabel = item.expenseGroup
            ? getCatalogValue(item.expenseGroup)
            : "";

          result.push({
            expenseCode: item.code,
            expenseLabel: expenseLabel,
            expenseGroupCode: expenseGroupCode,
            expenseGroupLabel: expenseGroupLabel,
          });
        }
      );
    } catch (error) {
      showToast(
        t("expense_item.ai_process_error", "Error processing expense AI items"),
        "error"
      );
    }

    return result;
  }, [generalDataResponse, employeeRuleId]);

  const addRequestsWrapper = () => {
    if (!accessToken) {
      return;
    }

    if (!catalogueDataResponse) {

      setExpenseRequests([
        {
          id: "0",
          name: t("create_expense_type_item.none", "None"),
        },
      ]);
      return;
    }

    try {
      addRequests(
        catalogueDataResponse,
        setExpenseRequests,
        t
      );
    } catch (error) {
      showToast(
        t("expense_item.add_requests_error", "Error processing expense requests"),
        "error"
      );

      setExpenseRequests([
        {
          id: "0",
          name: t("create_expense_type_item.none", "None"),
        },
      ]);
    }
  };

  const fetchInitialData = async () => {
    try {
      if (!accessToken) {
        return;
      }

      if (!userInfo) {
        return;
      }

      const currentDate = currentSelectedDate ? currentSelectedDate.toISOString() : new Date().toISOString();
      const employeeIdValue =
        userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID;

      if (!employeeIdValue) {
        return;
      }
      try {
        const employeeRuleData = await fetchEmployeeRule(
          employeeIdValue,
          currentDate,
          accessToken
        );

        if (employeeRuleData && employeeRuleData.expenseRuleId) {
          setEmployeeRuleId(employeeRuleData.expenseRuleId);
          setExpenseRuleError(null);
        } else {
          setExpenseRuleError(t('create_expense_item.missing_expense_rule_message', 'There is no rule set for your user, please reach out to your administrator.'));
        }
      } catch (ruleError) {
        setExpenseRuleError(t('create_expense_item.missing_expense_rule_message', 'There is no rule set for your user, please reach out to your administrator.'));
      }

      try {
        const generalData = await graphqlClient.query({
          query: fetchExpenseRuleGeneralData,
          variables: {
            expenseRuleId: employeeRuleId,
            activeUserLocale: getCurrentActiveUserLocale(),
            objectFilter: { useInExpense: true },
          },
        });
        setGeneralDataResponse(generalData);
      } catch (generalDataError) {
        showToast(
          t("expense_item.general_data_error", "Error fetching general data"),
          "error"
        );
      }

      if (rerunRule === false) {
        let catalogueData;
        try {
          catalogueData = await graphqlClient.query({
            query: fetchExpenseCatalogueData,
            variables: {
              employeeId: employeeIdValue,
              expenseRuleId: employeeRuleId,
              activeUserLocale: getCurrentActiveUserLocale(),
              objectFilter: { useInExpense: true },
            },
          });
          setCatalogueDataResponse(catalogueData);
        } catch (catalogueError) {
          showToast(
            t("expense_item.catalogue_error", "Error fetching catalogue data"),
            "error"
          );
        }

        if (firstRunVariable === false && catalogueData?.data) {
          const employeePosition =
            catalogueData?.data?.EmployeePosition || [];
          const structureId = employeePosition[0]?.structureId || "";
          const expenseIdValue =
          additionalData?.psi_taskPayload?.initialParameters?.expenseId ||
          additionalDataMocked.psi_taskPayload?.initialParameters?.expenseId;
        if (expenseIdValue) {
          setCurrentStep("form");
          
          await setByEdit(
            expenseIdValue,
            graphqlClient,
            form,
            setPositions,
            setMultiPosition,
            setExpenseRequests,
            handleExpenseGroupChange,
            handleExpenseTypeChange,
            expenseTypes,
            setExpenseTypes,
            customFields,
            setCustomFields,
            employeeRuleId,
            t
          );
        }
          let costCenterData;
          try {
            costCenterData = await graphqlClient.query({
              query: getStructureCostCenter,
              variables: {
                structureId: structureId,
              },
            });
            setStructureCostCenter(costCenterData);

            const userCostCenters =
              costCenterData?.data?.userCostCenters || [];
            setCostCenters(userCostCenters);
          } catch (costCenterError) {
            setCostCenters([]);
          }

          try {
            const updatedPositions = [...positions];

            const employeePositionCostCenterId =
              employeePosition[0]?.costCenterId;
            const firstCostCenterId =
              costCenterData?.data?.userCostCenters?.[0]?.id;

            if (employeePositionCostCenterId) {
              updatedPositions[0].costCenter = employeePositionCostCenterId;
            } else if (firstCostCenterId) {
              updatedPositions[0].costCenter = firstCostCenterId;
            }

            setPositions(updatedPositions);

            if (form && updatedPositions[0]?.costCenter) {
              form.setFieldsValue({
                [`costCenter-0`]: updatedPositions[0].costCenter,
              });
            }
          } catch (positionError) {
           
          }

          try {
            const currencyData = catalogueData?.data?.currency;
            if (currencyData && Array.isArray(currencyData)) {
              const finalCurrencies = transformCurrencies(currencyData);
              setCurrencies(finalCurrencies);
            } else {
              setCurrencies([]);
            }
          } catch (currencyError) {
            setCurrencies([]);
          }
          setFirstRunVariable(true);
        }
      }
      setRerunRule(false);
    } catch (error) {
      showToast(
        t("expense_item.initial_data_error", "Error fetching initial data"),
        "error"
      );
    }
  };

  const fetchExpenseTypesWrapper = async (
    groupId: string
  ): Promise<ExpenseType[]> => {
    return await fetchExpenseTypes(
      groupId,
      positions,
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t
    );
  };

  const fetchCustomFieldsWrapper = async (
    expenseTypeIds: string[]
  ): Promise<CustomField[]> => {
    return await fetchCustomFields(
      expenseTypeIds,
      graphqlClient,
      setCustomFields,
      t
    );
  };

  const calculateTotalWrapper = (): number => {
    return calculateTotal(positions);
  };

  const setByReceipts = (receiptData: any): void => {
    if (!receiptData || !receiptData.data) {
      return;
    }

    try {
      const data = receiptData.data;

      if (additionalData?.psi_taskPayload?.initialParameters?.currencyData || additionalDataMocked?.psi_taskPayload?.initialParameters?.currencyData) {
        const requestCurrency = currencies.find(
          (c) => c.id === additionalDataMocked.psi_taskPayload.initialParameters.currencyData
        );
        if (requestCurrency && requestCurrency.code !== data.currencyCode) {
          showToast(
            t(
              "expense_item.currency_mismatch",
              "The Receipt could not be added as it does not match the request currency"
            ),
            "error",
            t("expense_item.currency_mismatch_title", "Currency Mismatch")
          );

          return;
        }
      }

      if (data.vendor?.name) {
        form.setFieldsValue({ title: data.vendor.name });
      }

      if (data.invoiceDate) {
        try {
          let dateValue;

          if (typeof data.invoiceDate === "string") {
            if (data.invoiceDate.includes("T")) {
              dateValue = new Date(data.invoiceDate);
            } else {
              const [year, month, day] = data.invoiceDate
                .split("-")
                .map(Number);
              dateValue = new Date(year, month - 1, day);
            }
          } else {
            dateValue = new Date(data.invoiceDate);
          }

          if (!isNaN(dateValue.getTime())) {
            form.setFieldsValue({ date: dateValue });
          } else {
            showToast(
              t("expense_item.invalid_date", `Invalid date format: ${data.invoiceDate}`),
              "error"
            );
          }
        } catch (error) {
          showToast(
            t("expense_item.date_parse_error", `Error parsing date ${data.invoiceDate}`),
            "error"
          );
        }
      }

      if (data.currencyCode) {
        const currencyId = currencies.find(
          (c) => c.code === data.currencyCode
        )?.id;
        if (currencyId) {
          form.setFieldsValue({ currency: currencyId });
        }
      }

      if (data.items && data.items.length > 0) {
        const newPositions: ExpensePosition[] = [];

        const costCenterId = positions[0]?.costCenter || "";

        data.items.forEach((item: any, index: number) => {
          const newPosition: ExpensePosition = {
            id: `position-${Date.now()}-${index}`,
            expenseGroup: "",
            expenseType: "",
            amount: item.totalPrice || 0,
            costCenter: costCenterId,
            isReimbursable: true,
            customField: "",
          };

          if (item.expenseDetails) {
            if (item.expenseDetails.expenseGroupCode) {
              const matchingGroup = expenseGroups.find(
                (group) => group.code === item.expenseDetails.expenseGroupCode
              );

              if (matchingGroup) {
                newPosition.expenseGroup = matchingGroup.id;

                if (
                  item.expenseDetails.expenseCode &&
                  expenseTypes[matchingGroup.id]
                ) {
                  const matchingType = expenseTypes[matchingGroup.id].find(
                    (type) => type.code === item.expenseDetails.expenseCode
                  );

                  if (matchingType) {
                    newPosition.expenseType = matchingType.id;
                  }
                }
              }
            }
          }

          if (
            !newPosition.expenseGroup &&
            item.expenseDetails?.expenseGroupCode
          ) {
            const aiMatch = aiGroupsAndTypes.find(
              (ai) =>
                ai.expenseGroupCode === item.expenseDetails.expenseGroupCode &&
                ai.expenseCode === item.expenseDetails.expenseCode
            );

            if (aiMatch) {

              const matchingGroup = expenseGroups.find(
                (group) => group.code === aiMatch.expenseGroupCode
              );

              if (matchingGroup) {
                newPosition.expenseGroup = matchingGroup.id;
              }
            }
          }

          newPositions.push(newPosition);
        });

        setPositions(newPositions);

        if (newPositions.length > 1) {
          setMultiPosition(true);
        } else {
          setMultiPosition(false);
        }

        newPositions.forEach(async (position, index) => {
          if (position.expenseGroup && !position.expenseType) {
            try {
              const types = await fetchExpenseTypesWrapper(
                position.expenseGroup
              );

              if (data.items[index]?.expenseDetails?.expenseCode) {
                const matchingType = types.find(
                  (type) =>
                    type.code === data.items[index].expenseDetails.expenseCode
                );

                if (matchingType) {
                  const updatedPositions = [...newPositions];
                  updatedPositions[index].expenseType = matchingType.id;
                  setPositions(updatedPositions);
                }
              }
            } catch (error) {
              showToast(
                t("expense_item.receipt_field_error", "Error processing receipt field"),
                "error"
              );

            }
          }
        });
      }

      // Receipt data processed successfully
    } catch (error) {
      showToast(
        t("expense_item.receipt_error", "Error processing receipt data"),
        "error"
      );
      message.error(
        t(
          "expense_item.receipt_processing_error",
          "Error processing receipt data"
        )
      );
    }
  };

  const handleFileUploadWrapper = async (
    files: File[]
  ): Promise<any | null> => {
    if (!files || files.length === 0) {
      message.error(t("expense_item.no_files", "No files selected for upload"));
      return null;
    }

    try {
      setIsProcessingFiles(true);
      setIsFormDisabled(true);


      const result = await handleFileUpload(
        files,
        accessToken,
        aiGroupsAndTypes,
        t
      );

      if (result) {

        setByReceipts(result);
      } 

      setCurrentStep("form");

      setIsProcessingFiles(false);
      setIsFormDisabled(false);

      return result;
    } catch (error) {
      showToast(
        t(
          "expense_item.upload_error",
          "Error processing receipt. Continuing without receipt data."
        ),
        "error"
      );

      setIsProcessingFiles(false);
      setIsFormDisabled(false);

      setCurrentStep("form");

      return null;
    }
  };

  const handleSubmitWrapper = async (): Promise<void> => {
    await handleSubmit(
      form,
      positions,
      customFields,
      employeeRuleId,
      catalogueDataResponse,
      multiPosition,
      setPositions,
      setFileList,
      setCurrentStep,
      setLoading,
      t,
      fileList,
      accessToken,
      userInfo?.employeeDetails?.employeeId,
      additionalData || additionalDataMocked,
      userInfoMocked
    );
  };

  const handleExpenseGroupChangeWrapper = async (
    value: string,
    positionIndex: number
  ): Promise<void> => {
    await handleExpenseGroupChange(
      value,
      positionIndex,
      positions,
      setPositions,
      expenseTypes,
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t,
      form
    );
  };

  const handleCurrencyChangeWrapper = async (currencyId: string): Promise<void> => {
    if (!accessToken || !userInfo) {
      return;
    }
    try {
      const employeeIdValue = userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID;
      
      if (!employeeIdValue) {
        return;
      }
      
      const expenseRequestByCurrency = await graphqlClient.query({
        query: expenseRequestByCurrencyQuery,
        variables: {
          employeeId: employeeIdValue,
          givenCurrency: currencyId,
        },
      });

      addRequests(
        expenseRequestByCurrency,
        setExpenseRequests,
        t
      );
    } catch (error) {
      showToast(
        t("expense_item.currency_requests_error", "Error fetching expense requests by currency"),
        "error"
      );
    }
  };

  const handleExpenseTypeChangeWrapper = async (
    value: string,
    positionIndex: number
  ): Promise<void> => {
    await handleExpenseTypeChange(
      value,
      positionIndex,
      positions,
      setPositions,
      customFields,
      graphqlClient,
      setCustomFields,
      t,
      form // Pass the form to reset custom fields
    );
  };

  const handleAddPositionWrapper = (): void => {
    handleAddPosition(positions, setPositions);
  };

  const handleRemovePositionWrapper = (positionId: string): void => {
    handleRemovePosition(positionId, positions, setPositions, t);
  };

  const handleAmountChangeWrapper = (value: number, positionIndex: number): void => {
    const updatedPositions = [...positions];
    if (updatedPositions[positionIndex]) {
      updatedPositions[positionIndex].amount = value;
      setPositions(updatedPositions);
    }
  };

  const contextValue: ExpenseItemContextProps = {
    form,
    currentStep,
    setCurrentStep,
    loading,
    setLoading,
    fileList,
    setFileList,
    isProcessingFiles,
    setIsProcessingFiles,
    isFormDisabled,
    setIsFormDisabled,
    multiPosition,
    setMultiPosition,
    setCurrentSelectedDate,
    positions,
    setPositions,
    expenseGroups,
    expenseTypes,
    customFields,
    costCenters,
    currencies,
    expenseRequests,
    employeeRuleId,
    expenseRuleError,
    calculateTotal: calculateTotalWrapper,
    handleFileUpload: handleFileUploadWrapper,
    handleSubmit: handleSubmitWrapper,
    handleExpenseGroupChange: handleExpenseGroupChangeWrapper,
    handleExpenseTypeChange: handleExpenseTypeChangeWrapper,
    handleAddPosition: handleAddPositionWrapper,
    handleRemovePosition: handleRemovePositionWrapper,
    handleAmountChange: handleAmountChangeWrapper,
    handleCurrencyChange: handleCurrencyChangeWrapper,
    fetchExpenseTypes: fetchExpenseTypesWrapper,
    fetchCustomFields: fetchCustomFieldsWrapper,
  };

  return (
    <ExpenseItemContext.Provider value={contextValue}>
      {children}
    </ExpenseItemContext.Provider>
  );
};

export const useExpenseItem = () => {
  const context = useContext(ExpenseItemContext);
  if (context === undefined) {
    throw new Error(
      "useExpenseItem must be used within an ExpenseItemProvider"
    );
  }
  return context;
};