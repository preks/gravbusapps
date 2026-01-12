/**
 * DocumentAppsHub Component
 *
 * The main entry point for the Document Apps feature.
 * Displays existing documents, provides upload interface, and template gallery.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Card, Button, Input, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import {
  FileText,
  Plus,
  Search,
  Grid,
  List,
  Filter,
  SortAsc,
  Upload,
  Database,
  AlertCircle,
  LayoutTemplate,
  FolderOpen
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Components
import { WordUploader } from './components/WordUploader'
import { DocumentPreviewCard, NoDocumentsState } from './components/DocumentPreviewCard'
import { TemplateGallery } from './components/TemplateGallery'
import { SendForApprovalDialog } from './components/SendForApprovalDialog'
import { PagedDocumentEditor } from './components/PagedDocumentEditor'

// Hooks
import { useDocumentApps } from './hooks/useDocumentApps'
import { useDocumentTemplates } from './hooks/useDocumentTemplates'

// Types
import type { DocumentTemplate, ParsedWordDocument } from './types'

export interface DocumentAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'upload' | 'editor' | 'templates'

/**
 * DocumentAppsHub Component
 */
export const DocumentAppsHub: React.FC<DocumentAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'document-apps-hub'
}) => {
  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'documents' | 'templates'>('documents')

  // Data state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [parsedWordDocument, setParsedWordDocument] = useState<ParsedWordDocument | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [documentForApproval, setDocumentForApproval] = useState<string | null>(null)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // URL helpers for deep linking
  const getUrlParams = useCallback((): { docId: string | null; view: HubView | null } => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      docId: urlParams.get('docId'),
      view: urlParams.get('view') as HubView | null
    }
  }, [])

  const updateUrl = useCallback((docId: string | null, view?: HubView) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (docId) {
      urlParams.set('docId', docId)
      if (view) urlParams.set('view', view)
    } else {
      urlParams.delete('docId')
      urlParams.delete('view')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({ docId, view }, '', newUrl)
  }, [])

  // Hooks
  const {
    documents,
    currentDocument,
    isLoading: isLoadingDocuments,
    error: documentsError,
    storageMode,
    currentDocumentPermission,
    loadDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument,
    shareDocument,
    clearCurrentDocument
  } = useDocumentApps(accessToken, currentUserId)

  const { templates, createDocumentFromTemplate } = useDocumentTemplates(accessToken, currentUserId)

  // Track which document ID we've attempted to load to prevent infinite loops
  const loadAttemptedRef = useRef<string | null>(null)

  // Load document from URL on mount
  useEffect(() => {
    const { docId, view } = getUrlParams()
    // Only load if we have a docId, no current document, not loading, and haven't already attempted this document
    if (docId && !currentDocument && !isLoadingDocuments && loadAttemptedRef.current !== docId) {
      loadAttemptedRef.current = docId // Mark as attempted before loading
      loadDocument(docId).then(doc => {
        if (doc) {
          setSelectedDocumentId(docId)
          setCurrentView(view === 'editor' ? 'editor' : 'editor')
        }
      })
    }
  }, [getUrlParams, loadDocument, currentDocument, isLoadingDocuments])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { docId?: string; view?: HubView } | null
      if (state?.docId) {
        loadDocument(state.docId).then(doc => {
          if (doc) {
            setSelectedDocumentId(state.docId!)
            setCurrentView(state.view || 'editor')
          }
        })
      } else {
        setSelectedDocumentId(null)
        setCurrentView('list')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [loadDocument])

  // Filter documents based on search
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents

    const query = searchQuery.toLowerCase()
    return documents.filter(
      doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }, [documents, searchQuery])

  /**
   * Handle Word file parsed from uploader
   */
  const handleWordFileParsed = useCallback(async (parsed: ParsedWordDocument) => {
    setParsedWordDocument(parsed)
    // Go directly to editor with the parsed content
    setCurrentView('editor')
  }, [])

  /**
   * Create new blank document
   */
  const handleCreateNew = useCallback(async () => {
    const newDoc = await createDocument({
      title: 'Untitled Document',
      content: '<p></p>',
      status: 'draft',
      createdBy: currentUserId
    })

    if (newDoc) {
      setSelectedDocumentId(newDoc.id)
      setCurrentView('editor')
      updateUrl(newDoc.id, 'editor')
    }
  }, [createDocument, currentUserId, updateUrl])

  /**
   * Handle template selection
   */
  const handleSelectTemplate = useCallback(
    async (template: DocumentTemplate) => {
      const newDoc = await createDocumentFromTemplate(template.id, `New ${template.name}`)
      if (newDoc) {
        await loadDocument(newDoc.id)
        setSelectedDocumentId(newDoc.id)
        setCurrentView('editor')
        updateUrl(newDoc.id, 'editor')
      }
    },
    [createDocumentFromTemplate, loadDocument, updateUrl]
  )

  /**
   * Open a document
   */
  const handleOpenDocument = useCallback(
    async (id: string) => {
      const doc = await loadDocument(id)
      if (doc) {
        setSelectedDocumentId(id)
        setCurrentView('editor')
        updateUrl(id, 'editor')
      }
    },
    [loadDocument, updateUrl]
  )

  /**
   * Handle delete document
   */
  const handleDeleteDocument = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this document?')) {
        const success = await deleteDocument(id)
        if (success && selectedDocumentId === id) {
          setSelectedDocumentId(null)
          setCurrentView('list')
          updateUrl(null)
        }
      }
    },
    [deleteDocument, selectedDocumentId, updateUrl]
  )

  /**
   * Handle duplicate document
   */
  const handleDuplicateDocument = useCallback(
    async (id: string) => {
      await duplicateDocument(id)
    },
    [duplicateDocument]
  )

  /**
   * Handle send for approval click
   */
  const handleSendForApprovalClick = useCallback((id: string) => {
    setDocumentForApproval(id)
    setApprovalDialogOpen(true)
  }, [])

  /**
   * Go back to list
   */
  const handleBack = useCallback(() => {
    clearCurrentDocument()
    loadAttemptedRef.current = null // Reset so we can retry loading if needed
    setSelectedDocumentId(null)
    setParsedWordDocument(null)
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentDocument, updateUrl])

  /**
   * Start upload flow
   */
  const handleStartUpload = useCallback(() => {
    setParsedWordDocument(null)
    setCurrentView('upload')
  }, [])

  // Render editor view
  if (currentView === 'editor') {
    const canEdit = currentDocumentPermission === 'owner' || currentDocumentPermission === 'edit'

    // If we have a parsed Word document (from upload), create a new document with that content
    if (parsedWordDocument && !currentDocument) {
      return (
        <PagedDocumentEditor
          initialContent={parsedWordDocument.html}
          initialTitle={parsedWordDocument.fileName.replace(/\.(docx?|doc)$/i, '')}
          onSave={async (title, content) => {
            const newDoc = await createDocument({
              title,
              content,
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
          accessToken={accessToken}
          userInfo={userInfo}
          data-testid={`${testId}-editor`}
        />
      )
    }

    // If we have a current document loaded
    if (currentDocument) {
      return (
        <PagedDocumentEditor
          key={currentDocument.id}
          document={currentDocument}
          onSave={async (title, content) => {
            await updateDocument(currentDocument.id, { title, content })
          }}
          onBack={handleBack}
          isReadOnly={!canEdit}
          accessToken={accessToken}
          userInfo={userInfo}
          data-testid={`${testId}-editor`}
        />
      )
    }

    // Fallback - new document
    return (
      <PagedDocumentEditor
        onSave={async (title, content) => {
          const newDoc = await createDocument({
            title,
            content,
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
        accessToken={accessToken}
        userInfo={userInfo}
        data-testid={`${testId}-editor`}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary gba:to-primary/60 gba:flex gba:items-center gba:justify-center">
                <FileText className="gba:w-6 gba:h-6 gba:text-primary-foreground" />
              </div>
              <div>
                <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">Document Apps</h1>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Create, edit, and manage your documents with ease
                </p>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              {currentView === 'list' && (
                <>
                  <Button variant="outline" onClick={handleStartUpload}>
                    <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                    Upload Word
                  </Button>
                  <Button onClick={handleCreateNew}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    New Document
                  </Button>
                </>
              )}
              {currentView !== 'list' && (
                <Button variant="outline" onClick={handleBack}>
                  Back to Documents
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        {/* Upload View */}
        {currentView === 'upload' && (
          <div className="gba:max-w-2xl gba:mx-auto gba:space-y-6">
            <div className="gba:text-center gba:mb-8">
              <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">Upload Word Document</h2>
              <p className="gba:text-muted-foreground">
                Upload your Word document and we'll preserve the formatting for you
              </p>
            </div>

            <WordUploader
              onFileParsed={handleWordFileParsed}
              onError={error => toast.error(error)}
              data-testid={`${testId}-uploader`}
            />
          </div>
        )}

        {/* Template View */}
        {currentView === 'templates' && (
          <div className="gba:max-w-6xl gba:mx-auto">
            <TemplateGallery
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
              data-testid={`${testId}-templates`}
            />
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div className="gba:space-y-6">
            {/* Tabs for Documents and Templates */}
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'documents' | 'templates')}>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <TabsList>
                  <TabsTrigger value="documents" startIcon={<FolderOpen className="gba:w-4 gba:h-4" />}>
                    My Documents
                  </TabsTrigger>
                  <TabsTrigger value="templates" startIcon={<LayoutTemplate className="gba:w-4 gba:h-4" />}>
                    Templates
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'documents' && (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant={viewLayout === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewLayout('grid')}
                    >
                      <Grid className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      variant={viewLayout === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewLayout('list')}
                    >
                      <List className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="documents" className="gba:mt-0">
                {/* Toolbar */}
                <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
                  <div className="gba:relative gba:flex-1 gba:max-w-md">
                    <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="gba:pl-10"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="gba:w-4 gba:h-4 gba:mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <SortAsc className="gba:w-4 gba:h-4 gba:mr-2" />
                    Sort
                  </Button>
                </div>

                {/* Loading state */}
                {isLoadingDocuments && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                    <Spinner size="lg" />
                  </div>
                )}

                {/* Error state */}
                {documentsError && (
                  <Card className="gba:p-6 gba:text-center">
                    <AlertCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
                    <p className="gba:text-destructive">{documentsError}</p>
                  </Card>
                )}

                {/* Empty state */}
                {!isLoadingDocuments && !documentsError && filteredDocuments.length === 0 && (
                  <NoDocumentsState onCreateNew={handleCreateNew} />
                )}

                {/* Documents grid/list */}
                {!isLoadingDocuments && filteredDocuments.length > 0 && (
                  <div
                    className={
                      viewLayout === 'grid'
                        ? 'gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4'
                        : 'gba:space-y-4'
                    }
                  >
                    {filteredDocuments.map(doc => (
                      <DocumentPreviewCard
                        key={doc.id}
                        document={doc}
                        approvalRequest={doc.approvalRequest}
                        onOpen={handleOpenDocument}
                        onEdit={handleOpenDocument}
                        onDelete={handleDeleteDocument}
                        onDuplicate={handleDuplicateDocument}
                        onSendForApproval={handleSendForApprovalClick}
                        data-testid={`${testId}-doc-card`}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="templates" className="gba:mt-0">
                <TemplateGallery
                  templates={templates}
                  onSelectTemplate={handleSelectTemplate}
                  data-testid={`${testId}-templates`}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Feature highlights (shown in list view) */}
      {currentView === 'list' && activeTab === 'documents' && filteredDocuments.length > 0 && (
        <div className="gba:border-t gba:bg-muted/30 gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-8 gba:text-sm gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Database
                className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-success' : 'gba:text-warning'}`}
              />
              <span>{storageMode === 'database' ? 'Stored in database' : 'Stored locally'}</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Upload className="gba:w-4 gba:h-4 gba:text-primary" />
              <span>Word upload with formatting</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <LayoutTemplate className="gba:w-4 gba:h-4 gba:text-primary" />
              <span>Template library</span>
            </div>
          </div>
        </div>
      )}

      {/* Send for Approval Dialog */}
      {documentForApproval && (
        <SendForApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={open => {
            setApprovalDialogOpen(open)
            if (!open) setDocumentForApproval(null)
          }}
          documentId={documentForApproval}
          documentTitle={documents.find(d => d.id === documentForApproval)?.title || 'Untitled Document'}
          currentUserId={currentUserId}
          currentUserName={userInfo?.displayName || userInfo?.employeeDetails?.displayName}
          accessToken={accessToken}
          shareDocument={shareDocument}
          onApprovalSent={async (approverIds, approverWorkflows) => {
            // Update document with pending approval status including workflow IDs and user info
            if (documentForApproval) {
              const workflowIds = approverWorkflows?.map(aw => aw.workflowId) || []
              await updateDocument(documentForApproval, {
                status: 'pending_approval',
                approvalRequest: {
                  id: `approval_${Date.now()}`,
                  documentId: documentForApproval,
                  status: 'pending',
                  requestedBy: currentUserId,
                  requestedAt: new Date().toISOString(),
                  approvers: approverIds.map(id => {
                    const workflow = approverWorkflows?.find(aw => aw.userId === id)
                    return {
                      userId: id,
                      userName: workflow?.userName,
                      status: 'pending' as const,
                      workflowId: workflow?.workflowId
                    }
                  }),
                  workflowIds
                }
              })
            }
            setDocumentForApproval(null)
          }}
          data-testid={`${testId}-approval-dialog`}
        />
      )}
    </div>
  )
}

export default DocumentAppsHub
