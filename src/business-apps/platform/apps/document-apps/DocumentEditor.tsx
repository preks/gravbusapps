/**
 * DocumentEditor Component
 *
 * A full-featured rich text document editor with comprehensive
 * formatting capabilities, similar to Microsoft Word.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import ReactQuill from 'react-quill'
import { useEditorKeyboardIsolation } from '../shared/hooks/useEditorKeyboardIsolation'
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  FileText,
  Download,
  Share2,
  MoreVertical,
  Clock,
  CheckCircle,
  Printer,
  FileDown,
  BookTemplate,
  Send
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Document } from './types'
import {
  exportToWord,
  exportToPDF,
  printHtmlDocument,
  sanitizeHtmlForExport,
  embedImagesInHtml,
  blobToDataUrl
} from './utils/exportUtils'
import { fileClient } from '@/common/network/files/FileClient'
import translations from './_i18n'

// Import Quill styles
import 'react-quill/dist/quill.snow.css'

export interface DocumentEditorProps extends Partial<BusinessAppContextProps> {
  document?: Document
  initialContent?: string
  initialTitle?: string
  onSave: (title: string, content: string) => Promise<void>
  onBack: () => void
  onSaveAsTemplate?: (title: string, content: string) => void
  onSendForApproval?: () => void
  isReadOnly?: boolean
  'data-testid'?: string
}

/**
 * Quill modules configuration with full toolbar
 */
const QUILL_MODULES = {
  toolbar: {
    container: [
      // Undo/Redo - handled separately via custom handlers
      // Headers
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      // Font styling
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      // Text formatting
      ['bold', 'italic', 'underline', 'strike'],
      // Colors
      [{ color: [] }, { background: [] }],
      // Scripts
      [{ script: 'sub' }, { script: 'super' }],
      // Lists and indentation
      [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
      [{ indent: '-1' }, { indent: '+1' }],
      // Alignment
      [{ align: [] }],
      // Block elements
      ['blockquote', 'code-block'],
      // Links and media
      ['link', 'image', 'video'],
      // Tables - Note: Quill doesn't natively support tables without plugins
      // Clean formatting
      ['clean']
    ]
  },
  clipboard: {
    matchVisual: false
  },
  history: {
    delay: 1000,
    maxStack: 100,
    userOnly: true
  }
}

/**
 * Quill formats that are allowed
 */
const QUILL_FORMATS = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'list',
  'bullet',
  'check',
  'indent',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
  'video'
]

/**
 * DocumentEditor Component
 */
export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  initialContent = '',
  initialTitle,
  onSave,
  onBack,
  onSaveAsTemplate,
  onSendForApproval,
  isReadOnly = false,
  accessToken,
  'data-testid': testId = 'document-editor'
}) => {
  const { t } = useTranslation(translations)

  const getImageDataUrl = useCallback(
    async (src: string): Promise<string | null> => {
      if (!src) return null
      const s = src.trim()
      if (s.startsWith('data:')) return s
      if (s.startsWith('blob:')) {
        try {
          const res = await fetch(s)
          const blob = await res.blob()
          return blobToDataUrl(blob)
        } catch {
          return null
        }
      }
      if (accessToken && (s.startsWith('http://') || s.startsWith('https://'))) {
        try {
          const u = new URL(s)
          const pathWithQuery = `${u.pathname}${u.search}`
          const isTenantDownload =
            u.pathname.includes('/tenant/downloads/') || u.pathname.includes('/tenant/Downloads/')
          const looksLikeApiV1 = u.pathname.startsWith('/api/v1/')
          if (isTenantDownload || looksLikeApiV1) {
            const blob = await fileClient.downloadFileByPath(pathWithQuery, accessToken)
            return blobToDataUrl(blob)
          }
          const res = await fetch(s, {
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'omit'
          })
          if (!res.ok) return null
          const blob = await res.blob()
          return blobToDataUrl(blob)
        } catch {
          return null
        }
      }
      const rawPath = s.startsWith('/') ? s : `/${s}`
      const hasFileServicePath =
        rawPath.includes('/tenant/') || rawPath.startsWith('/files/') || rawPath.startsWith('/api/v1/')
      if (accessToken && hasFileServicePath) {
        try {
          const path = rawPath.replace(/^\/files(?=\/api\/v1\/)/, '')
          const blob = await fileClient.downloadFileByPath(path, accessToken)
          return blobToDataUrl(blob)
        } catch {
          return null
        }
      }
      return null
    },
    [accessToken]
  )

  // Editor state
  const [title, setTitle] = useState(document?.title ?? initialTitle ?? '')
  const [content, setContent] = useState(document?.content || initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(document ? new Date(document.updatedAt) : null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const editorRef = useRef<ReactQuill>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEditorKeyboardIsolation(editorContainerRef)

  /**
   * Save document
   */
  const handleSave = useCallback(
    async (isAutoSave = false) => {
      if (isReadOnly || isSaving) return

      setIsSaving(true)
      try {
        await onSave(title ?? '', content ?? '')
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        if (!isAutoSave) {
          // Could show a toast here
        }
      } catch (error) {
        console.error('[DocumentEditor] Save failed:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [title, content, onSave, isReadOnly, isSaving]
  )

  // Track content changes
  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value)
      setHasUnsavedChanges(true)

      // Auto-save after 2 seconds of inactivity
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave(true)
      }, 2000)
    },
    [handleSave]
  )

  // Track title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setHasUnsavedChanges(true)
  }, [])

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Export to Word
   */
  const handleExportWord = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportToWord(title, content)
    } catch (error) {
      console.error('[DocumentEditor] Export to Word failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [title, content])

  /**
   * Export to PDF
   */
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      const safeContent = sanitizeHtmlForExport(content, {
        preserveBlockSpacing: true,
        allowDataUriInImg: true
      })
      const htmlWithImages = await embedImagesInHtml(safeContent, getImageDataUrl)
      const finalContent = sanitizeHtmlForExport(htmlWithImages, {
        preserveBlockSpacing: true,
        allowDataUriInImg: true
      })
      await exportToPDF(title, finalContent)
    } catch (error) {
      console.error('[DocumentEditor] Export to PDF failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [title, content, getImageDataUrl])

  /**
   * Print document
   */
  const handlePrint = useCallback(async () => {
    const safeContent = sanitizeHtmlForExport(content, {
      preserveBlockSpacing: true,
      allowDataUriInImg: true
    })
    const htmlWithImages = await embedImagesInHtml(safeContent, getImageDataUrl)
    const finalContent = sanitizeHtmlForExport(htmlWithImages, {
      preserveBlockSpacing: true,
      allowDataUriInImg: true
    })
    printHtmlDocument({
      title,
      htmlContent: finalContent,
      includeTitleHeading: true,
      extraCss: `
        h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; }
        p { margin-bottom: 0.5em; }
      `
    })
  }, [title, content, getImageDataUrl])

  /**
   * Get word count
   */
  const wordCount = useMemo(() => {
    const text = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text ? text.split(' ').length : 0
  }, [content])

  /**
   * Get character count
   */
  const charCount = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, '')
    return text.length
  }, [content])

  /**
   * Format last saved time
   */
  const formatLastSaved = useCallback(
    (date: Date | null): string => {
      if (!date) return t('editor-status-not-saved')
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) return t('editor-status-saved-now')
      if (diffMinutes === 1) return t('editor-status-saved-minute')
      if (diffMinutes < 60) return t('editor-status-saved-minutes', { count: diffMinutes })

      return t('editor-status-saved-at', { time: date.toLocaleTimeString() })
    },
    [t]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header Toolbar */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:px-4 gba:py-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            {/* Left side - Back button and title */}
            <div className="gba:flex gba:items-center gba:gap-4 gba:min-w-0 gba:flex-1">
              <Button variant="ghost" size="icon" onClick={onBack} title={t('editor-back')} className="gba:shrink-0">
                <ArrowLeft className="gba:w-5 gba:h-5" />
              </Button>

              <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0 gba:flex-1">
                <div className="gba:w-10 gba:h-10 gba:shrink-0 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                  <FileText className="gba:w-5 gba:h-5 gba:text-primary" />
                </div>
                <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                  <Input
                    ref={titleInputRef}
                    value={title}
                    onChange={handleTitleChange}
                    placeholder={t('editor-title-placeholder')}
                    disabled={isReadOnly}
                    className="gba:text-lg gba:font-semibold gba:border-0 gba:p-0 gba:h-auto gba:min-w-0 gba:w-full gba:bg-transparent focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0"
                  />
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                    <span>{t('editor-word-count', { count: wordCount.toLocaleString() })}</span>
                    <span>-</span>
                    <span>{t('editor-character-count', { count: charCount.toLocaleString() })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Save status */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2">
                {isSaving ? (
                  <Badge variant="secondary" className="gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
                    {t('editor-saving')}
                  </Badge>
                ) : hasUnsavedChanges ? (
                  <Badge variant="outline" className="gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3" />
                    {t('editor-unsaved')}
                  </Badge>
                ) : lastSaved ? (
                  <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                    <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
                    {formatLastSaved(lastSaved)}
                  </span>
                ) : null}
              </div>

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportWord}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export-word')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export-pdf')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-print')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="gba:w-4 gba:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onSaveAsTemplate && (
                    <DropdownMenuItem onClick={() => onSaveAsTemplate(title, content)}>
                      <BookTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('editor-save-template')}
                    </DropdownMenuItem>
                  )}
                  {onSendForApproval && (
                    <DropdownMenuItem onClick={onSendForApproval}>
                      <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('menu-send-for-approval')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('menu-share')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save button */}
              {!isReadOnly && (
                <Button onClick={() => handleSave()} disabled={isSaving || !hasUnsavedChanges}>
                  <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isSaving ? t('editor-saving') : t('editor-save')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="gba:flex-1 gba:overflow-auto gba:flex gba:justify-center gba:bg-muted/30">
        <div className="gba:w-full gba:max-w-[850px] gba:min-h-full gba:bg-white gba:shadow-sm gba:my-4 gba:mx-4 gba:rounded-lg gba:flex gba:flex-col">
          <style>{`
            .document-editor .ql-toolbar {
              border: none !important;
              border-bottom: 1px solid hsl(var(--border)) !important;
              background: hsl(var(--muted) / 0.3);
              padding: 12px 16px !important;
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
            }
            .document-editor .ql-toolbar .ql-formats {
              margin-right: 8px;
            }
            .document-editor .ql-container {
              border: none !important;
              font-family: 'Georgia', 'Times New Roman', serif;
              font-size: 14px;
              flex: 1;
              overflow: visible;
            }
            .document-editor .ql-editor {
              padding: 48px 64px;
              min-height: 500px;
              line-height: 1.75;
              overflow: visible;
            }
            .document-editor .ql-editor h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 16px;
              color: hsl(var(--foreground));
            }
            .document-editor .ql-editor h2 {
              font-size: 22px;
              font-weight: 600;
              margin-top: 24px;
              margin-bottom: 12px;
              color: hsl(var(--foreground));
            }
            .document-editor .ql-editor h3 {
              font-size: 18px;
              font-weight: 600;
              margin-top: 20px;
              margin-bottom: 10px;
              color: hsl(var(--foreground));
            }
            .document-editor .ql-editor p {
              margin-bottom: 12px;
            }
            .document-editor .ql-editor ul, .document-editor .ql-editor ol {
              padding-left: 24px;
              margin-bottom: 12px;
            }
            .document-editor .ql-editor li {
              margin-bottom: 6px;
            }
            .document-editor .ql-editor blockquote {
              border-left: 4px solid hsl(var(--primary));
              padding-left: 16px;
              margin: 16px 0;
              color: hsl(var(--muted-foreground));
              font-style: italic;
            }
            .document-editor .ql-editor pre {
              background: hsl(var(--muted));
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
              margin: 16px 0;
            }
            .document-editor .ql-editor a {
              color: hsl(var(--primary));
              text-decoration: underline;
            }
            .document-editor .ql-editor img {
              max-width: 100%;
              height: auto;
              margin: 16px 0;
              border-radius: 8px;
            }
            .document-editor .ql-editor table {
              border-collapse: collapse;
              width: 100%;
              margin: 16px 0;
            }
            .document-editor .ql-editor table td, .document-editor .ql-editor table th {
              border: 1px solid hsl(var(--border));
              padding: 8px 12px;
            }
            .document-editor .ql-editor table th {
              background: hsl(var(--muted));
              font-weight: 600;
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item::before {
              content: 'Normal';
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
              content: 'Heading 1';
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
              content: 'Heading 2';
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
              content: 'Heading 3';
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
              content: 'Heading 4';
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before {
              content: 'Heading 5';
            }
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
            .document-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before {
              content: 'Heading 6';
            }
            .document-editor .ql-snow .ql-tooltip {
              z-index: 1000;
            }
            .document-editor .ql-editor.ql-blank::before {
              font-style: normal;
              color: hsl(var(--muted-foreground));
            }
          `}</style>

          <div ref={editorContainerRef} className="gba:flex gba:flex-col gba:flex-1 document-editor">
            <ReactQuill
              ref={editorRef}
              theme="snow"
              value={content}
              onChange={handleContentChange}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              readOnly={isReadOnly}
              placeholder={t('editor-content-placeholder')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentEditor
