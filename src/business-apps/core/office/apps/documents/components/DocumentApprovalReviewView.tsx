import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Spinner, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { officeClient } from '@/common/network/office/OfficeClient'
import { mapApiDocumentToDocument } from '../utils/documentOfficeOperations'
import type { Document, DocumentReviewContext } from '../types'
import { PagedDocumentEditor } from './PagedDocumentEditor'
import { DocumentApprovalReviewBanner } from './DocumentApprovalReviewBanner'
import translations from '../_i18n'

interface DocumentApprovalReviewViewProps {
  currentDocument: Document
  accessToken: string
  userInfo: unknown
  handleBack: () => void
  loadDocument: (id: string) => Promise<Document | null>
  onApprovalResolved?: () => Promise<void> | void
  testId: string
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

function getReviewVersionFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search)
  const version = Number(params.get('version'))

  if (!Number.isInteger(version) || version < 1) {
    return null
  }

  return version
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
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

  if (error === t('review-error-missing-version')) {
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

function buildReviewDocument(currentDocument: Document, reviewContext: DocumentReviewContext): Document | null {
  if (!reviewContext.reviewSnapshot) {
    return null
  }

  const snapshot = reviewContext.reviewSnapshot
  return mapApiDocumentToDocument({
    ...snapshot,
    id: currentDocument.id,
    status: currentDocument.status,
    ownerId: currentDocument.createdBy,
    currentVersion: reviewContext.versionUnderReview,
    settings: snapshot.settings ?? currentDocument.settings,
    sourceFileInfo: snapshot.sourceFileInfo ?? currentDocument.sourceFile
  })
}

export function DocumentApprovalReviewView({
  currentDocument,
  accessToken,
  userInfo,
  handleBack,
  loadDocument,
  onApprovalResolved,
  testId
}: DocumentApprovalReviewViewProps): React.ReactElement {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken)
  const [reviewContext, setReviewContext] = useState<DocumentReviewContext | null>(null)
  const [requesterDisplayInfo, setRequesterDisplayInfo] = useState<RequesterDisplayInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reviewVersion = useMemo(() => getReviewVersionFromUrl(), [])

  const fetchReviewContext = useCallback(async () => {
    if (!reviewVersion) {
      setError(t('review-error-missing-version'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      officeClient.setAccessToken(accessToken)
      const response = await officeClient.documents.getReviewContext<DocumentReviewContext>(
        currentDocument.id,
        reviewVersion
      )
      setReviewContext(response)
    } catch (fetchError) {
      console.error('[DocumentApprovalReviewView] Failed to load review context:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : t('review-error-load-context'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, currentDocument.id, reviewVersion, t])

  useEffect(() => {
    void fetchReviewContext()
  }, [fetchReviewContext])

  useEffect(() => {
    const requestedBy = reviewContext?.approvalRequest.requestedBy

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
  }, [graphqlClient, reviewContext?.approvalRequest.requestedBy])

  const handleDecision = useCallback(
    async (decision: 'approved' | 'rejected') => {
      if (!reviewContext) {
        return
      }

      setIsSubmitting(true)

      try {
        officeClient.setAccessToken(accessToken)
        await officeClient.documents.respondToApproval(reviewContext.approvalRequest.id, { decision })
        await fetchReviewContext()
        await loadDocument(currentDocument.id)
        await onApprovalResolved?.()
        toast.success(decision === 'approved' ? t('review-toast-approved') : t('review-toast-rejected'))
      } catch (submitError) {
        console.error('[DocumentApprovalReviewView] Failed to respond to approval:', submitError)
        toast.error(submitError instanceof Error ? submitError.message : t('review-error-update-approval'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [accessToken, currentDocument.id, fetchReviewContext, loadDocument, onApprovalResolved, reviewContext, t]
  )

  const reviewDocument = reviewContext ? buildReviewDocument(currentDocument, reviewContext) : null
  const displayApprovalRequest = useMemo(() => {
    if (!reviewContext) {
      return null
    }

    return {
      ...reviewContext.approvalRequest,
      requestedAt:
        reviewContext.approvalRequest.requestedAt ||
        reviewContext.approvalRequest.createdAt ||
        reviewContext.reviewVersion?.createdAt ||
        '',
      requestedByName: requesterDisplayInfo?.name,
      requestedByPicture: requesterDisplayInfo?.avatar
    }
  }, [requesterDisplayInfo, reviewContext])

  if (isLoading) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !reviewContext || !reviewDocument || !displayApprovalRequest) {
    const errorDisplay = getReviewErrorDisplay(error, t)

    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:px-6">
        <Card className="gba:max-w-lg gba:w-full gba:p-6 gba:text-center">
          <AlertCircle className="gba:mx-auto gba:mb-4 gba:h-12 gba:w-12 gba:text-destructive" />
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{errorDisplay.title}</h2>
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{errorDisplay.description}</p>
          {error && errorDisplay.allowRetry && <p className="gba:mt-3 gba:text-xs gba:text-destructive">{error}</p>}
          <div className="gba:mt-6 gba:flex gba:justify-center gba:gap-2">
            <Button variant="outline" onClick={handleBack} data-testid={`${testId}-review-error-back`}>
              {t('review-error-back')}
            </Button>
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

  return (
    <PagedDocumentEditor
      key={`${currentDocument.id}-review-${reviewContext.versionUnderReview}`}
      initialContent={reviewDocument.content}
      initialTitle={reviewDocument.title}
      initialFormatting={reviewDocument.formatting}
      isReadOnly
      isReviewMode
      onSave={async () => {}}
      onBack={handleBack}
      headerExtra={
        <DocumentApprovalReviewBanner
          approvalRequest={displayApprovalRequest}
          approvalMetadata={reviewContext.approvalMetadata}
          latestLiveVersion={reviewContext.latestLiveVersion}
          versionUnderReview={reviewContext.versionUnderReview}
          hasLiveChanges={reviewContext.hasLiveChanges}
          canRespond={reviewContext.canRespond}
          isSubmitting={isSubmitting}
          onApprove={() => {
            void handleDecision('approved')
          }}
          onReject={() => {
            void handleDecision('rejected')
          }}
          data-testid={`${testId}-review-banner`}
        />
      }
      accessToken={accessToken}
      userInfo={userInfo as UserInfoProps | undefined}
      data-testid={`${testId}-review-editor`}
    />
  )
}

export default DocumentApprovalReviewView
