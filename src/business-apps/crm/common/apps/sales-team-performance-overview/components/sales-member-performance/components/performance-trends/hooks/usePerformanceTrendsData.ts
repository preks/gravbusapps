import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { TimeFilter } from "../PerformanceTrendsChart";

export interface PerformanceTrendsDataPoint {
  period: string; // ISO date string
  convertedLeads: number;
  contactsWithAccounts: number;
  wonOpportunities: number;
  managedAccounts: number;
  totalSales: number; // Sales amount in EUR
}

export interface UsePerformanceTrendsDataResult {
  trendsData: PerformanceTrendsDataPoint[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// GraphQL query for time-series performance data
const GET_PERFORMANCE_TRENDS = `
  query GetPerformanceTrends($employeeId: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
    # Converted leads by month
    leadTrends: Lead(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: $employeeId }
        leadStatus: { code: { _eq: "CONVERTED" } }
        createdAt: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      id
      createdAt
    }
    
    # Contacts with accounts by month
    contactTrends: Contact(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: $employeeId }
        accountId: { _isNull: false }
        createdAt: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      id
      createdAt
    }
    
    # Won opportunities by month
    opportunityTrends: Opportunity(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: $employeeId }
        opportunityStatus: { code: { _eq: "WON" } }
        createdAt: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      id
      createdAt
      closeDate
      estimatedAmount
    }
    
    # Managed accounts by month
    accountTrends: Account(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      id
      createdAt
    }
  }
`;

interface TrendsResponse {
  leadTrends: Array<{ id: string; createdAt: string }>;
  contactTrends: Array<{ id: string; createdAt: string }>;
  opportunityTrends: Array<{
    id: string;
    createdAt: string;
    closeDate?: string;
    estimatedAmount?: number;
  }>;
  accountTrends: Array<{ id: string; createdAt: string }>;
}

export const usePerformanceTrendsData = (
  context: BusinessAppContextProps,
  timeFilter: TimeFilter,
  employeeId: string
): UsePerformanceTrendsDataResult => {
  const [trendsData, setTrendsData] = useState<PerformanceTrendsDataPoint[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  // Calculate date range based on time filter
  const getDateRange = useCallback(
    (filter: TimeFilter): { startDate: Date; endDate: Date } => {
      const endDate = new Date();
      const startDate = new Date();

      switch (filter) {
        case "month":
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "sixMonths":
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case "historical":
          startDate.setFullYear(endDate.getFullYear() - 3); // 3 years of data
          break;
      }

      return { startDate, endDate };
    },
    []
  );

  // Group data by time periods
  const groupDataByPeriod = useCallback(
    (
      data: TrendsResponse,
      timeFilter: TimeFilter
    ): PerformanceTrendsDataPoint[] => {
      const { startDate, endDate } = getDateRange(timeFilter);
      const periodMap = new Map<string, PerformanceTrendsDataPoint>();

      // Generate time periods based on filter
      const generatePeriods = () => {
        const periods: string[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
          let periodKey: string;

          if (timeFilter === "month") {
            // Daily periods for last month
            periodKey = current.toISOString().split("T")[0];
            current.setDate(current.getDate() + 1);
          } else {
            // Monthly periods for other filters
            periodKey = `${current.getFullYear()}-${String(
              current.getMonth() + 1
            ).padStart(2, "0")}-01`;
            current.setMonth(current.getMonth() + 1);
          }

          periods.push(periodKey);
          periodMap.set(periodKey, {
            period: periodKey,
            convertedLeads: 0,
            contactsWithAccounts: 0,
            wonOpportunities: 0,
            managedAccounts: 0,
            totalSales: 0,
          });
        }

        return periods;
      };

      generatePeriods();

      // Helper function to get period key from date
      const getPeriodKey = (dateStr: string): string => {
        const date = new Date(dateStr);
        if (timeFilter === "month") {
          return date.toISOString().split("T")[0];
        } else {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}-01`;
        }
      };

      // Process converted leads
      data.leadTrends.forEach((lead) => {
        const periodKey = getPeriodKey(lead.createdAt);
        const period = periodMap.get(periodKey);
        if (period) {
          period.convertedLeads++;
        }
      });

      // Process contacts with accounts
      data.contactTrends.forEach((contact) => {
        const periodKey = getPeriodKey(contact.createdAt);
        const period = periodMap.get(periodKey);
        if (period) {
          period.contactsWithAccounts++;
        }
      });

      // Process won opportunities (use close date if available, otherwise created date)
      data.opportunityTrends.forEach((opportunity) => {
        const dateToUse = opportunity.closeDate || opportunity.createdAt;
        const periodKey = getPeriodKey(dateToUse);
        const period = periodMap.get(periodKey);
        if (period) {
          period.wonOpportunities++;
          // Add estimated amount to total sales for this period
          if (opportunity.estimatedAmount) {
            period.totalSales += opportunity.estimatedAmount;
          }
        }
      });

      // Process managed accounts
      data.accountTrends.forEach((account) => {
        const periodKey = getPeriodKey(account.createdAt);
        const period = periodMap.get(periodKey);
        if (period) {
          period.managedAccounts++;
        }
      });

      return Array.from(periodMap.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      );
    },
    [getDateRange]
  );

  const fetchTrendsData = useCallback(
    async (employeeId: string) => {
      if (!context.accessToken || !employeeId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { startDate, endDate } = getDateRange(timeFilter);

        const response = await graphqlClient.request<TrendsResponse>(
          GET_PERFORMANCE_TRENDS,
          {
            employeeId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        );

        const groupedData = groupDataByPeriod(response, timeFilter);
        setTrendsData(groupedData);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch trends data")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      context.accessToken,
      timeFilter,
      graphqlClient,
      getDateRange,
      groupDataByPeriod,
    ]
  );

  const refetch = useCallback(() => {
    if (employeeId) {
      fetchTrendsData(employeeId);
    }
  }, [employeeId, fetchTrendsData]);

  useEffect(() => {
    if (employeeId) {
      fetchTrendsData(employeeId);
    }
  }, [employeeId, fetchTrendsData]);

  return {
    trendsData,
    isLoading,
    error,
    refetch,
  };
};
