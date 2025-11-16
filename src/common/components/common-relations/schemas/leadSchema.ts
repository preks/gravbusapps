import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const leadSegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  leadStatusRef: z.string().optional(),
  leadSourceRef: z.string().optional(),
  leadRatingRef: z.string().optional(),
  sensitive: z.boolean().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  academicTitleRef: z.string().optional(),
  jobPosition: z.string().optional(),
  legalFormRef: z.string().optional(),
  industryRef: z.string().optional(),
  website: z.string().optional(),
  companyEmail: z.string().optional(),
  companyPhone: z.string().optional(),
  numberOfEmployees: z.string().optional(),
  annualRevenue: z.string().optional(),
  description: z.string().optional(),
  notesSummary: z.string().optional(),
  communicationChannels: z
    .array(
      z.object({
        channelRef: z.string(),
        value: z.string().min(1, 'Value is required')
      })
    )
    .optional(),
  addresses: z
    .array(
      z.object({
        addressTypeRef: z.string().optional(),
        countryRef: z.string().optional(),
        line1: z.string().optional(),
        line2: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional()
      })
    )
    .optional()
})

export type LeadSegmentSchema = z.infer<typeof leadSegmentSchema>

export const createLeadSegmentResolver = () => zodResolver(leadSegmentSchema)
