import React from 'react'
import { Input, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { LearningKnowledgeArticle } from '../services/learningKnowledgeArticlesService'

export type SourceMode = 'upload' | 'existing'

interface DocumentSourceSelectorProps {
  sourceMode: SourceMode
  onSourceModeChange: (mode: SourceMode) => void
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  fileError: string | null
  existingDocumentError: string | null
  touched: boolean
  existingDocuments: LearningKnowledgeArticle[]
  selectedDocumentId: string
  onSelectedDocumentChange: (documentId: string) => void
  isLoadingExistingDocuments: boolean
  existingDocumentsError: string | null
}

function buildContentArticleUrl(contentEntryId: string): string {
  return `/platform/content/intranet/content-record?contentId=${encodeURIComponent(contentEntryId)}&tab=knowledge`
}

export const DocumentSourceSelector: React.FC<DocumentSourceSelectorProps> = ({
  sourceMode,
  onSourceModeChange,
  onFileChange,
  fileError,
  existingDocumentError,
  touched,
  existingDocuments,
  selectedDocumentId,
  onSelectedDocumentChange,
  isLoadingExistingDocuments,
  existingDocumentsError
}) => {
  const { t } = useTranslation(translations)

  return (
    <>
      <div className="gba:space-y-2">
        <span className="gba:text-sm gba:font-medium">{t('learning-upload-file-label')}</span>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <button
            type="button"
            className={`gba:rounded-md gba:border gba:px-3 gba:py-2 gba:text-left gba:text-sm ${
              sourceMode === 'upload' ? 'gba:border-primary gba:bg-primary/10' : 'gba:bg-background'
            }`}
            onClick={() => onSourceModeChange('upload')}
            data-testid="learning-source-mode-upload"
          >
            {t('learning-source-mode-upload')}
          </button>
          <button
            type="button"
            className={`gba:rounded-md gba:border gba:px-3 gba:py-2 gba:text-left gba:text-sm ${
              sourceMode === 'existing' ? 'gba:border-primary gba:bg-primary/10' : 'gba:bg-background'
            }`}
            onClick={() => onSourceModeChange('existing')}
            data-testid="learning-source-mode-existing"
          >
            {t('learning-source-mode-existing')}
          </button>
        </div>
      </div>

      {sourceMode === 'upload' ? (
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium" htmlFor="learning-source-file-input">
            {t('learning-upload-file-label')}
          </label>
          <Input
            id="learning-source-file-input"
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileChange}
            data-testid="learning-source-file-input"
          />
          <p className="gba:text-sm gba:text-muted-foreground">{t('learning-upload-file-help')}</p>
          {touched && fileError && (
            <p className="gba:text-sm gba:font-medium gba:text-destructive" role="alert">
              {t(fileError)}
            </p>
          )}
        </div>
      ) : (
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium" htmlFor="learning-existing-document-select">
            {t('learning-existing-document-label')}
          </label>
          <select
            id="learning-existing-document-select"
            value={selectedDocumentId}
            onChange={event => {
              onSelectedDocumentChange(event.target.value)
            }}
            className="gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
            disabled={isLoadingExistingDocuments || existingDocuments.length === 0}
            data-testid="learning-existing-document-select"
          >
            <option value="">{t('learning-existing-document-placeholder')}</option>
            {existingDocuments.map(document => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
          {isLoadingExistingDocuments && (
            <p className="gba:text-sm gba:text-muted-foreground">{t('learning-library-loading')}</p>
          )}
          {!isLoadingExistingDocuments && existingDocuments.length === 0 && (
            <p className="gba:text-sm gba:text-muted-foreground">{t('learning-existing-document-empty')}</p>
          )}
          {existingDocumentsError && (
            <p className="gba:text-sm gba:font-medium gba:text-destructive">{existingDocumentsError}</p>
          )}
          {touched && existingDocumentError && (
            <p className="gba:text-sm gba:font-medium gba:text-destructive" role="alert">
              {t(existingDocumentError)}
            </p>
          )}
          {selectedDocumentId && (
            <a
              href={buildContentArticleUrl(selectedDocumentId)}
              className="gba:inline-flex gba:text-sm gba:font-medium gba:text-primary hover:gba:underline"
              data-testid="learning-existing-document-open-link"
            >
              {t('learning-source-open-document')}
            </a>
          )}
        </div>
      )}
    </>
  )
}
