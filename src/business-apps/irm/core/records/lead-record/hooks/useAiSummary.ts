import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByLeadId,
  useGetInvestmentNotesByLeadId,
  useGetInvestmentTasksByLeadId
} from '@/common/data/investment/hooks/useInvestmentLeads'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'

const taskDescription = `You are an investment lead qualification assistant analyzing a potential investment prospect.

Analyze all available lead data including investment opportunity details, estimated values, asset characteristics, activities, notes, and tasks to provide:
1. A concise executive summary covering the investment opportunity profile, lead quality indicators, and qualification status
2. Up to 5 key insights covering:
   - Investment opportunity attractiveness and strategic fit
   - Lead qualification signals and readiness indicators
   - Information gaps or diligence requirements
   - Recommended next steps for lead progression or conversion

Focus on investment potential assessment and qualification criteria.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary in plain language'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})
type SummarySchema = z.infer<typeof summarySchema>
type UseAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useAiSummary(leadId: string, accessToken: string, lead?: InvestmentLead | null): UseAiSummaryReturn {
  const { fetchInvestmentActivitiesByLeadId } = useGetInvestmentActivitiesByLeadId({ accessToken })
  const { fetchInvestmentNotesByLeadId } = useGetInvestmentNotesByLeadId({ accessToken })
  const { fetchInvestmentTasksByLeadId } = useGetInvestmentTasksByLeadId({ accessToken })

  const generateInputData = useCallback(async () => {
    // get lead data using new declarative hook
    // lead is already available from the hook

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

    if (process.env.NODE_ENV === 'development') {
      console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
    }
    return inputData
  }, [leadId, lead, fetchInvestmentActivitiesByLeadId, fetchInvestmentNotesByLeadId, fetchInvestmentTasksByLeadId])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
