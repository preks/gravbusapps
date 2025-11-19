import { z } from 'zod'

/**
 * Task Schema based on Task Type (single source of truth)
 * All fields must match the Task interface
 */
export const buildTaskSchema = (options?: {
  requireAssignee?: boolean
  requireEntity?: boolean
  requireType?: boolean
}) => {
  const requireAssignee = options?.requireAssignee !== false
  const requireEntity = options?.requireEntity !== false
  const requireType = options?.requireType !== false

  return z.object({
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

    // Task specific fields
    title: z.string().min(1, 'Title is required'),
    name: z.string().optional(), // Alternative to title
    code: z.string().optional(),
    description: z.string().optional(),
    timingType: z.enum(['DEADLINE', 'SCHEDULED']).refine(v => !!v, {
      message: 'Timing is required'
    }),
    dueDate: z.preprocess(val => (val == null ? '' : val), z.string().min(1, 'Deadline is required')),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    templateStartDate: z.string().optional(),

    // Task catalog references
    taskTypeRef: requireType ? z.string().min(1, 'Type is required') : z.string().optional(),
    taskPriorityRef: z.string().min(1, 'Priority is required'),
    taskStatusRef: z.string().min(1, 'Status is required'),
    taskTemplateId: z.string().optional(),

    // Related entities (IDs only for form)
    accountId: z.string().optional(),
    contactId: z.string().optional(),
    opportunityId: z.string().optional(),
    leadId: z.string().optional(),
    assignedEmployeeId: requireAssignee ? z.string().min(1, 'Assigned employee is required') : z.string().optional(),
    creatorEmployeeId: z.string().optional(),

    // Related entities (full objects for display - not in form values)
    account: z.any().optional(),
    contact: z.any().optional(),
    opportunity: z.any().optional(),
    lead: z.any().optional(),
    assignedEmployee: z.any().optional(),
    creatorEmployee: z.any().optional(),

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

    // Other fields
    source: z.string().optional(),
    taskTiming: z.string().optional(),
    assignedUserId: z.string().optional(),
    creatorUserId: z.string().optional(),

    // Legacy/helper fields
    files: z.any().optional(),
    _pendingFiles: z.array(z.instanceof(File)).optional(),
    relatedEntityId: requireEntity ? z.string().min(1, 'Related entity is required') : z.string().optional()
  })
}

export type TaskSchema = z.infer<ReturnType<typeof buildTaskSchema>>
