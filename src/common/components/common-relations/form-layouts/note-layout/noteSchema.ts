import { z } from 'zod'

/**
 * Note Schema based on Note Type (single source of truth)
 * All fields must match the Note interface
 */
export const noteSchema = z.object({
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

  // Note specific fields
  title: z.string().min(1, 'Title is required'),
  text: z.string().min(1, 'Note text is required'),
  reminderDate: z.string().optional(),
  source: z.string().optional(),

  // Related entities (IDs only for form)
  accountId: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  leadId: z.string().optional(),
  authorEmployeeId: z.string().optional(),

  // Related entities (full objects for display - not in form values)
  account: z.any().optional(),
  contact: z.any().optional(),
  opportunity: z.any().optional(),
  lead: z.any().optional(),
  authorEmployee: z.any().optional(),

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
  _pendingFiles: z.array(z.instanceof(File)).optional(),
  relatedEntityId: z.string().optional() // Helper field for validation
})

export type NoteSchema = z.infer<typeof noteSchema>
