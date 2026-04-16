import React, { useCallback, useState } from 'react'
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import {
  DocumentApprovalReviewPanel,
  type DocumentApprovalReviewBannerMode,
  type DocumentApprovalReviewLoadedMeta,
  type DocumentApprovalReviewSource
} from './DocumentApprovalReviewPanel'
import translations from '../_i18n'

export interface DocumentApprovalReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: DocumentApprovalReviewSource
  accessToken: string
  userInfo?: UserInfoProps | unknown
  /** Defaults to `metadataOnly` for embed use cases (Every Box) where approve/reject lives elsewhere. */
  bannerMode?: DocumentApprovalReviewBannerMode
  title?: string
  description?: string
  onApprovalResolved?: () => Promise<void> | void
  testId?: string
}

export function DocumentApprovalReviewDialog({
  open,
  onOpenChange,
  source,
  accessToken,
  userInfo,
  bannerMode = 'metadataOnly',
  title,
  description,
  onApprovalResolved,
  testId = 'document-approval-review-dialog'
}: Readonly<DocumentApprovalReviewDialogProps>): React.ReactElement {
  const { t } = useTranslation(translations)
  const [loadedMeta, setLoadedMeta] = useState<DocumentApprovalReviewLoadedMeta | null>(null)

  const handleContextLoaded = useCallback((meta: DocumentApprovalReviewLoadedMeta) => {
    setLoadedMeta(meta)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const resolvedTitle = title ?? loadedMeta?.documentTitle ?? t('review-dialog-title-fallback')
  const resolvedDescription = description ?? t('review-dialog-description')
  const versionLabel = loadedMeta?.versionUnderReview ? `v${loadedMeta.versionUnderReview}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-6xl gba:w-full gba:h-[min(90vh,56rem)] gba:p-0 gba:flex gba:flex-col"
        data-testid={testId}
      >
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <DialogTitle className="gba:truncate gba:text-base gba:font-semibold">{resolvedTitle}</DialogTitle>
            {versionLabel && (
              <Badge variant="outline" className="gba:shrink-0" data-testid={`${testId}-version`}>
                {versionLabel}
              </Badge>
            )}
          </div>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:border-t gba:border-border">
          <DocumentApprovalReviewPanel
            source={source}
            accessToken={accessToken}
            userInfo={userInfo}
            bannerMode={bannerMode}
            onApprovalResolved={onApprovalResolved}
            onContextLoaded={handleContextLoaded}
            onBack={handleClose}
            onErrorBack={handleClose}
            testId={`${testId}-panel`}
          />
        </div>
        <DialogFooter className="gba:px-6 gba:py-4 gba:border-t gba:border-border">
          <Button variant="outline" onClick={handleClose} data-testid={`${testId}-close`}>
            {t('review-dialog-close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentApprovalReviewDialog
