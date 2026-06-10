import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale, getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { GET_EXPENSE_PLANS_BY_USER, GET_EXPENSE_PLAN_DETAILS } from '../queries/RequestAdvancePaymentQueries'

export interface ExpensePlan {
  id: string
  code: string
  title: string
  status: string
  totalAmountExpense?: number
  totalAmount?: number
  totalRemainingAmount?: number
  costCenterId?: string
  requestType?: {
    value: string
    translations: Array<{
      localeCode: string
      value: string
    }>
    catalog: {
      defaultLocale: string
    }
  }
  currency?: {
    id: string
    code: string
  }
  currencyRef?: string
}

export interface Currency {
  id: string
  code: string
  name: string
}

export interface CostCenter {
  id: string
  name: string
  code?: string
}

export interface PaymentMethod {
  id: string
  name: string
  code: string
}

export interface FetchExpensePlanDetailsOptions {
  onLoaded?: (plan: ExpensePlan) => void
}

export interface UseRequestAdvancePaymentDataReturn {
  expensePlans: ExpensePlan[]
  currencies: Currency[]
  costCenters: CostCenter[]
  paymentMethods: PaymentMethod[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  fetchExpensePlanDetails: (planId: string, options?: FetchExpensePlanDetailsOptions) => Promise<void>
}

// Constants to avoid duplication
const FALLBACK_CURRENCIES: Currency[] = [
  { id: 'EUR', code: 'EUR', name: 'EUR' },
  { id: 'USD', code: 'USD', name: 'USD' },
  { id: 'GBP', code: 'GBP', name: 'GBP' },
  { id: 'CHF', code: 'CHF', name: 'CHF' }
]

export const useRequestAdvancePaymentData = (context: BusinessAppContextProps): UseRequestAdvancePaymentDataReturn => {
  const [expensePlans, setExpensePlans] = useState<ExpensePlan[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchExpensePlansAndCostCenters = useCallback(async () => {
    if (!context.accessToken || !context.userInfo?.employeeDetails?.employeeId) {
      return
    }

    try {
      const structureId = getCurrentActiveStructureId()
      const employeeId = context.userInfo.employeeDetails.employeeId

      const activeUserLocale = getCurrentActiveUserLocale()

      const response = await graphqlClient.request(GET_EXPENSE_PLANS_BY_USER, {
        status: ['APPROVED', 'ASSIGNED'],
        structureId,
        employeeId,
        activeUserLocale
      })

      if (response?.ExpensePlan && response.ExpensePlan.length > 0) {
        // Filter plans to only include APPROVED and ASSIGNED status
        const filteredPlans = response.ExpensePlan.filter(
          (plan: any) => plan.status === 'APPROVED' || plan.status === 'ASSIGNED'
        )
        setExpensePlans(filteredPlans)
      } else {
        console.log('No expense plans found with APPROVED or ASSIGNED status')
      }

      if (response?.CostCenter) {
        setCostCenters(response.CostCenter)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expense plans and cost centers')
    }
  }, [graphqlClient, context.accessToken, context.userInfo?.employeeDetails?.employeeId])

  const fetchExpensePlanDetails = useCallback(
    async (planId: string, options?: FetchExpensePlanDetailsOptions) => {
      if (!context.accessToken) {
        return
      }

      try {
        const activeUserLocale = getCurrentActiveUserLocale()

        const response = await graphqlClient.request(GET_EXPENSE_PLAN_DETAILS, {
          planId,
          activeUserLocale
        })

        if (response?.ExpensePlan && response.ExpensePlan.length > 0) {
          const planDetails = response.ExpensePlan[0] as ExpensePlan
          options?.onLoaded?.(planDetails)
        }
      } catch (err) {
        console.error('Error fetching expense plan details:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch expense plan details')
      }
    },
    [graphqlClient, context.accessToken]
  )

  const fetchCurrencies = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Currency',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false
        }
      )

      // Handle the response based on the actual structure
      const catalogEntries =
        (response as any)?.catalogEntries || (response as any)?.data?.catalogEntries || response?.data || []

      if (catalogEntries.length > 0) {
        const currencyOptions: Currency[] = catalogEntries.map((entry: any) => ({
          id: entry.id,
          code: entry.value || entry.code || entry.name,
          name: entry.value || entry.code || entry.name
        }))
        setCurrencies(currencyOptions)
      } else {
        // Fallback to common currencies if catalog is empty
        setCurrencies(FALLBACK_CURRENCIES)
      }
    } catch (err) {
      console.error('Error fetching currencies:', err)
      // Fallback to common currencies on error
      setCurrencies(FALLBACK_CURRENCIES)
    }
  }, [catalogClient, context.accessToken])

  const fetchPaymentMethods = useCallback(async () => {
    // No PaymentMethod catalog — fixed codes; labels come from i18n via getPaymentMethodDisplay
    const paymentMethodOptions: PaymentMethod[] = [
      { id: 'DIRECT_DEPOSIT', name: 'DIRECT_DEPOSIT', code: 'DIRECT_DEPOSIT' },
      { id: 'CASH_PAYMENT', name: 'CASH_PAYMENT', code: 'CASH_PAYMENT' }
    ]

    setPaymentMethods(paymentMethodOptions)
  }, [])

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Missing access token')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Only fetch basic data initially - expense plans list, currencies, cost centers, and payment methods
      // Detailed plan data will be fetched when a plan is selected
      await Promise.all([fetchExpensePlansAndCostCenters(), fetchCurrencies(), fetchPaymentMethods()])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchExpensePlansAndCostCenters, fetchCurrencies, fetchPaymentMethods])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    expensePlans,
    currencies,
    costCenters,
    paymentMethods,
    isLoading,
    error,
    refetch: loadData,
    fetchExpensePlanDetails
  }
}
