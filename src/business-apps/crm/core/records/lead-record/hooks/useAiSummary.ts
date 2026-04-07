import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useGetSalesActivities } from '../queries/SalesActivityQueries'
import { useGetCrmNotes } from '../queries/CrmNoteQueries'
import { useGetSalesTasks } from '../queries/SalesTaskQueries'
import { GET_LEAD_BY_ID, GetLeadByIdResponse } from '../queries/GetLeadByIdQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { sortActivitiesByOccurredAtDesc } from '@/common/data/relations/utils/activityOccurredAtSort'

const taskDescription = `You are a sales qualification assistant analyzing a sales prospect.

Analyze all available lead data including prospect profile, company information, engagement signals, activities, notes, and tasks to provide:
1. A concise executive summary covering the prospect profile, lead quality indicators, qualification status, and conversion readiness
2. Up to 5 key insights covering:
   - Lead qualification signals and buying intent
   - Company fit and revenue potential
   - Engagement responsiveness and interest level
   - Information gaps or qualification requirements
   - Recommended next steps for lead nurturing or conversion

Focus on sales qualification and lead conversion potential.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary in plain language'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})
type SummarySchema = z.infer<typeof summarySchema>
type UseAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useAiSummary(leadId: string, accessToken: string): UseAiSummaryReturn {
  const graphQLClient = useGraphQLClient(accessToken)
  const { fetchSalesActivities } = useGetSalesActivities({ accessToken })
  const { fetchCrmNotes } = useGetCrmNotes({ accessToken })
  const { fetchSalesTasks } = useGetSalesTasks({ accessToken })

  const generateInputData = useCallback(async () => {
    // get lead data
    const lead = await graphQLClient.request<GetLeadByIdResponse>(GET_LEAD_BY_ID, { id: leadId })

    // get activity data
    const activityResult = await fetchSalesActivities({ leadId })
    const sortedActivities = sortActivitiesByOccurredAtDesc(activityResult.SalesActivity || [])

    // get notes data
    const notesResult = await fetchCrmNotes({ leadId })
    const sortedNotes = (notesResult.CrmNote || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get task data
    const tasksResult = await fetchSalesTasks({ leadId })
    const sortedTasks = (tasksResult.SalesTask || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const inputData = `Lead Info: ${JSON.stringify(lead)}
Activities: ${JSON.stringify(sortedActivities)}
Notes: ${JSON.stringify(sortedNotes)}
Tasks: ${JSON.stringify(sortedTasks)}`

    if (process.env.NODE_ENV === 'development') {
      console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
    }
    return inputData
  }, [leadId, graphQLClient, fetchSalesActivities, fetchCrmNotes, fetchSalesTasks])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
