import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import {
  useGetInvestmentActivitiesByContactId,
  useGetInvestmentNotesByContactId,
  useGetInvestmentTasksByContactId
} from '@/common/data/investment/hooks/useInvestmentContacts'
import { useGetInvestmentContactById } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const taskDescription = `You are an assistant that summarises IRM contact details.
Provide a concise executive summary in plain language, the total number of activities mentioned,
and up to 5 key insights or next steps as an array of strings.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary of the contact'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})

type SummarySchema = z.infer<typeof summarySchema>
type UseContactAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

export function useContactAiSummary(contactId: string, accessToken: string): UseContactAiSummaryReturn {
  const { fetchInvestmentContactById } = useGetInvestmentContactById({ accessToken })
  const { fetchInvestmentActivitiesByContactId } = useGetInvestmentActivitiesByContactId({ accessToken })
  const { fetchInvestmentTasksByContactId } = useGetInvestmentTasksByContactId({ accessToken })
  const { fetchInvestmentNotesByContactId } = useGetInvestmentNotesByContactId({ accessToken })

  const generateInputData = async () => {
    if (!contactId) {
      throw new Error('Contact ID is required for AI summary generation')
    }

    if (!accessToken) {
      throw new Error('Access token is required for AI summary generation')
    }

    try {
      // Get contact data
      const contactResponse = await fetchInvestmentContactById(contactId)
      const contact = contactResponse?.contact

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
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.jobTitle,
        contactType: contact.contactType,
        academicTitle: contact.academicTitle?.value,
        linkedinUrl: contact.linkedinUrl,
        xingUrl: contact.xingUrl,
        bio: contact.bio,
        account: contact.account
          ? {
              id: contact.account.id,
              name: contact.account.name
            }
          : null,
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
      if (totalDataPoints === 0) {
        console.warn('No activities, notes, or tasks found for contact', contactId)
      }

      const inputData = `Contact Context: ${JSON.stringify(contactContext, null, 2)}

Recent Activities (${sortedActivities.length} items): ${JSON.stringify(sortedActivities, null, 2)}

Notes (${sortedNotes.length} items): ${JSON.stringify(sortedNotes, null, 2)}

Tasks (${sortedTasks.length} items): ${JSON.stringify(sortedTasks, null, 2)}`

      console.log('AI Summary Input Data Length:', inputData.length, 'characters')
      return inputData
    } catch (error) {
      console.error('Error collecting contact data for AI summary:', error)
      throw new Error('Failed to collect contact data for AI analysis')
    }
  }

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4o')
}
