import { useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { env } from "@/common/env/EnvUtils";
import { useCurrencyStore } from "../store/useCurrencyStore";
import { extractCurrencyCode } from "../utils/currencyUtils";

const GET_MOST_USED_CURRENCY = `
  query GetMostUsedCurrency($managerId: uuid!) {
    # Get most used currency from advance payments
    advancePaymentCurrencies: AdvancePayment(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        }
      }
    ) {
      currencyRef
    }
    
    # Get most used currency from expense requests
    expenseRequestCurrencies: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      currencyRef
    }
    
    # Get most used currency from expense plans
    expensePlanCurrencies: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      currencyRef
    }
  }
`;

interface CurrencyCount {
  currencyRef: string;
  count: number;
}

interface CurrencyResponse {
  advancePaymentCurrencies?: {
    currencyRef: string;
  }[];
  expenseRequestCurrencies?: {
    currencyRef: string;
  }[];
  expensePlanCurrencies?: {
    currencyRef: string;
  }[];
}

/**
 * Hook to fetch and manage the most used currency across the manager-expenses app
 */
export const useAppCurrency = ({ accessToken, userInfo }: BusinessAppContextProps) => {
  const {
    primaryCurrency,
    setPrimaryCurrency,
    isLoading,
    setLoading,
    isUserSelected,
    setMostUsedCurrency,
    isInitialized,
  } = useCurrencyStore();

  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000";

  const fetchMostUsedCurrency = useCallback(async () => {
    // Don't fetch if user has already selected a currency or if already initialized
    if (!accessToken || !managerId || (isInitialized && isUserSelected)) {
      return;
    }

    // Set loading state
    setLoading(true);

    try {
      const response = await fetch(env("NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK")!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_MOST_USED_CURRENCY,
          variables: { managerId },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error("Error fetching currency data:", result.errors[0].message);
        return;
      }

      const data = result.data as CurrencyResponse;

      // Extract all currency references and count occurrences
      const allCurrencyRefs: string[] = [];

      // Process advance payment currencies
      if (data.advancePaymentCurrencies) {
        data.advancePaymentCurrencies.forEach((item) => {
          if (item.currencyRef) {
            allCurrencyRefs.push(item.currencyRef);
          }
        });
      }

      // Process expense request currencies
      if (data.expenseRequestCurrencies) {
        data.expenseRequestCurrencies.forEach((item) => {
          if (item.currencyRef) {
            allCurrencyRefs.push(item.currencyRef);
          }
        });
      }

      // Process expense plan currencies
      if (data.expensePlanCurrencies) {
        data.expensePlanCurrencies.forEach((item) => {
          if (item.currencyRef) {
            allCurrencyRefs.push(item.currencyRef);
          }
        });
      }

      // Count occurrences of each currency
      const currencyMap = new Map<string, number>();
      allCurrencyRefs.forEach((ref) => {
        const extractedCode = extractCurrencyCode(ref);
        if (extractedCode) {
          currencyMap.set(extractedCode, (currencyMap.get(extractedCode) || 0) + 1);
        }
      });

      // Convert to array of CurrencyCount objects
      const currencyCounts: CurrencyCount[] = Array.from(currencyMap.entries()).map(
        ([currencyRef, count]) => ({
          currencyRef,
          count,
        }),
      );

      // Sort by count in descending order
      currencyCounts.sort((a, b) => b.count - a.count);

      // Use the most frequent currency or default to EUR
      const mostUsedCurrency = currencyCounts.length > 0 ? currencyCounts[0].currencyRef : "EUR";

      // Update both the most used currency and primary currency in the store
      setMostUsedCurrency(mostUsedCurrency);

      // Only set primary currency if user hasn't made a selection
      if (!isUserSelected) {
        setPrimaryCurrency(mostUsedCurrency);
      }

      // Mark as no longer loading
      setLoading(false);
    } catch (err) {
      console.error("Error fetching most used currency:", err);
      // Keep the default currency in case of error
      setLoading(false);
    }
  }, [
    accessToken,
    managerId,
    isInitialized,
    isUserSelected,
    setPrimaryCurrency,
    setMostUsedCurrency,
    setLoading,
  ]);

  useEffect(() => {
    fetchMostUsedCurrency();
  }, [fetchMostUsedCurrency]);

  return {
    primaryCurrency,
    isLoading,
  };
};
