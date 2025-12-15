import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Label, Spinner } from '@newwork/nw-design-system'
import { CheckCircle, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(localizedFormat)

interface ApprovalDetailsSectionProps {
  approvalStatus?: string | null
  approvalComment?: string | null
  approvalDate?: string | null
  approverName?: string | null
  isLoadingApprover?: boolean
  isLoading?: boolean
  prefixDataTestId?: string
  t: (key: string, vars?: Record<string, unknown>) => string
}

// Helper function to get status class
const getStatusClass = (isApproved: boolean, isRejected: boolean): string => {
  if (isApproved) return 'gba:text-success'
  if (isRejected) return 'gba:text-destructive'
  return ''
}

const ApprovalDetailsSection: React.FC<ApprovalDetailsSectionProps> = ({
  approvalStatus,
  approvalComment,
  approvalDate,
  approverName,
  isLoadingApprover = false,
  isLoading = false,
  prefixDataTestId = 'approve-expense-plan-v2',
  t
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

  // Helper function to render status display
  const renderStatusDisplay = (): React.ReactNode => {
    if (isApproved) {
      return (
        <>
          <CheckCircle className="gba:h-4 gba:w-4" />
          {t('status-approved')}
        </>
      )
    }
    if (isRejected) {
      return (
        <>
          <AlertCircle className="gba:h-4 gba:w-4" />
          {t('status-rejected')}
        </>
      )
    }
    return approvalStatus
  }

  // Helper function to get comment display
  const getCommentDisplay = (): string => {
    if (approvalComment?.trim()) return approvalComment.trim()
    if (isRejected) return t('no-comment-provided')
    return ''
  }

  if (!approvalStatus) {
    return null
  }

  if (isLoading) {
    return (
      <Card data-testid={`${prefixDataTestId}-approval-details-section`}>
        <CardHeader>
          <CardTitle>{t('section-approval-details')}</CardTitle>
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
        <CardTitle>{t('section-approval-details')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Status */}
        <div>
          <Label className="gba:text-sm gba:text-muted-foreground">{t('label-status')}</Label>
          <div
            className={`gba:text-sm gba:font-medium gba:mt-1 gba:flex gba:items-center gba:gap-2 ${getStatusClass(isApproved, isRejected)}`}
          >
            {renderStatusDisplay()}
          </div>
        </div>

        {/* Approved By - Show approver name when available */}
        {approverName && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-reviewed-by')}</Label>
              <p className="gba:text-sm gba:mt-1">{isLoadingApprover ? <Spinner size="sm" /> : approverName}</p>
            </div>
          </>
        )}

        {/* Date */}
        {approvalDate && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-date')}</Label>
              <p className="gba:text-sm gba:mt-1">{dayjs(approvalDate).format('L LT')}</p>
            </div>
          </>
        )}

        {/* Comment - Always show for rejected status, or if there is a comment */}
        {(isRejected || approvalComment?.trim()) && (
          <>
            {approvalDate && <Separator />}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-comment')}</Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:whitespace-pre-wrap">
                {getCommentDisplay()}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ApprovalDetailsSection
