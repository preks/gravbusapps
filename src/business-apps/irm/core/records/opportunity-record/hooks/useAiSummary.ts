import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByOpportunityId,
  useGetInvestmentNotesByOpportunityId,
  useGetInvestmentTasksByOpportunityId
} from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { sortActivitiesByOccurredAtDesc } from '@/common/data/relations/utils/activityOccurredAtSort'

const taskDescription = `You are an investment opportunity assistant analyzing an investment opportunity.

Analyze all available opportunity data including investment details, financial terms, asset characteristics, opportunity timeline, activities, notes, and tasks to provide:
1. A concise executive summary highlighting the investment thesis, opportunity structure, asset profile, and current pipeline stage
2. Up to 5 key insights covering:
   - Investment viability and financial attractiveness
   - Opportunity momentum and progression indicators
   - Risk factors or concerns identified
   - Critical next steps to advance or close the opportunity

Emphasize investment metrics, financial considerations, and opportunity-specific factors.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary in plain language'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})
type SummarySchema = z.infer<typeof summarySchema>
type UseAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useAiSummary(
  opportunityId: string,
  accessToken: string,
  opportunity: InvestmentOpportunity | null
): UseAiSummaryReturn {
  const { fetchInvestmentActivitiesByOpportunityId } = useGetInvestmentActivitiesByOpportunityId({ accessToken })
  const { fetchInvestmentNotesByOpportunityId } = useGetInvestmentNotesByOpportunityId({ accessToken })
  const { fetchInvestmentTasksByOpportunityId } = useGetInvestmentTasksByOpportunityId({ accessToken })

  const generateInputData = useCallback(async () => {
    // get activity data
    const activityResult = await fetchInvestmentActivitiesByOpportunityId(opportunityId)
    const sortedActivities = sortActivitiesByOccurredAtDesc(activityResult || [])

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

    if (process.env.NODE_ENV === 'development') {
      console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
    }
    return inputData
  }, [
    opportunityId,
    opportunity,
    fetchInvestmentActivitiesByOpportunityId,
    fetchInvestmentNotesByOpportunityId,
    fetchInvestmentTasksByOpportunityId
  ])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
