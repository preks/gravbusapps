import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Label, Spinner } from '@newwork/nw-design-system'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/business-apps/platform/apps/every-box-2/utils/taskFormatters'

interface ApprovalDetailsSectionProps {
  approvalStatus?: string | null
  approvalComment?: string | null
  approvalDate?: string | null
  isLoading?: boolean
  prefixDataTestId?: string
}

const ApprovalDetailsSection: React.FC<ApprovalDetailsSectionProps> = ({
  approvalStatus,
  approvalComment,
  approvalDate,
  isLoading = false,
  prefixDataTestId = 'advance-payment-approval-v2'
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
            className={`gba:text-sm gba:font-medium gba:mt-1 gba:flex gba:items-center gba:gap-2 ${
              isApproved ? 'gba:text-success' : isRejected ? 'gba:text-destructive' : ''
            }`}
          >
            {isApproved ? (
              <>
                <CheckCircle className="gba:h-4 gba:w-4" />
                Approved
              </>
            ) : isRejected ? (
              <>
                <AlertCircle className="gba:h-4 gba:w-4" />
                Rejected
              </>
            ) : (
              approvalStatus
            )}
          </div>
        </div>

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
                {approvalComment?.trim() || (isRejected ? 'No comment provided' : '')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ApprovalDetailsSection
