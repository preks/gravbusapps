/**
 * Types for Onboarding Employee app.
 * Aligned with case-management Case type; used for list and detail views.
 */

import type { CaseStatus } from '@/business-apps/common/apps/case-management/types'

export type { CaseStatus }

/** Minimal case shape for list display (matches Case from case-management) */
export interface OnboardingCaseListItem {
  caseId: string
  state: {
    metadata?: {
      title?: string
      status?: CaseStatus
      assignedTo?: string
    }
    linkedFlows?: { workflowId: string; status?: string }[]
  }
  createdAt: string
  updatedAt: string
}
