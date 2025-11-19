import { z } from 'zod'

/**
 * Activity Schema based on Activity Type (single source of truth)
 * All fields must match the Activity interface
 */
export const activitySchema = z.object({
  // BaseEntity fields
  id: z.string().optional(),
  version: z.number().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  recordState: z.string().optional(),
  activeFrom: z.string().optional(),
  activeTo: z.string().optional(),
  additionalProperties: z.any().optional(),

  // Activity specific fields
  title: z.string().min(1, 'Title is required'),
  activityTypeRef: z.string().min(1, 'Activity type is required'),
  occurredAt: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  completedAt: z.string().optional(),
  source: z.string().optional(),

  // Related entities (IDs only for form)
  accountId: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  leadId: z.string().optional(),
  ownerEmployeeId: z.string().optional(),

  // Related entities (full objects for display - not in form values)
  account: z.any().optional(),
  contact: z.any().optional(),
  opportunity: z.any().optional(),
  lead: z.any().optional(),
  ownerEmployee: z.any().optional(),

  // Documents
  documents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        version: z.number().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        fileInfo: z.any().optional()
      })
    )
    .optional(),

  // Legacy/helper fields
  files: z.any().optional(), // Legacy field - kept for backward compatibility
  _pendingFiles: z.array(z.instanceof(File)).optional(), // Files pending upload
  relatedEntityId: z.string().optional() // Helper field for validation
})

export type ActivitySchema = z.infer<typeof activitySchema>
