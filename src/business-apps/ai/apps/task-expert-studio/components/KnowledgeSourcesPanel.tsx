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
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import { Upload, Link as LinkIcon, FileText, ExternalLink, Trash2, Plus, BookOpen } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { KnowledgeSource } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ContentEntrySelector } from './ContentEntrySelector'

interface KnowledgeSourcesPanelProps {
  promptId?: string // Only available when editing existing prompt
  sources: KnowledgeSource[]
  onSourcesChange: (sources: KnowledgeSource[]) => void
  accessToken: string
  allowLocalOnly?: boolean // Allow adding sources locally before save (for create mode)
  'data-testid'?: string
}

export const KnowledgeSourcesPanel: React.FC<KnowledgeSourcesPanelProps> = ({
  promptId,
  sources,
  onSourcesChange,
  accessToken,
  allowLocalOnly = false,
  'data-testid': testId = 'knowledge-sources-panel'
}) => {
  const client = usePromptManagerClient(accessToken)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [urlDescription, setUrlDescription] = useState('')
  const [showContentSelector, setShowContentSelector] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setIsUploading(true)
      setUploadError(null)

      try {
        const uploadedSources: KnowledgeSource[] = []

        for (const file of Array.from(files)) {
          if (promptId) {
            // Edit mode - upload to backend
            const source = await client.uploadKnowledgeSource(promptId, file, `Uploaded from ${file.name}`)
            uploadedSources.push(source)
          } else if (allowLocalOnly) {
            // Create mode - store locally
            const source: KnowledgeSource = {
              id: `temp-${Date.now()}-${file.name}`,
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
        }

        onSourcesChange([...sources, ...uploadedSources])
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload file')
      } finally {
        setIsUploading(false)
      }
    },
    [promptId, allowLocalOnly, client, sources, onSourcesChange]
  )

  const handleAddUrl = useCallback(async () => {
    if (!urlInput || !urlName) return

    setIsUploading(true)
    setUploadError(null)

    try {
      let source: KnowledgeSource

      if (promptId) {
        // Edit mode - add to backend
        source = await client.addKnowledgeSourceUrl(promptId, urlInput, urlName, urlDescription)
      } else if (allowLocalOnly) {
        // Create mode - store locally
        source = {
          id: `temp-${Date.now()}-url`,
          type: 'url',
          name: urlName,
          description: urlDescription,
          url: urlInput,
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      } else {
        return
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
  }, [promptId, allowLocalOnly, urlInput, urlName, urlDescription, client, sources, onSourcesChange])

  const handleAddContentEntries = useCallback(
    async (entries: Array<{ id: string; title: string; contentType?: { value: string } }>) => {
      setIsUploading(true)
      setUploadError(null)

      try {
        const addedSources: KnowledgeSource[] = []

        for (const entry of entries) {
          if (promptId) {
            // If we have a promptId (edit mode), upload to backend
            const source = await client.addKnowledgeSourceContent(
              promptId,
              entry.id,
              entry.title,
              entry.contentType?.value || 'Internal Content'
            )
            addedSources.push(source)
          } else if (allowLocalOnly) {
            // Create mode - store locally until save
            const source: KnowledgeSource = {
              id: `temp-${Date.now()}-${entry.id}`,
              type: 'content_entry',
              name: entry.title,
              description: entry.contentType?.value || 'Internal Content',
              contentEntryId: entry.id,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
            addedSources.push(source)
          }
        }

        onSourcesChange([...sources, ...addedSources])
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to add content')
      } finally {
        setIsUploading(false)
      }
    },
    [promptId, allowLocalOnly, client, sources, onSourcesChange]
  )

  const handleRemoveSource = useCallback(
    async (sourceId: string) => {
      if (!promptId) {
        // For new prompts, just remove from local state
        onSourcesChange(sources.filter(s => s.id !== sourceId))
        return
      }

      try {
        await client.removeKnowledgeSource(promptId, sourceId)
        onSourcesChange(sources.filter(s => s.id !== sourceId))
      } catch (error) {
        console.error('Failed to remove knowledge source:', error)
      }
    },
    [promptId, client, sources, onSourcesChange]
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:text-base">📚 Knowledge Sources</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <p className="gba:text-sm gba:text-muted-foreground">
          Add documents, URLs, and knowledge bases to enhance your expert's knowledge. These sources will be used to
          provide accurate, context-specific answers.
        </p>

        {/* Upload Actions */}
        {promptId || allowLocalOnly ? (
          <>
            <div className="gba:flex gba:gap-2 gba:flex-wrap">
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
            {!promptId && allowLocalOnly && (
              <div className="gba:bg-info/10 gba:border gba:border-info/20 gba:rounded-lg gba:p-3">
                <p className="gba:text-xs gba:text-info-foreground">
                  💡 <strong>Knowledge Sources:</strong>
                  <br />• Add from Knowledge Base and External URLs now
                  <br />• Upload Documents after saving the expert (Edit mode)
                </p>
              </div>
            )}
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
                  key={source.id || idx}
                  className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border"
                  data-testid={`${testId}-source-${source.id}`}
                >
                  <div className="gba:w-8 gba:h-8 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    {source.type === 'url' ? (
                      <ExternalLink className="gba:w-4 gba:h-4 gba:text-primary" />
                    ) : source.type === 'content_entry' ? (
                      <BookOpen className="gba:w-4 gba:h-4 gba:text-primary" />
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
                    onClick={() => handleRemoveSource(source.id)}
                    className="gba:text-destructive gba:hover:bg-destructive/10"
                    data-testid={`${testId}-remove-source-${source.id}`}
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
            <p className="gba:text-xs gba:mt-1">Add from knowledge base, upload documents, or add external URLs</p>
          </div>
        )}
      </CardContent>

      {/* Content Entry Selector Dialog */}
      <ContentEntrySelector
        isOpen={showContentSelector}
        onClose={() => setShowContentSelector(false)}
        onSelect={handleAddContentEntries}
        accessToken={accessToken}
      />
    </Card>
  )
}
