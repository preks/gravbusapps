/**
 * DocumentAppsHubEditorView
 *
 * Renders the appropriate editor view (template, parsed Word, document, or new).
 * Extracted from DocumentAppsHub to reduce cognitive complexity.
 */

import React from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { PagedDocumentEditor } from './PagedDocumentEditor'
import { PdfDocumentViewer } from './PdfDocumentViewer'
import { TemplateFieldsPanel } from './TemplateFieldsPanel'
import type { PagedDocumentEditorRef } from './PagedDocumentEditor'
import type { Document, DocumentTemplate, DocumentFormatting, ParsedWordDocument } from '../types'

export interface DocumentAppsHubEditorViewProps {
  templateBeingEdited: DocumentTemplate | null
  setTemplateBeingEdited: (t: DocumentTemplate | null) => void
  setSessionEntityContext: (c: string | null) => void
  parsedWordDocument: ParsedWordDocument | null
  setParsedWordDocument: (p: ParsedWordDocument | null) => void
  currentDocument: Document | null
  currentDocumentPermission: string
  createDocument: (opts: unknown) => Promise<Document | null>
  loadDocument: (id: string) => Promise<Document | null>
  updateDocument: (
    id: string,
    updates: { title?: string; content?: string; formatting?: DocumentFormatting }
  ) => Promise<Document | null>
  updateTemplate: (id: string, updates: { name?: string; content?: string }) => Promise<DocumentTemplate | null>
  updateUrl: (docId: string | null, view?: string) => void
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
  testId: string
}

export function DocumentAppsHubEditorView({
  templateBeingEdited,
  setTemplateBeingEdited,
  setSessionEntityContext,
  parsedWordDocument,
  setParsedWordDocument,
  setSelectedDocumentId,
  currentDocument,
  currentDocumentPermission,
  createDocument,
  loadDocument,
  updateDocument,
  updateTemplate,
  updateUrl,
  setCurrentView,
  setActiveSection,
  handleBack,
  handleSendForApprovalClick,
  currentUserId,
  accessToken,
  userInfo,
  templateEditorRef,
  effectiveEntityContext,
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
        leftPanel={
          <TemplateFieldsPanel
            onInsertField={placeholder => templateEditorRef.current?.insertAtCursor(placeholder)}
            accessToken={accessToken}
            context={effectiveEntityContext}
            templateContent={templateBeingEdited.content}
            data-testid={`${testId}-template-fields-panel`}
          />
        }
        onSave={async (title, content) => {
          const updated = await updateTemplate(templateBeingEdited.id, { name: title, content })
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

  if (parsedWordDocument && !currentDocument) {
    return (
      <PagedDocumentEditor
        initialContent={parsedWordDocument.html}
        initialTitle={parsedWordDocument.fileName.replace(/\.(docx?|doc)$/i, '')}
        onSave={async (title, content, formatting) => {
          const newDoc = await createDocument({
            title,
            content,
            formatting,
            status: 'draft',
            createdBy: currentUserId,
            sourceFile: {
              originalName: parsedWordDocument.fileName,
              fileSize: parsedWordDocument.fileSize,
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              uploadedAt: new Date().toISOString()
            }
          })
          if (newDoc) {
            setParsedWordDocument(null)
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

  if (currentDocument) {
    const isPdfDocument = currentDocument.sourceFile?.mimeType === 'application/pdf'
    if (isPdfDocument) {
      return (
        <PdfDocumentViewer
          key={currentDocument.id}
          document={currentDocument}
          accessToken={accessToken}
          onBack={handleBack}
          data-testid={`${testId}-pdf-viewer`}
        />
      )
    }
    return (
      <PagedDocumentEditor
        key={currentDocument.id}
        document={currentDocument}
        onSave={async (title, content, formatting) => {
          await updateDocument(currentDocument.id, { title, content, formatting })
        }}
        onPersistFormatting={async formatting => {
          await updateDocument(currentDocument.id, { formatting })
        }}
        onBack={handleBack}
        onSendForApproval={() => handleSendForApprovalClick(currentDocument.id)}
        isReadOnly={!canEdit}
        accessToken={accessToken}
        userInfo={userInfo}
        data-testid={`${testId}-editor`}
      />
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
