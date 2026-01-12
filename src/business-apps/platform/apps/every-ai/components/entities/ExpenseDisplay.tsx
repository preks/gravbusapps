import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface ExpenseDisplayProps {
  expenseId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  entityType?: 'expense_request' | 'expense_item' | 'expense_plan'
}

interface Expense {
  id: string
  title: string
  code?: string
  totalAmount?: number
  currency?: string
  currencyRef?: string
  status?: string
  submissionDate?: string
  expenseDate?: string
  requestDate?: string
  planDate?: string
  startDate?: string
  endDate?: string
}

export const ExpenseDisplay: React.FC<ExpenseDisplayProps> = ({ expenseId, accessToken, operation, entityType }) => {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detectedType, setDetectedType] = useState<'ExpenseRequest' | 'ExpensePlan' | 'ExpenseItem' | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchExpense = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Try all three expense types: ExpenseRequest, ExpensePlan, ExpenseItem
        let query: string
        let resultKey: string

        console.log('Fetching expense with ID:', expenseId, 'Type:', entityType || 'auto-detect')

        // First, try to fetch as ExpenseRequest
        query = `
          query GetExpenseRequest($id: uuid!) {
            ExpenseRequest(where: {id: {_eq: $id}, isDeleted: {_eq: false}}) {
              id
              title
              totalAmount
              currencyRef
              status
              requestDate
              code
              startDate
              endDate
            }
          }
        `
        resultKey = 'ExpenseRequest'
        let result = await graphqlClient.request<{
          ExpenseRequest?: Expense[]
          ExpensePlan?: Expense[]
          ExpenseItem?: Expense[]
        }>(query, { id: expenseId })
        console.log('ExpenseRequest query result:', result)

        // If no ExpenseRequest found, try ExpensePlan
        if (!result.ExpenseRequest || result.ExpenseRequest.length === 0) {
          console.log('Not found as ExpenseRequest, trying ExpensePlan...')
          query = `
            query GetExpensePlan($id: uuid!) {
              ExpensePlan(where: {id: {_eq: $id}, isDeleted: {_eq: false}}) {
                id
                title
                totalAmount
                currencyRef
                status
                planDate
                code
                startDate
                endDate
              }
            }
          `
          resultKey = 'ExpensePlan'
          result = await graphqlClient.request<{
            ExpenseRequest?: Expense[]
            ExpensePlan?: Expense[]
            ExpenseItem?: Expense[]
          }>(query, { id: expenseId })
          console.log('ExpensePlan query result:', result)
        }

        // If no ExpensePlan found, try ExpenseItem
        if (
          (!result.ExpenseRequest || result.ExpenseRequest.length === 0) &&
          (!result.ExpensePlan || result.ExpensePlan.length === 0)
        ) {
          console.log('Not found as ExpensePlan, trying ExpenseItem...')
          query = `
            query GetExpenseItem($id: uuid!) {
              ExpenseItem(where: {id: {_eq: $id}, isDeleted: {_eq: false}}) {
                id
                title
                totalAmount
                currencyRef
                status
                expenseDate
                code
              }
            }
          `
          resultKey = 'ExpenseItem'
          result = await graphqlClient.request<{
            ExpenseRequest?: Expense[]
            ExpensePlan?: Expense[]
            ExpenseItem?: Expense[]
          }>(query, { id: expenseId })
          console.log('ExpenseItem query result:', result)
        }

        const expenseArray = result[resultKey as keyof typeof result]
        if (expenseArray && expenseArray.length > 0) {
          const expenseData = expenseArray[0]
          console.log('Expense found:', expenseData, 'Type:', resultKey)
          setDetectedType(resultKey as 'ExpenseRequest' | 'ExpensePlan' | 'ExpenseItem')
          setExpense({
            ...expenseData,
            currency: expenseData.currencyRef,
            submissionDate: expenseData.expenseDate || expenseData.requestDate || expenseData.planDate
          })
        } else {
          console.log('No expense found in ExpenseRequest, ExpensePlan, or ExpenseItem')
          setError('Expense not found')
        }
      } catch (err) {
        console.error('Error fetching expense:', err, 'Expense ID:', expenseId)
        setError('Failed to load expense')
      } finally {
        setIsLoading(false)
      }
    }

    if (expenseId && accessToken) {
      fetchExpense()
    }
  }, [expenseId, accessToken, graphqlClient, entityType])

  const operationBadge = getOperationBadge(operation)

  const handleClick = () => {
    if (!expenseId || !detectedType) return

    let url: string
    switch (detectedType) {
      case 'ExpenseRequest':
        url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
          expenseRequestId: expenseId,
          referrer: 'every-ai'
        })
        break
      case 'ExpensePlan':
        url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
          expensePlanId: expenseId,
          referrer: 'every-ai'
        })
        break
      case 'ExpenseItem':
        // Navigate to personal expenses with the expense items tab
        url = buildPlatformUrl('/platform/fin/expenses/personal-expenses', {
          tab: 'expense-items',
          highlightId: expenseId
        })
        break
      default:
        return
    }
    // Force window refresh to ensure updated expense content is shown (SPA navigation, not full page reload)
    navigateTo(url, { forceReload: true })
  }

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return '-'
    const currencyCode = currency?.split(':').pop() || 'EUR'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount)
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-ai-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={expense?.title || 'Expense'}
      subtitle={expense?.status}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        expense
          ? [
              { label: 'Amount', value: formatCurrency(expense.totalAmount, expense.currency) },
              { label: 'Date', value: expense.submissionDate }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      onClick={handleClick}
    />
  )
}

export default ExpenseDisplay
