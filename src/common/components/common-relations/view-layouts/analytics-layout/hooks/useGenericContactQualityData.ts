import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactQualityData {
  fieldCompleteness: { field: string; completed: number; missing: number }[]
  accountCoverage: { category: string; count: number }[]
}

export interface ContactQualityConfig {
  contactEntity: string // 'Contact' or 'InvestmentContact'
  contactAggregate: string // 'ContactAggregate' or 'InvestmentContactAggregate'
  accountField: string // 'accountId' or 'investmentAccountContact.accountId'
}

/**
 * Generic Contact Quality Data Hook using ONLY aggregate queries.
 * Returns chart-ready aggregate counts without FE scoring or estimates.
 * Configurable for both CRM and IRM
 */
export const useGenericContactQualityData = (accessToken: string, config: ContactQualityConfig) => {
  const [data, setData] = useState<ContactQualityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Build account where conditions based on field structure
        const accountHasValueWhere =
          config.accountField === 'accountId'
            ? 'accountId: { _isNull: false }'
            : 'investmentAccountContact: { accountId: { _isNull: false } }'

        const accountMissingWhere =
          config.accountField === 'accountId'
            ? 'accountId: { _isNull: true }'
            : 'investmentAccountContact: { accountId: { _isNull: true } }'

        const query = `
          query GetContactCompletenessData {
            # Completeness aggregates - All fields used in quality scoring
            contactsWithEmail: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                email: { _neq: "" }
              }
            ) {
              aggregate { count }
            }

            contactsWithPhone: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                phone: { _neq: "" }
              }
            ) {
              aggregate { count }
            }

            contactsWithAccount: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                ${accountHasValueWhere}
              }
            ) {
              aggregate { count }
            }

            contactsWithFirstName: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                firstName: { _neq: "" }
              }
            ) {
              aggregate { count }
            }

            contactsWithLastName: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                lastName: { _neq: "" }
              }
            ) {
              aggregate { count }
            }

            missingFirstNames: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                firstName: { _eq: "" }
              }
            ) {
              aggregate { count }
            }

            missingLastNames: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                lastName: { _eq: "" }
              }
            ) {
              aggregate { count }
            }

            missingEmails: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                email: { _eq: "" }
              }
            ) {
              aggregate { count }
            }

            missingPhones: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                phone: { _eq: "" }
              }
            ) {
              aggregate { count }
            }

            missingAccounts: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                ${accountMissingWhere}
              }
            ) {
              aggregate { count }
            }
          }
        `

        const result = await graphqlClient.request<any>(query)

        const contactsWithEmail = result.contactsWithEmail?.aggregate?.count || 0
        const contactsWithPhone = result.contactsWithPhone?.aggregate?.count || 0
        const contactsWithAccount = result.contactsWithAccount?.aggregate?.count || 0
        const contactsWithFirstName = result.contactsWithFirstName?.aggregate?.count || 0
        const contactsWithLastName = result.contactsWithLastName?.aggregate?.count || 0
        const missingFirstNames = result.missingFirstNames?.aggregate?.count || 0
        const missingLastNames = result.missingLastNames?.aggregate?.count || 0
        const missingEmails = result.missingEmails?.aggregate?.count || 0
        const missingPhones = result.missingPhones?.aggregate?.count || 0
        const missingAccounts = result.missingAccounts?.aggregate?.count || 0

        const fieldCompleteness = [
          {
            field: 'First Name',
            completed: contactsWithFirstName,
            missing: missingFirstNames
          },
          {
            field: 'Last Name',
            completed: contactsWithLastName,
            missing: missingLastNames
          },
          {
            field: 'Email Address',
            completed: contactsWithEmail,
            missing: missingEmails
          },
          {
            field: 'Phone Number',
            completed: contactsWithPhone,
            missing: missingPhones
          },
          {
            field: 'Account Link',
            completed: contactsWithAccount,
            missing: missingAccounts
          }
        ]

        const accountCoverage = [
          {
            category: 'Linked to Account',
            count: contactsWithAccount
          },
          {
            category: 'No Account',
            count: missingAccounts
          }
        ]

        setData({ fieldCompleteness, accountCoverage })
      } catch (err) {
        console.error('Error fetching contact quality data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [accessToken, graphqlClient, config.contactAggregate, config.accountField])

  return { data, isLoading }
}
