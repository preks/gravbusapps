import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactQualityData {
  overallScore: number
  qualityDistribution: { category: string; count: number; percentage: number }[]
  completenessMetrics: { metric: string; completed: number; total: number; percentage: number }[]
  issuesSummary: { missingEmails: number; missingPhones: number; missingAccounts: number; duplicatePotential: number }
}

export interface ContactQualityConfig {
  contactEntity: string // 'Contact' or 'InvestmentContact'
  contactAggregate: string // 'ContactAggregate' or 'InvestmentContactAggregate'
  accountField: string // 'accountId' or 'investmentAccountContact.accountId'
  typeField: string // 'contactType' or 'type'
}

/**
 * Generic Contact Quality Data Hook using ONLY aggregate queries
 * Pattern: 100% aggregates - NO full record fetches!
 * Quality score based on 6-7 fields: firstName, lastName, email, phone, account, type
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
          query GetContactQualityData {
            # Total contacts
            totalContacts: ${config.contactAggregate}(
              where: { isDeleted: { _eq: false } }
            ) {
              aggregate { count }
            }

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

            contactsWithType: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                ${config.typeField}: { _neq: "" }
              }
            ) {
              aggregate { count }
            }

            # Issues summary
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

        const totalContacts = result.totalContacts?.aggregate?.count || 0
        const contactsWithEmail = result.contactsWithEmail?.aggregate?.count || 0
        const contactsWithPhone = result.contactsWithPhone?.aggregate?.count || 0
        const contactsWithAccount = result.contactsWithAccount?.aggregate?.count || 0
        const contactsWithFirstName = result.contactsWithFirstName?.aggregate?.count || 0
        const contactsWithLastName = result.contactsWithLastName?.aggregate?.count || 0
        const contactsWithType = result.contactsWithType?.aggregate?.count || 0
        const missingEmails = result.missingEmails?.aggregate?.count || 0
        const missingPhones = result.missingPhones?.aggregate?.count || 0
        const missingAccounts = result.missingAccounts?.aggregate?.count || 0

        // Calculate completeness metrics (100% from aggregates - no sample!)
        const completenessMetrics = [
          {
            metric: 'Email Address',
            completed: contactsWithEmail,
            total: totalContacts,
            percentage: totalContacts > 0 ? Math.round((contactsWithEmail / totalContacts) * 100) : 0
          },
          {
            metric: 'Phone Number',
            completed: contactsWithPhone,
            total: totalContacts,
            percentage: totalContacts > 0 ? Math.round((contactsWithPhone / totalContacts) * 100) : 0
          },
          {
            metric: 'Account Link',
            completed: contactsWithAccount,
            total: totalContacts,
            percentage: totalContacts > 0 ? Math.round((contactsWithAccount / totalContacts) * 100) : 0
          },
          {
            metric: 'Contact Type',
            completed: contactsWithType,
            total: totalContacts,
            percentage: totalContacts > 0 ? Math.round((contactsWithType / totalContacts) * 100) : 0
          }
        ]

        // Calculate overall quality score from aggregate completeness percentages
        // Quality scoring: firstName(1) + lastName(1) + email(1) + phone(1) + account(2) + type(1) = 8 points
        const fieldCompleteness = [
          contactsWithFirstName / totalContacts, // 1 point
          contactsWithLastName / totalContacts, // 1 point
          contactsWithEmail / totalContacts, // 1 point
          contactsWithPhone / totalContacts, // 1 point
          contactsWithAccount / totalContacts, // 2 points (weighted)
          contactsWithAccount / totalContacts, // (counted twice for 2-point weight)
          contactsWithType / totalContacts // 1 point
        ]

        // Average completeness across all fields (8 points total)
        const avgCompleteness = fieldCompleteness.reduce((sum, val) => sum + val, 0) / 8
        const overallScore = Math.round(avgCompleteness * 100)

        // Estimate quality distribution based on aggregate completeness levels
        // Excellent: High completeness in all fields (especially account)
        const excellentPercentage = Math.min(avgCompleteness, contactsWithAccount / totalContacts) * 0.8
        // Poor: Low average completeness
        const poorPercentage = Math.max(0, 1 - avgCompleteness)
        // Good/Fair: Split the middle range
        const remainingPercentage = 1 - excellentPercentage - poorPercentage
        const goodPercentage = remainingPercentage * 0.6
        const fairPercentage = remainingPercentage * 0.4

        const qualityDistribution = [
          {
            category: 'Excellent',
            count: Math.round(excellentPercentage * totalContacts),
            percentage: Math.round(excellentPercentage * 100)
          },
          {
            category: 'Good',
            count: Math.round(goodPercentage * totalContacts),
            percentage: Math.round(goodPercentage * 100)
          },
          {
            category: 'Fair',
            count: Math.round(fairPercentage * totalContacts),
            percentage: Math.round(fairPercentage * 100)
          },
          {
            category: 'Poor',
            count: Math.round(poorPercentage * totalContacts),
            percentage: Math.round(poorPercentage * 100)
          }
        ].filter(item => item.count > 0)

        // Estimate duplicates: assume 3% of contacts with emails might be duplicates
        const estimatedDuplicates = contactsWithEmail > 0 ? Math.round(contactsWithEmail * 0.03) : 0

        const issuesSummary = {
          missingEmails,
          missingPhones,
          missingAccounts,
          duplicatePotential: estimatedDuplicates
        }

        setData({ overallScore, qualityDistribution, completenessMetrics, issuesSummary })
      } catch (err) {
        console.error('Error fetching contact quality data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [accessToken, graphqlClient, config.contactAggregate, config.accountField, config.typeField])

  return { data, isLoading }
}
