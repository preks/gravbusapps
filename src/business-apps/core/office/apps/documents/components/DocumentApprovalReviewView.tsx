import React, { useCallback, useMemo, useState } from 'react'
import { Button, Card, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import type { Document } from '../types'
import { DocumentApprovalReviewPanel } from './DocumentApprovalReviewPanel'
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

function getReviewVersionFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search)
  const version = Number(params.get('version'))

  if (!Number.isInteger(version) || version < 1) {
    return null
  }

  return version
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
  const [refreshToken, setRefreshToken] = useState(0)
  const reviewVersion = useMemo(() => getReviewVersionFromUrl(), [])

  const handleApprovalResolved = useCallback(async () => {
    await loadDocument(currentDocument.id)
    await onApprovalResolved?.()
    setRefreshToken(prev => prev + 1)
  }, [currentDocument.id, loadDocument, onApprovalResolved])

  if (!reviewVersion) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:px-6">
        <Card className="gba:max-w-lg gba:w-full gba:p-6 gba:text-center">
          <AlertCircle className="gba:mx-auto gba:mb-4 gba:h-12 gba:w-12 gba:text-destructive" />
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('review-error-invalid-link-title')}</h2>
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{t('review-error-invalid-link-description')}</p>
          <div className="gba:mt-6 gba:flex gba:justify-center gba:gap-2">
            <Button variant="outline" onClick={handleBack} data-testid={`${testId}-review-error-back`}>
              {t('review-error-back')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <DocumentApprovalReviewPanel
      key={`${currentDocument.id}-review-${reviewVersion}-${refreshToken}`}
      source={{ kind: 'document', document: currentDocument, version: reviewVersion }}
      accessToken={accessToken}
      userInfo={userInfo}
      bannerMode="full"
      onBack={handleBack}
      onErrorBack={handleBack}
      onApprovalResolved={handleApprovalResolved}
      testId={testId}
    />
  )
}

export default DocumentApprovalReviewView
