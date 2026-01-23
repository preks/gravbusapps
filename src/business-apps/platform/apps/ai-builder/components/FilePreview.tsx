import React, { useState, useEffect, useMemo } from 'react'
import { X, Copy, Check, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { ENV } from '../config/environment'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  useEffect(() => {
    loadFile()
  }, [filePath])

  const loadFile = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/tools/execute`, {
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

  // Search functionality
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim() || !content) return []

    const lines = content.split('\n')
    const matches: { lineIndex: number; lineNumber: number; columnIndex: number }[] = []
    const searchLower = searchTerm.toLowerCase()

    lines.forEach((line, lineIndex) => {
      const lineLower = line.toLowerCase()
      let columnIndex = 0

      while ((columnIndex = lineLower.indexOf(searchLower, columnIndex)) !== -1) {
        matches.push({
          lineIndex,
          lineNumber: lineIndex + 1,
          columnIndex
        })
        columnIndex += searchTerm.length
      }
    })

    return matches
  }, [content, searchTerm])

  // Reset current match index when search term changes
  useEffect(() => {
    setCurrentMatchIndex(0)
  }, [searchTerm])

  const goToNextMatch = () => {
    if (searchMatches.length === 0) return
    setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length)
  }

  const goToPrevMatch = () => {
    if (searchMatches.length === 0) return
    setCurrentMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length)
  }

  // Highlight search matches in content
  const highlightedContent = useMemo(() => {
    if (!searchTerm.trim() || searchMatches.length === 0) return content

    const lines = content.split('\n')
    const searchLower = searchTerm.toLowerCase()

    return lines.map((line, lineIndex) => {
      const lineLower = line.toLowerCase()
      let lastIndex = 0
      const parts: React.ReactNode[] = []
      let matchIndexInLine = 0

      while (true) {
        const columnIndex = lineLower.indexOf(searchLower, lastIndex)
        if (columnIndex === -1) break

        // Add text before match
        if (columnIndex > lastIndex) {
          parts.push(line.substring(lastIndex, columnIndex))
        }

        // Find the global match index for this occurrence
        const globalMatchIndex = searchMatches.findIndex(
          m => m.lineIndex === lineIndex && m.columnIndex === columnIndex
        )

        const isCurrent = globalMatchIndex === currentMatchIndex

        // Add highlighted match
        parts.push(
          <mark
            key={`${lineIndex}-${matchIndexInLine}`}
            className={`${
              isCurrent ? 'gba:bg-warning gba:text-warning-foreground' : 'gba:bg-warning/30 gba:text-foreground'
            } gba:px-0.5 gba:rounded`}
          >
            {line.substring(columnIndex, columnIndex + searchTerm.length)}
          </mark>
        )

        lastIndex = columnIndex + searchTerm.length
        matchIndexInLine++
      }

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex))
      }

      return (
        <div key={lineIndex} className="gba:leading-relaxed">
          {parts.length > 0 ? parts : line}
        </div>
      )
    })
  }, [content, searchTerm, searchMatches, currentMatchIndex])

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
        <div className="gba:p-4 gba:border-b gba:border-border gba:space-y-3">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex-1 gba:min-w-0">
              <h3 className="gba:text-sm gba:font-mono gba:truncate gba:text-foreground">{filePath}</h3>
              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                <span
                  className={`gba:text-xs gba:px-2 gba:py-0.5 gba:rounded gba:font-medium ${
                    source === 'session'
                      ? 'gba:bg-warning/20 gba:text-warning'
                      : 'gba:bg-muted gba:text-muted-foreground'
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

          {/* Search Bar */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:relative gba:flex-1">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search in file..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="gba:pl-9 gba:h-8 gba:text-sm"
              />
            </div>
            {searchMatches.length > 0 && (
              <>
                <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">
                  {currentMatchIndex + 1} / {searchMatches.length}
                </span>
                <div className="gba:flex gba:gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={goToPrevMatch}
                    className="gba:h-8 gba:w-8 gba:p-0"
                    title="Previous match (Shift+Enter)"
                  >
                    <ChevronUp size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={goToNextMatch}
                    className="gba:h-8 gba:w-8 gba:p-0"
                    title="Next match (Enter)"
                  >
                    <ChevronDown size={16} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:overflow-auto gba:bg-background">
          {loading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
              <div className="gba:animate-pulse">Loading file content...</div>
            </div>
          ) : (
            <div className="gba:flex gba:font-mono gba:text-xs">
              {/* Line numbers */}
              <div className="gba:flex-shrink-0 gba:py-4 gba:pl-4 gba:pr-3 gba:bg-muted/30 gba:text-muted-foreground gba:select-none gba:text-right gba:border-r gba:border-border">
                {content.split('\n').map((_, i) => (
                  <div key={i} className="gba:leading-relaxed">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Code content with search highlights */}
              <div className={`gba:flex-1 gba:py-4 gba:px-4 gba:overflow-x-auto gba:text-foreground language-${ext}`}>
                {searchTerm.trim() && searchMatches.length > 0 ? (
                  highlightedContent
                ) : (
                  <pre className="gba:whitespace-pre gba:leading-relaxed">{content}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
