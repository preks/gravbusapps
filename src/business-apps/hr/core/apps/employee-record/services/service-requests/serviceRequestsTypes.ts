/**
 * Type definitions for service requests
 * Uses the standard SubmittedRequest type from SER for compatibility
 */

export interface SubmittedRequest {
  id: string
  templateId: string
  templateVersion: number
  requesterId: string
  createdAt: string
  status: 'open' | 'in_progress' | 'completed' | 'canceled'
  titleSnapshot: string
  categoryIdSnapshot: string
  formData: any
  steps: StepInstance[]
  timeline: Array<{ at: string; message: string }>
}

export interface StepInstance {
  id: string
  name: string
  status: string
  assignedToUserId?: string
  startedAt?: string
  finishedAt?: string
  dueDate?: string
  comments: any[]
}
