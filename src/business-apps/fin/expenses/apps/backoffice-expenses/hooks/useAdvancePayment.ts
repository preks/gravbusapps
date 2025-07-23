import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import {
  GET_ADVANCE_PAYMENTS,
  GET_ADVANCE_PAYMENT_STATISTICS,
} from "../queries/advancePayment.queries";
import { AdvancePaymentItem, AdvancePaymentStatisticsData } from "../types";

// ⚡ BEST PRACTICE: Query limit enforcement for safety (like leads)
const MAX_QUERY_LIMIT = 1000;
const enforceQueryLimit = (limit: number): number => {
  return Math.min(limit, MAX_QUERY_LIMIT);
};

export interface AdvancePaymentsResult {
  payments: AdvancePaymentItem[];
  isLoading: boolean;
  error: any;
  totalCount: number;
  fetchPayments: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    status?: string,
    amountMin?: string,
    amountMax?: string,
    advanceMin?: string,
    advanceMax?: string,
    reporter?: string
  ) => Promise<void>;
  advancePaymentStats: AdvancePaymentStatisticsData | null;
  statsLoading: boolean;
  statsError: any;
  fetchAdvancePaymentStatistics: () => Promise<void>;
  searchReporters: (searchTerm: string) => Promise<string[]>;
  searchStatuses: () => Promise<string[]>;
}

export const useAdvancePayments = (
  context?: BusinessAppContextProps
): AdvancePaymentsResult => {
  const [payments, setPayments] = useState<AdvancePaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [advancePaymentStats, setAdvancePaymentStats] =
    useState<AdvancePaymentStatisticsData | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<any>(null);

  const client = useGraphqlClient(context?.accessToken ?? "");

  // ⚡ OPTIMIZED: Build proper where clause for better performance
  const buildQueryVariables = (
    searchTerm: string,
    page: number,
    pageSize: number,
    status?: string,
    amountMin?: string,
    amountMax?: string,
    advanceMin?: string,
    advanceMax?: string,
    reporter?: string
  ) => {
    const offset = (page - 1) * pageSize;

    // Build conditions array like expense requests
    const conditions: any[] = [];

    // Base conditions
    conditions.push({ isDeleted: { _eq: false } });
    conditions.push({
      status: {
        _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"],
      },
    });

    // Add status filter if provided
    if (status && status !== "all" && status !== "") {
      conditions.push({ status: { _eq: status } });
    }

    // Add search conditions if provided
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = `%${searchTerm.trim()}%`;
      conditions.push({
        _or: [
          { code: { _ilike: searchValue } },
          { description: { _ilike: searchValue } },
          { expensePlan: { code: { _ilike: searchValue } } },
          { expensePlan: { title: { _ilike: searchValue } } },
          { expensePlan: { employee: { firstName: { _ilike: searchValue } } } },
          { expensePlan: { employee: { lastName: { _ilike: searchValue } } } },
        ],
      });
    }

    // Add amount min/max filter if provided (using expensePlan.totalAmount)
    if (amountMin || amountMax) {
      const amountConditions: any = {};
      if (amountMin) {
        amountConditions._gte = parseFloat(amountMin);
      }
      if (amountMax) {
        amountConditions._lte = parseFloat(amountMax);
      }
      if (Object.keys(amountConditions).length > 0) {
        conditions.push({
          expensePlan: {
            totalAmount: amountConditions,
          },
        });
      }
    }

    // Add advance min/max filter if provided (using payment amount)
    if (advanceMin || advanceMax) {
      const advanceConditions: any = {};
      if (advanceMin) {
        advanceConditions._gte = parseFloat(advanceMin);
      }
      if (advanceMax) {
        advanceConditions._lte = parseFloat(advanceMax);
      }
      if (Object.keys(advanceConditions).length > 0) {
        conditions.push({
          amount: advanceConditions,
        });
      }
    }

    // Add reporter filter if provided
    if (reporter && reporter.trim() !== "") {
      const reporterNames = reporter
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      if (reporterNames.length > 0) {
        const reporterConditions = reporterNames.map((reporterName) => {
          // Split the full name into parts and search for each part
          const nameParts = reporterName
            .split(" ")
            .filter((part) => part.length > 0);

          const namePartConditions = nameParts.map((part) => {
            const partValue = `%${part.trim()}%`;
            return {
              _or: [
                {
                  expensePlan: {
                    employee: { firstName: { _ilike: partValue } },
                  },
                },
                {
                  expensePlan: {
                    employee: { lastName: { _ilike: partValue } },
                  },
                },
                {
                  expensePlan: {
                    employee: { displayName: { _ilike: partValue } },
                  },
                },
              ],
            };
          });

          // All parts of the name must match (AND logic)
          return namePartConditions.length === 1
            ? namePartConditions[0]
            : { _and: namePartConditions };
        });

        if (reporterConditions.length === 1) {
          conditions.push(reporterConditions[0]);
        } else {
          conditions.push({ _or: reporterConditions });
        }
      }
    }

    // Build final where clause
    const where =
      conditions.length === 1 ? conditions[0] : { _and: conditions };

    // ⚡ BEST PRACTICE: Enforce query limit for safety (like leads)
    const safePageSize = enforceQueryLimit(pageSize);

    return {
      where,
      limit: safePageSize,
      offset: offset,
    };
  };

  const mapResponseToPayments = (data: any): AdvancePaymentItem[] => {
    const fetchedPayments = data?.AdvancePayment ?? [];
    return fetchedPayments.map((payment: any) => ({
      id: payment.id,
      code: payment.expensePlan?.code || payment.code, // Use expense plan code first, fallback to payment code
      description: payment.description,
      status: payment.status ?? "PENDING",
      title: payment.expensePlan?.title,
      employeeDisplayName: payment.expensePlan?.employee
        ? `${payment.expensePlan.employee.firstName || ""} ${
            payment.expensePlan.employee.lastName || ""
          }`.trim()
        : "N/A",
      employeeFullName: payment.expensePlan?.employee
        ? `${payment.expensePlan.employee.firstName || ""} ${
            payment.expensePlan.employee.lastName || ""
          }`.trim()
        : "N/A",
      amount: payment.amount,
      startDate: payment.expensePlan?.startDate,
      paymentMethod: payment.paymentMethod,
      currency: payment.currency,
      costCenter: payment.costCenter,
      expensePlan: payment.expensePlan,
    }));
  };

  const fetchPayments = useCallback(
    async (
      searchTerm: string = "",
      page: number = 1,
      pageSize: number = 10,
      status?: string,
      amountMin?: string,
      amountMax?: string,
      advanceMin?: string,
      advanceMax?: string,
      reporter?: string
    ) => {
      if (!context?.accessToken) {
        setError(new Error("Access token not found."));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const variables = buildQueryVariables(
          searchTerm,
          page,
          pageSize,
          status,
          amountMin,
          amountMax,
          advanceMin,
          advanceMax,
          reporter
        );

        const data = await client.request(GET_ADVANCE_PAYMENTS, variables);

        const mappedPayments = mapResponseToPayments(data);
        setPayments(mappedPayments);
        setTotalCount(data.AdvancePaymentAggregate?.aggregate?.count ?? 0);
      } catch (err: any) {
        setError(err);
        setPayments([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [client, context?.accessToken]
  );

  const fetchAdvancePaymentStatistics = useCallback(async () => {
    if (!context?.accessToken) {
      setStatsError(new Error("Access token not found."));
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const data = await client.request(GET_ADVANCE_PAYMENT_STATISTICS, {});

      if (!data?.advancePaymentStats?.aggregate?.sum) {
        setAdvancePaymentStats({ totalAmount: null });
      } else {
        setAdvancePaymentStats({
          totalAmount: data.advancePaymentStats.aggregate.sum.amount,
        });
      }
    } catch (err: any) {
      setStatsError(err);
      setAdvancePaymentStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [client, context?.accessToken]);

  const searchReporters = useCallback(
    async (searchTerm: string): Promise<string[]> => {
      if (!context?.accessToken) {
        throw new Error("Access token not found.");
      }

      if (!searchTerm.trim()) {
        return [];
      }

      try {
        // Build search query for reporters
        const searchValue = `%${searchTerm.trim()}%`;
        const variables = {
          where: {
            _and: [
              { isDeleted: { _eq: false } },
              {
                status: {
                  _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"],
                },
              },
              {
                _or: [
                  {
                    expensePlan: {
                      employee: { firstName: { _ilike: searchValue } },
                    },
                  },
                  {
                    expensePlan: {
                      employee: { lastName: { _ilike: searchValue } },
                    },
                  },
                  {
                    expensePlan: {
                      employee: { displayName: { _ilike: searchValue } },
                    },
                  },
                ],
              },
            ],
          },
          limit: 1000, // Get more results for better search coverage
          offset: 0,
        };

        const data = await client.request(GET_ADVANCE_PAYMENTS, variables);

        // Extract unique reporter names from the results
        const reporters = new Set<string>();
        data?.AdvancePayment?.forEach((payment: any) => {
          if (payment.expensePlan?.employee) {
            const firstName = payment.expensePlan.employee.firstName || "";
            const lastName = payment.expensePlan.employee.lastName || "";
            const displayName = payment.expensePlan.employee.displayName || "";

            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName) {
              reporters.add(fullName);
            }
            if (displayName) {
              reporters.add(displayName);
            }
          }
        });

        return Array.from(reporters).sort();
      } catch (err: any) {
        console.error("Error searching reporters:", err);
        return [];
      }
    },
    [client, context?.accessToken]
  );

  const searchStatuses = useCallback(async (): Promise<string[]> => {
    if (!context?.accessToken) {
      throw new Error("Access token not found.");
    }

    try {
      // Build query to get all statuses from all records
      const variables = {
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            {
              status: {
                _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"],
              },
            },
          ],
        },
        limit: 1000, // Get more results for better coverage
        offset: 0,
      };

      const data = await client.request(GET_ADVANCE_PAYMENTS, variables);

      // Extract unique statuses from the results
      const statuses = new Set<string>();
      data?.AdvancePayment?.forEach((payment: any) => {
        if (payment.status) {
          statuses.add(payment.status);
        }
      });

      return Array.from(statuses).sort();
    } catch (err: any) {
      console.error("Error searching statuses:", err);
      return [];
    }
  }, [client, context?.accessToken]);

  return {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
    advancePaymentStats,
    statsLoading,
    statsError,
    fetchAdvancePaymentStatistics,
    searchReporters,
    searchStatuses,
  };
};
