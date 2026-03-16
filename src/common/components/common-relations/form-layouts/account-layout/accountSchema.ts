import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const accountSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  name: z.string().min(1, 'Account name is required'),
  legalFormRef: z.string().nullable().optional(),
  industryClassRef: z.string().nullable().optional(),
  accountPriorityRef: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  companySizeRef: z.string().nullable().optional(),
  accountAnnualRevenueBandRef: z.string().nullable().optional(),
  foundationDate: z.string().nullable().optional(),
  notesSummary: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  pictureThumbnail: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  prospective: z.boolean().default(true),
  id: z.string().optional(),
  version: z.number().optional(),
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
  addresses: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        addressType: z.string().nullable().optional(),
        addressLine: z
          .union([z.string().nullable(), z.object({ lines: z.array(z.string().nullable()) }).nullable()])
          .optional(),
        countryRef: z.string().nullable().optional(),
        regionRef: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        locality: z.string().nullable().optional()
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
    .optional()
})

export type AccountSchema = z.infer<typeof accountSchema>

export const createAccountSegmentResolver = () => zodResolver(accountSchema)
