import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface CompanyDisplayProps {
  companyId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  email?: string
}

export const CompanyDisplay: React.FC<CompanyDisplayProps> = ({ companyId, accessToken, operation }) => {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchCompany = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetCompany($id: uuid!) {
            customerAccounts_by_pk(id: $id) {
              id
              name
              industry
              website
              email
            }
          }
        `

        const result = await graphqlClient.request<{ customerAccounts_by_pk: Company }>(query, { id: companyId })

        if (result.customerAccounts_by_pk) {
          setCompany(result.customerAccounts_by_pk)
        } else {
          setError('Company not found')
        }
      } catch (err) {
        console.error('Error fetching company:', err)
        setError('Failed to load company')
      } finally {
        setIsLoading(false)
      }
    }

    if (companyId && accessToken) {
      fetchCompany()
    }
  }, [companyId, accessToken, graphqlClient])

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

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-primary-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={company?.name || 'Company'}
      subtitle={company?.industry}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        company
          ? [
              { label: 'Website', value: company.website },
              { label: 'Email', value: company.email }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
    />
  )
}

export default CompanyDisplay
