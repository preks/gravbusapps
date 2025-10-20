import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useGetSalesActivities } from '../queries/OpportunityActivityQueries'
import { useGetCrmNotes } from '../queries/CrmNoteQueries'
import { useGetSalesTasks } from '../queries/OpportunityTaskQueries'
import { GET_OPPORTUNITY_BY_ID, GetOpportunityByIdResponse } from '../queries/GetOpportunityByIdQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const taskDescription = `You are an assistant that summarises CRM opportunity timelines. 
Provide a concise executive summary in plain language, the total number of activities mentioned, 
and up to 5 key insights or next steps as an array of strings. 
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary in plain language'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})
type SummarySchema = z.infer<typeof summarySchema>
type UseAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useAiSummary(opportunityId: string, accessToken: string): UseAiSummaryReturn {
  const graphQLClient = useGraphQLClient(accessToken)
  const { fetchSalesActivities } = useGetSalesActivities({ accessToken })
  const { fetchCrmNotes } = useGetCrmNotes({ accessToken })
  const { fetchSalesTasks } = useGetSalesTasks({ accessToken })

  const generateInputData = async () => {
    // get opportunity data
    const opportunity = await graphQLClient.request<GetOpportunityByIdResponse>(GET_OPPORTUNITY_BY_ID, {
      id: opportunityId
    })

    // get activity data
    const activityResult = await fetchSalesActivities({ opportunityId })
    const sortedActivities = (activityResult.SalesActivity || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get notes data
    const notesResult = await fetchCrmNotes({ opportunityId })
    const sortedNotes = (notesResult.CrmNote || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get task data
    const tasksResult = await fetchSalesTasks({ opportunityId })
    const sortedTasks = (tasksResult.SalesTask || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const inputData = `Opportunity Info: ${JSON.stringify(opportunity)}
Activities: ${JSON.stringify(sortedActivities)}
Notes: ${JSON.stringify(sortedNotes)}
Tasks: ${JSON.stringify(sortedTasks)}`

    return inputData
  }

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
