import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const opportunitySegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  opportunityName: z.string().min(1, 'Opportunity name is required'),
  accountId: z.string().nullable().optional(),
  estimatedAmount: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  estimatedCloseDate: z.string().nullable().optional(),
  pipelineRef: z.string().nullable().optional(),
  stageRef: z.string().nullable().optional(),
  statusRef: z.string().nullable().optional(),
  probability: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notesSummary: z.string().nullable().optional()
})

export type OpportunitySegmentSchema = z.infer<typeof opportunitySegmentSchema>

export const createOpportunitySegmentResolver = () => zodResolver(opportunitySegmentSchema)
