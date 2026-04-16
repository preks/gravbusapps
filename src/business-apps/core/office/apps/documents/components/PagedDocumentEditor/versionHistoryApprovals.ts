import type { VersionHistoryApprovalDetails } from '@/business-apps/platform/apps/shared/components/VersionHistory'

type DocumentApprovalHistoryStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
type DocumentApprovalHistoryStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped'

export interface DocumentApprovalHistoryStep {
  approverId: string
  status: DocumentApprovalHistoryStepStatus
  respondedAt?: string | null
  comments?: string | null
}

export interface DocumentApprovalHistoryRequest {
  id: string
  requestedBy: string
  requestedByName?: string
  requestedByPicture?: string
  createdAt?: string
  requestedAt?: string
  status: DocumentApprovalHistoryStatus
  versionAtRequest?: number | null
  steps?: DocumentApprovalHistoryStep[]
}

export interface VersionHistoryApprovalSummary {
  approvalDetailsByVersion: Record<number, VersionHistoryApprovalDetails>
  approvalUserIds: string[]
  approvedCount: number
  pendingCount: number
}

function isVersionNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function getRequestedAtValue(approval: DocumentApprovalHistoryRequest): string {
  return approval.requestedAt || approval.createdAt || ''
}

export function buildVersionHistoryApprovalSummary(
  approvals: DocumentApprovalHistoryRequest[],
  currentUserId?: string
): VersionHistoryApprovalSummary {
  const approvalDetailsByVersion: Record<number, VersionHistoryApprovalDetails> = {}
  const approvalUserIds = new Set<string>()
  let approvedCount = 0
  let pendingCount = 0

  for (const approval of approvals) {
    if (approval.status === 'approved') {
      approvedCount += 1
    }

    if (approval.status === 'pending') {
      pendingCount += 1
    }

    if (approval.requestedBy) {
      approvalUserIds.add(approval.requestedBy)
    }

    const reviewers = (approval.steps ?? []).map(step => {
      if (step.approverId) {
        approvalUserIds.add(step.approverId)
      }

      const stepComments = step.comments?.trim()

      return {
        userId: step.approverId,
        status: step.status,
        respondedAt: step.respondedAt ?? undefined,
        ...(stepComments ? { comments: stepComments } : {})
      }
    })

    if (!isVersionNumber(approval.versionAtRequest) || approvalDetailsByVersion[approval.versionAtRequest]) {
      continue
    }

    const canReview = Boolean(
      currentUserId &&
        approval.status === 'pending' &&
        reviewers.some(step => step.userId === currentUserId && step.status === 'pending')
    )

    const canViewApproved = approval.status === 'approved'

    approvalDetailsByVersion[approval.versionAtRequest] = {
      requestId: approval.id,
      requestStatus: approval.status,
      requestedBy: approval.requestedBy,
      requestedByName: approval.requestedByName,
      requestedByPicture: approval.requestedByPicture,
      requestedAt: getRequestedAtValue(approval),
      reviewers,
      canReview,
      canViewApproved
    }
  }

  return {
    approvalDetailsByVersion,
    approvalUserIds: Array.from(approvalUserIds),
    approvedCount,
    pendingCount
  }
}
