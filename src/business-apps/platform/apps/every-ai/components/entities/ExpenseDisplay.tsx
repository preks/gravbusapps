import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface ExpenseDisplayProps {
  expenseId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Expense {
  id: string
  title: string
  totalAmount?: number
  currency?: string
  status?: string
  submissionDate?: string
}

export const ExpenseDisplay: React.FC<ExpenseDisplayProps> = ({ expenseId, accessToken, operation }) => {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchExpense = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetExpense($id: uuid!) {
            employeeExpenses_by_pk(id: $id) {
              id
              title
              totalAmount
              currency
              status
              submissionDate
            }
          }
        `

        const result = await graphqlClient.request<{ employeeExpenses_by_pk: Expense }>(query, { id: expenseId })

        if (result.employeeExpenses_by_pk) {
          setExpense(result.employeeExpenses_by_pk)
        } else {
          setError('Expense not found')
        }
      } catch (err) {
        console.error('Error fetching expense:', err)
        setError('Failed to load expense')
      } finally {
        setIsLoading(false)
      }
    }

    if (expenseId && accessToken) {
      fetchExpense()
    }
  }, [expenseId, accessToken, graphqlClient])

  const getOperationBadge = () => {
    switch (operation) {
      case 'create':
        return { text: 'Created', variant: 'success' as const }
      case 'update':
        return { text: 'Updated', variant: 'default' as const }
      case 'delete':
        return { text: 'Deleted', variant: 'destructive' as const }
      default:
        return undefined
    }
  }

  const operationBadge = getOperationBadge()

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return '-'
    const currencyCode = currency?.split(':').pop() || 'EUR'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount)
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-warning-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    />
  )
}

export default ExpenseDisplay
