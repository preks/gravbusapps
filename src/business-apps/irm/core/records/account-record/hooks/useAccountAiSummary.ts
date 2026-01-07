import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByAccountId,
  useGetInvestmentNotesByAccountId,
  useGetInvestmentTasksByAccountId,
  useGetInvestmentAccountById
} from '@/common/data/investment/hooks/useInvestmentAccounts'

const taskDescription = `You are an assistant that summarises IRM account details.
Provide a concise executive summary in plain language, the total number of activities mentioned,
and up to 5 key insights or next steps as an array of strings.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary of the account'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})

type SummarySchema = z.infer<typeof summarySchema>
type UseAccountAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useAccountAiSummary(accountId: string, accessToken: string): UseAccountAiSummaryReturn {
  const { fetchInvestmentAccountById } = useGetInvestmentAccountById({ accessToken })
  const { fetchInvestmentActivitiesByAccountId } = useGetInvestmentActivitiesByAccountId({ accessToken })
  const { fetchInvestmentTasksByAccountId } = useGetInvestmentTasksByAccountId({ accessToken })
  const { fetchInvestmentNotesByAccountId } = useGetInvestmentNotesByAccountId({ accessToken })

  const generateInputData = async () => {
    if (!accountId) {
      throw new Error('Account ID is required for AI summary generation')
    }

    if (!accessToken) {
      throw new Error('Access token is required for AI summary generation')
    }

    try {
      // Get account data
      const accountResponse = await fetchInvestmentAccountById(accountId)
      const account = accountResponse?.account

      if (!account) {
        throw new Error(`Investment account with ID ${accountId} not found`)
      }

      // Get activities data
      const activities = await fetchInvestmentActivitiesByAccountId(accountId)
      const sortedActivities = (activities || []).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Get notes data
      const notes = await fetchInvestmentNotesByAccountId(accountId)
      const sortedNotes = (notes || []).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Get tasks data
      const tasks = await fetchInvestmentTasksByAccountId(accountId)
      const sortedTasks = (tasks || []).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

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
        geographicPresence: account.geographicPresence,
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
      if (totalDataPoints === 0) {
        console.warn('No activities, notes, or tasks found for account', accountId)
      }

      const inputData = `Account Context: ${JSON.stringify(accountContext, null, 2)}

Recent Activities (${sortedActivities.length} items): ${JSON.stringify(sortedActivities, null, 2)}

Notes (${sortedNotes.length} items): ${JSON.stringify(sortedNotes, null, 2)}

Tasks (${sortedTasks.length} items): ${JSON.stringify(sortedTasks, null, 2)}`

      console.log('AI Summary Input Data Length:', inputData.length, 'characters')
      return inputData
    } catch (error) {
      console.error('Error collecting account data for AI summary:', error)
      throw new Error('Failed to collect account data for AI analysis')
    }
  }

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
