import { z } from 'zod'

/**
 * Activity Schema based on Activity Type (single source of truth)
 * All fields must match the Activity interface
 */
export const activitySchema = z
  .object({
    // BaseEntity fields
    id: z.string().optional(),
    version: z.number().optional(),
    createdAt: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
    isDeleted: z.boolean().optional(),
    recordState: z.string().nullable().optional(),
    activeFrom: z.string().nullable().optional(),
    activeTo: z.string().nullable().optional(),
    additionalProperties: z.any().optional(),

    // Activity specific fields
    title: z.string().min(1, 'Title is required'),
    activityTypeRef: z.string().min(1, 'Activity type is required'),
    occurredAt: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    completedAt: z.string().nullable().optional(),
    source: z.string().nullable().optional(),

    // Related entities (IDs only for form)
    accountId: z.string().nullable().optional(),
    contactId: z.string().nullable().optional(),
    opportunityId: z.string().nullable().optional(),
    leadId: z.string().nullable().optional(),
    investmentId: z.string().nullable().optional(), // IRM-specific
    ownerEmployeeId: z.string().nullable().optional(),

    // Related entities (full objects for display - not in form values)
    account: z.any().optional(),
    contact: z.any().optional(),
    opportunity: z.any().optional(),
    lead: z.any().optional(),
    investment: z.any().optional(), // IRM-specific
    ownerEmployee: z.any().optional(),

    // Documents
    documents: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          version: z.number().optional(),
          mimeType: z.string().nullable().optional(),
          fileSize: z.number().nullable().optional(),
          fileInfo: z.any().optional()
        })
      )
      .optional(),

    // Legacy/helper fields
    files: z.any().optional(), // Legacy field - kept for backward compatibility
    _pendingFiles: z.array(z.instanceof(File)).optional(), // Files pending upload
    relatedEntityId: z.string().nullable().optional() // Helper field for validation
  })
  .superRefine((data, ctx) => {
    const hasAnyEntity =
      data.accountId || data.contactId || data.opportunityId || data.leadId || data.investmentId || data.relatedEntityId

    if (!hasAnyEntity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Related entity is required',
        path: ['relatedEntityId']
      })
    }
  })

export type ActivitySchema = z.infer<typeof activitySchema>
