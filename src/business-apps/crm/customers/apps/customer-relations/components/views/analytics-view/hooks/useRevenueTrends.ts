import { useState, useEffect } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface RevenueTrendData {
  month: string;
  pipelineRevenue: number;
  wonRevenue: number;
  opportunities: number;
}

export type TimeFilter =
  | "month"
  | "quarter"
  | "sixMonths"
  | "year"
  | "historical";

export const useRevenueTrends = (
  accessToken: string,
  timeFilter: TimeFilter = "sixMonths",
  selectedPipelineId?: string
) => {
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchRevenueTrends = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Generate time periods based on the selected filter
        const periods = generateTimePeriods(timeFilter);

        // Add pipeline filter to the where condition if specified
        const pipelineFilter = selectedPipelineId
          ? `salesPipeline: {id: {_eq: "${selectedPipelineId}"}}`
          : "";
        const baseWhere = `isDeleted: {_eq: false}${
          pipelineFilter ? ", " + pipelineFilter : ""
        }`;

        const queries = periods.map(
          (period, index) => `
          period${index}: OpportunityAggregate(
            where: {
              ${baseWhere}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }
          
          wonPeriod${index}: OpportunityAggregate(
            where: {
              ${baseWhere}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              opportunityStatus: {code: {_eq: "WON"}}
            }
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }
        `
        );

        const query = `
          query GetRevenueTrends {
            ${queries.join("\n")}
          }
        `;

        const result = await graphqlClient.request(query);
        const trends = periods.map((period, index) => {
          const totalAmount =
            result[`period${index}`]?.aggregate?.sum?.estimatedAmount || 0;
          const wonAmount =
            result[`wonPeriod${index}`]?.aggregate?.sum?.estimatedAmount || 0;

          return {
            month: period.label,
            pipelineRevenue: totalAmount - wonAmount, // Active pipeline revenue (excluding won deals)
            wonRevenue: wonAmount,
            opportunities: result[`period${index}`]?.aggregate?.count || 0,
          };
        });

        setRevenueTrends(trends);
      } catch (err) {
        // Error handled by state management
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchRevenueTrends();
    }
  }, [accessToken, graphqlClient, timeFilter, selectedPipelineId]);

  return { revenueTrends, isLoading, error };
};

// Helper function to generate time periods based on filter
function generateTimePeriods(timeFilter: TimeFilter) {
  const currentDate = new Date();
  const periods = [];

  switch (timeFilter) {
    case "month":
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - (i * 7 + 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `Week ${4 - i}`,
        });
      }
      break;

    case "quarter":
      // Last 3 months
      for (let i = 2; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthStart = date.toISOString();
        const monthEnd = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        ).toISOString();
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName,
        });
      }
      break;

    case "sixMonths":
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthStart = date.toISOString();
        const monthEnd = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        ).toISOString();
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName,
        });
      }
      break;

    case "year":
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthStart = date.toISOString();
        const monthEnd = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        ).toISOString();
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName,
        });
      }
      break;

    case "historical":
      // Last 24 months
      for (let i = 23; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthStart = date.toISOString();
        const monthEnd = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        ).toISOString();
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName,
        });
      }
      break;

    default:
      // Default to 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthStart = date.toISOString();
        const monthEnd = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        ).toISOString();
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName,
        });
      }
  }

  return periods;
}
