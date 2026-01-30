import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useGetInvestmentActivitiesByInvestmentId } from './useInvestmentActivitiesByInvestmentId'
import { useGetInvestmentTasksByInvestmentId } from './useInvestmentTasksByInvestmentId'
import { useGetInvestmentNotesByInvestmentId } from './useInvestmentNotesByInvestmentId'
import { GET_INVESTMENT_BY_ID } from '@/common/data/investment/queries/investmentQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const taskDescription = `You are an investment portfolio assistant analyzing a specific investment asset.

Analyze all available investment data including asset details, financial metrics, performance indicators, activities, notes, and tasks to provide:
1. A concise executive summary highlighting the investment profile (type, status, stake), financial position (amounts, market value, returns), portfolio company, and current performance
2. Up to 5 key insights covering:
   - Investment performance and value trends
   - Portfolio company developments and risk indicators
   - Recent activities and engagement patterns
   - Outstanding tasks or concerns requiring attention
   - Recommended next steps for portfolio management

Emphasize portfolio performance, value creation, and risk management considerations.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary of the investment'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})

type SummarySchema = z.infer<typeof summarySchema>
type UseInvestmentAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useInvestmentAiSummary(investmentId: string, accessToken: string): UseInvestmentAiSummaryReturn {
  const graphQLClient = useGraphQLClient(accessToken)
  const { fetchInvestmentActivitiesByInvestmentId } = useGetInvestmentActivitiesByInvestmentId({ accessToken })
  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId({ accessToken })
  const { fetchInvestmentNotesByInvestmentId } = useGetInvestmentNotesByInvestmentId({ accessToken })

  const generateInputData = async () => {
    if (!investmentId) {
      throw new Error('Investment ID is required for AI summary generation')
    }

    if (!accessToken) {
      throw new Error('Access token is required for AI summary generation')
    }

    try {
      // Get investment data
      const investmentResponse = await graphQLClient.request(GET_INVESTMENT_BY_ID(investmentId))
      const investment = investmentResponse.Investment?.[0]

      if (!investment) {
        throw new Error(`Investment with ID ${investmentId} not found`)
      }

      // Get activities data
      const activities = await fetchInvestmentActivitiesByInvestmentId(investmentId)
      const sortedActivities = activities.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Get notes data
      const notes = await fetchInvestmentNotesByInvestmentId(investmentId)
      const sortedNotes = notes.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Get tasks data
      const tasks = await fetchInvestmentTasksByInvestmentId(investmentId)
      const sortedTasks = tasks.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Create enhanced context for AI
      const investmentContext = {
        id: investment.id,
        name: investment.name || 'Unnamed Investment',
        type: investment.investmentType?.value || 'Unknown Type',
        status: investment.investmentStatus?.value || 'Unknown Status',
        initialAmount: investment.initialInvestmentAmount,
        totalAmount: investment.totalInvestmentAmount,
        marketValue: investment.investmentMarketValue,
        stakePercentage: investment.stakePercentage,
        currency: investment.currency?.value || 'EUR',
        acquisitionDate: investment.acquisitionDate,
        companyName: investment.investmentAccounts?.[0]?.investmentAccount?.name || 'Unknown Company', // GraphQL field name
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
        console.warn('No activities, notes, or tasks found for investment', investmentId)
      }

      const inputData = `Investment Context: ${JSON.stringify(investmentContext, null, 2)}

Recent Activities (${sortedActivities.length} items): ${JSON.stringify(sortedActivities, null, 2)}

Notes (${sortedNotes.length} items): ${JSON.stringify(sortedNotes, null, 2)}

Tasks (${sortedTasks.length} items): ${JSON.stringify(sortedTasks, null, 2)}`

      if (process.env.NODE_ENV === 'development') {
        console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
      }
      return inputData
    } catch (error) {
      console.error('Error collecting investment data for AI summary:', error)
      throw new Error('Failed to collect investment data for AI analysis')
    }
  }

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
