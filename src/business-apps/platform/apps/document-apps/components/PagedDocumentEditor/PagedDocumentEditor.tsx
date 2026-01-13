/**
 * PagedDocumentEditor Component
 *
 * A professional document editor with proper A4 page layout,
 * page breaks, and Word-like editing experience.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { FontFamily } from '@tiptap/extension-font-family'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Typography } from '@tiptap/extension-typography'
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Badge,
  Separator,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  FileText,
  Download,
  MoreVertical,
  Clock,
  CheckCircle,
  Printer,
  FileDown,
  BookTemplate,
  Send,
  ZoomIn,
  ZoomOut,
  UserCheck,
  AlertCircle,
  XCircle
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Document, DocumentApprovalRequest } from '../../types'
import { PageBreak } from './extensions/PageBreak'
import { EditorToolbar } from './EditorToolbar'
import { exportToWord, exportToPDF } from '../../utils/exportUtils'
import { useCollaboration } from '../../../shared/hooks/useCollaboration'
import { PresenceIndicator } from '../../../shared/components/PresenceIndicator'
import { CollaboratorCursor } from '../../../shared/components/CollaboratorCursor'

// A4 dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794 // 210mm
const A4_HEIGHT_PX = 1123 // 297mm
const PAGE_MARGIN_PX = 96 // 1 inch = 96px at 96 DPI

/**
 * Format approval date for display
 */
function formatApprovalDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get avatar image URL from base64 data
 * Handles both raw base64 and data: prefixed strings
 */
function getAvatarUrl(picture?: string): string | undefined {
  if (!picture) return undefined
  // If already has data: prefix, use as-is
  if (picture.startsWith('data:')) return picture
  // Otherwise, add the prefix (try png first, browser will handle it)
  return `data:image/png;base64,${picture}`
}

/**
 * ApprovalStatusBadge Component - Shows detailed approval status in header
 */
const ApprovalStatusBadge: React.FC<{ approvalRequest: DocumentApprovalRequest }> = ({ approvalRequest }) => {
  const approvedBy = approvalRequest.approvers?.filter(a => a.status === 'approved') || []
  const pendingApprovers = approvalRequest.approvers?.filter(a => a.status === 'pending') || []
  const rejectedBy = approvalRequest.approvers?.filter(a => a.status === 'rejected') || []
  const isPending = approvalRequest.status === 'pending'
  const isApproved = approvalRequest.status === 'approved'
  const isRejected = approvalRequest.status === 'rejected'

  if (isPending && pendingApprovers.length > 0) {
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-warning/10 gba:border gba:border-warning/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-warning">
          <AlertCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">Pending Approval</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          {pendingApprovers.slice(0, 3).map((approver, idx) => (
            <Avatar key={idx} className="gba:w-6 gba:h-6">
              <AvatarImage src={getAvatarUrl(approver.userPicture)} alt={approver.userName || 'Approver'} />
              <AvatarFallback className="gba:text-[8px] gba:bg-warning/20 gba:text-warning">
                {approver.userName ? getInitials(approver.userName) : '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {pendingApprovers.length > 3 && (
            <span className="gba:text-xs gba:text-muted-foreground">+{pendingApprovers.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  if (isApproved && approvedBy.length > 0) {
    const lastApproved = approvedBy[approvedBy.length - 1]
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-success/10 gba:border gba:border-success/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-success">
          <CheckCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">Approved</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage src={getAvatarUrl(lastApproved.userPicture)} alt={lastApproved.userName || 'Approver'} />
            <AvatarFallback className="gba:text-[8px] gba:bg-success/20 gba:text-success">
              {lastApproved.userName ? getInitials(lastApproved.userName) : <UserCheck className="gba:w-3 gba:h-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">
              {lastApproved.userName || lastApproved.userId}
            </span>
            {lastApproved.respondedAt && (
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatApprovalDateTime(lastApproved.respondedAt)}
              </span>
            )}
          </div>
        </div>
        {approvedBy.length > 1 && (
          <div className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
            +{approvedBy.length - 1} more {approvedBy.length - 1 === 1 ? 'approver' : 'approvers'}
          </div>
        )}
      </div>
    )
  }

  if (isRejected && rejectedBy.length > 0) {
    const lastRejected = rejectedBy[rejectedBy.length - 1]
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-destructive/10 gba:border gba:border-destructive/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
          <XCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">Rejected</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage src={getAvatarUrl(lastRejected.userPicture)} alt={lastRejected.userName || 'Rejector'} />
            <AvatarFallback className="gba:text-[8px] gba:bg-destructive/20 gba:text-destructive">
              {lastRejected.userName ? getInitials(lastRejected.userName) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">
              {lastRejected.userName || lastRejected.userId}
            </span>
            {lastRejected.respondedAt && (
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatApprovalDateTime(lastRejected.respondedAt)}
              </span>
            )}
          </div>
        </div>
        {lastRejected.comments && (
          <div className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1 gba:italic">"{lastRejected.comments}"</div>
        )}
      </div>
    )
  }

  return null
}

export interface PagedDocumentEditorProps extends Partial<BusinessAppContextProps> {
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
 * PagedDocumentEditor Component
 */
export const PagedDocumentEditor: React.FC<PagedDocumentEditorProps> = ({
  document,
  initialContent = '',
  initialTitle = 'Untitled Document',
  onSave,
  onBack,
  onSaveAsTemplate,
  onSendForApproval,
  isReadOnly = false,
  'data-testid': testId = 'paged-document-editor'
}) => {
  // Editor state
  const [title, setTitle] = useState(document?.title || initialTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(document ? new Date(document.updatedAt) : null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isApplyingRemoteChange = useRef(false)
  const editorRef = useRef<any>(null) // Store editor instance
  const isCollaborationConnectedRef = useRef(false)
  const emitOperationRef = useRef<any>(null)

  // Stable collaboration callbacks (no dependencies that change)
  const onOperationReceivedCallback = useCallback((operation: any) => {
    // Handle incoming operations from other users
    console.log('[PagedDocumentEditor] Received operation:', operation)
    if (operation.operation.type === 'content_update') {
      const { content } = operation.operation.data as { content: string }
      // Apply remote content update without triggering another operation
      // Use editorRef to avoid dependency on editor
      if (editorRef.current && !isApplyingRemoteChange.current) {
        isApplyingRemoteChange.current = true
        editorRef.current.commands.setContent(content, false)
        setTimeout(() => {
          isApplyingRemoteChange.current = false
        }, 100)
      }
    }
  }, []) // No dependencies - stable callback

  const onErrorCallback = useCallback((error: Error) => {
    console.error('[PagedDocumentEditor] Collaboration error:', error)
  }, [])

  // Collaboration state
  const {
    participants,
    isConnected: isCollaborationConnected,
    emitOperation,
    emitCursor
  } = useCollaboration({
    entityType: 'document',
    entityId: document?.id || '',
    enabled: !!document?.id,
    onOperationReceived: onOperationReceivedCallback,
    onError: onErrorCallback
  })

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...'
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table'
        }
      }),
      TableRow,
      TableHeader,
      TableCell,
      FontFamily,
      Subscript,
      Superscript,
      Typography,
      PageBreak
    ],
    content: document?.content || initialContent || '<p></p>',
    editable: !isReadOnly,
    onUpdate: ({ editor: currentEditor }) => {
      setHasUnsavedChanges(true)
      updatePageCount()

      // Emit collaboration operation (debounced) or save via REST
      if (!isApplyingRemoteChange.current) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }

        // Use refs to avoid dependencies in the callback
        if (isCollaborationConnectedRef.current) {
          // When collaboration is active, use WebSocket for persistence (1s debounce)
          autoSaveTimeoutRef.current = setTimeout(() => {
            const content = currentEditor.getHTML()
            if (emitOperationRef.current) {
              emitOperationRef.current({
                type: 'content_update',
                data: {
                  content
                }
              })
            }
            // Mark as saved since WebSocket persists to DB
            setLastSaved(new Date())
            setHasUnsavedChanges(false)
          }, 1000)
        } else {
          // Fallback to REST API when collaboration is not connected (3s debounce)
          autoSaveTimeoutRef.current = setTimeout(() => {
            handleSave()
          }, 3000)
        }
      }
    }
  })

  // Update refs when values change
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    isCollaborationConnectedRef.current = isCollaborationConnected
    emitOperationRef.current = emitOperation
  }, [isCollaborationConnected, emitOperation])

  // Emit cursor position on editor selection change
  useEffect(() => {
    if (!editor || !isCollaborationConnected) return

    const updateCursor = () => {
      const selection = editor.state.selection
      const pos = selection.from

      // Get line and column from position
      const doc = editor.state.doc
      let line = 1
      let column = 0

      doc.descendants((node, nodePos) => {
        if (nodePos + node.nodeSize > pos) {
          if (node.isBlock) {
            column = pos - nodePos
          }
          return false
        }
        if (node.isBlock) {
          line++
        }
        return true
      })

      emitCursor({
        line,
        column,
        offset: pos
      })
    }

    editor.on('selectionUpdate', updateCursor)

    return () => {
      editor.off('selectionUpdate', updateCursor)
    }
  }, [editor, isCollaborationConnected, emitCursor])

  // Calculate page count based on content height
  const updatePageCount = useCallback(() => {
    if (!editorContainerRef.current) return

    const editorContent = editorContainerRef.current.querySelector('.ProseMirror')
    if (!editorContent) return

    const contentHeight = editorContent.scrollHeight
    const pageContentHeight = A4_HEIGHT_PX - PAGE_MARGIN_PX * 2
    const pages = Math.max(1, Math.ceil(contentHeight / pageContentHeight))
    setPageCount(pages)
  }, [])

  // Update page count when content changes
  useEffect(() => {
    updatePageCount()

    // Also update on window resize
    window.addEventListener('resize', updatePageCount)
    return () => window.removeEventListener('resize', updatePageCount)
  }, [updatePageCount])

  // Handle scroll to track current page
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      const pageContentHeight = A4_HEIGHT_PX - PAGE_MARGIN_PX * 2
      const currentPageNum = Math.floor(scrollTop / pageContentHeight) + 1
      setCurrentPage(Math.min(currentPageNum, pageCount))
    },
    [pageCount]
  )

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setHasUnsavedChanges(true)
  }, [])

  // Save document
  const handleSave = useCallback(async () => {
    if (isReadOnly || isSaving || !editor) return

    setIsSaving(true)
    try {
      const content = editor.getHTML()
      await onSave(title, content)
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('[PagedDocumentEditor] Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [title, editor, onSave, isReadOnly, isSaving])

  // Keyboard shortcuts
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

  // Export to Word
  const handleExportWord = useCallback(async () => {
    if (!editor) return
    setIsExporting(true)
    try {
      await exportToWord(title, editor.getHTML())
    } catch (error) {
      console.error('[PagedDocumentEditor] Export to Word failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [title, editor])

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!editor) return
    setIsExporting(true)
    try {
      await exportToPDF(title, editor.getHTML())
    } catch (error) {
      console.error('[PagedDocumentEditor] Export to PDF failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [title, editor])

  // Print document
  const handlePrint = useCallback(() => {
    if (!editor) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          h1 { font-size: 24pt; margin: 0 0 12pt 0; }
          h2 { font-size: 18pt; margin: 18pt 0 10pt 0; }
          h3 { font-size: 14pt; margin: 16pt 0 8pt 0; }
          h4, h5, h6 { font-size: 12pt; margin: 14pt 0 6pt 0; }
          p { margin: 0 0 10pt 0; }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 12pt 0;
          }
          td, th {
            border: 1px solid #333;
            padding: 6pt 8pt;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
          }
          blockquote {
            border-left: 3pt solid #ccc;
            padding-left: 12pt;
            margin: 12pt 0;
            color: #555;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          @media print {
            .page-break {
              page-break-after: always;
              break-after: page;
              height: 0;
              border: none;
            }
          }
        </style>
      </head>
      <body>
        ${editor.getHTML()}
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }, [title, editor])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, 50))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(100)
  }, [])

  // Get word count
  const wordCount =
    editor?.storage.characterCount?.words?.() || editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0

  // Get character count
  const charCount = editor?.storage.characterCount?.characters?.() || editor?.getText().length || 0

  // Format last saved time
  const formatLastSaved = (date: Date | null): string => {
    if (!date) return 'Not saved'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return 'Saved just now'
    if (diffMinutes === 1) return 'Saved 1 minute ago'
    if (diffMinutes < 60) return `Saved ${diffMinutes} minutes ago`

    return `Saved at ${date.toLocaleTimeString()}`
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:shadow-sm">
        <div className="gba:px-4 gba:py-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            {/* Left side - Back button and title */}
            <div className="gba:flex gba:items-center gba:gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} title="Back to documents">
                <ArrowLeft className="gba:w-5 gba:h-5" />
              </Button>

              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                  <FileText className="gba:w-5 gba:h-5 gba:text-primary" />
                </div>
                <div className="gba:flex gba:flex-col">
                  <Input
                    ref={titleInputRef}
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Document Title"
                    disabled={isReadOnly}
                    className="gba:text-lg gba:font-semibold gba:border-0 gba:p-0 gba:h-auto gba:bg-transparent focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0"
                  />
                  <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                    <span>{wordCount.toLocaleString()} words</span>
                    <span>•</span>
                    <span>{charCount.toLocaleString()} characters</span>
                    <span>•</span>
                    <span>
                      Page {currentPage} of {pageCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Status Badge */}
              {document?.approvalRequest && <ApprovalStatusBadge approvalRequest={document.approvalRequest} />}
            </div>

            {/* Right side - Actions */}
            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Collaboration presence indicator */}
              {participants.length > 0 && (
                <PresenceIndicator
                  participants={participants}
                  maxVisible={3}
                  size="sm"
                  showLabel={false}
                  className="gba:mr-2"
                />
              )}
              {/* Save status */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2">
                {isSaving ? (
                  <Badge variant="secondary" className="gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
                    Saving...
                  </Badge>
                ) : hasUnsavedChanges ? (
                  <Badge variant="outline" className="gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3" />
                    Unsaved changes
                  </Badge>
                ) : lastSaved ? (
                  <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                    <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
                    {formatLastSaved(lastSaved)}
                  </span>
                ) : null}
              </div>

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Zoom controls */}
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="gba:h-8 gba:w-8"
                >
                  <ZoomOut className="gba:w-4 gba:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomReset}
                  className="gba:h-8 gba:px-2 gba:text-xs gba:min-w-[50px]"
                >
                  {zoom}%
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In" className="gba:h-8 gba:w-8">
                  <ZoomIn className="gba:w-4 gba:h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportWord}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    Export as Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="gba:w-4 gba:h-4 gba:mr-2" />
                    Print
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
                    <DropdownMenuItem onClick={() => editor && onSaveAsTemplate(title, editor.getHTML())}>
                      <BookTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
                      Save as Template
                    </DropdownMenuItem>
                  )}
                  {onSendForApproval && (
                    <DropdownMenuItem onClick={onSendForApproval}>
                      <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                      Send for Approval
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save button */}
              {!isReadOnly && (
                <Button onClick={() => handleSave()} disabled={isSaving || !hasUnsavedChanges}>
                  <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <EditorToolbar editor={editor} data-testid={`${testId}-toolbar`} />
      </div>

      {/* Editor Area with Page Layout */}
      <div ref={editorContainerRef} className="gba:flex-1 gba:overflow-auto gba:bg-muted/50" onScroll={handleScroll}>
        <div className="gba:flex gba:justify-center gba:py-8" style={{ minHeight: '100%' }}>
          <div
            className="paged-document-editor"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center'
            }}
          >
            {/* Page visual representation */}
            <div
              className="gba:bg-white gba:shadow-lg gba:rounded-sm gba:relative"
              style={{
                width: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`,
                padding: `${PAGE_MARGIN_PX}px`
              }}
            >
              <EditorContent editor={editor} className="editor-content" />

              {/* Render collaborator cursors */}
              {participants.map(participant => {
                if (!participant.cursor) return null
                // Simple positioning - in a real implementation, you'd calculate exact position
                const x = (participant.cursor.column || 0) * 8 + PAGE_MARGIN_PX
                const y = (participant.cursor.line || 0) * 20 + PAGE_MARGIN_PX

                return (
                  <CollaboratorCursor
                    key={participant.userId}
                    userName={participant.userName}
                    userColor={participant.userColor}
                    position={{ x, y }}
                    isActive={true}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Styles */}
      <style>{`
        .paged-document-editor .ProseMirror {
          outline: none;
          font-family: 'Times New Roman', Georgia, serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #1a1a1a;
          min-height: ${A4_HEIGHT_PX - PAGE_MARGIN_PX * 2}px;
        }

        .paged-document-editor .ProseMirror p {
          margin: 0 0 10pt 0;
        }

        .paged-document-editor .ProseMirror h1 {
          font-size: 24pt;
          font-weight: 700;
          margin: 0 0 16pt 0;
          line-height: 1.2;
        }

        .paged-document-editor .ProseMirror h2 {
          font-size: 18pt;
          font-weight: 600;
          margin: 20pt 0 12pt 0;
          line-height: 1.3;
        }

        .paged-document-editor .ProseMirror h3 {
          font-size: 14pt;
          font-weight: 600;
          margin: 16pt 0 10pt 0;
          line-height: 1.4;
        }

        .paged-document-editor .ProseMirror h4,
        .paged-document-editor .ProseMirror h5,
        .paged-document-editor .ProseMirror h6 {
          font-size: 12pt;
          font-weight: 600;
          margin: 14pt 0 8pt 0;
        }

        .paged-document-editor .ProseMirror ul,
        .paged-document-editor .ProseMirror ol {
          padding-left: 24pt;
          margin: 0 0 10pt 0;
        }

        .paged-document-editor .ProseMirror li {
          margin-bottom: 4pt;
        }

        .paged-document-editor .ProseMirror blockquote {
          border-left: 3pt solid #d0d0d0;
          padding-left: 16pt;
          margin: 16pt 0;
          color: #555;
          font-style: italic;
        }

        .paged-document-editor .ProseMirror pre {
          background: #f5f5f5;
          border: 1pt solid #e0e0e0;
          border-radius: 4pt;
          padding: 12pt;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          margin: 12pt 0;
        }

        .paged-document-editor .ProseMirror code {
          background: #f0f0f0;
          padding: 2pt 4pt;
          border-radius: 2pt;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
        }

        .paged-document-editor .ProseMirror a {
          color: #0066cc;
          text-decoration: underline;
        }

        .paged-document-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 12pt 0;
          border-radius: 4pt;
        }

        .paged-document-editor .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 16pt 0;
        }

        .paged-document-editor .ProseMirror td,
        .paged-document-editor .ProseMirror th {
          border: 1pt solid #333;
          padding: 8pt 12pt;
          text-align: left;
          vertical-align: top;
        }

        .paged-document-editor .ProseMirror th {
          background: #f5f5f5;
          font-weight: bold;
        }

        .paged-document-editor .ProseMirror hr {
          border: none;
          border-top: 1pt solid #d0d0d0;
          margin: 20pt 0;
        }

        /* Page break styling */
        .paged-document-editor .ProseMirror .page-break {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 40pt 0;
          padding: 20pt 0;
          user-select: none;
          cursor: default;
        }

        .paged-document-editor .ProseMirror .page-break .page-break-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 0;
          border-top: 2px dashed #ccc;
        }

        .paged-document-editor .ProseMirror .page-break .page-break-label {
          position: relative;
          background: white;
          padding: 4pt 12pt;
          font-size: 9pt;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1pt;
          border: 1pt solid #ddd;
          border-radius: 4pt;
        }

        /* Placeholder styling */
        .paged-document-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #aaa;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }

        /* Selection styling */
        .paged-document-editor .ProseMirror ::selection {
          background: #b4d5fe;
        }

        /* Table resize handles */
        .paged-document-editor .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }

        .paged-document-editor .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #adf;
          pointer-events: none;
        }

        /* Print styles */
        @media print {
          .paged-document-editor .ProseMirror .page-break {
            page-break-after: always;
            break-after: page;
            border: none;
            margin: 0;
            padding: 0;
            height: 0;
          }

          .paged-document-editor .ProseMirror .page-break .page-break-line,
          .paged-document-editor .ProseMirror .page-break .page-break-label {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default PagedDocumentEditor
