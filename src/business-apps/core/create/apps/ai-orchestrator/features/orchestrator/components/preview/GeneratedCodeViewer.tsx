/**
 * GeneratedCodeViewer - Fallback code viewer when azureUrl is not available
 *
 * Shows generated files from the AI Builder session using the same API
 * that ai-builder uses to display code.
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle
} from '@newwork/nw-design-system'
import { Code2, FileText, AlertCircle, ExternalLink } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AI_BUILDER_API_URL } from '@/common/utils/serviceResolver'

const AI_SERVICE_API_URL = AI_BUILDER_API_URL

export interface GeneratedCodeViewerProps {
  sessionId: string | null
  repoId: string | null
  jobId?: string | null
  createdId?: string | null
  componentName: string
  accessToken: string
}

interface FileChange {
  path: string
  type: 'create' | 'modify' | 'delete'
  content?: string
}

export const GeneratedCodeViewer: React.FC<GeneratedCodeViewerProps> = ({
  sessionId,
  repoId,
  jobId,
  createdId,
  componentName,
  accessToken
}) => {
  const [files, setFiles] = useState<FileChange[]>([])
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [fileLoadError, setFileLoadError] = useState<string | null>(null)

  // Derive sessionId/repoId from alternative identifiers if not provided
  const effectiveSessionId = sessionId || createdId || jobId
  const effectiveRepoId = repoId || createdId || jobId

  useEffect(() => {
    const loadFiles = async () => {
      if (!effectiveSessionId || !effectiveRepoId) {
        setError('Missing session or repository information')
        setLoading(false)
        return
      }

      try {
        const queryParams = new URLSearchParams()
        queryParams.set('repoId', effectiveRepoId)
        queryParams.set('sessionId', effectiveSessionId)

        const response = await fetch(`${AI_SERVICE_API_URL}/api/git/changes?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch files: ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()
        const filesList = data.summary?.files || []

        setFiles(filesList)
        if (filesList.length > 0) {
          setSelectedFile(filesList[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load generated files')
      } finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [effectiveSessionId, effectiveRepoId, accessToken])

  const loadFileContent = async (file: FileChange) => {
    if (file.content) {
      setSelectedFile(file)
      return
    }

    setIsLoadingFile(true)
    setFileLoadError(null)

    try {
      const response = await fetch(`${AI_SERVICE_API_URL}/api/tools/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolName: 'read_file',
          args: { file_path: file.path },
          repoId: effectiveRepoId,
          sessionId: effectiveSessionId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const fileWithContent = { ...file, content: data.content || '' }
      setFiles(prev => prev.map(f => (f.path === file.path ? fileWithContent : f)))
      setSelectedFile(fileWithContent)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file content'
      setFileLoadError(errorMessage)
    } finally {
      setIsLoadingFile(false)
    }
  }

  const handleOpenInAIBuilder = () => {
    const params = new URLSearchParams()
    if (effectiveSessionId) params.set('sessionId', effectiveSessionId)
    if (effectiveRepoId) params.set('repoId', effectiveRepoId)
    if (jobId) params.set('jobId', jobId)
    if (createdId) params.set('createdId', createdId)

    navigateTo(buildPlatformUrl(`/platform/create/screen-builder?${params.toString()}`))
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px] gba:p-6">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <AlertTitle>Failed to Load Code</AlertTitle>
          <AlertDescription className="gba:mt-2">
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px] gba:p-6">
        <Alert className="gba:max-w-md">
          <Code2 className="gba:h-4 gba:w-4" />
          <AlertTitle>No Files Generated</AlertTitle>
          <AlertDescription className="gba:mt-2">
            <p>No generated files found for this session.</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:gap-4 gba:p-4">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Generated Code</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {files.length} file{files.length === 1 ? '' : 's'} generated for {componentName}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenInAIBuilder}>
          <ExternalLink className="gba:w-4 gba:h-4 gba:mr-2" />
          Open in Screen Builder
        </Button>
      </div>

      {/* Split view: File list + Content */}
      <div className="gba:flex gba:gap-4 gba:flex-1 gba:overflow-hidden">
        {/* File list */}
        <Card className="gba:w-80 gba:flex gba:flex-col">
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-sm">Files</CardTitle>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:overflow-auto gba:p-0">
            <div className="gba:space-y-1 gba:p-2">
              {files.map(file => (
                <button
                  key={file.path}
                  onClick={() => {
                    setFileLoadError(null)
                    loadFileContent(file)
                  }}
                  className={`gba:w-full gba:text-left gba:px-3 gba:py-2 gba:rounded-md gba:flex gba:items-center gba:gap-2 gba:transition-colors ${
                    selectedFile?.path === file.path ? 'gba:bg-primary/10 gba:text-primary' : 'hover:gba:bg-muted'
                  }`}
                >
                  <FileText className="gba:w-4 gba:h-4 gba:shrink-0" />
                  <span className="gba:text-sm gba:font-mono gba:truncate gba:flex-1">{file.path}</span>
                  <Badge
                    variant="secondary"
                    className={`gba:text-[10px] gba:px-1.5 gba:py-0 gba:shrink-0 ${
                      file.type === 'create'
                        ? 'gba:bg-emerald-100 gba:text-emerald-700'
                        : 'gba:bg-blue-100 gba:text-blue-700'
                    }`}
                  >
                    {file.type}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Code content */}
        <Card className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
          {selectedFile ? (
            <>
              <CardHeader className="gba:pb-3 gba:border-b gba:border-border">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <code className="gba:text-sm gba:font-mono gba:text-foreground">{selectedFile.path}</code>
                  <Badge
                    variant="secondary"
                    className={`gba:text-[10px] gba:px-2 gba:py-0.5 ${
                      selectedFile.type === 'create'
                        ? 'gba:bg-emerald-100 gba:text-emerald-700'
                        : 'gba:bg-blue-100 gba:text-blue-700'
                    }`}
                  >
                    {selectedFile.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="gba:flex-1 gba:overflow-auto gba:p-0">
                {(() => {
                  if (fileLoadError) {
                    return (
                      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:p-4">
                        <Alert variant="destructive" className="gba:max-w-md">
                          <AlertCircle className="gba:h-4 gba:w-4" />
                          <AlertTitle>Failed to Load File</AlertTitle>
                          <AlertDescription className="gba:mt-2">
                            <p>{fileLoadError}</p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    )
                  }
                  if (selectedFile.content) {
                    return (
                      <pre className="gba:p-4 gba:text-xs gba:font-mono gba:text-foreground gba:whitespace-pre gba:overflow-x-auto">
                        {selectedFile.content}
                      </pre>
                    )
                  }
                  if (isLoadingFile) {
                    return (
                      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
                        <Spinner size="sm" />
                      </div>
                    )
                  }
                  return (
                    <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
                      <p className="gba:text-sm">Select a file to view its contents</p>
                    </div>
                  )
                })()}
              </CardContent>
            </>
          ) : (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
              <p className="gba:text-sm">Select a file to view its contents</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default GeneratedCodeViewer
