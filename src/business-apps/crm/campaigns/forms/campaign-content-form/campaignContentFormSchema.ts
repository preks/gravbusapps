import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { STANDARD_ENGAGEMENT_METRIC_KEYS, createEmptyEngagementMetricsFormState } from './engagementMetricsUtils'

const optionalNonNegativeNumber = z.preprocess(
  value => (value === '' || value == null ? undefined : value),
  z.coerce.number().min(0).optional()
)

export interface ContentFormValidationMessages {
  metricKeyRequired: string
  metricValueRequired: string
  metricKeyReserved: string
  metricKeyDuplicate: string
}

const customMetricRowSchema = z.object({
  key: z.string(),
  value: optionalNonNegativeNumber
})

const buildEngagementMetricsFormSchema = (messages: ContentFormValidationMessages) =>
  z
    .object({
      standard: z.object({
        views: optionalNonNegativeNumber,
        clicks: optionalNonNegativeNumber,
        shares: optionalNonNegativeNumber,
        comments: optionalNonNegativeNumber,
        impressions: optionalNonNegativeNumber
      }),
      custom: z.array(customMetricRowSchema)
    })
    .superRefine((data, ctx) => {
      const reservedKeys = new Set<string>(STANDARD_ENGAGEMENT_METRIC_KEYS)
      const seenCustom = new Set<string>()

      data.custom.forEach((row, index) => {
        const trimmedKey = row.key.trim()
        const hasKey = trimmedKey.length > 0
        const hasValue = row.value != null && !Number.isNaN(Number(row.value))

        if (!hasKey && !hasValue) {
          return
        }

        if (!hasKey) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.metricKeyRequired,
            path: ['custom', index, 'key']
          })
          return
        }

        if (!hasValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.metricValueRequired,
            path: ['custom', index, 'value']
          })
          return
        }

        const normalized = trimmedKey.toLowerCase()
        if (reservedKeys.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.metricKeyReserved,
            path: ['custom', index, 'key']
          })
          return
        }

        if (seenCustom.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.metricKeyDuplicate,
            path: ['custom', index, 'key']
          })
          return
        }

        seenCustom.add(normalized)
        reservedKeys.add(normalized)
      })
    })

export const createContentSchema = (messages: ContentFormValidationMessages) =>
  z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    publishDate: z.string().optional(),
    assistedOpportunities: z.preprocess(
      value => (value === '' || value == null ? undefined : value),
      z.coerce.number().int().min(0).optional()
    ),
    engagementMetrics: buildEngagementMetricsFormSchema(messages),
    persona: z.string().optional(),
    funnelStage: z.string().optional(),
    channel: z.string().optional(),
    distributionType: z.string().optional()
  })

export type CampaignContentFormValues = z.infer<ReturnType<typeof createContentSchema>>

export const createContentFormResolver = (messages: ContentFormValidationMessages) =>
  zodResolver(createContentSchema(messages))

export const defaultContentFormValues: CampaignContentFormValues = {
  title: '',
  description: '',
  publishDate: '',
  assistedOpportunities: undefined,
  engagementMetrics: createEmptyEngagementMetricsFormState(),
  persona: '',
  funnelStage: '',
  channel: '',
  distributionType: ''
}
