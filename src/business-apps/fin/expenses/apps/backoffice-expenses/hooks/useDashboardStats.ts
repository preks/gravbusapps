/**
 * Hook for fetching and managing all dashboard statistics.
 * This is the single source of truth for all data displayed on the expense dashboard.
 */

import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import {
  GET_EXPENSE_PLAN_YEARLY_TOTAL,
  GET_MONTHLY_SPEND_COMPARISON,
  GET_SPEND_COMPARISON_YEARLY,
  GET_SPEND_COMPARISON_QUARTERLY,
  GET_YTD_STATS,
  GET_ADDITIONAL_DASHBOARD_METRICS_YEARLY,
  GET_ADDITIONAL_DASHBOARD_METRICS_MONTHLY,
  GET_ADDITIONAL_DASHBOARD_METRICS_QUARTERLY,
  GET_AVG_SPEND_PER_TRIP_YEARLY,
  GET_AVG_SPEND_PER_TRIP_MONTHLY,
  GET_AVG_SPEND_PER_TRIP_QUARTERLY,
  GET_ADVANCE_PAYMENTS_APPROVED_YEARLY,
  GET_ADVANCE_PAYMENTS_APPROVED_MONTHLY,
  GET_ADVANCE_PAYMENTS_APPROVED_QUARTERLY,
  GET_TOTAL_COMPANY_SPEND_MONTHLY,
  GET_TOTAL_COMPANY_SPEND_QUARTERLY,
  GET_TOTAL_COMPANY_SPEND_YEARLY,
} from "../queries/expenseDashboard.queries";
import { DashboardStats } from "../types";

interface UseDashboardStatsResult {
  stats: DashboardStats;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useDashboardStats = ({
  accessToken,
  filters = {},
}: Pick<BusinessAppContextProps, "accessToken"> & {
  filters?: {
    currency?: string;
    department?: string;
    period?: string;
  };
}): UseDashboardStatsResult => {
  const [stats, setStats] = useState<DashboardStats>({
    expensePlanYearly: { totalAmount: 0, count: 0 },
    ytdStats: {
      totalAmount: 0,
      count: 0,
      previousTotalAmount: 0,
      previousCount: 0,
    },
    monthlyTrends: Array.from({ length: 12 }).map((_, i) => ({
      month: i + 1,
      monthName: new Date(0, i).toLocaleString("default", { month: "short" }),
      totalAmount: 0,
      count: 0,
    })),
    monthlySpendComparison: {
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      currentMonthCount: 0,
      previousMonthCount: 0,
      percentChange: 0,
      isIncrease: false,
    },
    transferRequired: 0,
    pendingRequestsCount: 0,
    avgSpendPerTrip: 0,
    travelExpensesCount: 0,
    advancePaymentsApproved: { count: 0, totalAmount: 0 },
    totalCompanySpend: {
      currentPeriodTotal: 0,
      previousPeriodTotal: 0,
      currentPeriodCount: 0,
      previousPeriodCount: 0,
      percentChange: 0,
      isIncrease: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [currencyCache, setCurrencyCache] = useState<Map<string, any>>(
    new Map()
  );

  const [lastRequestId, setLastRequestId] = useState<string>("");

  const client = useGraphqlClient(accessToken);

  const fetchEssentialStats = useCallback(async () => {
    if (!accessToken || !client) {
      setError(new Error("Access token and GraphQL client are required."));
      setLoading(false);
      return;
    }

    const requestId = `${JSON.stringify(filters)}-${Date.now()}`;
    if (requestId === lastRequestId) {
      console.log("Duplicate request detected, skipping");
      return;
    }
    setLastRequestId(requestId);

    setLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date();

      const startOfYear = new Date(currentYear, 0, 1)
        .toISOString()
        .split("T")[0];
      const endOfYear = new Date(currentYear, 11, 31)
        .toISOString()
        .split("T")[0];
      const startOfYearTs = new Date(currentYear, 0, 1).toISOString();
      const endOfYearTs = new Date(
        currentYear,
        11,
        31,
        23,
        59,
        59
      ).toISOString();

      const currentYearStart = startOfYear;
      const currentYTD = currentDate.toISOString().split("T")[0];

      const previousYear = currentYear - 1;
      const previousYearStart = new Date(previousYear, 0, 1)
        .toISOString()
        .split("T")[0];
      const previousYTD = new Date(
        previousYear,
        currentDate.getMonth(),
        currentDate.getDate()
      )
        .toISOString()
        .split("T")[0];

      const currentMonthStart = new Date(currentYear, currentDate.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const currentMonthEnd = new Date(
        currentYear,
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      )
        .toISOString()
        .split("T")[0];

      const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59)
        .toISOString()
        .split("T")[0];
      const previousMonthStart = new Date(
        currentYear,
        currentDate.getMonth() - 1,
        1
      )
        .toISOString()
        .split("T")[0];
      const previousMonthEnd = new Date(
        currentYear,
        currentDate.getMonth(),
        0,
        23,
        59,
        59
      )
        .toISOString()
        .split("T")[0];

      const getQuarterDates = (date: Date) => {
        const month = date.getMonth();
        const year = date.getFullYear();

        const quarter = Math.floor(month / 3);

        const quarterStartMonth = quarter * 3; // 0, 3, 6, 9
        const quarterEndMonth = quarterStartMonth + 2; // 2, 5, 8, 11

        const quarterStart = new Date(year, quarterStartMonth, 1)
          .toISOString()
          .split("T")[0];
        const quarterEnd = new Date(year, quarterEndMonth + 1, 0, 23, 59, 59)
          .toISOString()
          .split("T")[0];

        return { quarterStart, quarterEnd };
      };

      const { quarterStart, quarterEnd } = getQuarterDates(currentDate);

      const getPreviousQuarterDates = (date: Date) => {
        const month = date.getMonth();
        const year = date.getFullYear();

        const quarter = Math.floor(month / 3);

        let previousQuarter = quarter - 1;
        let previousYear = year;

        if (previousQuarter < 0) {
          previousQuarter = 3;
          previousYear = year - 1;
        }

        const previousQuarterStartMonth = previousQuarter * 3;
        const previousQuarterEndMonth = previousQuarterStartMonth + 2;

        const previousQuarterStart = new Date(
          previousYear,
          previousQuarterStartMonth,
          1
        )
          .toISOString()
          .split("T")[0];
        const previousQuarterEnd = new Date(
          previousYear,
          previousQuarterEndMonth + 1,
          0,
          23,
          59,
          59
        )
          .toISOString()
          .split("T")[0];

        return { previousQuarterStart, previousQuarterEnd };
      };

      const { previousQuarterStart, previousQuarterEnd } =
        getPreviousQuarterDates(currentDate);

      const previousYearStartForComparison = new Date(currentYear - 1, 0, 1)
        .toISOString()
        .split("T")[0];
      const previousYearEndForComparison = new Date(
        currentYear - 1,
        11,
        31,
        23,
        59,
        59
      )
        .toISOString()
        .split("T")[0];

      const previousMonthStartForComparison = new Date(
        currentYear,
        currentDate.getMonth() - 1,
        1
      )
        .toISOString()
        .split("T")[0];
      const previousMonthEndForComparison = new Date(
        currentYear,
        currentDate.getMonth(),
        0,
        23,
        59,
        59
      )
        .toISOString()
        .split("T")[0];

      const selectedCurrency =
        filters.currency && filters.currency.trim() !== ""
          ? filters.currency
          : "Currency:v1:RON";

      const isCurrencyOnlyUpdate =
        Object.keys(filters).length === 1 && filters.currency;

      const cacheKey = `currency-${selectedCurrency}`;
      const cachedData = currencyCache.get(cacheKey);

      let expensePlanResponse: any = null,
        monthlyStatsResponse: any = null,
        ytdStatsResponse: any = null,
        additionalMetricsResponse: any = null;

      if (isCurrencyOnlyUpdate) {
        if (cachedData) {
          additionalMetricsResponse = cachedData;
        } else {
          let additionalMetricsResponse;
          if (filters.period === "yearly") {
            additionalMetricsResponse = await client.request(
              GET_ADDITIONAL_DASHBOARD_METRICS_YEARLY,
              {
                selectedCurrency: selectedCurrency,
                currentYearStart: startOfYear,
                currentYearEnd: currentYearEnd,
              }
            );
          } else if (filters.period === "quarterly") {
            additionalMetricsResponse = await client.request(
              GET_ADDITIONAL_DASHBOARD_METRICS_QUARTERLY,
              {
                selectedCurrency: selectedCurrency,
                quarterStart: quarterStart,
                quarterEnd: quarterEnd,
              }
            );
          } else {
            additionalMetricsResponse = await client.request(
              GET_ADDITIONAL_DASHBOARD_METRICS_MONTHLY,
              {
                selectedCurrency: selectedCurrency,
                currentMonthStart: currentMonthStart,
                currentMonthEnd: currentMonthEnd,
              }
            );
          }

          let avgSpendPerTripResponse;
          if (filters.period === "yearly") {
            avgSpendPerTripResponse = await client.request(
              GET_AVG_SPEND_PER_TRIP_YEARLY,
              {
                selectedCurrency: selectedCurrency,
                currentYearStart: startOfYear,
                currentYearEnd: currentYearEnd,
              }
            );
          } else if (filters.period === "quarterly") {
            avgSpendPerTripResponse = await client.request(
              GET_AVG_SPEND_PER_TRIP_QUARTERLY,
              {
                selectedCurrency: selectedCurrency,
                quarterStart: quarterStart,
                quarterEnd: quarterEnd,
              }
            );
          } else {
            avgSpendPerTripResponse = await client.request(
              GET_AVG_SPEND_PER_TRIP_MONTHLY,
              {
                selectedCurrency: selectedCurrency,
                currentMonthStart: currentMonthStart,
                currentMonthEnd: currentMonthEnd,
              }
            );
          }

          additionalMetricsResponse = {
            ...additionalMetricsResponse,
            avgSpendPerTrip: avgSpendPerTripResponse.avgSpendPerTrip,
          };

          let advancePaymentsResponse;
          if (filters.period === "yearly") {
            advancePaymentsResponse = await client.request(
              GET_ADVANCE_PAYMENTS_APPROVED_YEARLY,
              {
                selectedCurrency: selectedCurrency,
                currentYearStart: new Date(currentYear, 0, 1).toISOString(),
                currentYearEnd: new Date(
                  currentYear,
                  11,
                  31,
                  23,
                  59,
                  59
                ).toISOString(),
              }
            );
          } else if (filters.period === "quarterly") {
            advancePaymentsResponse = await client.request(
              GET_ADVANCE_PAYMENTS_APPROVED_QUARTERLY,
              {
                selectedCurrency: selectedCurrency,
                quarterStart: new Date(
                  currentYear,
                  Math.floor(currentDate.getMonth() / 3) * 3,
                  1
                ).toISOString(),
                quarterEnd: new Date(
                  currentYear,
                  Math.floor(currentDate.getMonth() / 3) * 3 + 2 + 1,
                  0,
                  23,
                  59,
                  59
                ).toISOString(),
              }
            );
          } else {
            advancePaymentsResponse = await client.request(
              GET_ADVANCE_PAYMENTS_APPROVED_MONTHLY,
              {
                selectedCurrency: selectedCurrency,
                currentMonthStart: new Date(
                  currentYear,
                  currentDate.getMonth(),
                  1
                ).toISOString(),
                currentMonthEnd: new Date(
                  currentYear,
                  currentDate.getMonth() + 1,
                  0,
                  23,
                  59,
                  59
                ).toISOString(),
              }
            );
          }

          additionalMetricsResponse = {
            ...additionalMetricsResponse,
            advancePaymentsApproved:
              advancePaymentsResponse.advancePaymentsApproved,
          };

          let totalCompanySpendResponse;
          if (filters.period === "yearly") {
            totalCompanySpendResponse = await client.request(
              GET_TOTAL_COMPANY_SPEND_YEARLY,
              {
                selectedCurrency: selectedCurrency,
                yearStart: startOfYear,
                currentDate: currentDate.toISOString().split("T")[0],
                previousYearStart: previousYearStartForComparison,
                previousYearEnd: previousYearEndForComparison,
              }
            );
          } else if (filters.period === "quarterly") {
            totalCompanySpendResponse = await client.request(
              GET_TOTAL_COMPANY_SPEND_QUARTERLY,
              {
                selectedCurrency: selectedCurrency,
                quarterStart: quarterStart,
                currentDate: currentDate.toISOString().split("T")[0],
                previousQuarterStart: previousQuarterStart,
                previousQuarterEnd: previousQuarterEnd,
              }
            );
          } else {
            totalCompanySpendResponse = await client.request(
              GET_TOTAL_COMPANY_SPEND_MONTHLY,
              {
                selectedCurrency: selectedCurrency,
                currentMonthStart: currentMonthStart,
                currentDate: currentDate.toISOString().split("T")[0],
                previousMonthStart: previousMonthStartForComparison,
                previousMonthEnd: previousMonthEndForComparison,
              }
            );
          }

          additionalMetricsResponse = {
            ...additionalMetricsResponse,
            totalCompanySpend: totalCompanySpendResponse,
          };

          setCurrencyCache((prev) =>
            new Map(prev).set(cacheKey, additionalMetricsResponse)
          );
        }

        // Use existing stats for non-currency-dependent data
        expensePlanResponse = null;
        monthlyStatsResponse = null;
        ytdStatsResponse = null;
      } else {
        // Full dashboard refresh
        console.log("Full dashboard refresh");
        [
          expensePlanResponse,
          monthlyStatsResponse,
          ytdStatsResponse,
          additionalMetricsResponse,
        ] = await Promise.all([
          client.request(GET_EXPENSE_PLAN_YEARLY_TOTAL, {
            startOfYear,
            endOfYear,
            startOfYearTs,
            endOfYearTs,
          }),
          // Get spend comparison based on period
          (async () => {
            if (filters.period === "yearly") {
              return await client.request(GET_SPEND_COMPARISON_YEARLY, {
                selectedCurrency: selectedCurrency,
                currentYearStart: startOfYear,
                currentYearEnd: currentYearEnd,
                previousYearStart: previousYearStartForComparison,
                previousYearEnd: previousYearEndForComparison,
              });
            } else if (filters.period === "quarterly") {
              return await client.request(GET_SPEND_COMPARISON_QUARTERLY, {
                selectedCurrency: selectedCurrency,
                currentQuarterStart: quarterStart,
                currentQuarterEnd: quarterEnd,
                previousQuarterStart: previousQuarterStart,
                previousQuarterEnd: previousQuarterEnd,
              });
            } else {
              // monthly (default)
              return await client.request(GET_MONTHLY_SPEND_COMPARISON, {
                currentMonthStart,
                currentMonthEnd,
                previousMonthStart: previousMonthStartForComparison,
                previousMonthEnd: previousMonthEndForComparison,
                selectedCurrency: selectedCurrency,
              });
            }
          })(),
          client.request(GET_YTD_STATS, {
            currentYearStart,
            currentYTD,
            previousYearStart,
            previousYTD,
          }),
          // Get additional metrics based on period
          (async () => {
            if (filters.period === "yearly") {
              return await client.request(
                GET_ADDITIONAL_DASHBOARD_METRICS_YEARLY,
                {
                  selectedCurrency: selectedCurrency,
                  currentYearStart: startOfYear,
                  currentYearEnd: currentYearEnd,
                }
              );
            } else if (filters.period === "quarterly") {
              return await client.request(
                GET_ADDITIONAL_DASHBOARD_METRICS_QUARTERLY,
                {
                  selectedCurrency: selectedCurrency,
                  quarterStart: quarterStart,
                  quarterEnd: quarterEnd,
                }
              );
            } else {
              // monthly (default)
              return await client.request(
                GET_ADDITIONAL_DASHBOARD_METRICS_MONTHLY,
                {
                  selectedCurrency: selectedCurrency,
                  currentMonthStart: currentMonthStart,
                  currentMonthEnd: currentMonthEnd,
                }
              );
            }
          })(),
        ]);

        // Get average spend per trip based on period
        let avgSpendPerTripResponse;
        if (filters.period === "yearly") {
          avgSpendPerTripResponse = await client.request(
            GET_AVG_SPEND_PER_TRIP_YEARLY,
            {
              selectedCurrency: selectedCurrency,
              currentYearStart: startOfYear,
              currentYearEnd: currentYearEnd,
            }
          );
        } else if (filters.period === "quarterly") {
          avgSpendPerTripResponse = await client.request(
            GET_AVG_SPEND_PER_TRIP_QUARTERLY,
            {
              selectedCurrency: selectedCurrency,
              quarterStart: quarterStart,
              quarterEnd: quarterEnd,
            }
          );
        } else {
          // monthly (default)
          avgSpendPerTripResponse = await client.request(
            GET_AVG_SPEND_PER_TRIP_MONTHLY,
            {
              selectedCurrency: selectedCurrency,
              currentMonthStart: currentMonthStart,
              currentMonthEnd: currentMonthEnd,
            }
          );
        }

        // Merge the responses
        additionalMetricsResponse = {
          ...additionalMetricsResponse,
          avgSpendPerTrip: avgSpendPerTripResponse.avgSpendPerTrip,
        };

        // Get advance payments approved based on period
        let advancePaymentsResponse;
        if (filters.period === "yearly") {
          advancePaymentsResponse = await client.request(
            GET_ADVANCE_PAYMENTS_APPROVED_YEARLY,
            {
              selectedCurrency: selectedCurrency,
              currentYearStart: new Date(currentYear, 0, 1).toISOString(),
              currentYearEnd: new Date(
                currentYear,
                11,
                31,
                23,
                59,
                59
              ).toISOString(),
            }
          );
        } else if (filters.period === "quarterly") {
          advancePaymentsResponse = await client.request(
            GET_ADVANCE_PAYMENTS_APPROVED_QUARTERLY,
            {
              selectedCurrency: selectedCurrency,
              quarterStart: new Date(
                currentYear,
                Math.floor(currentDate.getMonth() / 3) * 3,
                1
              ).toISOString(),
              quarterEnd: new Date(
                currentYear,
                Math.floor(currentDate.getMonth() / 3) * 3 + 2 + 1,
                0,
                23,
                59,
                59
              ).toISOString(),
            }
          );
        } else {
          // monthly (default)
          advancePaymentsResponse = await client.request(
            GET_ADVANCE_PAYMENTS_APPROVED_MONTHLY,
            {
              selectedCurrency: selectedCurrency,
              currentMonthStart: new Date(
                currentYear,
                currentDate.getMonth(),
                1
              ).toISOString(),
              currentMonthEnd: new Date(
                currentYear,
                currentDate.getMonth() + 1,
                0,
                23,
                59,
                59
              ).toISOString(),
            }
          );
        }

        additionalMetricsResponse = {
          ...additionalMetricsResponse,
          advancePaymentsApproved:
            advancePaymentsResponse.advancePaymentsApproved,
        };

        let totalCompanySpendResponse;
        if (filters.period === "yearly") {
          totalCompanySpendResponse = await client.request(
            GET_TOTAL_COMPANY_SPEND_YEARLY,
            {
              selectedCurrency: selectedCurrency,
              yearStart: startOfYear,
              currentDate: currentDate.toISOString().split("T")[0],
              previousYearStart: previousYearStartForComparison,
              previousYearEnd: previousYearEndForComparison,
            }
          );
        } else if (filters.period === "quarterly") {
          totalCompanySpendResponse = await client.request(
            GET_TOTAL_COMPANY_SPEND_QUARTERLY,
            {
              selectedCurrency: selectedCurrency,
              quarterStart: quarterStart,
              currentDate: currentDate.toISOString().split("T")[0],
              previousQuarterStart: previousQuarterStart,
              previousQuarterEnd: previousQuarterEnd,
            }
          );
        } else {
          // monthly (default)
          totalCompanySpendResponse = await client.request(
            GET_TOTAL_COMPANY_SPEND_MONTHLY,
            {
              selectedCurrency: selectedCurrency,
              currentMonthStart: currentMonthStart,
              currentDate: currentDate.toISOString().split("T")[0],
              previousMonthStart: previousMonthStartForComparison,
              previousMonthEnd: previousMonthEndForComparison,
            }
          );
        }

        additionalMetricsResponse = {
          ...additionalMetricsResponse,
          totalCompanySpend: totalCompanySpendResponse,
        };
      }

      const monthlyTrendsResponse = Array.from({ length: 12 }, (_, index) => ({
        ExpenseRequestAggregate: {
          aggregate: {
            sum: { totalAmount: 0 },
            count: 0,
          },
        },
      }));

      const processedStats: DashboardStats = isCurrencyOnlyUpdate
        ? {
            ...stats,
            transferRequired:
              additionalMetricsResponse?.transferRequired?.aggregate?.sum
                ?.totalAmount || 0,
            pendingRequestsCount:
              additionalMetricsResponse?.pendingRequests?.aggregate?.count || 0,
            avgSpendPerTrip:
              additionalMetricsResponse?.avgSpendPerTrip?.aggregate?.avg
                ?.totalAmount || 0,
            advancePaymentsApproved: {
              count:
                additionalMetricsResponse?.advancePaymentsApproved?.aggregate
                  ?.count || 0,
              totalAmount:
                additionalMetricsResponse?.advancePaymentsApproved?.aggregate
                  ?.sum?.amount || 0,
            },
            totalCompanySpend: {
              currentPeriodTotal:
                additionalMetricsResponse?.totalCompanySpend?.currentPeriodSpend
                  ?.aggregate?.sum?.totalAmount || 0,
              previousPeriodTotal:
                additionalMetricsResponse?.totalCompanySpend
                  ?.previousPeriodSpend?.aggregate?.sum?.totalAmount || 0,
              currentPeriodCount:
                additionalMetricsResponse?.totalCompanySpend?.currentPeriodSpend
                  ?.aggregate?.count || 0,
              previousPeriodCount:
                additionalMetricsResponse?.totalCompanySpend
                  ?.previousPeriodSpend?.aggregate?.count || 0,
              percentChange: 0, // Will be calculated below
              isIncrease: false, // Will be calculated below
            },
          }
        : {
            expensePlanYearly: {
              totalAmount:
                expensePlanResponse?.ExpensePlanAggregate?.aggregate?.sum
                  ?.totalAmount || 0,
              count: expensePlanResponse?.ExpensePlan?.length || 0,
            },
            ytdStats: {
              totalAmount:
                ytdStatsResponse?.currentYearExpenses?.aggregate?.sum
                  ?.totalAmount || 0,
              count:
                ytdStatsResponse?.currentYearExpenses?.aggregate?.count || 0,
              previousTotalAmount:
                ytdStatsResponse?.previousYearExpenses?.aggregate?.sum
                  ?.totalAmount || 0,
              previousCount:
                ytdStatsResponse?.previousYearExpenses?.aggregate?.count || 0,
            },
            monthlyTrends: monthlyTrendsResponse.map(
              (response: any, index: number) => ({
                month: index + 1,
                monthName: new Date(currentYear, index).toLocaleString(
                  "default",
                  {
                    month: "short",
                  }
                ),
                totalAmount: 0,
                count: 0,
              })
            ),
            monthlySpendComparison: {
              currentMonthTotal:
                monthlyStatsResponse?.currentMonthExpenses?.aggregate?.sum
                  ?.totalAmount ||
                monthlyStatsResponse?.currentYearExpenses?.aggregate?.sum
                  ?.totalAmount ||
                monthlyStatsResponse?.currentQuarterExpenses?.aggregate?.sum
                  ?.totalAmount ||
                0,
              previousMonthTotal:
                monthlyStatsResponse?.previousMonthExpenses?.aggregate?.sum
                  ?.totalAmount ||
                monthlyStatsResponse?.previousYearExpenses?.aggregate?.sum
                  ?.totalAmount ||
                monthlyStatsResponse?.previousQuarterExpenses?.aggregate?.sum
                  ?.totalAmount ||
                0,
              currentMonthCount:
                monthlyStatsResponse?.currentMonthExpenses?.aggregate?.count ||
                monthlyStatsResponse?.currentYearExpenses?.aggregate?.count ||
                monthlyStatsResponse?.currentQuarterExpenses?.aggregate
                  ?.count ||
                0,
              previousMonthCount:
                monthlyStatsResponse?.previousMonthExpenses?.aggregate?.count ||
                monthlyStatsResponse?.previousYearExpenses?.aggregate?.count ||
                monthlyStatsResponse?.previousQuarterExpenses?.aggregate
                  ?.count ||
                0,
              percentChange: 0, // Will be calculated below
              isIncrease: false, // Will be calculated below
            },
            transferRequired:
              additionalMetricsResponse?.transferRequired?.aggregate?.sum
                ?.totalAmount || 0,
            pendingRequestsCount:
              additionalMetricsResponse?.pendingRequests?.aggregate?.count || 0,
            avgSpendPerTrip:
              additionalMetricsResponse?.avgSpendPerTrip?.aggregate?.avg
                ?.totalAmount || 0,
            travelExpensesCount: 0, // Not available in current query
            advancePaymentsApproved: {
              count:
                additionalMetricsResponse?.advancePaymentsApproved?.aggregate
                  ?.count || 0,
              totalAmount:
                additionalMetricsResponse?.advancePaymentsApproved?.aggregate
                  ?.sum?.amount || 0,
            },
            totalCompanySpend: {
              currentPeriodTotal:
                additionalMetricsResponse?.totalCompanySpend?.currentPeriodSpend
                  ?.aggregate?.sum?.totalAmount || 0,
              previousPeriodTotal:
                additionalMetricsResponse?.totalCompanySpend
                  ?.previousPeriodSpend?.aggregate?.sum?.totalAmount || 0,
              currentPeriodCount:
                additionalMetricsResponse?.totalCompanySpend?.currentPeriodSpend
                  ?.aggregate?.count || 0,
              previousPeriodCount:
                additionalMetricsResponse?.totalCompanySpend
                  ?.previousPeriodSpend?.aggregate?.count || 0,
              percentChange: 0, // Will be calculated below
              isIncrease: false, // Will be calculated below
            },
          };

      if (!isCurrencyOnlyUpdate) {
        const currentTotal =
          processedStats.monthlySpendComparison.currentMonthTotal;
        const previousTotal =
          processedStats.monthlySpendComparison.previousMonthTotal;
        if (previousTotal > 0) {
          processedStats.monthlySpendComparison.percentChange =
            ((currentTotal - previousTotal) / previousTotal) * 100;
          processedStats.monthlySpendComparison.isIncrease =
            currentTotal > previousTotal;
        }

        const currentCompanyTotal =
          processedStats.totalCompanySpend.currentPeriodTotal;
        const previousCompanyTotal =
          processedStats.totalCompanySpend.previousPeriodTotal;

        if (previousCompanyTotal > 0) {
          processedStats.totalCompanySpend.percentChange =
            ((currentCompanyTotal - previousCompanyTotal) /
              previousCompanyTotal) *
            100;
          processedStats.totalCompanySpend.isIncrease =
            currentCompanyTotal > previousCompanyTotal;
        }
      }

      setStats(processedStats);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      console.error("Error details:", {
        message: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        filters: filters,
      });
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch dashboard stats")
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, client, filters.currency, filters.period]);

  useEffect(() => {
    fetchEssentialStats();
  }, [fetchEssentialStats]);

  return { stats, loading, error, refetch: fetchEssentialStats };
};

export default useDashboardStats;
