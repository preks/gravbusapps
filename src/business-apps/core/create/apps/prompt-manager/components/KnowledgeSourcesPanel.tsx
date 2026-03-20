/**
 * Knowledge Sources Panel
 *
 * Manage documents, URLs, and knowledge bases for Every Experts
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import {
  Upload,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Trash2,
  Plus,
  BookOpen,
  Database,
  FolderOpen,
  StickyNote,
  TableProperties,
  Presentation
} from 'lucide-react'
import type { KnowledgeSource } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ContentEntrySelector } from './ContentEntrySelector'
import { CatalogSelector } from './CatalogSelector'
import { WorkspaceContentSelector } from './WorkspaceContentSelector'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface KnowledgeSourcesPanelProps extends BusinessAppContextProps {
  promptId?: string // For reference only, not used for immediate saves
  sources: KnowledgeSource[]
  onSourcesChange: (sources: KnowledgeSource[]) => void
  'data-testid'?: string
}

export const KnowledgeSourcesPanel: React.FC<KnowledgeSourcesPanelProps> = ({
  promptId,
  sources,
  onSourcesChange,
  'data-testid': testId = 'knowledge-sources-panel',
  ...context
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [urlDescription, setUrlDescription] = useState('')
  const [showContentSelector, setShowContentSelector] = useState(false)
  const [showCatalogSelector, setShowCatalogSelector] = useState(false)
  const [showWorkspaceContent, setShowWorkspaceContent] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setIsUploading(true)
      setUploadError(null)

      try {
        const uploadedSources: KnowledgeSource[] = []

        for (const file of Array.from(files)) {
          // Always store locally - the TaskExpertEditor handles backend save
          const source: KnowledgeSource = {
            id: `document-${Date.now()}-${file.name}`,
            type: 'document',
            name: file.name,
            description: `Uploaded from ${file.name}`,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
          uploadedSources.push(source)
        }

        onSourcesChange([...sources, ...uploadedSources])
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload file')
      } finally {
        setIsUploading(false)
      }
    },
    [sources, onSourcesChange]
  )

  const handleAddUrl = useCallback(async () => {
    if (!urlInput || !urlName) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Always store locally - the TaskExpertEditor handles backend save
      const source: KnowledgeSource = {
        id: `url-${Date.now()}`,
        type: 'url',
        name: urlName,
        description: urlDescription,
        url: urlInput,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }

      onSourcesChange([...sources, source])

      // Reset form
      setUrlInput('')
      setUrlName('')
      setUrlDescription('')
      setShowUrlInput(false)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to add URL')
    } finally {
      setIsUploading(false)
    }
  }, [urlInput, urlName, urlDescription, sources, onSourcesChange])

  const handleAddContentEntries = useCallback(
    async (entries: Array<{ id: string; title: string; contentType?: { value: string } }>) => {
      setIsUploading(true)
      setUploadError(null)

      try {
        const addedSources: KnowledgeSource[] = []

        for (const entry of entries) {
          // Always store locally - the TaskExpertEditor handles backend save
          const source: KnowledgeSource = {
            id: entry.id,
            type: 'content_entry',
            name: entry.title,
            description: entry.contentType?.value || 'Internal Content',
            contentEntryId: entry.id,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
          addedSources.push(source)
        }

        onSourcesChange([...sources, ...addedSources])
        setShowContentSelector(false)
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to add content')
      } finally {
        setIsUploading(false)
      }
    },
    [sources, onSourcesChange]
  )

  const handleAddCatalogs = useCallback(
    async (
      catalogs: Array<{ id: string; identifier: string; version: string; name: string; entriesCount?: number }>
    ) => {
      setIsUploading(true)
      setUploadError(null)

      try {
        const addedSources: KnowledgeSource[] = []

        for (const catalog of catalogs) {
          // Always store locally - the TaskExpertEditor handles backend save
          const source: KnowledgeSource = {
            id: catalog.id,
            type: 'catalog',
            name: catalog.name,
            description: `Catalog: ${catalog.identifier} (${catalog.entriesCount || 0} entries)`,
            catalogIdentifier: catalog.identifier,
            catalogVersion: catalog.version,
            catalogEntryCount: catalog.entriesCount,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
          addedSources.push(source)
        }

        onSourcesChange([...sources, ...addedSources])
        setShowCatalogSelector(false)
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to add catalogs')
      } finally {
        setIsUploading(false)
      }
    },
    [sources, onSourcesChange]
  )

  const handleAddWorkspaceContent = useCallback(
    (items: Array<{ id: string; type: string; title: string; spaceName?: string }>) => {
      setIsUploading(true)
      setUploadError(null)

      try {
        const addedSources: KnowledgeSource[] = items.map(item => ({
          id: `workspace-${item.type}-${item.id}`,
          type: item.type as KnowledgeSource['type'],
          name: item.title,
          description: item.spaceName ? `From space: ${item.spaceName}` : `Workspace ${item.type}`,
          contentEntryId: item.id,
          fileId: item.id,
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }))

        onSourcesChange([...sources, ...addedSources])
        setShowWorkspaceContent(false)
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to add workspace content')
      } finally {
        setIsUploading(false)
      }
    },
    [sources, onSourcesChange]
  )

  /** Get a stable identifier for a knowledge source (backend id, or fallback to content/catalog id). */
  const getSourceKey = (source: KnowledgeSource, idx: number): string =>
    source.id || source.contentEntryId || source.catalogIdentifier || String(idx)

  const handleRemoveSource = useCallback(
    async (idx: number) => {
      // Always remove locally only - the TaskExpertEditor handles backend save
      onSourcesChange(sources.filter((_, i) => i !== idx))
    },
    [sources, onSourcesChange]
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card className="gba:!bg-background" data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <BookOpen className="gba:w-5 gba:h-5" />
          Knowledge Sources
        </CardTitle>
        <CardDescription>
          Add documents, URLs, and knowledge bases to enhance your expert&apos;s knowledge. These sources will be used
          to provide accurate, context-specific answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Upload Actions */}
        {true ? (
          <>
            <div className="gba:flex gba:gap-2 gba:flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWorkspaceContent(true)}
                disabled={isUploading}
                data-testid={`${testId}-add-workspace-content-button`}
              >
                <FolderOpen className="gba:w-4 gba:h-4 gba:mr-2" />
                From Workspace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContentSelector(true)}
                disabled={isUploading}
                data-testid={`${testId}-add-content-button`}
              >
                <BookOpen className="gba:w-4 gba:h-4 gba:mr-2" />
                From Knowledge Base
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCatalogSelector(true)}
                disabled={isUploading}
                data-testid={`${testId}-add-catalog-button`}
              >
                <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                Add Catalog
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={isUploading}
                data-testid={`${testId}-add-url-button`}
              >
                <LinkIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                Add External URL
              </Button>
              {promptId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid={`${testId}-upload-button`}
                >
                  <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                  Upload Document
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={e => handleFileUpload(e.target.files)}
                className="gba:hidden"
              />
            </div>
          </>
        ) : (
          <div className="gba:bg-warning/10 gba:border gba:border-warning/20 gba:rounded-lg gba:p-3">
            <p className="gba:text-sm gba:text-warning-foreground">
              Save the expert first, then you can add knowledge sources
            </p>
          </div>
        )}

        {/* URL Input Form */}
        {showUrlInput && promptId && (
          <Card className="gba:border-primary/20">
            <CardContent className="gba:pt-4 gba:space-y-3">
              <div className="gba:space-y-2">
                <Label htmlFor="urlName">Source Name *</Label>
                <Input
                  id="urlName"
                  value={urlName}
                  onChange={e => setUrlName(e.target.value)}
                  placeholder="Company Legal Policy"
                  data-testid={`${testId}-url-name-input`}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="urlInput">URL *</Label>
                <Input
                  id="urlInput"
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://docs.company.com/legal/policies"
                  data-testid={`${testId}-url-input`}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="urlDescription">Description</Label>
                <Input
                  id="urlDescription"
                  value={urlDescription}
                  onChange={e => setUrlDescription(e.target.value)}
                  placeholder="Optional description"
                  data-testid={`${testId}-url-description-input`}
                />
              </div>
              <div className="gba:flex gba:gap-2 gba:justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowUrlInput(false)}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddUrl}
                  disabled={!urlInput || !urlName || isUploading}
                  data-testid={`${testId}-add-url-submit-button`}
                >
                  <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
                  Add URL
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="gba:text-destructive gba:text-sm" data-testid={`${testId}-error`}>
            {uploadError}
          </div>
        )}

        {/* Loading State */}
        {isUploading && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <Spinner size="sm" />
            <span>Uploading...</span>
          </div>
        )}

        {/* Knowledge Sources List */}
        {sources.length > 0 && (
          <div className="gba:space-y-2">
            <Label>Sources ({sources.length})</Label>
            <div className="gba:space-y-2">
              {sources.map((source, idx) => (
                <div
                  key={getSourceKey(source, idx)}
                  className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border"
                  data-testid={`${testId}-source-${getSourceKey(source, idx)}`}
                >
                  <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    {source.type === 'url' ? (
                      <ExternalLink className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : source.type === 'content_entry' ? (
                      <BookOpen className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : source.type === 'catalog' ? (
                      <Database className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : source.type === 'note' ? (
                      <StickyNote className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : source.type === 'spreadsheet' ? (
                      <TableProperties className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : source.type === 'slide' ? (
                      <Presentation className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : (
                      <FileText className="gba:w-4 gba:h-4 gba:text-primary" />
                    )}
                  </div>

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                      <div className="gba:flex-1">
                        <h4 className="gba:font-medium gba:text-sm gba:truncate">{source.name}</h4>
                        {source.description && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1">{source.description}</p>
                        )}
                        {source.type === 'document' && source.fileSize && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {formatFileSize(source.fileSize)}
                          </p>
                        )}
                        {source.type === 'catalog' && source.catalogEntryCount !== undefined && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {source.catalogIdentifier} ({source.catalogEntryCount} entries)
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:flex-shrink-0">
                        {source.type}
                      </Badge>
                    </div>

                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gba:text-xs gba:text-primary gba:hover:underline gba:mt-1 gba:inline-flex gba:items-center gba:gap-1"
                      >
                        View
                        <ExternalLink className="gba:w-2.5 gba:h-2.5" />
                      </a>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSource(idx)}
                    className="gba:text-destructive gba:hover:bg-destructive/10"
                    data-testid={`${testId}-remove-source-${getSourceKey(source, idx)}`}
                  >
                    <Trash2 className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sources.length === 0 && !isUploading && (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            <FileText className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
            <p className="gba:text-sm">No knowledge sources yet</p>
            <p className="gba:text-xs gba:mt-1">
              Add from workspace content, knowledge base, catalogs, upload documents, or add external URLs
            </p>
          </div>
        )}
      </CardContent>

      {/* Content Entry Selector Dialog */}
      <ContentEntrySelector
        isOpen={showContentSelector}
        onSelect={handleAddContentEntries}
        accessToken={context.accessToken}
        onClose={() => setShowContentSelector(false)}
      />

      {/* Catalog Selector Dialog */}
      <CatalogSelector
        isOpen={showCatalogSelector}
        onSelect={handleAddCatalogs}
        existingSources={sources}
        {...context}
        onClose={() => setShowCatalogSelector(false)}
      />

      {/* Workspace Content Selector Dialog */}
      <WorkspaceContentSelector
        isOpen={showWorkspaceContent}
        onSelect={handleAddWorkspaceContent}
        accessToken={context.accessToken}
        onClose={() => setShowWorkspaceContent(false)}
      />
    </Card>
  )
}
