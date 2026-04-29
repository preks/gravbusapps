/**
 * DocumentAppsHubEditorView
 *
 * Renders the appropriate editor view (template, persisted document, or a
 * fallback "new document" surface that persists on first Save).
 *
 * Word and ODF imports are persisted immediately in `DocumentAppsHub`
 * before this view is entered, so they flow through the regular persisted
 * document branch below instead of needing a dedicated preview branch.
 *
 * Extracted from DocumentAppsHub to reduce cognitive complexity.
 */

import React from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { isEffectivelyEmptyDocumentHtml } from '../utils/documentContentUtils'
import { PagedDocumentEditor } from './PagedDocumentEditor'
import { PdfDocumentViewer } from './PdfDocumentViewer'
import { TemplateFieldsPanel } from './TemplateFieldsPanel'
import { ExternalDocumentSourceBadge } from './external-import/ExternalDocumentSourceBadge'
import { TrashedDocumentReadonlyDialog } from './TrashedDocumentReadonlyDialog'
import { DocumentApprovalReviewView } from './DocumentApprovalReviewView'
import type { PagedDocumentEditorRef } from './PagedDocumentEditor'
import type { Document, DocumentTemplate, DocumentFormatting } from '../types'

export interface DocumentAppsHubEditorViewProps {
  currentView: string
  templateBeingEdited: DocumentTemplate | null
  setTemplateBeingEdited: (t: DocumentTemplate | null) => void
  setSessionEntityContext: (c: string | null) => void
  currentDocument: Document | null
  currentDocumentPermission: string
  createDocument: (opts: unknown) => Promise<Document | null>
  loadDocument: (id: string) => Promise<Document | null>
  updateDocument: (
    id: string,
    updates: { title?: string; content?: string; formatting?: DocumentFormatting; contentJson?: Record<string, never> }
  ) => Promise<Document | null>
  updateTemplate: (
    id: string,
    updates: { name?: string; content?: string; formatting?: DocumentFormatting }
  ) => Promise<DocumentTemplate | null>
  updateUrl: (docId: string | null, view?: string) => void
  onNavigateToDocumentReview?: (versionNumber: number) => void
  setSelectedDocumentId: (id: string | null) => void
  setCurrentView: (v: string) => void
  setActiveSection: (s: string) => void
  handleBack: () => void
  handleSendForApprovalClick: (id: string) => void
  currentUserId: string
  accessToken: string
  userInfo: unknown
  templateEditorRef: React.RefObject<PagedDocumentEditorRef | null>
  effectiveEntityContext: string
  isTrashedDocument: boolean
  canRestoreTrashedDocument: boolean
  isRestoringTrashedDocument: boolean
  onGoToDocsHome: () => void
  onRestoreTrashedDocument: () => void
  onApprovalResolved?: () => Promise<void> | void
  testId: string
}

export function DocumentAppsHubEditorView({
  currentView,
  templateBeingEdited,
  setTemplateBeingEdited,
  setSessionEntityContext,
  setSelectedDocumentId,
  currentDocument,
  currentDocumentPermission,
  createDocument,
  loadDocument,
  updateDocument,
  updateTemplate,
  updateUrl,
  onNavigateToDocumentReview,
  setCurrentView,
  setActiveSection,
  handleBack,
  handleSendForApprovalClick,
  currentUserId,
  accessToken,
  userInfo,
  templateEditorRef,
  effectiveEntityContext,
  isTrashedDocument,
  canRestoreTrashedDocument,
  isRestoringTrashedDocument,
  onGoToDocsHome,
  onRestoreTrashedDocument,
  onApprovalResolved,
  testId
}: DocumentAppsHubEditorViewProps): React.ReactElement {
  const { t } = useTranslation(translations)
  const canEdit = currentDocumentPermission === 'owner' || currentDocumentPermission === 'edit'

  if (templateBeingEdited) {
    return (
      <PagedDocumentEditor
        ref={templateEditorRef}
        key={`template-${templateBeingEdited.id}`}
        initialContent={templateBeingEdited.content}
        initialTitle={templateBeingEdited.name}
        initialFormatting={templateBeingEdited.formatting}
        leftPanel={
          <TemplateFieldsPanel
            onInsertField={placeholder => templateEditorRef.current?.insertAtCursor(placeholder)}
            accessToken={accessToken}
            context={effectiveEntityContext}
            templateContent={templateBeingEdited.content}
            data-testid={`${testId}-template-fields-panel`}
          />
        }
        onSave={async (title, content, formatting) => {
          const updated = await updateTemplate(templateBeingEdited.id, { name: title, content, formatting })
          if (updated) {
            setTemplateBeingEdited(updated)
            toast.success(t('editor-toast-template-saved'))
          }
        }}
        onBack={() => {
          setTemplateBeingEdited(null)
          setSessionEntityContext(null)
          setCurrentView('list')
          setActiveSection('templates')
        }}
        onSendForApproval={() => {
          toast.info(t('editor-toast-templates-info'))
        }}
        accessToken={accessToken}
        userInfo={userInfo}
        data-testid={`${testId}-template-editor`}
      />
    )
  }

  if (currentDocument) {
    if (currentView === 'review') {
      return (
        <DocumentApprovalReviewView
          currentDocument={currentDocument}
          accessToken={accessToken}
          userInfo={userInfo}
          handleBack={handleBack}
          loadDocument={loadDocument}
          onApprovalResolved={onApprovalResolved}
          testId={testId}
        />
      )
    }

    const isPdfDocument = currentDocument.sourceFile?.mimeType === 'application/pdf'
    if (isPdfDocument) {
      return (
        <>
          <PdfDocumentViewer
            key={currentDocument.id}
            document={currentDocument}
            accessToken={accessToken}
            onBack={handleBack}
            data-testid={`${testId}-pdf-viewer`}
          />
          {isTrashedDocument ? (
            <TrashedDocumentReadonlyDialog
              documentTitle={currentDocument.title}
              canRestore={canRestoreTrashedDocument}
              isRestoring={isRestoringTrashedDocument}
              onGoToDocsHome={onGoToDocsHome}
              onRestore={onRestoreTrashedDocument}
              data-testid={`${testId}-trashed-document-dialog`}
            />
          ) : null}
        </>
      )
    }

    const externalProvenance = currentDocument.settings?.external
    const isExternalReadOnly = !!externalProvenance || currentDocument.settings?.readOnly === true

    return (
      <>
        <PagedDocumentEditor
          key={currentDocument.id}
          document={currentDocument}
          onSave={async (title, content, formatting) => {
            await updateDocument(currentDocument.id, {
              title,
              content,
              formatting,
              ...(isEffectivelyEmptyDocumentHtml(content) ? { contentJson: {} } : {})
            })
          }}
          onPersistFormatting={async formatting => {
            await updateDocument(currentDocument.id, { formatting })
          }}
          onBack={handleBack}
          onSendForApproval={() => handleSendForApprovalClick(currentDocument.id)}
          onNavigateToReviewVersion={onNavigateToDocumentReview}
          isReadOnly={isTrashedDocument || !canEdit || isExternalReadOnly}
          isTrashedDocument={isTrashedDocument}
          headerExtra={
            !isTrashedDocument && externalProvenance ? (
              <ExternalDocumentSourceBadge
                provenance={externalProvenance}
                onCreateEditableCopy={async () => {
                  const copy = await createDocument({
                    title: `${currentDocument.title} (copy)`,
                    content: currentDocument.content,
                    formatting: currentDocument.formatting,
                    status: 'draft',
                    createdBy: currentUserId
                  })
                  if (copy) {
                    setSelectedDocumentId(copy.id)
                    await loadDocument(copy.id)
                    updateUrl(copy.id, 'editor')
                  }
                }}
                data-testid={`${testId}-external-source-badge`}
              />
            ) : undefined
          }
          accessToken={accessToken}
          userInfo={userInfo}
          data-testid={`${testId}-editor`}
        />
        {isTrashedDocument ? (
          <TrashedDocumentReadonlyDialog
            documentTitle={currentDocument.title}
            canRestore={canRestoreTrashedDocument}
            isRestoring={isRestoringTrashedDocument}
            onGoToDocsHome={onGoToDocsHome}
            onRestore={onRestoreTrashedDocument}
            data-testid={`${testId}-trashed-document-dialog`}
          />
        ) : null}
      </>
    )
  }

  return (
    <PagedDocumentEditor
      onSave={async (title, content, formatting) => {
        const newDoc = await createDocument({
          title,
          content,
          formatting,
          status: 'draft',
          createdBy: currentUserId
        })
        if (newDoc) {
          setSelectedDocumentId(newDoc.id)
          await loadDocument(newDoc.id)
          updateUrl(newDoc.id, 'editor')
        }
      }}
      onBack={handleBack}
      onSendForApproval={() => {
        toast.info(t('editor-toast-save-first'))
      }}
      accessToken={accessToken}
      userInfo={userInfo}
      data-testid={`${testId}-editor`}
    />
  )
}
