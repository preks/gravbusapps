import React, { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

interface FilePreviewProps {
  filePath: string
  repoId: string
  sessionId: string
  onClose: () => void
}

export const FilePreview: React.FC<FilePreviewProps> = ({ filePath, repoId, sessionId, onClose }) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [source, setSource] = useState<string>('')

  useEffect(() => {
    loadFile()
  }, [filePath])

  const loadFile = async () => {
    setLoading(true)
    try {
      const response = await fetch('https://forge-api-production-db58.up.railway.app/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read_file',
          args: { file_path: filePath },
          repoId,
          sessionId
        })
      })
      const data = await response.json()
      setContent(data.content || 'No content')
      setSource(data.source || 'unknown')
    } catch (error) {
      setContent('Error loading file')
      console.error('Failed to load file:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyPath = () => {
    navigator.clipboard.writeText(filePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyContent = () => {
    navigator.clipboard.writeText(content)
  }

  // Get file extension for basic syntax highlighting class
  const getFileExtension = (path: string): string => {
    const parts = path.split('.')
    return parts.length > 1 ? parts[parts.length - 1] : ''
  }

  const ext = getFileExtension(filePath)

  return (
    <div
      className="gba:fixed gba:inset-0 gba:bg-black/50 gba:flex gba:items-center gba:justify-center gba:z-50"
      onClick={onClose}
    >
      <div
        className="gba:bg-card gba:rounded-lg gba:shadow-lg gba:w-[900px] gba:max-w-[90vw] gba:max-h-[90vh] gba:flex gba:flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:border-b gba:border-border">
          <div className="gba:flex-1 gba:min-w-0">
            <h3 className="gba:text-sm gba:font-mono gba:truncate gba:text-foreground">{filePath}</h3>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
              <span
                className={`gba:text-xs gba:px-2 gba:py-0.5 gba:rounded gba:font-medium ${
                  source === 'session' ? 'gba:bg-warning/20 gba:text-warning' : 'gba:bg-muted gba:text-muted-foreground'
                }`}
              >
                {source === 'session' ? '● Modified in session' : source}
              </span>
              <span className="gba:text-xs gba:text-muted-foreground">{content.split('\n').length} lines</span>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={copyPath}
            className="gba:h-8 gba:w-8 gba:p-0"
            title="Copy file path"
          >
            {copied ? <Check size={16} className="gba:text-success" /> : <Copy size={16} />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={copyContent}
            className="gba:h-8 gba:px-3"
            title="Copy file content"
          >
            <Copy size={16} className="gba:mr-1.5" />
            <span className="gba:text-xs">Copy</span>
          </Button>

          <Button size="sm" variant="ghost" onClick={onClose} className="gba:h-8 gba:w-8 gba:p-0">
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:overflow-auto gba:p-4 gba:bg-background">
          {loading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
              <div className="gba:animate-pulse">Loading file content...</div>
            </div>
          ) : (
            <pre
              className={`gba:text-xs gba:font-mono gba:whitespace-pre-wrap gba:leading-relaxed gba:text-foreground language-${ext}`}
            >
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
