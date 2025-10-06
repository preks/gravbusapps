import { useState, useEffect, useMemo, useCallback } from "react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { GET_EXPENSE_REQUESTS, PROCESS_PAYMENT_MUTATION } from "../queries";
import { ExpenseData, ExpenseRequestQueryData } from "../types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";


export const useExpenseRequests = (context: BusinessAppContextProps) => {
  const { accessToken } = context;
  const client = useGraphqlClient(accessToken);

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sorter, setSorter] = useState<Record<string, any>>({
    createdAt: "DESC_NULLS_LAST",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("BOOKED");
  const [amountMinFilter, setAmountMinFilter] = useState<string>("");
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>("");
  

  const transformExpenseRequest = (item: any): ExpenseData => {
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
      advance: "",
      status: item.status ?? "",
      payableAmount: item.totalAmount
        ? `${item.totalAmount} ${item.currency?.code ?? ""}`.trim()
        : "-",
      paymentMethod: "-",
      employeeId: String(item.employee?.id ?? "-"),
      version: item.version ?? "",
      currency: { code: item.currency?.code ?? "" },
      currencyRef: item.currencyRef ?? "",
      typeRef: "",
      requestTypeRef: item.requestTypeRef ?? "",
      totalRemainingAmount: item.totalRemainingAmount ?? "-",
      userId: "",
      expenseRuleId: "",
      totalAmount: item.totalAmount ?? 0,
      employeeDocumentId: item.employeeDocumentId ?? null,
      documentData: null,
      employeeDocument: item.employeeDocument,
      department: item.employee?.employeePosition?.costCenter?.name ?? "N/A",
      nonReimbursableAmount: item.nonReimbursableAmount,
      expensePlan: item.expensePlan,
    };
  };

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

      conditions.push({ status: { _neq: "DISCARDED" } });

      if (statusFilter && statusFilter !== "") {
        const statusArray = statusFilter
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);
        if (statusArray.length > 0) {
          conditions.push({ status: { _in: statusArray } });
        }
      }

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

      if (amountMinFilter || amountMaxFilter) {
        const amountConditions: any = {};
        if (amountMinFilter) {
          amountConditions._gte = parseFloat(amountMinFilter);
        }
        if (amountMaxFilter) {
          amountConditions._lte = parseFloat(amountMaxFilter);
        }
        if (Object.keys(amountConditions).length > 0) {
          conditions.push({
            totalAmount: amountConditions,
          });
        }
      }


      if (searchTerm && searchTerm.trim() !== "") {
        const searchValue = `%${searchTerm.trim()}%`;
        conditions.push({
          _or: [
            { employee: { firstName: { _ilike: searchValue } } },
            { employee: { lastName: { _ilike: searchValue } } },
            { employee: { displayName: { _ilike: searchValue } } },
            { employee: { code: { _ilike: searchValue } } },

            { title: { _ilike: searchValue } },
            { code: { _ilike: searchValue } },

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

            { requestType: { value: { _ilike: searchValue } } },
            {
              requestType: { translations: { value: { _ilike: searchValue } } },
            },

            { currency: { code: { _ilike: searchValue } } },
          ],
        });
      }

      const baseWhere =
        conditions.length === 1 ? conditions[0] : { _and: conditions };

      const limit = Math.min(pageSize, 1000);
      const offset = (currentPage - 1) * limit;

      const variables = {
        where: baseWhere,
        limit,
        offset,
        orderBy: sorter,
      };

      const response = await client.request(GET_EXPENSE_REQUESTS, variables);
      const responseData = response as ExpenseRequestQueryData;

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
    if (accessToken && client) {
      fetchData();
    }
  }, [
    accessToken,
    client,
    currentPage,
    pageSize,
    searchTerm,
    employeeFilter,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
  ]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    setSorter(sorter);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEmployeeFilter = useCallback((employeeIds: string) => {
    setEmployeeFilter(employeeIds);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = useCallback((statuses: string) => {
    setStatusFilter(statuses);
    setCurrentPage(1);
  }, []);

  const handleAmountFilter = useCallback(
    (amountMin: string, amountMax: string) => {
      setAmountMinFilter(amountMin);
      setAmountMaxFilter(amountMax);
      setCurrentPage(1);
    },
    []
  );


  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    expenses.forEach((expense) => {
      if (expense.department && expense.department !== "N/A") {
        deptSet.add(expense.department);
      }
    });
    return Array.from(deptSet).sort();
  }, [expenses]);

  const processExpensePayment = async (id: string) => {
    if (!client) return false;
    // setMutationLoading(true); // This state variable was removed, so this line is removed.
    setError(null);
    try {
      await client.request(PROCESS_PAYMENT_MUTATION, { id });
      await fetchData(); // Refresh data after payment processing
      // setMutationLoading(false); // This state variable was removed, so this line is removed.
      return true;
    } catch (err) {
      console.error("Error processing expense payment:", err);
      setError("Failed to process expense payment.");
      // setMutationLoading(false); // This state variable was removed, so this line is removed.
      return false;
    }
  };

  // Search employees method
  const searchEmployees = useCallback(
    async (
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
          limit: 1000,
          offset: 0,
        };

        const data = await client.request(GET_EXPENSE_REQUESTS, variables);

        const employees = new Map<string, { id: string; name: string }>();
        const searchLower = searchTerm.trim().toLowerCase();

        data?.ExpenseRequest?.forEach((request: any) => {
          if (request.employee) {
            const firstName = request.employee.firstName || "";
            const lastName = request.employee.lastName || "";
            const displayName = request.employee.displayName || "";
            const employeeId = request.employee.id;

            const fullName = `${firstName} ${lastName}`.trim();

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
        return result;
      } catch (err: any) {
        console.error("Error searching employees:", err);
        return [];
      }
    },
    [client, accessToken]
  );

  // Search statuses method
  const searchStatuses = useCallback(async (): Promise<string[]> => {
    if (!accessToken) {
      console.warn("Access token not found for status search");
      return [];
    }

    if (!client) {
      console.warn("GraphQL client not initialized for status search");
      return [];
    }

    try {
      const variables = {
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { status: { _neq: "DISCARDED" } },
          ],
        },
        limit: 1000,
        offset: 0,
      };

      const data = await client.request(GET_EXPENSE_REQUESTS, variables);

      const statuses = new Set<string>();
      data?.ExpenseRequest?.forEach((request: any) => {
        if (request.status) {
          statuses.add(request.status);
        }
      });

      const result = Array.from(statuses).sort();
      return result;
    } catch (err: any) {
      console.error("Error searching statuses:", err);
      return [];
    }
  }, [client, accessToken]);

  return {
    expenses,
    totalItems,
    loading,
    error,
    currentPage,
    pageSize,
    searchTerm,
    fetchData,
    searchEmployees,
    searchStatuses,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleTableChange,
    handleSearch,
    amountMinFilter,
    amountMaxFilter,
  };
};
