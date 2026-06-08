import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useGetSalesActivities } from '../queries/OpportunityActivityQueries'
import { useGetCrmNotes } from '../queries/CrmNoteQueries'
import { useGetSalesTasks } from '../queries/OpportunityTaskQueries'
import { GET_OPPORTUNITY_BY_ID, GetOpportunityByIdResponse } from '../queries/GetOpportunityByIdQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { sortActivitiesByOccurredAtDesc } from '@/common/data/relations/utils/activityOccurredAtSort'
import { toCustomerNote } from '@/common/data/customer/mappers/customerRelatedEntityMappers'
import { isCrmNoteNextStepType, isCrmNoteRegularType } from '@/common/data/customer/types/customerNoteTypes'

const taskDescription = `You are a sales pipeline assistant analyzing a sales opportunity.

"General notes" are historical context (UNKNOWN_NOTE_TYPE, GENERAL_NOTE). "Next steps" are explicit committed follow-ups (NEXT_STEP_NOTE). Treat them differently: next steps are actionable commitments; general notes are broader context.

Analyze all available opportunity data including opportunity details, pipeline stage, revenue potential, customer interactions, activities, notes, and tasks to provide:
1. A concise executive summary highlighting the opportunity structure, revenue potential, pipeline stage, competitive position, and win probability
2. Up to 5 key insights covering:
   - Opportunity momentum and progression indicators
   - Win probability and competitive positioning
   - Risk factors or blockers identified
   - Stakeholder engagement and buying signals
   - Critical next steps to advance or close the opportunity

Emphasize sales metrics, pipeline health, and opportunity closing strategies.
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

  const generateInputData = useCallback(async () => {
    // get opportunity data
    const opportunity = await graphQLClient.request<GetOpportunityByIdResponse>(GET_OPPORTUNITY_BY_ID, {
      id: opportunityId
    })

    // get activity data
    const activityResult = await fetchSalesActivities({ opportunityId })
    const sortedActivities = sortActivitiesByOccurredAtDesc(activityResult.SalesActivity || [])

    const notesResult = await fetchCrmNotes({ opportunityId })
    const normalizedNotes = (notesResult.CrmNote || [])
      .map(toCustomerNote)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const generalNotes = normalizedNotes.filter(isCrmNoteRegularType)
    const nextStepNotes = normalizedNotes.filter(isCrmNoteNextStepType)

    // get task data
    const tasksResult = await fetchSalesTasks({ opportunityId })
    const sortedTasks = (tasksResult.SalesTask || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const inputData = `Opportunity Info: ${JSON.stringify(opportunity)}
Activities: ${JSON.stringify(sortedActivities)}
General notes: ${JSON.stringify(generalNotes)}
Next steps: ${JSON.stringify(nextStepNotes)}
Tasks: ${JSON.stringify(sortedTasks)}`

    if (process.env.NODE_ENV === 'development') {
      console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
    }
    return inputData
  }, [opportunityId, graphQLClient, fetchSalesActivities, fetchCrmNotes, fetchSalesTasks])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
