import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByLeadId,
  useGetInvestmentNotesByLeadId,
  useGetInvestmentTasksByLeadId,
  useGetInvestmentLeadById
} from '@/common/data/investment/hooks/useInvestmentLeads'

const taskDescription = `You are an assistant that summarises CRM lead timelines. 
Provide a concise executive summary in plain language, the total number of activities mentioned, 
and up to 5 key insights or next steps as an array of strings. 
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary in plain language'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})
type SummarySchema = z.infer<typeof summarySchema>
type UseAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useAiSummary(leadId: string, accessToken: string): UseAiSummaryReturn {
  const { fetchInvestmentLeadById } = useGetInvestmentLeadById({ accessToken })
  const { fetchInvestmentActivitiesByLeadId } = useGetInvestmentActivitiesByLeadId({ accessToken })
  const { fetchInvestmentNotesByLeadId } = useGetInvestmentNotesByLeadId({ accessToken })
  const { fetchInvestmentTasksByLeadId } = useGetInvestmentTasksByLeadId({ accessToken })

  const generateInputData = async () => {
    // get lead data using central hook
    const leadResult = await fetchInvestmentLeadById(leadId)
    const lead = leadResult.lead

    // get activity data
    const activityResult = await fetchInvestmentActivitiesByLeadId(leadId)
    const sortedActivities = (activityResult || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get notes data
    const notesResult = await fetchInvestmentNotesByLeadId(leadId)
    const sortedNotes = (notesResult || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // get task data
    const tasksResult = await fetchInvestmentTasksByLeadId(leadId)
    const sortedTasks = (tasksResult || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const inputData = `Lead Info: ${JSON.stringify(lead)}
Activities: ${JSON.stringify(sortedActivities)}
Notes: ${JSON.stringify(sortedNotes)}
Tasks: ${JSON.stringify(sortedTasks)}`

    return inputData
  }

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4o')
}
