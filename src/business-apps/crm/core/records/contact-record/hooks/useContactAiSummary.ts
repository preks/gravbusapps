import { useCallback } from 'react'
import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import {
  getEmailChannel,
  getPhoneChannel,
  getLinkedInChannel,
  getXingChannel
} from '@/common/data/common/utils/communicationChannelHelpers'

const taskDescription = `You are a sales relationship assistant analyzing a customer contact.

Analyze all available contact data, organizational role, engagement history, activities, notes, and tasks to provide:
1. A concise executive summary highlighting the contact's role in purchasing decisions, organizational context, relationship strength, and engagement status
2. Up to 5 key insights covering:
   - Contact's influence and decision-making authority
   - Relationship quality and engagement indicators
   - Communication preferences and responsiveness
   - Engagement gaps or relationship risks
   - Recommended next steps for relationship development or deal advancement

Focus on sales relationship management and deal progression.
Respond strictly in JSON conforming to the provided schema.`

const summarySchema = z.object({
  summary: z.string().describe('A concise executive summary of the contact'),
  keyInsights: z.array(z.string()).describe('Up to 5 key insights or next steps')
})

type SummarySchema = z.infer<typeof summarySchema>
type UseContactAiSummaryReturn = UseInformationExtractionReturn<SummarySchema>

/**
 * Helper function to fetch paginated data from API
 */
async function fetchPaginatedData<T>(
  fetchFn: (id: string, limit: number, offset: number) => Promise<T[]>,
  entityId: string,
  limit = 100
): Promise<T[]> {
  const allData: T[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const batch = await fetchFn(entityId, limit, offset)
    if (batch && batch.length > 0) {
      allData.push(...batch)
      offset += limit
      hasMore = batch.length === limit
    } else {
      hasMore = false
    }
  }

  return allData
}

export function useContactAiSummary(
  contactId: string,
  accessToken: string,
  contact: CustomerContact | null
): UseContactAiSummaryReturn {
  const { fetchCustomerActivitiesByContactId } = useCustomerActivities({ accessToken } as BusinessAppContextProps)
  const { fetchCustomerNotesByContactId } = useCustomerNotes({ accessToken } as BusinessAppContextProps)
  const { fetchCustomerTasksByContactId } = useCustomerTasks({ accessToken } as BusinessAppContextProps)

  const generateInputData = useCallback(async () => {
    if (!contactId) {
      throw new Error('Contact ID is required for AI summary generation')
    }

    if (!accessToken) {
      throw new Error('Access token is required for AI summary generation')
    }

    try {
      if (!contact) {
        throw new Error(`Customer contact with ID ${contactId} not found`)
      }

      // Get activities data with pagination
      const allActivities = await fetchPaginatedData(fetchCustomerActivitiesByContactId, contactId)
      allActivities.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const sortedActivities = allActivities

      // Get notes data with pagination
      const allNotes = await fetchPaginatedData(fetchCustomerNotesByContactId, contactId)
      allNotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const sortedNotes = allNotes

      // Get tasks data with pagination
      const allTasks = await fetchPaginatedData(fetchCustomerTasksByContactId, contactId)
      allTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      const sortedTasks = allTasks

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
            pipelineStage: oc.opportunity?.salesPipelineStage?.value || oc.opportunity?.opportunityPipelineStage?.value
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
    fetchCustomerActivitiesByContactId,
    fetchCustomerNotesByContactId,
    fetchCustomerTasksByContactId
  ])

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1')
}
