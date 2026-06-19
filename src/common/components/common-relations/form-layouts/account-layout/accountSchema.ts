import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getInvalidPhoneCommunicationChannelIndexes } from '../../form-segments/communication-segment/communicationPhoneValidation'

export const accountSchema = z
  .object({
    ownerEmployeeId: z.string().trim().min(1, 'Owner is required'),
    name: z.string().trim().min(1, 'Account name is required'),
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
        z
          .object({
            id: z.string().optional(),
            version: z.number().optional(),
            accountId: z.string().optional(),
            contactId: z.string().optional(),
            contactType: z.string().nullable().optional(),
            // Inline-create draft markers: present only when the row was created via the
            // inline "+ Create new" affordance and not yet persisted. The embedded entity
            // payload is validated by the inline-create dialog before being added here.
            __isDraft: z.boolean().optional(),
            __draftId: z.string().optional(),
            account: z.record(z.string(), z.any()).optional(),
            contact: z.record(z.string(), z.any()).optional()
          })
          .refine(
            entry =>
              entry.__isDraft === true
                ? Boolean(entry.account || entry.contact)
                : Boolean(entry.accountId || entry.contactId || entry.id),
            {
              message: 'Each association must reference an existing entity or carry an inline-created draft'
            }
          )
      )
      .optional()
  })
  .superRefine((data, ctx) => {
    getInvalidPhoneCommunicationChannelIndexes(data.communicationChannels).forEach(index => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid phone number',
        path: ['communicationChannels', index, 'value']
      })
    })
  })

export type AccountSchema = z.infer<typeof accountSchema>

export const createAccountSegmentResolver = () => zodResolver(accountSchema)
