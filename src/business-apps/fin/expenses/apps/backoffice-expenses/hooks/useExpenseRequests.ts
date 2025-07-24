import { useState, useEffect, useMemo } from "react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { GET_EXPENSE_REQUESTS, PROCESS_PAYMENT_MUTATION } from "../queries";
import { ExpenseData, ExpenseRequest, ExpenseRequestQueryData } from "../types";

// ⚡ BEST PRACTICE: Query limit enforcement for safety (like leads)
const MAX_QUERY_LIMIT = 1000;
const enforceQueryLimit = (limit: number): number => {
  return Math.min(limit, MAX_QUERY_LIMIT);
};

const transformExpenseRequest = (item: ExpenseRequest): ExpenseData => {
  const getCalculatedPayable = () => {
    // ⚡ SIMPLIFIED: Use total amount directly since we removed complex calculations for performance
    return item?.totalAmount ?? 0;
  };

  return {
    id: item.id,
    expenseId: String(item.id ?? "-"),
    employeeCode: item.employee?.code ?? "-",
    code: item.code ?? "-",
    sapNumber: item.employee?.additionalProperties?.SAPNumber ?? "-",
    employee:
      `${item.employee?.firstName ?? ""} ${
        item.employee?.lastName ?? ""
      }`.trim() || "-",
    title: item.title ?? "-",
    creationDate: item.createdAt ?? "-",
    startDate: item.startDate ?? "",
    endDate: item.endDate ?? "",
    requestDate: item.requestDate ?? "",
    reporter:
      `${item.employee?.firstName ?? ""} ${
        item.employee?.lastName ?? ""
      }`.trim() || "-",
    type: item.requestType?.value ?? "-",
    amount: item.totalAmount
      ? `${item.totalAmount} ${item.currency?.code ?? ""}`.trim()
      : "-",
    advance: "-", // ⚡ SIMPLIFIED: Removed for performance
    status: item.status ?? "-",
    payableAmount:
      getCalculatedPayable() != 0
        ? `${getCalculatedPayable()} ${item.currency?.code ?? ""}`.trim()
        : "-",
    paymentMethod: "-", // ⚡ SIMPLIFIED: Removed for performance
    employeeId: String(item.employee?.id ?? "-"),
    version: "-", // ⚡ SIMPLIFIED: Default value for performance
    currency: { code: item.currency?.code ?? "" },
    currencyRef: "-", // ⚡ SIMPLIFIED: Default value for performance
    typeRef: "-", // ⚡ SIMPLIFIED: Default value for performance
    totalRemainingAmount: "-", // ⚡ SIMPLIFIED: Default value for performance
    userId: "-", // ⚡ SIMPLIFIED: Default value for performance
    expenseRuleId: "-", // ⚡ SIMPLIFIED: Default value for performance
    totalAmount: item.totalAmount ?? 0,
    employeeDocumentId: null, // ⚡ SIMPLIFIED: Default value for performance
    documentData: null, // ⚡ SIMPLIFIED: Default value for performance
    department: item.employee?.employeePosition?.costCenter?.name ?? "N/A",
  };
};

import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export const useExpenseRequests = ({
  accessToken,
}: Pick<BusinessAppContextProps, "accessToken">) => {
  const client = useGraphqlClient(accessToken); // accessToken is now guaranteed by BusinessAppContextProps

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mutationLoading, setMutationLoading] = useState<boolean>(false); // Specific loading for mutations
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20); // ⚡ BEST PRACTICE: Match leads default (20)
  const [sorter, setSorter] = useState<Record<string, any>>({
    createdAt: "DESC_NULLS_LAST",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>(""); // This will now store employee IDs

  const fetchData = async () => {
    if (!accessToken || !client) {
      setError("Access token and GraphQL client are required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const conditions: any[] = [{ isDeleted: { _eq: false } }];

      // Always exclude DISCARDED status
      conditions.push({ status: { _neq: "DISCARDED" } });

      // Add employee filter if provided
      if (employeeFilter && employeeFilter !== "") {
        const employeeIds = employeeFilter
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        if (employeeIds.length > 0) {
          conditions.push({
            _or: employeeIds.map((id) => ({
              employee: { id: { _eq: id } },
            })),
          });
        }
      }

      // Add search conditions if search term is provided
      if (searchTerm && searchTerm.trim() !== "") {
        const searchValue = `%${searchTerm.trim()}%`;
        conditions.push({
          _or: [
            // Employee fields
            { employee: { firstName: { _ilike: searchValue } } },
            { employee: { lastName: { _ilike: searchValue } } },
            { employee: { displayName: { _ilike: searchValue } } },
            { employee: { code: { _ilike: searchValue } } },

            // Request fields
            { title: { _ilike: searchValue } },
            { code: { _ilike: searchValue } },

            // Department/organizational fields
            {
              employee: {
                employeePosition: {
                  costCenter: { name: { _ilike: searchValue } },
                },
              },
            },
            {
              employee: {
                employeePosition: {
                  organizationalUnit: { name: { _ilike: searchValue } },
                },
              },
            },

            // Request type
            { requestType: { value: { _ilike: searchValue } } },
            {
              requestType: { translations: { value: { _ilike: searchValue } } },
            },

            // Currency
            { currency: { code: { _ilike: searchValue } } },
          ],
        });
      }

      // Build final where clause
      const baseWhere =
        conditions.length === 1 ? conditions[0] : { _and: conditions };

      // ⚡ BEST PRACTICE: Enforce query limit for safety (like leads)
      const limit = Math.min(pageSize, 1000);
      const offset = (currentPage - 1) * limit;

      const variables = {
        where: baseWhere,
        limit,
        offset,
        orderBy: sorter,
      };

      console.log("Fetching expense requests with variables:", variables);

      const response = await client.request(GET_EXPENSE_REQUESTS, variables);
      const responseData = response as ExpenseRequestQueryData;

      console.log("Expense requests response:", responseData);

      if (responseData?.ExpenseRequest) {
        const transformedData = responseData.ExpenseRequest.map(
          transformExpenseRequest
        );
        setExpenses(transformedData);
      } else {
        setExpenses([]);
      }

      setTotalItems(responseData.total.aggregate.count ?? 0);
    } catch (err) {
      console.error("Error fetching expense requests:", err);
      console.error("Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        employeeFilter,
        searchTerm,
        currentPage,
        pageSize,
      });
      setError("Failed to fetch expense requests. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ⚡ PERFORMANCE OPTIMIZATION: Add debouncing for search and filters
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        fetchData();
      },
      searchTerm ? 300 : 0
    ); // 300ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [
    client,
    currentPage,
    pageSize,
    sorter,
    searchTerm,
    employeeFilter,
    accessToken,
  ]);

  const handleTableChange = (
    pagination: any,
    newFilters: any,
    newSorter: any
  ) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);

    if (newSorter.field && newSorter.order) {
      const order =
        newSorter.order === "ascend" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
      setSorter({ [newSorter.field]: order });
    } else {
      setSorter({ createdAt: "DESC_NULLS_LAST" });
    }
  };

  // New function to handle search
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  // New function to handle employee filter
  const handleEmployeeFilter = (employee: string) => {
    setEmployeeFilter(employee);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const departments = useMemo(() => {
    const deptSet = new Set(
      expenses.map((exp) => exp.department).filter((d) => d && d !== "N/A")
    );
    return Array.from(deptSet);
  }, [expenses]);

  const processExpensePayment = async (id: string) => {
    if (!client) return false;
    setMutationLoading(true);
    setError(null);
    try {
      await client.request(PROCESS_PAYMENT_MUTATION, { id });
      await fetchData(); // Refresh data after payment processing
      setMutationLoading(false);
      return true;
    } catch (err) {
      console.error("Error processing expense payment:", err);
      setError("Failed to process expense payment.");
      setMutationLoading(false);
      return false;
    }
  };

  // Search employees method
  const searchEmployees = async (
    searchTerm: string
  ): Promise<Array<{ id: string; name: string }>> => {
    if (!accessToken) {
      console.warn("Access token not found for employee search");
      return [];
    }

    if (!client) {
      console.warn("GraphQL client not initialized for employee search");
      return [];
    }

    if (!searchTerm.trim()) {
      return [];
    }

    try {
      // Build search query for employees - use broader search
      const searchValue = `%${searchTerm.trim()}%`;
      const variables = {
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { status: { _neq: "DISCARDED" } },
            {
              _or: [
                { employee: { firstName: { _ilike: searchValue } } },
                { employee: { lastName: { _ilike: searchValue } } },
                { employee: { displayName: { _ilike: searchValue } } },
              ],
            },
          ],
        },
        limit: 1000, // Get more results for better search coverage
        offset: 0,
      };

      console.log("Searching employees with variables:", variables);

      const data = await client.request(GET_EXPENSE_REQUESTS, variables);

      console.log("Employee search response:", data);

      // Extract unique employee names from the results and filter for better matches
      const employees = new Map<string, { id: string; name: string }>();
      const searchLower = searchTerm.trim().toLowerCase();

      data?.ExpenseRequest?.forEach((request: any) => {
        if (request.employee) {
          const firstName = request.employee.firstName || "";
          const lastName = request.employee.lastName || "";
          const displayName = request.employee.displayName || "";
          const employeeId = request.employee.id;

          const fullName = `${firstName} ${lastName}`.trim();

          // Check if the search term matches any part of the name
          const matchesSearch =
            fullName.toLowerCase().includes(searchLower) ||
            displayName.toLowerCase().includes(searchLower) ||
            firstName.toLowerCase().includes(searchLower) ||
            lastName.toLowerCase().includes(searchLower);

          if (fullName && matchesSearch && employeeId) {
            employees.set(employeeId, { id: employeeId, name: fullName });
          }
          if (displayName && matchesSearch && employeeId) {
            employees.set(employeeId, { id: employeeId, name: displayName });
          }
        }
      });

      const result = Array.from(employees.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      console.log("Found employees:", result);
      return result;
    } catch (err: any) {
      console.error("Error searching employees:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        searchTerm,
        accessToken: accessToken ? "present" : "missing",
        client: client ? "initialized" : "not initialized",
      });
      return [];
    }
  };

  return {
    expenses,
    loading,
    mutationLoading, // Loading state for mutation operations
    error,
    totalItems,
    currentPage,
    pageSize,
    searchTerm,
    employeeFilter,
    departments,
    handleTableChange,
    handleSearch,
    handleEmployeeFilter,
    fetchData,
    processExpensePayment,
    searchEmployees,
  };
};
