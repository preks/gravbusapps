import { z } from 'zod'

/**
 * Note Schema based on Note Type (single source of truth)
 * All fields must match the Note interface
 */
export const noteSchema = z.object({
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

  // Note specific fields
  title: z.string().trim().min(1, 'Title is required'),
  text: z.string().trim().min(1, 'Note text is required'),
  reminderDate: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  /** CRM CrmNote.noteType; hidden in UI, preserved on update */
  noteType: z.enum(['UNKNOWN_NOTE_TYPE', 'GENERAL_NOTE', 'NEXT_STEP_NOTE']).nullable().optional(),

  // Related entities (IDs only for form)
  accountId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  opportunityId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  investmentId: z.string().nullable().optional(), // IRM-specific
  authorEmployeeId: z.string().nullable().optional(),

  // Related entities (full objects for display - not in form values)
  account: z.any().optional(),
  contact: z.any().optional(),
  opportunity: z.any().optional(),
  lead: z.any().optional(),
  investment: z.any().optional(), // IRM-specific
  authorEmployee: z.any().optional(),

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
  _pendingFiles: z.array(z.instanceof(File)).optional(),
  relatedEntityId: z.string().nullable().optional() // Helper field for validation
})

export type NoteSchema = z.infer<typeof noteSchema>
