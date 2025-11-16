import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const opportunitySegmentSchema = z.object({
  ownerEmployeeId: z.string().min(1, 'Owner is required'),
  opportunityName: z.string().min(1, 'Opportunity name is required'),
  accountId: z.string().optional(),
  estimatedAmount: z.string().optional(),
  currency: z.string().optional(),
  estimatedCloseDate: z.string().optional(),
  pipelineRef: z.string().optional(),
  stageRef: z.string().optional(),
  statusRef: z.string().optional(),
  probability: z.string().optional(),
  description: z.string().optional(),
  notesSummary: z.string().optional()
})

export type OpportunitySegmentSchema = z.infer<typeof opportunitySegmentSchema>

export const createOpportunitySegmentResolver = () => zodResolver(opportunitySegmentSchema)
