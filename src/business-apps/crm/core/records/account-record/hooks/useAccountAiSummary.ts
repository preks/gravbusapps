import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const taskDescription = `You are a customer relationship management assistant analyzing a customer account.

Analyze all available account data, customer interactions, activities, notes, and tasks to provide:
1. A concise executive summary focused on the customer relationship, account profile, engagement status, and business potential
2. Up to 5 key insights covering:
   - Customer engagement patterns and relationship health
   - Revenue opportunities and business development potential
   - Interaction quality and satisfaction indicators
   - Risk factors or concerns requiring attention
   - Recommended next steps for account growth and retention

Focus on customer relationship management and revenue generation opportunities.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary of the account'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})

type SummarySchema = z.infer<typeof summarySchema>
type UseAccountAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

/**
 * Helper function to fetch paginated data from API
 */
async function fetchPaginatedData<T>(
  fetchFn: (id: string, limit: number, offset: number) => Promise<T[]>,
  entityId: string,
  limit = 100
): Promise<T[]> {
  const allData: T[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const batch = await fetchFn(entityId, limit, offset)
    if (batch && batch.length > 0) {
      allData.push(...batch)
      offset += limit
      hasMore = batch.length === limit
    } else {
      hasMore = false
    }
  }

  return allData
}

export function useAccountAiSummary(accountId: string, accessToken: string): UseAccountAiSummaryReturn {
  const { account } = useCustomerAccount(accessToken, accountId)
  const { fetchCustomerActivitiesByAccountId } = useCustomerActivities({ accessToken } as BusinessAppContextProps)
  const { fetchCustomerNotesByAccountId } = useCustomerNotes({ accessToken } as BusinessAppContextProps)
  const { fetchCustomerTasksByAccountId } = useCustomerTasks({ accessToken } as BusinessAppContextProps)

  const generateInputData = useCallback(async () => {
    if (!accountId) {
      throw new Error('Account ID is required for AI summary generation')
    }

    if (!accessToken) {
      throw new Error('Access token is required for AI summary generation')
    }

    try {
      // Account data is already available from the hook
      if (!account) {
        throw new Error(`Customer account with ID ${accountId} not found`)
      }

      // Get activities data with pagination
      const allActivities = await fetchPaginatedData(fetchCustomerActivitiesByAccountId, accountId)
      allActivities.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const sortedActivities = allActivities

      // Get notes data with pagination
      const allNotes = await fetchPaginatedData(fetchCustomerNotesByAccountId, accountId)
      allNotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const sortedNotes = allNotes

      // Get tasks data with pagination
      const allTasks = await fetchPaginatedData(fetchCustomerTasksByAccountId, accountId)
      allTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const sortedTasks = allTasks

      // Create enhanced context for AI
      const accountContext = {
        id: account.id,
        name: account.name || 'Unnamed Account',
        industryClass: account.industryClass?.value || 'Unknown Industry',
        companySize: account.companySize?.value || 'Unknown Size',
        legalForm: account.legalForm?.value || 'Unknown Legal Form',
        annualRevenueBand: account.accountAnnualRevenueBand?.value || 'Unknown Revenue',
        website: account.website,
        foundationDate: account.foundationDate,
        ownerEmployee: account.ownerEmployee
          ? {
              firstName: account.ownerEmployee.firstName,
              lastName: account.ownerEmployee.lastName,
              displayName: account.ownerEmployee.displayName
            }
          : null,
        // Additional context
        activitiesCount: sortedActivities.length,
        notesCount: sortedNotes.length,
        tasksCount: sortedTasks.length,
        lastActivityDate: sortedActivities[0]?.createdAt,
        lastNoteDate: sortedNotes[0]?.createdAt,
        lastTaskDate: sortedTasks[0]?.createdAt
      }

      // Validate we have some data to analyze
      const totalDataPoints = sortedActivities.length + sortedNotes.length + sortedTasks.length
      if (totalDataPoints === 0 && process.env.NODE_ENV === 'development') {
        console.warn('No activities, notes, or tasks found for account', accountId)
      }

      const inputData = `Account Context: ${JSON.stringify(accountContext, null, 2)}

Recent Activities (${sortedActivities.length} items): ${JSON.stringify(sortedActivities, null, 2)}

Notes (${sortedNotes.length} items): ${JSON.stringify(sortedNotes, null, 2)}

Tasks (${sortedTasks.length} items): ${JSON.stringify(sortedTasks, null, 2)}`

      if (process.env.NODE_ENV === 'development') {
        console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
      }
      return inputData
    } catch (error) {
      console.error('Error collecting account data for AI summary:', error)
      throw new Error('Failed to collect account data for AI analysis')
    }
  }, [
    accountId,
    accessToken,
    account,
    fetchCustomerActivitiesByAccountId,
    fetchCustomerNotesByAccountId,
    fetchCustomerTasksByAccountId
  ])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
