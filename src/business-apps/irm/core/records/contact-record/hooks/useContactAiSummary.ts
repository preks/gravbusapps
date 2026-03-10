import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByContactId,
  useGetInvestmentNotesByContactId,
  useGetInvestmentTasksByContactId
} from '@/common/data/investment/hooks/useInvestmentContacts'
import { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import {
  getEmailChannel,
  getPhoneChannel,
  getLinkedInChannel,
  getXingChannel
} from '@/common/data/common/utils/communicationChannelHelpers'

const taskDescription = `You are an investment relationship assistant analyzing a contact within the investment ecosystem.

Analyze all available contact data, organizational affiliation, engagement history, activities, notes, and tasks to provide:
1. A concise executive summary highlighting the contact's role in investment decisions, organizational context, relationship strength, and engagement status
2. Up to 5 key insights covering:
   - Contact's influence and decision-making capacity in investments
   - Relationship quality and engagement indicators
   - Engagement gaps or relationship risks
   - Recommended next steps for relationship development or deal advancement

Focus on relationship management within an investment context.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary of the contact'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})

type SummarySchema = z.infer<typeof summarySchema>
type UseContactAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useContactAiSummary(
  contactId: string,
  accessToken: string,
  contact: InvestmentContact | null
): UseContactAiSummaryReturn {
  const { fetchInvestmentActivitiesByContactId } = useGetInvestmentActivitiesByContactId({ accessToken })
  const { fetchInvestmentTasksByContactId } = useGetInvestmentTasksByContactId({ accessToken })
  const { fetchInvestmentNotesByContactId } = useGetInvestmentNotesByContactId({ accessToken })

  const generateInputData = useCallback(async () => {
    if (!contactId) {
      throw new Error('Contact ID is required for AI summary generation')
    }

    if (!accessToken) {
      throw new Error('Access token is required for AI summary generation')
    }

    try {
      if (!contact) {
        throw new Error(`Investment contact with ID ${contactId} not found`)
      }

      // Get activities data
      const activities = await fetchInvestmentActivitiesByContactId(contactId)
      const sortedActivities = (activities || []).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Get notes data
      const notes = await fetchInvestmentNotesByContactId(contactId)
      const sortedNotes = (notes || []).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Get tasks data
      const tasks = await fetchInvestmentTasksByContactId(contactId)
      const sortedTasks = (tasks || []).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Create enhanced context for AI
      const contactContext = {
        id: contact.id,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown Contact',
        email: getEmailChannel(contact.communicationChannels)?.value,
        phone: getPhoneChannel(contact.communicationChannels)?.value,
        jobTitle: contact.jobPosition,
        contactType: contact.type,
        department: contact.department,
        academicTitle: contact.academicTitle?.value,
        linkedinUrl: getLinkedInChannel(contact.communicationChannels)?.value,
        xingUrl: getXingChannel(contact.communicationChannels)?.value,
        bio: contact.description,
        accounts:
          contact.accountContacts?.map(ac => ({
            id: ac.account?.id,
            name: ac.account?.name,
            contactType: ac.contactType
          })) || [],
        opportunities:
          contact.opportunityContacts?.map(oc => ({
            id: oc.opportunity?.id,
            name: oc.opportunity?.name,
            contactType: oc.contactType,
            estimatedAmount: oc.opportunity?.estimatedAmount,
            pipelineStage: oc.opportunity?.opportunityPipelineStage?.value
          })) || [],
        ownerEmployee: contact.ownerEmployee
          ? {
              firstName: contact.ownerEmployee.firstName,
              lastName: contact.ownerEmployee.lastName,
              displayName: contact.ownerEmployee.displayName,
              fullName: contact.ownerEmployee.fullName
            }
          : null,
        // Additional context
        activitiesCount: sortedActivities.length,
        notesCount: sortedNotes.length,
        tasksCount: sortedTasks.length,
        lastActivityDate: sortedActivities[0]?.createdAt,
        lastNoteDate: sortedNotes[0]?.createdAt,
        lastTaskDate: sortedTasks[0]?.createdAt,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      }

      // Validate we have some data to analyze
      const totalDataPoints = sortedActivities.length + sortedNotes.length + sortedTasks.length
      if (totalDataPoints === 0 && process.env.NODE_ENV === 'development') {
        console.warn('No activities, notes, or tasks found for contact', contactId)
      }

      const inputData = `Contact Context: ${JSON.stringify(contactContext, null, 2)}

Recent Activities (${sortedActivities.length} items): ${JSON.stringify(sortedActivities, null, 2)}

Notes (${sortedNotes.length} items): ${JSON.stringify(sortedNotes, null, 2)}

Tasks (${sortedTasks.length} items): ${JSON.stringify(sortedTasks, null, 2)}`

      if (process.env.NODE_ENV === 'development') {
        console.debug('AI Summary Input Data Length:', inputData.length, 'characters')
      }
      return inputData
    } catch (error) {
      console.error('Error collecting contact data for AI summary:', error)
      throw new Error('Failed to collect contact data for AI analysis')
    }
  }, [
    contactId,
    accessToken,
    contact,
    fetchInvestmentActivitiesByContactId,
    fetchInvestmentNotesByContactId,
    fetchInvestmentTasksByContactId
  ])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
