import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface CurrencyCount {
  currency: string;
  count: number;
}

interface CurrencyDetectionResponse {
  managerPlans: {
    id: string;
    currencyRef: string;
  }[];
  allPlans: {
    id: string;
    currencyRef: string;
  }[];
}

const GET_CURRENCY_DISTRIBUTION = `
  query GetCurrencyDistribution($managerId: uuid!) {
    # Get all plans for the manager to analyze currency distribution
    managerPlans: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      id
      currencyRef
    }
    # Debug: Get all plans without manager filtering
    allPlans: ExpensePlan(
      where: {
        isDeleted: {_eq: false}
      }
    ) {
      id
      currencyRef
    }
  }
`;

export const useExpensePlanCurrencies = (
  context: BusinessAppContextProps,
  managerId: string
) => {
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string>("EUR"); // Default fallback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const detectMostUsedCurrency = useCallback(async () => {
    if (!managerId || !context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await graphqlClient.request<CurrencyDetectionResponse>(
        GET_CURRENCY_DISTRIBUTION,
        { managerId }
      );

      if (result?.managerPlans && result?.allPlans) {
        // Helper function to count currencies from plans
        const countCurrencies = (
          plans: { currencyRef: string }[]
        ): CurrencyCount[] => {
          const currencyMap = new Map<string, number>();

          plans.forEach((plan) => {
            if (plan.currencyRef) {
              const currency = plan.currencyRef.replace("Currency:v1:", "");
              currencyMap.set(currency, (currencyMap.get(currency) || 0) + 1);
            }
          });

          return Array.from(currencyMap.entries()).map(([currency, count]) => ({
            currency,
            count,
          }));
        };

        const managerPlansCurrencyCounts = countCurrencies(result.managerPlans);
        const allPlansCurrencyCounts = countCurrencies(result.allPlans);

        // Sort by count (descending) and get the most used currency
        if (managerPlansCurrencyCounts.length > 0) {
          managerPlansCurrencyCounts.sort((a, b) => b.count - a.count);
          const detectedCurrency = managerPlansCurrencyCounts[0].currency;

          // Extract the actual currency code (e.g., "Currency:v1:EUR" -> "EUR")
          const currencyCode = detectedCurrency.split(":").pop() || "EUR";
          setMostUsedCurrency(currencyCode);
        } else {
          setMostUsedCurrency("EUR");
        }
      } else {
        setMostUsedCurrency("EUR");
      }
    } catch (err) {
      console.error("Error detecting most used currency:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to detect currency")
      );
      setMostUsedCurrency("EUR"); // Fallback to EUR on error
    } finally {
      setIsLoading(false);
    }
  }, [managerId, context.accessToken, graphqlClient]);

  useEffect(() => {
    detectMostUsedCurrency();
  }, [detectMostUsedCurrency]);

  return {
    mostUsedCurrency,
    isLoading,
    error,
    refetch: detectMostUsedCurrency,
  };
};
