import { useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { useCurrencyStore } from '../store/useCurrencyStore';

const GET_MOST_USED_CURRENCY = `
  query GetMostUsedCurrency($managerId: uuid!) {
    # Get most used currency from advance payments
    advancePaymentCurrencies: AdvancePaymentAggregate(
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
      groupBy {
        currencyRef
      }
      aggregate {
        count
      }
    }
    
    # Get most used currency from expense requests
    expenseRequestCurrencies: ExpenseRequestAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      groupBy {
        currencyRef
      }
      aggregate {
        count
      }
    }
    
    # Get most used currency from expense plans
    expensePlanCurrencies: ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      groupBy {
        currencyRef
      }
      aggregate {
        count
      }
    }
  }
`;

interface CurrencyCount {
  currencyRef: string;
  count: number;
}

interface CurrencyResponse {
  advancePaymentCurrencies?: {
    groupBy: {
      currencyRef: string;
    };
    aggregate: {
      count: number;
    };
  }[];
  expenseRequestCurrencies?: {
    groupBy: {
      currencyRef: string;
    };
    aggregate: {
      count: number;
    };
  }[];
  expensePlanCurrencies?: {
    groupBy: {
      currencyRef: string;
    };
    aggregate: {
      count: number;
    };
  }[];
}

/**
 * Hook to fetch and manage the most used currency across the manager-expenses app
 */
export const useAppCurrency = ({ accessToken, userInfo }: BusinessAppContextProps) => {
  const { primaryCurrency, setPrimaryCurrency, isLoaded, setIsLoaded } = useCurrencyStore();
  
  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000";
  
  const fetchMostUsedCurrency = useCallback(async () => {
    if (!accessToken || !managerId || isLoaded) {
      return;
    }

    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MOST_USED_CURRENCY,
          variables: { managerId }
        })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        console.error('Error fetching currency data:', result.errors[0].message);
        return;
      }
      
      const data = result.data as CurrencyResponse;
      
      // Combine all currency counts from different sources
      const currencyCounts: CurrencyCount[] = [];
      
      // Process advance payment currencies
      if (data.advancePaymentCurrencies) {
        data.advancePaymentCurrencies.forEach(item => {
          if (item.groupBy.currencyRef) {
            const existingCurrency = currencyCounts.find(c => c.currencyRef === item.groupBy.currencyRef);
            if (existingCurrency) {
              existingCurrency.count += item.aggregate.count;
            } else {
              currencyCounts.push({
                currencyRef: item.groupBy.currencyRef,
                count: item.aggregate.count
              });
            }
          }
        });
      }
      
      // Process expense request currencies
      if (data.expenseRequestCurrencies) {
        data.expenseRequestCurrencies.forEach(item => {
          if (item.groupBy.currencyRef) {
            const existingCurrency = currencyCounts.find(c => c.currencyRef === item.groupBy.currencyRef);
            if (existingCurrency) {
              existingCurrency.count += item.aggregate.count;
            } else {
              currencyCounts.push({
                currencyRef: item.groupBy.currencyRef,
                count: item.aggregate.count
              });
            }
          }
        });
      }
      
      // Process expense plan currencies
      if (data.expensePlanCurrencies) {
        data.expensePlanCurrencies.forEach(item => {
          if (item.groupBy.currencyRef) {
            const existingCurrency = currencyCounts.find(c => c.currencyRef === item.groupBy.currencyRef);
            if (existingCurrency) {
              existingCurrency.count += item.aggregate.count;
            } else {
              currencyCounts.push({
                currencyRef: item.groupBy.currencyRef,
                count: item.aggregate.count
              });
            }
          }
        });
      }
      
      // Sort by count in descending order
      currencyCounts.sort((a, b) => b.count - a.count);
      
      // Use the most frequent currency or default to EUR
      const mostUsedCurrency = currencyCounts.length > 0 ? currencyCounts[0].currencyRef : 'EUR';
      
      console.log('Most used currency determined:', mostUsedCurrency);
      setPrimaryCurrency(mostUsedCurrency);
      setIsLoaded(true);
      
    } catch (err) {
      console.error('Error fetching most used currency:', err);
      // Keep the default currency in case of error
    }
  }, [accessToken, managerId, isLoaded, setPrimaryCurrency, setIsLoaded]);

  useEffect(() => {
    fetchMostUsedCurrency();
  }, [fetchMostUsedCurrency]);

  return {
    primaryCurrency,
    isLoaded
  };
};
