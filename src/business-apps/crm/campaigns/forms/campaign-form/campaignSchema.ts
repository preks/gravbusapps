import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const CAMPAIGN_VALIDATION_ERRORS = {
  NAME_REQUIRED: 'campaign-validation-name-required',
  TYPE_REQUIRED: 'campaign-validation-type-required'
} as const

const campaignAccountRowSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  customerAccountId: z.string(),
  customerEngagementLevelRef: z.string().nullable().optional()
})

export const createCampaignFormSchema = (messages: { nameRequired: string; typeRequired: string }) =>
  z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    name: z.string().trim().min(1, messages.nameRequired),
    typeRef: z.string().trim().min(1, messages.typeRequired),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    customerCampaignSegmentRef: z.string().optional(),
    customerPersonaRef: z.string().optional(),
    customerValuePackFocusRef: z.string().optional(),
    customerIndustryFocusRef: z.string().optional(),
    countryRef: z.string().optional(),
    budgetAllocated: z.coerce.number().optional(),
    pipelineTarget: z.coerce.number().optional(),
    expectedWinRate: z.coerce.number().optional(),
    expectedRevenueContribution: z.coerce.number().optional(),
    customerCampaignStatusRef: z.string().optional(),
    ownerEmployeeId: z.string().optional(),
    customerCampaignAccounts: z.array(campaignAccountRowSchema).optional()
  })

export type CampaignFormSchema = z.infer<ReturnType<typeof createCampaignFormSchema>>

export const createCampaignFormResolver = (messages: { nameRequired: string; typeRequired: string }) =>
  zodResolver(createCampaignFormSchema(messages))
