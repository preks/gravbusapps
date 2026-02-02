import React, { useState } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { FileCode, FolderOpen, File, Plus, Edit, Trash2 } from 'lucide-react'
import { cn } from '@newwork/nw-design-system'

interface GeneratedFile {
  path: string
  content: string
  changeType: 'create' | 'modify' | 'delete'
}

interface FileTreeViewerProps {
  files: GeneratedFile[]
  onFileSelect: (file: GeneratedFile) => void
}

export const FileTreeViewer: React.FC<FileTreeViewerProps> = ({ files, onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'gba:bg-success gba:text-success-foreground'
      case 'modify':
        return 'gba:bg-warning gba:text-warning-foreground'
      case 'delete':
        return 'gba:bg-destructive gba:text-destructive-foreground'
      default:
        return 'gba:bg-muted gba:text-muted-foreground'
    }
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <Plus className="gba:w-3 gba:h-3" />
      case 'modify':
        return <Edit className="gba:w-3 gba:h-3" />
      case 'delete':
        return <Trash2 className="gba:w-3 gba:h-3" />
      default:
        return <File className="gba:w-3 gba:h-3" />
    }
  }

  const handleFileClick = (file: GeneratedFile) => {
    setSelectedFile(file.path)
    onFileSelect(file)
  }

  if (files.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:p-6">
        <div className="gba:text-center gba:space-y-3">
          <FolderOpen className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground" />
          <div>
            <h3 className="gba:text-lg gba:font-medium gba:text-foreground">No Files Generated</h3>
            <p className="gba:text-sm gba:text-muted-foreground">Start a conversation to generate files</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:h-full">
      {/* File List */}
      <div className="gba:w-1/3 gba:border-r gba:overflow-y-auto gba:bg-muted/30">
        <div className="gba:p-4 gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Generated Files ({files.length})</h3>
          </div>
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => handleFileClick(file)}
              className={cn(
                'gba:w-full gba:text-left gba:p-3 gba:rounded-lg gba:transition-colors',
                'hover:gba:bg-muted gba:border gba:border-transparent',
                selectedFile === file.path && 'gba:bg-primary/10 gba:border-primary'
              )}
              data-testid={`ai-builder-file-item-${idx}`}
            >
              <div className="gba:flex gba:items-start gba:gap-2">
                <FileCode className="gba:w-4 gba:h-4 gba:mt-0.5 gba:text-muted-foreground gba:flex-shrink-0" />
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">
                    {file.path.split('/').pop()}
                  </div>
                  <div className="gba:text-[10px] gba:text-muted-foreground gba:truncate gba:mt-0.5">{file.path}</div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1',
                    getChangeTypeColor(file.changeType)
                  )}
                >
                  {getChangeTypeIcon(file.changeType)}
                  {file.changeType}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* File Content */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        {selectedFile ? (
          <div className="gba:p-6">
            {(() => {
              const file = files.find(f => f.path === selectedFile)
              if (!file) return null

              return (
                <div className="gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
                        {file.path.split('/').pop()}
                      </h3>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{file.path}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn('gba:flex gba:items-center gba:gap-1.5', getChangeTypeColor(file.changeType))}
                    >
                      {getChangeTypeIcon(file.changeType)}
                      {file.changeType.toUpperCase()}
                    </Badge>
                  </div>

                  <Card>
                    <CardContent className="gba:p-0">
                      <pre className="gba:p-4 gba:text-xs gba:overflow-x-auto gba:bg-muted/50">
                        <code className="gba:text-foreground">{file.content}</code>
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <div className="gba:text-center gba:text-muted-foreground">
              <File className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2" />
              <p className="gba:text-sm">Select a file to view its contents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
