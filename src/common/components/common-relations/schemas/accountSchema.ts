import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const accountSegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  name: z.string().min(1, 'Account name is required'), // Fixed: was 'accountName'
  legalFormRef: z.string().nullable().optional(),
  industryClassRef: z.string().nullable().optional(), // Fixed: was 'industryRef'
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  companySizeRef: z.string().nullable().optional(), // Fixed: was 'numberOfEmployees'
  accountAnnualRevenueBandRef: z.string().nullable().optional(), // Fixed: was 'annualRevenue'
  foundationDate: z.string().nullable().optional(),
  notesSummary: z.string().nullable().optional(),
  pictureFile: z.any().optional(),
  code: z.string().nullable().optional(),
  id: z.string().optional(),
  version: z.number().optional(),
  communicationChannels: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        communicationChannelRef: z.string(), // Fixed: was 'channelRef'
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
        addressType: z.string().nullable().optional(), // Fixed: was 'addressTypeRef'
        addressLines: z.array(z.string().nullable()).nullable().optional(), // Fixed: was 'line1', 'line2'
        countryRef: z.string().nullable().optional(),
        regionRef: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        locality: z.string().nullable().optional() // Fixed: was 'city'
      })
    )
    .optional(),
  relatedEntityId: z.string().optional(),
  contacts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        contactType: z.string().optional(),
        associationId: z.string().optional(),
        associationVersion: z.number().optional()
      })
    )
    .optional()
})

export type AccountSegmentSchema = z.infer<typeof accountSegmentSchema>

export const createAccountSegmentResolver = () => zodResolver(accountSegmentSchema)
