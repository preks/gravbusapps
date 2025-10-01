import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { GET_EXPENSE_PLANS_BY_MANAGER } from "../queries/expensePlans";
import { GET_EXPENSE_REQUESTS_BY_MANAGER } from "../queries/expenseRequests";
import { GET_EXPENSE_ITEMS_BY_MANAGER } from "../queries/expenseItems";
import { formatDate, getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER } from "../queries/advancePayments";
import { getExpenseRequestStatusDisplay, getExpensePlanStatusDisplay, getAdvancePaymentStatusDisplay } from "../utils";

// Define report types
export enum ReportType {
  EXPENSE_ITEM = "expense_item",
  EXPENSE_PLAN = "expense_plan",
  EXPENSE_REQUEST = "expense_request",
  ADVANCE_PAYMENT = "advance_payment",
}

// Define report metadata
export interface ReportMetadata {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  selected?: boolean;
}

// Define base report item interface
export interface ReportItem {
  id: string;
  [key: string]: any;
}

// Define expense item interface
export interface ExpenseItemReport extends ReportItem {
  date: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  employeeName: string;
  status: string;
  code?: string;
  currency?: string;
}

// Define expense plan interface
export interface ExpensePlanReport extends ReportItem {
  code: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  employeeName: string;
  expenseRequestCode?: string;
  currency: string;
  createdAt?: string;
}

// Define expense request interface
export interface ExpenseRequestReport extends ReportItem {
  code: string;
  planCode?: string;
  title: string;
  requestDate: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  employeeName: string;
  currency: string;
}

// Define advance payment interface
export interface AdvancePaymentReport extends ReportItem {
  code: string; // plan code
  title: string; // plan title
  requestDate: string; // createdAt of the payment
  status: string;
  amount: number; // advance amount
  employeeName: string;
  paymentMethod?: string;
  costCenter?: string;
  currency?: string;
}

// Define hook return interface
export interface UseExpenseReportDataReturn {
  reportTypes: ReportMetadata[];
  selectedReportType: ReportType | null;
  setSelectedReportType: (type: ReportType) => void;
  reportData: ReportItem[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchReportData: () => Promise<void>;
  fetchAllForExport: () => Promise<ReportItem[]>;
}

/**
 * Hook for fetching and managing expense report data
 */
export const useExpenseReportData = ({
  accessToken,
  userInfo,
}: BusinessAppContextProps): UseExpenseReportDataReturn => {
  // Initialize GraphQL client
  const graphqlClient = useGraphqlClient(accessToken);

  // Get managerId from userInfo or use a fallback UUID for development
  const managerId =
    userInfo?.employeeDetails?.employeeId || userInfo?.id || "00000000-0000-0000-0000-000000000000";

  // State for report data, loading state, and errors
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // State for pagination and filtering
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // State for selected report type
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(
    ReportType.EXPENSE_ITEM,
  );

  // Define report types
  const reportTypes: ReportMetadata[] = [
    {
      id: "report-1",
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_item_report",
        "Expense Item Report",
      ),
      type: ReportType.EXPENSE_ITEM,
      selected: selectedReportType === ReportType.EXPENSE_ITEM,
    },
    {
      id: "report-2",
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_plan_report",
        "Expense Plan Report",
      ),
      type: ReportType.EXPENSE_PLAN,
      selected: selectedReportType === ReportType.EXPENSE_PLAN,
    },
    {
      id: "report-3",
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_request_report",
        "Expense Request Report",
      ),
      type: ReportType.EXPENSE_REQUEST,
      selected: selectedReportType === ReportType.EXPENSE_REQUEST,
    },
    {
      id: "report-4",
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:advance_payment_report.search_module",
        "Advance Payment Report",
      ),
      type: ReportType.ADVANCE_PAYMENT,
      selected: selectedReportType === ReportType.ADVANCE_PAYMENT,
    },
  ];

  // Process expense items data
  const processExpenseItemsData = (data: any): ExpenseItemReport[] => {
    if (!data?.ExpenseItem?.length) return [];

    return data.ExpenseItem.map((item: any) => {
      // Get the first expense group from positions or use 'Uncategorized'
      const expenseGroup =
        item.expensePosition &&
        item.expensePosition.length > 0 &&
        item.expensePosition[0].expenseGroupRef
          ? item.expensePosition[0].expenseGroupRef.replace("ExpenseGroup:v1:", "")
          : "Uncategorized";

      const statusDisplay = item.expenseRequest?.status
        ? getExpenseRequestStatusDisplay(item.expenseRequest.status)
        : { label: "", type: "draft" };

      return {
        id: item.id,
        code: item.expenseRequest?.code || "",
        currency:
          item.expenseRequest?.currencyRef
            ? String(item.expenseRequest.currencyRef).split(":").pop() || ""
            : "",
        date: item.expenseRequest?.createdAt
          ? formatDate(item.expenseRequest.createdAt, "date.short")
          : "-",
        title: item.title || "",
        description: item.description || "",
        category: expenseGroup,
        amount: item.totalAmount || 0,
        employeeName: item.employee?.firstName + " " + item.employee?.lastName || "",
        status: statusDisplay.label,
      };
    });
  };

  // Process expense plans data
  const processExpensePlansData = (data: any): ExpensePlanReport[] => {
    if (!data?.ExpensePlan?.length) return [];

      return data.ExpensePlan.map((plan: any) => {
      const statusDisplay = plan.status
        ? getExpensePlanStatusDisplay(plan.status)
        : { label: "", type: "draft" };

      const employeeName = plan.employee?.fullName || "";

      return {
        id: plan.id,
        code: plan.code || "",
        title: plan.title || "",
        startDate: plan.startDate ? formatDate(plan.startDate, "date.short") : "",
        endDate: plan.endDate ? formatDate(plan.endDate, "date.short") : "",
        status: statusDisplay.label,
        totalAmount: plan.totalAmount || 0,
        currency: plan.currencyRef ? String(plan.currencyRef).split(":").pop() || "" : "",
        employeeName,
        expenseRequestCode:
          Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0
            ? plan.expenseRequest[0].code || ""
            : "",
        createdAt: plan.createdAt ? formatDate(plan.createdAt, "date.short") : "",
      };
    });
  };

  // Process expense requests data
  const processExpenseRequestsData = (data: any): ExpenseRequestReport[] => {
    if (!data?.ExpenseRequest?.length) return [];

    return data.ExpenseRequest.map((request: any) => {
      const statusDisplay = request.status
        ? getExpenseRequestStatusDisplay(request.status)
        : { label: "", type: "draft" };

      return {
        id: request.id,
        code: request.code || "",
        planCode: request.expensePlan?.code || "",
        title: request.title || "",
        requestDate: request.requestDate ? formatDate(request.requestDate, "date.short") : "",
        createdAt: request.createdAt ? formatDate(request.createdAt, "date.short") : "",
        status: statusDisplay.label,
        totalAmount: request.totalAmount || 0,
        currency: request.currencyRef ? String(request.currencyRef).split(":").pop() || "" : "",
        employeeName: request.employee?.firstName + " " + request.employee?.lastName || "",
      };
    });
  };

  // Process advance payments data
  const processAdvancePaymentsData = (_data: any): AdvancePaymentReport[] => {
    if (!_data?.ExpensePlan?.length) return [];

    const rows: AdvancePaymentReport[] = [];
    _data.ExpensePlan.forEach((plan: any) => {
      const payments = Array.isArray(plan.advancePayment) ? plan.advancePayment : [];
      payments.forEach((payment: any) => {
        const statusDisplay = payment.status
          ? getAdvancePaymentStatusDisplay(payment.status)
          : { label: "", type: "draft" };
        const currencyCode = payment?.currencyRef ? String(payment.currencyRef).split(":").pop() || "" : "";
        rows.push({
          id: payment.id,
          code: plan.code || "",
          title: plan.title || "",
          requestDate: payment.createdAt ? formatDate(payment.createdAt, "date.short") || "-" : "-",
          status: statusDisplay.label,
          amount: payment.amount || 0,
          employeeName: plan.employee?.fullName || "",
          paymentMethod: payment.paymentMethod || undefined,
          costCenter: payment.costCenter?.name || payment.costCenter?.code || undefined,
          currency: currencyCode,
        });
      });
    });
    return rows;
  };

  // Fetch expense items report
  const fetchExpenseItems = useCallback(async () => {
    if (!graphqlClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : "%%",
      });

      const processedData = processExpenseItemsData(result);
      setReportData(processedData);
      setTotalCount(result?.ExpenseItemAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error("Error fetching expense items:", err);
      setError("Failed to load expense items data");
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);

  // Fetch expense plans report
  const fetchExpensePlans = useCallback(async () => {
    if (!graphqlClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_EXPENSE_PLANS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : "%%",
      });

      const processedData = processExpensePlansData(result);
      setReportData(processedData);
      setTotalCount(result?.ExpensePlanAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error("Error fetching expense plans:", err);
      setError("Failed to load expense plans data");
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);

  // Fetch expense requests report
  const fetchExpenseRequests = useCallback(async () => {
    if (!graphqlClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // Use the real manager ID from userInfo
      const where = {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: managerId } } },
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: searchTerm ? `%${searchTerm}%` : "%%" } },
          { title: { _ilike: searchTerm ? `%${searchTerm}%` : "%%" } },
          { employee: { fullName: { _ilike: searchTerm ? `%${searchTerm}%` : "%%" } } },
        ],
      } as any;

      const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BY_MANAGER, {
        where,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: [{ requestDate: "DESC" }],
      });

      const processedData = processExpenseRequestsData(result);
      setReportData(processedData);
      setTotalCount(result?.ExpenseRequestAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error("Error fetching expense requests:", err);
      setError("Failed to load expense requests data");
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);

  // Fetch advance payments report
  const fetchAdvancePayments = useCallback(async () => {
    if (!graphqlClient) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER, {
        managerId: managerId,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : "%%",
      });

      const rows: AdvancePaymentReport[] = (result?.AdvancePayment || []).map(mapAdvancePaymentToReport);

      setReportData(rows);
      setTotalCount(result?.AdvancePaymentAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error("Error fetching advance payments:", err);
      setError("Failed to load advance payments data");
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);

  const mapAdvancePaymentToReport = useCallback((p: any): AdvancePaymentReport => {
    const statusDisplay = p.status
      ? getAdvancePaymentStatusDisplay(p.status)
      : { label: "", type: "draft" };
    const currencyCode = p?.currencyRef ? String(p.currencyRef).split(":").pop() || "" : "";
    return {
      id: p.id,
      code: p.expensePlan?.code || p.code || "",
      title: p.expensePlan?.title || "",
      requestDate: p.createdAt ? formatDate(p.createdAt, "date.short") || "-" : "-",
      status: statusDisplay.label,
      amount: p.amount || 0,
      employeeName: p.expensePlan?.employee?.fullName || "",
      paymentMethod: p.paymentMethod || undefined,
      costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
      currency: currencyCode,
    };
  }, []);

  // Fetch all rows for export (bypassing pagination) for the currently selected report and filters
  const fetchAllForExport = useCallback(async (): Promise<ReportItem[]> => {
    if (!graphqlClient || !selectedReportType) return [];

    const batchLimit = 1000;
    try {
      switch (selectedReportType) {
        case ReportType.EXPENSE_ITEM: {
          const all: ReportItem[] = [];
          let offset = 0;
          try {
            // Loop until fewer than batchLimit items are returned
            while (true) {
              const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BY_MANAGER, {
                managerId: managerId,
                limit: batchLimit,
                offset,
                searchTerm: searchTerm ? `%${searchTerm}%` : "%%",
              });
              const processed = processExpenseItemsData(result);
              all.push(...processed);
              if (!Array.isArray(processed) || processed.length < batchLimit) break;
              offset += batchLimit;
            }
          } catch (error) {
            console.error('Error fetching batch for export (items):', error);
            setError('Partial export: some items could not be fetched');
          }
          return all;
        }
        case ReportType.EXPENSE_PLAN: {
          const all: ReportItem[] = [];
          let offset = 0;
          try {
            while (true) {
              const result = await graphqlClient.request(GET_EXPENSE_PLANS_BY_MANAGER, {
                managerId: managerId,
                limit: batchLimit,
                offset,
                searchTerm: searchTerm ? `%${searchTerm}%` : "%%",
              });
              const processed = processExpensePlansData(result);
              all.push(...processed);
              if (!Array.isArray(processed) || processed.length < batchLimit) break;
              offset += batchLimit;
            }
          } catch (error) {
            console.error('Error fetching batch for export (plans):', error);
            setError('Partial export: some plans could not be fetched');
          }
          return all;
        }
        case ReportType.EXPENSE_REQUEST: {
          const all: ReportItem[] = [];
          let offset = 0;
          const where = {
            employee: { employeePosition: { supervisorEmployeeId: { _eq: managerId } } },
            isDeleted: { _eq: false },
            _or: [
              { code: { _ilike: searchTerm ? `%${searchTerm}%` : "%%" } },
              { title: { _ilike: searchTerm ? `%${searchTerm}%` : "%%" } },
              { employee: { fullName: { _ilike: searchTerm ? `%${searchTerm}%` : "%%" } } },
            ],
          } as any;

          try {
            while (true) {
              const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BY_MANAGER, {
                where,
                limit: batchLimit,
                offset,
                orderBy: [{ requestDate: "DESC" }],
              });
              const processed = processExpenseRequestsData(result);
              all.push(...processed);
              if (!Array.isArray(processed) || processed.length < batchLimit) break;
              offset += batchLimit;
            }
          } catch (error) {
            console.error('Error fetching batch for export (requests):', error);
            setError('Partial export: some requests could not be fetched');
          }
          return all;
        }
        case ReportType.ADVANCE_PAYMENT: {
          const all: ReportItem[] = [];
          let offset = 0;
          try {
            while (true) {
              const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER, {
                managerId: managerId,
                limit: batchLimit,
                offset,
                searchTerm: searchTerm ? `%${searchTerm}%` : "%%",
              });

              const rows: AdvancePaymentReport[] = (result?.AdvancePayment || []).map(mapAdvancePaymentToReport);

              all.push(...rows);
              if (!Array.isArray(rows) || rows.length < batchLimit) break;
              offset += batchLimit;
            }
          } catch (error) {
            console.error('Error fetching batch for export (advance payments):', error);
            setError('Partial export: some advance payments could not be fetched');
          }
          return all;
        }
        default:
          return [];
      }
    } catch (err) {
      console.error("Error exporting report data:", err);
      setError("Failed to export report data");
      return [];
    }
  }, [graphqlClient, selectedReportType, managerId, searchTerm]);

  // Main function to fetch report data based on selected type
  const fetchReportData = useCallback(async () => {
    if (!selectedReportType) return;

    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        await fetchExpenseItems();
        break;
      case ReportType.EXPENSE_PLAN:
        await fetchExpensePlans();
        break;
      case ReportType.EXPENSE_REQUEST:
        await fetchExpenseRequests();
        break;
      case ReportType.ADVANCE_PAYMENT:
        await fetchAdvancePayments();
        break;
      default:
        console.warn(`Unknown report type: ${selectedReportType}`);
    }
  }, [
    selectedReportType,
    fetchExpenseItems,
    fetchExpensePlans,
    fetchExpenseRequests,
    fetchAdvancePayments,
  ]);

  return {
    reportTypes,
    selectedReportType,
    setSelectedReportType,
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    fetchReportData,
    fetchAllForExport,
  };
};
