import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const opportunitySchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  name: z.string().min(1, 'Opportunity name is required'),
  accountId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  estimatedAmount: z.string().nullable().optional(),
  currencyRef: z.string().nullable().optional(),
  closeDate: z.string().nullable().optional(),
  opportunityPipelineRef: z.string().min(1, 'Pipeline is required'),
  opportunityPipelineStageRef: z.string().min(1, 'Stage is required'),
  opportunityStatusRef: z.string().nullable().optional(),
  opportunityForecastRef: z.string().nullable().optional(),
  winningChance: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notesSummary: z.string().nullable().optional(),
  id: z.string().optional(),
  version: z.number().optional(),
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
  communicationChannels: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        communicationChannelRef: z.string().nullable().optional(),
        value: z.string().nullable().optional(),
        valueExtension: z.string().nullable().optional()
      })
    )
    .optional(),
  opportunityContacts: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        contactId: z.string().optional(),
        contactType: z.string().nullable().optional()
      })
    )
    .optional()
})

export type OpportunitySchema = z.infer<typeof opportunitySchema>

export const createOpportunitySegmentResolver = () => zodResolver(opportunitySchema)
