import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Label, Spinner } from '@newwork/nw-design-system'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/business-apps/core/every/apps/every-box/utils/taskFormatters'

interface ApprovalDetailsSectionProps {
  approvalStatus?: string | null
  approvalComment?: string | null
  approvalDate?: string | null
  approverName?: string | null
  isLoadingApprover?: boolean
  isLoading?: boolean
  prefixDataTestId?: string
}

// Helper function to get status class
const getStatusClass = (isApproved: boolean, isRejected: boolean): string => {
  if (isApproved) return 'gba:text-success'
  if (isRejected) return 'gba:text-destructive'
  return ''
}

// Helper function to render status display
const renderStatusDisplay = (isApproved: boolean, isRejected: boolean, approvalStatus: string): React.ReactNode => {
  if (isApproved) {
    return (
      <>
        <CheckCircle className="gba:h-4 gba:w-4" />
        Approved
      </>
    )
  }
  if (isRejected) {
    return (
      <>
        <AlertCircle className="gba:h-4 gba:w-4" />
        Rejected
      </>
    )
  }
  return approvalStatus
}

// Helper function to get comment display
const getCommentDisplay = (approvalComment: string | null | undefined, isRejected: boolean): string => {
  if (approvalComment?.trim()) return approvalComment.trim()
  if (isRejected) return 'No comment provided'
  return ''
}

const ApprovalDetailsSection: React.FC<ApprovalDetailsSectionProps> = ({
  approvalStatus,
  approvalComment,
  approvalDate,
  approverName,
  isLoadingApprover = false,
  isLoading = false,
  prefixDataTestId = 'approve-expense-plan-v2'
}) => {
  // Determine if approved or rejected
  const isApproved = useMemo(() => {
    if (!approvalStatus) return false
    const statusLower = approvalStatus.toLowerCase()
    return statusLower.includes('approved')
  }, [approvalStatus])

  const isRejected = useMemo(() => {
    if (!approvalStatus) return false
    const statusLower = approvalStatus.toLowerCase()
    return statusLower.includes('rejected') || statusLower.includes('returned')
  }, [approvalStatus])

  if (!approvalStatus) {
    return null
  }

  if (isLoading) {
    return (
      <Card data-testid={`${prefixDataTestId}-approval-details-section`}>
        <CardHeader>
          <CardTitle>Approval Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:p-6">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={`${prefixDataTestId}-approval-details-section`}>
      <CardHeader>
        <CardTitle>Approval Details</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Status */}
        <div>
          <Label className="gba:text-sm gba:text-muted-foreground">Status</Label>
          <div
            className={`gba:text-sm gba:font-medium gba:mt-1 gba:flex gba:items-center gba:gap-2 ${getStatusClass(isApproved, isRejected)}`}
          >
            {renderStatusDisplay(isApproved, isRejected, approvalStatus || '')}
          </div>
        </div>

        {/* Approved By - Show approver name when available */}
        {approverName && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Approved By</Label>
              <p className="gba:text-sm gba:mt-1">{isLoadingApprover ? <Spinner size="sm" /> : approverName}</p>
            </div>
          </>
        )}

        {/* Date */}
        {approvalDate && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Date</Label>
              <p className="gba:text-sm gba:mt-1">{formatDateTime(approvalDate)}</p>
            </div>
          </>
        )}

        {/* Comment - Always show for rejected status, or if there is a comment */}
        {(isRejected || approvalComment?.trim()) && (
          <>
            {approvalDate && <Separator />}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Comment</Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:whitespace-pre-wrap">
                {getCommentDisplay(approvalComment, isRejected)}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ApprovalDetailsSection
