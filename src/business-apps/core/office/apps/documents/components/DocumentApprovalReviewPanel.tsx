import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Spinner, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { officeClient } from '@/common/network/office/OfficeClient'
import type { Document, DocumentApprovalRequest, DocumentReviewContext } from '../types'
import { PagedDocumentEditor } from './PagedDocumentEditor'
import { DocumentApprovalReviewBanner } from './DocumentApprovalReviewBanner'
import { buildReviewDocument, fetchReviewContextForApproval } from './documentApprovalReviewShared'
import translations from '../_i18n'

export type DocumentApprovalReviewSource =
  | { kind: 'document'; document: Document; version: number }
  | { kind: 'approvalRequest'; approvalRequestId: string; baseDocument?: Document }

export type DocumentApprovalReviewBannerMode = 'full' | 'metadataOnly' | 'hidden'

export interface DocumentApprovalReviewPanelProps {
  source: DocumentApprovalReviewSource
  accessToken: string
  userInfo?: unknown
  bannerMode?: DocumentApprovalReviewBannerMode
  onBack?: () => void
  /** Shown in the error card "go back" button; falls back to {@link onBack}. */
  onErrorBack?: () => void
  /** Called after a successful approve/reject when `bannerMode` is `full`. */
  onApprovalResolved?: () => Promise<void> | void
  /** Allows parent to react when the review has been loaded (e.g. to update dialog title). */
  onContextLoaded?: (context: DocumentApprovalReviewLoadedMeta) => void
  testId?: string
}

export interface DocumentApprovalReviewLoadedMeta {
  documentTitle: string
  versionUnderReview: number
  approvalStatus: DocumentApprovalRequest['status']
  approvalRequest: DocumentApprovalRequest
  reviewContext: DocumentReviewContext
}

interface EmployeeLightRow {
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
}

interface RequesterDisplayInfo {
  name?: string
  avatar?: string
}

interface ReviewErrorDisplay {
  title: string
  description: string
  allowRetry: boolean
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) {
    return undefined
  }
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

function getReviewErrorDisplay(
  error: string | null,
  t: (key: string, vars?: Record<string, string | number>) => string
): ReviewErrorDisplay {
  if (
    error?.includes('Only assigned approvers can open this review URL') ||
    error?.includes('REST request failed: 403')
  ) {
    return {
      title: t('review-error-forbidden-title'),
      description: t('review-error-forbidden-description'),
      allowRetry: false
    }
  }

  if (error === t('review-error-missing-version') || error === 'approval-request-missing-version') {
    return {
      title: t('review-error-invalid-link-title'),
      description: t('review-error-invalid-link-description'),
      allowRetry: false
    }
  }

  return {
    title: t('review-error-load-title'),
    description: t('review-error-load-description'),
    allowRetry: true
  }
}

function resolveBaseDocument(source: DocumentApprovalReviewSource): Document | null {
  if (source.kind === 'document') {
    return source.document
  }
  return source.baseDocument ?? null
}

export function DocumentApprovalReviewPanel({
  source,
  accessToken,
  userInfo,
  bannerMode = 'full',
  onBack,
  onErrorBack,
  onApprovalResolved,
  onContextLoaded,
  testId = 'document-approval-review'
}: Readonly<DocumentApprovalReviewPanelProps>): React.ReactElement {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken)
  const [reviewContext, setReviewContext] = useState<DocumentReviewContext | null>(null)
  const [approvalRequest, setApprovalRequest] = useState<DocumentApprovalRequest | null>(null)
  const [requesterDisplayInfo, setRequesterDisplayInfo] = useState<RequesterDisplayInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseDocument = useMemo(() => resolveBaseDocument(source), [source])

  const fetchReviewContext = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      officeClient.setAccessToken(accessToken)

      if (source.kind === 'document') {
        if (!Number.isInteger(source.version) || source.version < 1) {
          setError(t('review-error-missing-version'))
          return
        }
        const response = await officeClient.documents.getReviewContext<DocumentReviewContext>(
          source.document.id,
          source.version
        )
        setReviewContext(response)
        setApprovalRequest(response.approvalRequest)
        return
      }

      const { approvalRequest: loadedRequest, reviewContext: loadedContext } = await fetchReviewContextForApproval(
        officeClient,
        source.approvalRequestId
      )
      setApprovalRequest(loadedRequest)
      setReviewContext(loadedContext)
    } catch (fetchError) {
      console.error('[DocumentApprovalReviewPanel] Failed to load review context:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : t('review-error-load-context'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, source, t])

  useEffect(() => {
    void fetchReviewContext()
  }, [fetchReviewContext])

  useEffect(() => {
    const requestedBy = approvalRequest?.requestedBy

    if (!requestedBy) {
      setRequesterDisplayInfo(null)
      return
    }

    let cancelled = false
    setRequesterDisplayInfo(null)

    const loadRequesterDisplayInfo = async () => {
      try {
        const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(requestedBy)
        const response = await graphqlClient.request<{ Employee: EmployeeLightRow[] }>(query)
        const employee = response.Employee?.[0]

        if (cancelled) {
          return
        }

        const resolvedName =
          employee?.displayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || requestedBy

        setRequesterDisplayInfo({
          name: resolvedName,
          avatar: toAvatarDataUrl(employee?.pictureThumbnail)
        })
      } catch {
        if (!cancelled) {
          setRequesterDisplayInfo({ name: requestedBy })
        }
      }
    }

    void loadRequesterDisplayInfo()

    return () => {
      cancelled = true
    }
  }, [graphqlClient, approvalRequest?.requestedBy])

  const reviewDocument = useMemo(() => {
    if (!reviewContext) {
      return null
    }
    return buildReviewDocument(baseDocument, reviewContext)
  }, [baseDocument, reviewContext])

  useEffect(() => {
    if (!reviewContext || !approvalRequest || !reviewDocument) {
      return
    }
    onContextLoaded?.({
      documentTitle: reviewDocument.title,
      versionUnderReview: reviewContext.versionUnderReview,
      approvalStatus: approvalRequest.status,
      approvalRequest,
      reviewContext
    })
  }, [approvalRequest, onContextLoaded, reviewContext, reviewDocument])

  const displayApprovalRequest = useMemo<DocumentApprovalRequest | null>(() => {
    if (!approvalRequest) {
      return null
    }

    return {
      ...approvalRequest,
      requestedAt:
        approvalRequest.requestedAt || approvalRequest.createdAt || reviewContext?.reviewVersion?.createdAt || '',
      requestedByName: requesterDisplayInfo?.name,
      requestedByPicture: requesterDisplayInfo?.avatar
    }
  }, [approvalRequest, requesterDisplayInfo, reviewContext])

  const handleDecision = useCallback(
    async (decision: 'approved' | 'rejected') => {
      if (!reviewContext || !approvalRequest) {
        return
      }

      setIsSubmitting(true)

      try {
        officeClient.setAccessToken(accessToken)
        await officeClient.documents.respondToApproval(approvalRequest.id, { decision })
        await fetchReviewContext()
        await onApprovalResolved?.()
        toast.success(decision === 'approved' ? t('review-toast-approved') : t('review-toast-rejected'))
      } catch (submitError) {
        console.error('[DocumentApprovalReviewPanel] Failed to respond to approval:', submitError)
        toast.error(submitError instanceof Error ? submitError.message : t('review-error-update-approval'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [accessToken, approvalRequest, fetchReviewContext, onApprovalResolved, reviewContext, t]
  )

  if (isLoading) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !reviewContext || !reviewDocument || !displayApprovalRequest) {
    const errorDisplay = getReviewErrorDisplay(error, t)
    const handleBackClick = onErrorBack ?? onBack

    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:px-6" data-testid={`${testId}-error`}>
        <Card className="gba:max-w-lg gba:w-full gba:p-6 gba:text-center">
          <AlertCircle className="gba:mx-auto gba:mb-4 gba:h-12 gba:w-12 gba:text-destructive" />
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{errorDisplay.title}</h2>
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{errorDisplay.description}</p>
          {error && errorDisplay.allowRetry && <p className="gba:mt-3 gba:text-xs gba:text-destructive">{error}</p>}
          <div className="gba:mt-6 gba:flex gba:justify-center gba:gap-2">
            {handleBackClick && (
              <Button variant="outline" onClick={handleBackClick} data-testid={`${testId}-review-error-back`}>
                {t('review-error-back')}
              </Button>
            )}
            {errorDisplay.allowRetry && (
              <Button
                onClick={() => {
                  void fetchReviewContext()
                }}
                data-testid={`${testId}-review-error-retry`}
              >
                {t('review-error-retry')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  const showBanner = bannerMode !== 'hidden'
  const canShowBannerActions = bannerMode === 'full'

  return (
    <PagedDocumentEditor
      key={`${reviewDocument.id}-review-${reviewContext.versionUnderReview}`}
      initialContent={reviewDocument.content}
      initialTitle={reviewDocument.title}
      initialFormatting={reviewDocument.formatting}
      isReadOnly
      isReviewMode
      onSave={async () => {}}
      onBack={onBack ?? (() => {})}
      headerExtra={
        showBanner ? (
          <DocumentApprovalReviewBanner
            approvalRequest={displayApprovalRequest}
            approvalMetadata={reviewContext.approvalMetadata}
            latestLiveVersion={reviewContext.latestLiveVersion}
            versionUnderReview={reviewContext.versionUnderReview}
            hasLiveChanges={reviewContext.hasLiveChanges}
            canRespond={canShowBannerActions && reviewContext.canRespond}
            isSubmitting={isSubmitting}
            onApprove={() => {
              void handleDecision('approved')
            }}
            onReject={() => {
              void handleDecision('rejected')
            }}
            data-testid={`${testId}-review-banner`}
          />
        ) : undefined
      }
      accessToken={accessToken}
      userInfo={userInfo as UserInfoProps | undefined}
      data-testid={`${testId}-review-editor`}
    />
  )
}

export default DocumentApprovalReviewPanel
