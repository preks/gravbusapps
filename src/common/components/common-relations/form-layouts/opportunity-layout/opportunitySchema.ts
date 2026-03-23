import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// I18n error message keys
export const OPPORTUNITY_VALIDATION_ERRORS = {
  OWNER_REQUIRED: 'opportunity.validation.ownerRequired',
  NAME_REQUIRED: 'opportunity.validation.nameRequired',
  STAGE_REQUIRED_WHEN_PIPELINE_SELECTED: 'opportunity.validation.stageRequiredWhenPipelineSelected'
} as const

// Base schema without refinements (allows extending)
export const opportunitySchemaBase = z.object({
  ownerEmployeeId: z.string().min(1, OPPORTUNITY_VALIDATION_ERRORS.OWNER_REQUIRED),
  name: z.string().min(1, OPPORTUNITY_VALIDATION_ERRORS.NAME_REQUIRED),
  accountId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  estimatedAmount: z.coerce.number().nullable().optional(),
  currencyRef: z.string().nullable().optional(),
  closeDate: z.string().nullable().optional(),
  opportunityPipelineRef: z.string().nullable().optional(),
  opportunityPipelineStageRef: z.string().nullable().optional(),
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
      z
        .object({
          id: z.string().optional(),
          version: z.number().optional(),
          contactId: z.string().optional(),
          contactType: z.string().nullable().optional()
        })
        .strict() // Only allow defined fields - prevents nested objects
    )
    .optional(),
  opportunityAccounts: z
    .array(
      z
        .object({
          id: z.string().optional(),
          version: z.number().optional(),
          accountId: z.string().optional(),
          accountTypeRef: z.string().nullable().optional()
        })
        .strict() // Only allow defined fields - prevents nested objects
    )
    .optional()
})

// Helper function to add pipeline/stage validation refinement
export const addPipelineStageRefinement = <T extends z.ZodObject<any>>(schema: T) => {
  return schema.refine(
    data => {
      // If pipeline is selected, stage must also be selected
      const pipelineValue = data.opportunityPipelineRef
      const stageValue = data.opportunityPipelineStageRef

      // Helper to check if a value is empty (null, undefined, or empty string)
      const isEmpty = (val: any): boolean => {
        return val === null || val === undefined || (typeof val === 'string' && val.trim() === '')
      }

      // If pipeline has a value, stage must also have a value
      if (!isEmpty(pipelineValue)) {
        return !isEmpty(stageValue)
      }
      return true
    },
    {
      message: OPPORTUNITY_VALIDATION_ERRORS.STAGE_REQUIRED_WHEN_PIPELINE_SELECTED,
      path: ['opportunityPipelineStageRef']
    }
  )
}

// Export schema with refinement for direct use
export const opportunitySchema = addPipelineStageRefinement(opportunitySchemaBase)

export type OpportunitySchema = z.infer<typeof opportunitySchema>

export const createOpportunitySegmentResolver = () => zodResolver(opportunitySchema)
