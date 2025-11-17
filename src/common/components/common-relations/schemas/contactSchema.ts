import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const contactSegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  contactTypeRef: z.string().nullable().optional(),
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
  type: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  communicationChannels: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        communicationChannelRef: z.string(),
        value: z.string().min(1, 'Value is required'),
        valueExtension: z.string().nullable().optional()
      })
    )
    .optional(),
  addresses: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        addressType: z.string().nullable().optional(),
        addressLines: z.array(z.string().nullable()).nullable().optional(),
        postalCode: z.string().nullable().optional(),
        locality: z.string().nullable().optional(),
        regionRef: z.string().nullable().optional(),
        countryRef: z.string().nullable().optional()
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
        contactType: z.string().nullable().optional(),
        account: z.any().optional()
      })
    )
    .optional(),
  salesCampaignId: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  pictureThumbnail: z.string().nullable().optional(),
  id: z.string().optional(),
  version: z.number().optional()
})

export type ContactSegmentSchema = z.infer<typeof contactSegmentSchema>

export const createContactSegmentResolver = () => zodResolver(contactSegmentSchema)
