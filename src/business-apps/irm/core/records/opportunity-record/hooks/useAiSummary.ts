import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByOpportunityId,
  useGetInvestmentNotesByOpportunityId,
  useGetInvestmentTasksByOpportunityId
} from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'

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
  const { opportunity } = useInvestmentOpportunity(accessToken, opportunityId)
  const { fetchInvestmentActivitiesByOpportunityId } = useGetInvestmentActivitiesByOpportunityId({ accessToken })
  const { fetchInvestmentNotesByOpportunityId } = useGetInvestmentNotesByOpportunityId({ accessToken })
  const { fetchInvestmentTasksByOpportunityId } = useGetInvestmentTasksByOpportunityId({ accessToken })

  const generateInputData = async () => {
    // get opportunity data using new declarative hook
    // opportunity is already available from the hook

    // get activity data
    const activityResult = await fetchInvestmentActivitiesByOpportunityId(opportunityId)
    const sortedActivities = (activityResult || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get notes data
    const notesResult = await fetchInvestmentNotesByOpportunityId(opportunityId)
    const sortedNotes = (notesResult || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get task data
    const tasksResult = await fetchInvestmentTasksByOpportunityId(opportunityId)
    const sortedTasks = (tasksResult || []).sort(
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
