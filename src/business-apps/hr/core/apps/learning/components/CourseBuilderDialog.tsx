import React, { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../_i18n'
import { LEARNING_STATUS } from '../constants/learningStatus'
import { useLearningCourseDetails } from '../hooks/useLearningCourseDetails'
import {
  generateLearningQuizFromDocument,
  type GeneratedLearningQuizContent
} from '../services/learningQuizGeneratorApi'
import { publishLearningQuiz } from '../services/learningPublishApi'
import type { EditableLearningQuiz } from '../types'
import { DocumentUploadStep, type CreatedLearningCourseDraft } from './DocumentUploadStep'
import { GenerationPlaceholderStep } from './GenerationPlaceholderStep'
import { ReviewPlaceholderStep } from './ReviewPlaceholderStep'

interface CourseBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: BusinessAppContextProps
  onCourseCreated?: (draft: CreatedLearningCourseDraft) => void
  mode?: 'create' | 'edit'
  courseId?: string | null
}

const BUILDER_STEPS = [
  'learning-builder-step-upload',
  'learning-builder-step-generate',
  'learning-builder-step-review'
] as const

type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

function buildContentArticleUrl(contentEntryId: string): string {
  return `/platform/content/intranet/content-record?contentId=${encodeURIComponent(contentEntryId)}&tab=knowledge`
}

function getReviewNotice(
  isEditMode: boolean,
  courseStatus: string | undefined,
  t: (key: string) => string
): string | undefined {
  if (!isEditMode) return undefined
  if (courseStatus === LEARNING_STATUS.PUBLISHED) return t('learning-edit-published-notice')
  return t('learning-edit-draft-notice')
}

function getPublishLabel(
  isEditMode: boolean,
  courseStatus: string | undefined,
  t: (key: string) => string
): string | undefined {
  if (isEditMode && courseStatus === LEARNING_STATUS.PUBLISHED) return t('learning-edit-publish-new-version')
  return undefined
}

export const CourseBuilderDialog: React.FC<CourseBuilderDialogProps> = ({
  open,
  onOpenChange,
  context,
  onCourseCreated,
  mode = 'create',
  courseId
}) => {
  const { t } = useTranslation(translations)
  const isEditMode = mode === 'edit'
  const {
    details,
    loading: detailsLoading,
    error: detailsError
  } = useLearningCourseDetails(isEditMode ? courseId : null, context.accessToken)
  const [activeStep, setActiveStep] = useState(0)
  const [draft, setDraft] = useState<CreatedLearningCourseDraft | null>(null)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [generationResult, setGenerationResult] = useState<GeneratedLearningQuizContent | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const reviewNotice = getReviewNotice(isEditMode, details?.course.status, t)
  const publishLabel = getPublishLabel(isEditMode, details?.course.status, t)

  useEffect(() => {
    if (!open) {
      setActiveStep(0)
      setDraft(null)
      setGenerationStatus('idle')
      setGenerationResult(null)
      setGenerationError(null)
      setIsPublishing(false)
      setPublishError(null)
      setPublishSuccess(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !isEditMode || !details) return
    setDraft({
      courseId: details.course.id,
      sourceDocumentId: details.sourceDocumentId ?? details.course.sourceDocumentId ?? '',
      title: details.course.title,
      ownerEmployeeId: details.course.ownerEmployeeId ?? context.userInfo?.employeeDetails?.employeeId ?? '',
      maxAttempts: details.course.maxAttempts ?? details.quiz.maxAttempts,
      version: details.course.version
    })
    setGenerationResult(null)
    setGenerationStatus('idle')
    setActiveStep(2)
  }, [context.userInfo?.employeeDetails?.employeeId, details, isEditMode, open])

  const runGeneration = useCallback(
    async (createdDraft: CreatedLearningCourseDraft) => {
      setGenerationStatus('loading')
      setGenerationError(null)
      setGenerationResult(null)
      setPublishError(null)
      setPublishSuccess(false)

      try {
        const response = await generateLearningQuizFromDocument(context.accessToken, {
          courseId: createdDraft.courseId,
          contentEntryId: createdDraft.sourceDocumentId,
          title: createdDraft.title,
          passThreshold: 70
        })
        const content = response.content as GeneratedLearningQuizContent
        if (content?.success === false) {
          throw new Error(content.error || 'AI generation failed')
        }

        setGenerationResult(content)
        setGenerationStatus('success')
        setActiveStep(2)
      } catch (err) {
        setGenerationStatus('error')
        setGenerationError(err instanceof Error ? err.message : 'AI generation failed')
      }
    },
    [context.accessToken]
  )

  const handleCreated = (createdDraft: CreatedLearningCourseDraft) => {
    setDraft(createdDraft)
    onCourseCreated?.(createdDraft)
    if (isEditMode) {
      setGenerationResult(null)
      setPublishSuccess(false)
      setActiveStep(2)
      return
    }
    setActiveStep(1)
    runGeneration(createdDraft).catch(err => {
      setGenerationStatus('error')
      setGenerationError(err instanceof Error ? err.message : 'AI generation failed')
    })
  }

  const handleRetryGeneration = () => {
    if (!draft) return
    setActiveStep(1)
    runGeneration(draft).catch(err => {
      setGenerationStatus('error')
      setGenerationError(err instanceof Error ? err.message : 'AI generation failed')
    })
  }

  const handlePublish = async (quiz: EditableLearningQuiz) => {
    if (!draft) return
    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(false)

    try {
      await publishLearningQuiz(context.accessToken, {
        courseId: draft.courseId,
        courseVersion: draft.version,
        sourceDocumentId: draft.sourceDocumentId,
        ownerEmployeeId: draft.ownerEmployeeId,
        versionNo: isEditMode ? (details?.latestVersion?.versionNo ?? 0) + 1 : 1,
        publishedBy: context.userInfo?.id,
        quiz
      })
      setPublishSuccess(true)
      globalThis.dispatchEvent(new CustomEvent('learning-course-created'))
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : t('learning-review-publish-error'))
    } finally {
      setIsPublishing(false)
    }
  }

  const renderStep = () => {
    if (isEditMode && detailsLoading) {
      return (
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:p-4"
          data-testid="learning-edit-loading"
        >
          <Spinner className="gba:h-5 gba:w-5" />
          <span className="gba:text-sm gba:text-muted-foreground">{t('learning-edit-loading')}</span>
        </div>
      )
    }
    if (isEditMode && detailsError) {
      return (
        <div
          className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
          data-testid="learning-edit-error"
        >
          {detailsError}
        </div>
      )
    }
    if (activeStep === 0) {
      return (
        <DocumentUploadStep
          context={context}
          onCreated={handleCreated}
          mode={isEditMode ? 'edit' : 'create'}
          initialDraft={draft ? { ...draft, description: details?.course.description } : undefined}
        />
      )
    }
    if (activeStep === 1) {
      return (
        <GenerationPlaceholderStep status={generationStatus} error={generationError} onRetry={handleRetryGeneration} />
      )
    }
    return (
      <ReviewPlaceholderStep
        generatedContent={generationResult}
        initialQuiz={generationResult ? null : details?.quiz}
        isPublishing={isPublishing}
        publishError={publishError}
        publishSuccess={publishSuccess}
        notice={reviewNotice}
        publishLabel={publishLabel}
        onChangeSource={isEditMode ? () => setActiveStep(0) : undefined}
        onRegenerate={isEditMode ? handleRetryGeneration : undefined}
        onPublish={quiz => {
          handlePublish(quiz).catch(err => {
            setPublishError(err instanceof Error ? err.message : t('learning-review-publish-error'))
          })
        }}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-3xl gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="learning-builder-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('learning-builder-title')}</DialogTitle>
          <DialogDescription>{t('learning-builder-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6">
          <div className="gba:grid gba:grid-cols-3 gba:gap-3">
            {BUILDER_STEPS.map((stepKey, index) => (
              <div
                key={stepKey}
                className={`gba:rounded-lg gba:border gba:px-3 gba:py-2 gba:text-sm ${
                  index === activeStep ? 'gba:border-primary gba:bg-primary/10' : 'gba:bg-muted/30'
                }`}
                data-testid={`learning-builder-step-${index + 1}`}
              >
                {t(stepKey)}
              </div>
            ))}
          </div>

          {draft && (
            <div
              className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:bg-muted gba:px-4 gba:py-3 gba:text-sm gba:text-muted-foreground"
              data-testid="learning-builder-created-draft-summary"
            >
              <span>{t('learning-builder-draft-created')}</span>
              <a
                href={buildContentArticleUrl(draft.sourceDocumentId)}
                className="gba:font-medium gba:text-primary hover:gba:underline"
                data-testid="learning-builder-source-document-link"
              >
                {t('learning-source-open-document')}
              </a>
            </div>
          )}

          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
