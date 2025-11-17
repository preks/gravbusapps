import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const leadSegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().nullable().optional(),
  leadStatusRef: z.string().nullable().optional(),
  leadSourceRef: z.string().nullable().optional(),
  leadRatingRef: z.string().nullable().optional(),
  sensitive: z.boolean().optional(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  academicTitleRef: z.string().nullable().optional(),
  jobPosition: z.string().nullable().optional(),
  legalFormRef: z.string().nullable().optional(),
  industryClassRef: z.string().nullable().optional(), // Fixed: was 'industryRef'
  website: z.string().nullable().optional(),
  companyEmail: z.string().nullable().optional(),
  companyPhone: z.string().nullable().optional(),
  companySizeRef: z.string().nullable().optional(), // Fixed: was 'numberOfEmployees'
  accountAnnualRevenueBandRef: z.string().nullable().optional(), // Fixed: was 'annualRevenue'
  description: z.string().nullable().optional(),
  notesSummary: z.string().nullable().optional(),
  salesCampaignId: z.string().nullable().optional(), // CRM-specific field
  // Flat address fields (no arrays for leads)
  addressLines: z.array(z.string().nullable()).nullable().optional(),
  postalCode: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  regionRef: z.string().nullable().optional(),
  countryRef: z.string().nullable().optional()
})

export type LeadSegmentSchema = z.infer<typeof leadSegmentSchema>

export const createLeadSegmentResolver = () => zodResolver(leadSegmentSchema)
