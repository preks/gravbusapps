import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactsStaticData {
  totalContacts: number
  last30DaysContacts: number
  previous30DaysContacts: number
  totalAtPreviousPeriodEnd: number
  totalAccounts: number
}

export interface ContactsEntityConfig {
  contactEntity: string // "Contact" | "InvestmentContact"
  accountEntity: string // "Account" | "InvestmentAccount"
}

/**
 * Generic hook for fetching contacts static data (KPIs)
 * Configurable for both CRM and IRM modules
 * Uses aggregate queries only - no full record fetching
 */
export const useGenericContactsStaticData = (accessToken: string, config: ContactsEntityConfig) => {
  const [data, setData] = useState<ContactsStaticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchContactsStaticData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Calculate date ranges (30-day rolling window)
        const now = new Date()
        const last30DaysStart = new Date(now)
        last30DaysStart.setDate(now.getDate() - 30)

        const previous30DaysStart = new Date(now)
        previous30DaysStart.setDate(now.getDate() - 60)

        const previous30DaysEnd = last30DaysStart

        const query = `
          query GetContactsStaticDataMega {
            # Total contacts
            totalNumberOfContacts: ${config.contactEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
              }
            ) {
              aggregate {
                count
              }
            }

            # Last 30 days contacts (rolling window)
            last30DaysContacts: ${config.contactEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${last30DaysStart.toISOString()}" }
              }
            ) {
              aggregate {
                count
              }
            }

            # Previous 30 days contacts (30-60 days ago)
            previous30DaysContacts: ${config.contactEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${previous30DaysStart.toISOString()}", _lt: "${previous30DaysEnd.toISOString()}" }
              }
            ) {
              aggregate {
                count
              }
            }

            # Total contacts at end of previous period (for total growth calculation)
            totalAtPreviousPeriodEnd: ${config.contactEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _lt: "${previous30DaysEnd.toISOString()}" }
              }
            ) {
              aggregate {
                count
              }
            }

            # Account count for calculating average contacts per account
            totalAccounts: ${config.accountEntity}Aggregate(
              where: {
                isDeleted: { _eq: false }
              }
            ) {
              aggregate {
                count
              }
            }
          }
        `

        const result = await graphqlClient.request(query)

        const staticData: ContactsStaticData = {
          totalContacts: result.totalNumberOfContacts?.aggregate?.count || 0,
          last30DaysContacts: result.last30DaysContacts?.aggregate?.count || 0,
          previous30DaysContacts: result.previous30DaysContacts?.aggregate?.count || 0,
          totalAtPreviousPeriodEnd: result.totalAtPreviousPeriodEnd?.aggregate?.count || 0,
          totalAccounts: result.totalAccounts?.aggregate?.count || 0
        }

        setData(staticData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactsStaticData()
  }, [accessToken, config.contactEntity, config.accountEntity])

  return { data, isLoading, error }
}
