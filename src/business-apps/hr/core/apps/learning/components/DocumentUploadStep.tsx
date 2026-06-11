import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Textarea, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWordParser } from '@/business-apps/core/office/apps/documents/hooks/useWordParser'
import { LEARNING_STATUS } from '../constants/learningStatus'
import {
  resolveSavedLearningCourseId,
  resolveSavedLearningCourseVersion,
  saveLearningCourse
} from '../services/learningCourseApi'
import {
  createLearningKnowledgeArticleFromDocx,
  listLearningKnowledgeArticles,
  type LearningKnowledgeArticle
} from '../services/learningKnowledgeArticlesService'
import translations from '../_i18n'
import { DocumentSourceSelector, type SourceMode } from './DocumentSourceSelector'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ALLOWED_MIME_TYPES = new Set([DOCX_MIME_TYPE])
const ALLOWED_EXTENSIONS = ['.docx']

function withStepContext(error: unknown, step: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  return new Error(`${step}: ${message}`)
}

async function createSourceDocumentId(params: {
  sourceMode: SourceMode
  file: File | null
  parseFile: (file: File) => Promise<Parameters<typeof createLearningKnowledgeArticleFromDocx>[2] | null>
  accessToken: string
  ownerEmployeeId: string
  title: string
  description: string
  selectedDocumentId: string
}): Promise<string> {
  if (params.sourceMode === 'existing') return params.selectedDocumentId
  if (!params.file) throw new Error('Learning source file is required')

  try {
    const parsedDocument = await params.parseFile(params.file)
    if (!parsedDocument) {
      throw new Error('Could not parse the DOCX source document.')
    }
    const sourceArticle = await createLearningKnowledgeArticleFromDocx(
      params.accessToken,
      params.ownerEmployeeId,
      parsedDocument,
      params.title,
      params.description || undefined
    )
    return sourceArticle.id
  } catch (err) {
    throw withStepContext(err, 'Knowledge article creation failed')
  }
}

async function saveLearningCourseDraft(params: {
  accessToken: string
  mode: 'create' | 'edit'
  initialDraft?: CreatedLearningCourseDraft & { description?: string }
  title: string
  description: string
  sourceDocumentId: string
  ownerEmployeeId: string
}) {
  try {
    return await saveLearningCourse(params.accessToken, {
      changeMode: params.mode === 'edit' ? 'UPDATE' : 'INSERT',
      learningCourse: {
        ...(params.mode === 'edit' && params.initialDraft
          ? { id: params.initialDraft.courseId, version: params.initialDraft.version }
          : {}),
        title: params.title,
        description: params.description || undefined,
        sourceDocumentId: params.sourceDocumentId,
        ownerEmployeeId: params.ownerEmployeeId,
        passThreshold: 70,
        maxAttempts: params.initialDraft?.maxAttempts ?? 1,
        allowRetake: false,
        anonymous: false,
        status: LEARNING_STATUS.DRAFT
      }
    })
  } catch (err) {
    throw withStepContext(err, 'Learning course draft creation failed')
  }
}

function getSubmitLabel(mode: 'create' | 'edit', isSubmitting: boolean, t: (key: string) => string): string {
  if (isSubmitting) return t('learning-library-loading')
  if (mode === 'edit') return t('learning-edit-source-save')
  return t('learning-upload-continue')
}

export interface CreatedLearningCourseDraft {
  courseId: string
  sourceDocumentId: string
  title: string
  ownerEmployeeId: string
  maxAttempts: number
  version?: number
}

interface DocumentUploadStepProps {
  context: BusinessAppContextProps
  onCreated: (draft: CreatedLearningCourseDraft) => void
  initialDraft?: CreatedLearningCourseDraft & { description?: string }
  mode?: 'create' | 'edit'
}

export function validateLearningSourceFile(file: File | null): string | null {
  if (!file) return 'learning-upload-file-required'
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') return 'learning-upload-file-pdf-deferred'
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some(extension => lowerName.endsWith(extension))
  const hasAllowedMimeType = file.type === '' || ALLOWED_MIME_TYPES.has(file.type)
  if (!hasAllowedExtension || !hasAllowedMimeType) return 'learning-upload-file-type-error'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'learning-upload-file-size-error'
  return null
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  context,
  onCreated,
  initialDraft,
  mode = 'create'
}) => {
  const { t } = useTranslation(translations)
  const { parseFile } = useWordParser()
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [description, setDescription] = useState(initialDraft?.description ?? '')
  const [sourceMode, setSourceMode] = useState<SourceMode>(initialDraft?.sourceDocumentId ? 'existing' : 'upload')
  const [file, setFile] = useState<File | null>(null)
  const [existingDocuments, setExistingDocuments] = useState<LearningKnowledgeArticle[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialDraft?.sourceDocumentId ?? '')
  const [existingDocumentsError, setExistingDocumentsError] = useState<string | null>(null)
  const [isLoadingExistingDocuments, setIsLoadingExistingDocuments] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const titleError = useMemo(() => (title.trim().length < 3 ? 'learning-upload-title-required' : null), [title])
  const fileError = useMemo(() => validateLearningSourceFile(file), [file])
  const existingDocumentError =
    sourceMode === 'existing' && !selectedDocumentId ? 'learning-existing-document-required' : null
  const sourceError = sourceMode === 'upload' ? fileError : existingDocumentError
  const canSubmit = !titleError && !sourceError && !isSubmitting

  useEffect(() => {
    let cancelled = false

    const loadExistingDocuments = async () => {
      if (sourceMode !== 'existing' || !context.accessToken) return
      setIsLoadingExistingDocuments(true)
      setExistingDocumentsError(null)
      try {
        const documents = await listLearningKnowledgeArticles(context.accessToken)
        if (!cancelled) {
          setExistingDocuments(documents)
        }
      } catch (err) {
        if (!cancelled) {
          setExistingDocuments([])
          setExistingDocumentsError(err instanceof Error ? err.message : 'Could not load existing knowledge articles.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExistingDocuments(false)
        }
      }
    }

    loadExistingDocuments()
    return () => {
      cancelled = true
    }
  }, [context.accessToken, sourceMode])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTouched(true)
    setFile(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    setError(null)

    if (!canSubmit) return

    const ownerEmployeeId = initialDraft?.ownerEmployeeId ?? context.userInfo?.employeeDetails?.employeeId
    if (!ownerEmployeeId) {
      setError('Current user is not linked to an employee record. Learning courses require an owner employee.')
      return
    }

    try {
      setIsSubmitting(true)
      const trimmedTitle = title.trim()
      const trimmedDescription = description.trim()
      const sourceDocumentId = await createSourceDocumentId({
        sourceMode,
        file,
        parseFile,
        accessToken: context.accessToken,
        ownerEmployeeId,
        title: trimmedTitle,
        description: trimmedDescription,
        selectedDocumentId
      })
      const savedCourse = await saveLearningCourseDraft({
        accessToken: context.accessToken,
        mode,
        initialDraft,
        title: trimmedTitle,
        description: trimmedDescription,
        sourceDocumentId,
        ownerEmployeeId
      })
      const courseId = resolveSavedLearningCourseId(savedCourse)
      if (!courseId) {
        throw new Error('Employee service did not return the created learning course id')
      }
      const version = resolveSavedLearningCourseVersion(savedCourse)

      globalThis.dispatchEvent(new CustomEvent('learning-course-created'))
      onCreated({
        courseId,
        sourceDocumentId,
        title: trimmedTitle,
        ownerEmployeeId,
        maxAttempts: initialDraft?.maxAttempts ?? 1,
        version
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('learning-upload-error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="gba:space-y-5" onSubmit={handleSubmit} data-testid="learning-document-upload-step">
      <div className="gba:space-y-2">
        <label className="gba:text-sm gba:font-medium" htmlFor="learning-course-title-input">
          {t('learning-upload-title-label')}
        </label>
        <Input
          id="learning-course-title-input"
          value={title}
          onChange={event => setTitle(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={t('learning-upload-title-placeholder')}
          data-testid="learning-course-title-input"
        />
        {touched && titleError && (
          <p className="gba:text-sm gba:font-medium gba:text-destructive" role="alert">
            {t(titleError)}
          </p>
        )}
      </div>

      <div className="gba:space-y-2">
        <label className="gba:text-sm gba:font-medium" htmlFor="learning-course-description-input">
          {t('learning-upload-description-label')}
        </label>
        <Textarea
          id="learning-course-description-input"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder={t('learning-upload-description-placeholder')}
          rows={3}
          data-testid="learning-course-description-input"
        />
      </div>

      <DocumentSourceSelector
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
        onFileChange={handleFileChange}
        fileError={fileError}
        existingDocumentError={existingDocumentError}
        touched={touched}
        existingDocuments={existingDocuments}
        selectedDocumentId={selectedDocumentId}
        onSelectedDocumentChange={documentId => {
          setTouched(true)
          setSelectedDocumentId(documentId)
        }}
        isLoadingExistingDocuments={isLoadingExistingDocuments}
        existingDocumentsError={existingDocumentsError}
      />

      {error && (
        <div
          className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
          data-testid="learning-upload-error"
        >
          {error}
        </div>
      )}

      <div className="gba:flex gba:justify-end">
        <Button type="submit" disabled={!canSubmit} data-testid="learning-upload-submit-button">
          {getSubmitLabel(mode, isSubmitting, t)}
        </Button>
      </div>
    </form>
  )
}
