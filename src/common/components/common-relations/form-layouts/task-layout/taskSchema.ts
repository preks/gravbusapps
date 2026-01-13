import { z } from 'zod'

/**
 * Task Schema based on Task Type (single source of truth)
 * All fields must match the Task interface
 */
export const taskSchema = z.object({
  // BaseEntity fields
  id: z.string().optional(),
  version: z.number().optional(),
  // Task specific fields
  name: z.string().min(1, 'Name is required'),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  taskTiming: z.enum(['DEADLINE', 'SCHEDULED']).refine(v => !!v, {
    message: 'Timing is required'
  }),
  dueDate: z.string().min(1, 'Deadline is required'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  templateStartDate: z.string().nullable().optional(),

  // Task catalog references
  taskTypeRef: z.string().nullable().optional(),
  taskPriorityRef: z.string().min(1, 'Priority is required'),
  taskStatusRef: z.string().nullable().optional(), // Backend computed, not required from user
  taskTemplateId: z.string().nullable().optional(),

  // Related entities (IDs only for form)
  accountId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  opportunityId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  assignedEmployeeId: z.string().nullable().optional(),
  creatorEmployeeId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
  creatorUserId: z.string().nullable().optional(),

  // Employee objects (for EmployeeSelect initialEmployee prop - avoids extra request)
  assignedEmployee: z.any().optional(),
  creatorEmployee: z.any().optional(),

  // Task Assignees (multiple assignees support - junction table)
  taskAssignees: z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        assignedEmployeeId: z.string().optional(),
        assignedUserId: z.string().nullable().optional(),
        taskStatus: z.string().nullable().optional(),
        completedAt: z.string().nullable().optional()
      })
    )
    .optional(),

  // Helper fields for MultiEmployeeSelect (not sent to backend)
  assignedEmployeeIds: z.array(z.string()).optional(),
  assignedEmployees: z.array(z.any()).optional(),

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
  source: z.string().nullable().optional(),

  // Legacy/helper fields
  files: z.any().optional(),
  _pendingFiles: z.array(z.instanceof(File)).optional(),
  relatedEntityId: z.string().min(1, 'Related entity is required')
})

export type TaskSchema = z.infer<typeof taskSchema>
