import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const contactSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  salutationRef: z.string().nullable().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  academicTitleRef: z.string().nullable().optional(),
  languageRef: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notesSummary: z.string().nullable().optional(),
  jobPosition: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  communicationChannels: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        communicationChannelRef: z.string(),
        value: z.string().optional(),
        valueExtension: z.string().nullable().optional()
      })
    )
    .optional(),
  accountContacts: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        accountId: z.string().optional(),
        contactId: z.string().optional(),
        contactType: z.string().nullable().optional()
      })
    )
    .optional(),
  picture: z.string().nullable().optional(),
  pictureThumbnail: z.string().nullable().optional(),
  id: z.string().optional(),
  version: z.number().optional()
})

export type ContactSchema = z.infer<typeof contactSchema>

export const createContactSegmentResolver = () => zodResolver(contactSchema)
