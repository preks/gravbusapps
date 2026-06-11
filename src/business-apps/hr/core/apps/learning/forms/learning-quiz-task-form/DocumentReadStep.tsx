import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { ContentHtmlRenderer } from '@/business-apps/core/content/records/content-record/components/ContentHtmlRenderer'

interface DocumentReadStepProps {
  article: ContentEntry | null
  loading: boolean
  error?: string | null
  missingDocument: boolean
  onContinue: () => void
  t: (key: string, params?: Record<string, unknown>) => string
}

const SCROLL_BOTTOM_THRESHOLD = 8

function hasReachedBottom(element: HTMLElement): boolean {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_BOTTOM_THRESHOLD
}

export const DocumentReadStep: React.FC<DocumentReadStepProps> = ({
  article,
  loading,
  error,
  missingDocument,
  onContinue,
  t
}) => {
  const [hasReadDocument, setHasReadDocument] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const updateReadState = useCallback(() => {
    const element = contentRef.current
    if (!element) return
    if (element.scrollHeight <= element.clientHeight + SCROLL_BOTTOM_THRESHOLD || hasReachedBottom(element)) {
      setHasReadDocument(true)
    }
  }, [])

  useEffect(() => {
    setHasReadDocument(false)
  }, [article?.id])

  useEffect(() => {
    if (!article || loading) return undefined
    const frameId = globalThis.requestAnimationFrame?.(updateReadState)
    const timeoutId = globalThis.setTimeout(updateReadState, 100)
    return () => {
      if (frameId !== undefined) globalThis.cancelAnimationFrame?.(frameId)
      globalThis.clearTimeout(timeoutId)
    }
  }, [article, loading, updateReadState])

  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground"
        data-testid="learning-quiz-document-loading"
      >
        <Spinner className="gba:h-5 gba:w-5" />
        {t('learning-quiz-document-loading')}
      </div>
    )
  }

  if (missingDocument || error || !article) {
    return (
      <div className="gba:space-y-3" data-testid="learning-quiz-document-error">
        <div className="gba:rounded-md gba:bg-destructive/10 gba:p-3 gba:text-sm gba:text-destructive">
          {error ?? t('learning-quiz-document-missing')}
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:space-y-4"
      data-testid="learning-quiz-document-step"
    >
      <div>
        <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
          {t('learning-quiz-document-step-label')}
        </div>
        <h3 className="gba:mt-1 gba:text-lg gba:font-semibold">{article.title ?? t('learning-quiz-document-title')}</h3>
        <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{t('learning-quiz-document-description')}</p>
      </div>

      <div
        ref={contentRef}
        onScroll={updateReadState}
        className="gba:min-h-[320px] gba:max-h-[60vh] gba:overflow-y-auto gba:rounded-lg gba:border gba:bg-background gba:p-4"
        data-testid="learning-quiz-document-scroll"
      >
        {article.preview && (
          <p className="gba:mb-4 gba:text-sm gba:font-medium gba:text-muted-foreground">{article.preview}</p>
        )}
        <ContentHtmlRenderer
          content={article.content ?? ''}
          variant="default"
          data-testid="learning-quiz-document-content"
        />
      </div>

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="learning-quiz-document-read-status">
          {hasReadDocument ? t('learning-quiz-document-read-complete') : t('learning-quiz-document-scroll-instruction')}
        </p>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!hasReadDocument}
          data-testid="learning-quiz-document-continue-button"
        >
          {t('learning-quiz-document-continue')}
        </Button>
      </div>
    </div>
  )
}
