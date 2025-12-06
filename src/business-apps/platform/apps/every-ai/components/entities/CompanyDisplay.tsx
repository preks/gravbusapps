import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface CompanyDisplayProps {
  companyId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Company {
  id: string
  name: string
  industry?: { id: string; value: string }
  website?: string
  email?: string
}

export const CompanyDisplay: React.FC<CompanyDisplayProps> = ({ companyId, accessToken, operation }) => {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    // For delete operations, skip GraphQL query since entity is already deleted
    if (operation === 'delete') {
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchCompany = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetCompany($id: uuid!) {
            Account(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              name
              industry {
                id
                value
              }
              website
              email
            }
          }
        `

        const result = await graphqlClient.request<{ Account: Company[] }>(query, { id: companyId })

        if (result.Account && result.Account.length > 0) {
          setCompany(result.Account[0])
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
  }, [companyId, accessToken, graphqlClient, operation])

  const operationBadge = getOperationBadge(operation)

  const handleClick = () => {
    if (companyId) {
      const url = buildPlatformUrl('/platform/crm/account-record', {
        accountId: companyId,
        source: 'every-ai'
      })
      navigateTo(url)
    }
  }

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
      subtitle={company?.industry?.value}
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
      onClick={handleClick}
    />
  )
}

export default CompanyDisplay
