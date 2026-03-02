/**
 * PagedDocumentEditor Component
 *
 * A professional document editor with proper A4 page layout,
 * page breaks, and Word-like editing experience.
 */

import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
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
  AvatarFallback,
  AiButton,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  FileText,
  Clock,
  CheckCircle,
  Printer,
  FileDown,
  BookTemplate,
  Send,
  ZoomIn,
  ZoomOut,
  LayoutPanelLeft,
  UserCheck,
  AlertCircle,
  XCircle,
  History,
  Lock,
  Unlock,
  MessageSquare,
  Upload,
  Wand2
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Document, DocumentApprovalRequest, DocumentFormatting } from '../../types'
import {
  getPaginationConfigFromFormatting,
  resolvePageLayout,
  getDefaultPageLayout,
  DEFAULT_PAGE_COLOR
} from '../../utils/pageLayoutUtils'
import {
  useDocumentEditorAvatars,
  useYjsDocumentSync,
  useDocumentEditorShortcuts,
  useVersionUserDisplays
} from '../../hooks'
import { useEditorKeyboardIsolation } from '../../../shared/hooks/useEditorKeyboardIsolation'
import { PaginationPlus } from 'tiptap-pagination-plus'
import { LineAndParagraphSpacing } from './extensions/LineAndParagraphSpacing'
import { PageBreak } from './extensions/PageBreak'
import { createYjsCursorExtension } from './extensions/YjsCursor'
import { EditorToolbar } from './EditorToolbar'
import { exportToWord, exportToPDF, printHtmlDocument } from '../../utils/exportUtils'
import { DocumentApiService } from '../../services/DocumentApiService'
import { useCollaboration } from '../../../shared/hooks/useCollaboration'
import { PresenceIndicator } from '../../../shared/components/PresenceIndicator'
import { useVersioning } from '../../../shared/hooks/useVersioning'
import { useFileLock } from '../../../shared/hooks/useFileLock'
import { useComments } from '../../../shared/hooks/useComments'
import { usePublishing } from '../../../shared/hooks/usePublishing'
import { emitDocumentActivity, emitDocumentActivityEnd } from '../../../spaces/hooks/useSpaceDocumentActivity'
import { VersionHistory } from '../../../shared/components/VersionHistory'
import { CheckpointDialog } from '../../../shared/components/CheckpointDialog'
import { AutoSaveIndicator } from '../../../shared/components/AutoSaveIndicator'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { PublishDialog } from '../../../shared/components/PublishDialog'
import { CommentPanel } from '../../../shared/components/CommentPanel'
import { InlineCommentPopover } from '../../../shared/components/InlineCommentPopover'
import { InlineComment as InlineCommentExtension } from '../../../shared/extensions/InlineCommentExtension'
import { AiEditPanel } from '../AiEditPanel'
import { PageSetupDialog } from './PageSetupDialog'
import translations from '../../_i18n'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

// A4 dimensions and margins at 96 DPI (aligned with pageLayoutConstants)
const PAGE_GAP_PX = 24

/** Delay before auto-saving new documents/templates (no document id). 5 minutes. */
const AUTO_SAVE_DELAY_MS = 5 * 60 * 1000

// Collaboration cursor styles
const CURSOR_STYLES = `
  @keyframes cursor-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  /* Only the cursor line blinks, not the label */
  .collaboration-cursor__line {
    animation: cursor-blink 1s ease-in-out infinite;
  }
  
  /* Label does NOT blink - stays visible */
  .collaboration-cursor__label {
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  
  .collaboration-cursor__caret:hover .collaboration-cursor__label {
    transform: scale(1.03);
  }
  
  /* Avatar styling */
  .collaboration-cursor__avatar {
    transition: transform 0.15s ease;
  }
  
  .collaboration-cursor__caret:hover .collaboration-cursor__avatar {
    transform: scale(1.1);
  }
  
  .collaboration-cursor__selection {
    transition: background-color 0.15s ease;
  }
`

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
  const { t } = useTranslation(translations)
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
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-pending')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          {pendingApprovers.slice(0, 3).map((approver, idx) => (
            <Avatar key={idx} className="gba:w-6 gba:h-6">
              <AvatarImage
                src={getAvatarUrl(approver.userPicture)}
                alt={approver.userName || t('editor-approval-approver-alt')}
              />
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
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-approved')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage
              src={getAvatarUrl(lastApproved.userPicture)}
              alt={lastApproved.userName || t('editor-approval-approver-alt')}
            />
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
            {t('editor-approval-more', { count: approvedBy.length - 1 })}
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
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-rejected')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage
              src={getAvatarUrl(lastRejected.userPicture)}
              alt={lastRejected.userName || t('editor-approval-rejector-alt')}
            />
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
  onSave: (title: string, content: string, formatting?: DocumentFormatting) => Promise<void>
  onBack: () => void
  /** When provided, page setup changes are persisted immediately on OK (so layout survives when leaving without Save). */
  onPersistFormatting?: (formatting: DocumentFormatting) => Promise<void>
  onSaveAsTemplate?: (title: string, content: string) => void
  onSendForApproval?: () => void
  isReadOnly?: boolean
  /** Left panel (e.g. Insert field for templates); shown when editing a template */
  leftPanel?: React.ReactNode
  'data-testid'?: string
}

export interface PagedDocumentEditorRef {
  insertAtCursor: (htmlOrText: string) => void
}

function findInlineCommentSelection(editor: any, commentId: string): { from: number; to: number } | null {
  const { doc } = editor.state
  let found: { from: number; to: number } | null = null

  doc.descendants((node: any, pos: number) => {
    if (found) return false
    const marks: any[] | undefined = node.marks
    if (!marks?.length) return

    for (const mark of marks) {
      if (mark?.type?.name === 'inlineComment' && mark?.attrs?.commentId === commentId) {
        found = { from: pos, to: pos + node.nodeSize }
        return false
      }
    }
    return
  })

  return found
}

function scrollInlineCommentDomIntoView(commentId: string) {
  setTimeout(() => {
    const element = document.querySelector(`[data-comment-id="${commentId}"]`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}

/**
 * PagedDocumentEditor Component
 */
export const PagedDocumentEditor = forwardRef<PagedDocumentEditorRef, PagedDocumentEditorProps>(
  function PagedDocumentEditor(
    {
      document,
      initialContent = '',
      initialTitle,
      onSave,
      onBack,
      onPersistFormatting,
      onSaveAsTemplate,
      onSendForApproval,
      isReadOnly = false,
      leftPanel,
      accessToken: accessTokenProp,
      'data-testid': testId = 'paged-document-editor'
    },
    ref
  ) {
    const { t } = useTranslation(translations)
    // Editor state
    const [title, setTitle] = useState((document?.title || initialTitle) ?? t('title-untitled-document'))
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(document ? new Date(document.updatedAt) : null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [zoom, setZoom] = useState(100)
    const [pageCount, setPageCount] = useState(1)
    const [currentPage, setCurrentPage] = useState(1)
    const [layoutFormatting, setLayoutFormatting] = useState<DocumentFormatting>(() => getDefaultPageLayout())

    const editorContainerRef = useRef<HTMLDivElement>(null)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const editorRef = useRef<any>(null) // Store editor instance

    useEffect(() => {
      DocumentApiService.setAccessToken(accessTokenProp || null)
    }, [accessTokenProp])

    const resolvedLayout = resolvePageLayout(layoutFormatting)
    const paginationConfig = getPaginationConfigFromFormatting(layoutFormatting)
    const isPageless = resolvedLayout.pageless
    const pageColor = resolvedLayout.pageColor ?? DEFAULT_PAGE_COLOR

    useEffect(() => {
      const fromDoc = resolvePageLayout(document?.formatting)
      setLayoutFormatting({
        ...getDefaultPageLayout(),
        ...document?.formatting,
        pageSize: fromDoc.pageSize,
        orientation: fromDoc.orientation,
        margins: fromDoc.margins,
        marginUnit: fromDoc.marginUnit,
        pageColor: fromDoc.pageColor,
        pageless: fromDoc.pageless
      })
    }, [document?.id])

    // Versioning UI state
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
    const [showPublishDialog, setShowPublishDialog] = useState(false)
    const [showPageSetupDialog, setShowPageSetupDialog] = useState(false)
    // Right sidebar: only one can be open at a time (comments vs AI editor)
    type RightSidebar = 'closed' | 'comments' | 'ai'
    const [rightSidebar, setRightSidebar] = useState<RightSidebar>('closed')
    const [showInlineCommentPopover, setShowInlineCommentPopover] = useState(false)
    const [inlineCommentPosition, setInlineCommentPosition] = useState<{ top: number; left: number } | null>(null)
    const [pendingSelection, setPendingSelection] = useState<{ from: number; to: number; text: string } | null>(null)

    const ydoc = React.useMemo(() => new Y.Doc(), [document?.id])
    const awareness = React.useMemo(() => new Awareness(ydoc), [ydoc])

    // Collaborative page layout (formatting) sync via Yjs.
    // Content is already synced via Collaboration; formatting must be synced separately.
    const formattingYMap = React.useMemo(() => ydoc.getMap('documentFormatting'), [ydoc])
    const metaYMap = React.useMemo(() => ydoc.getMap('documentMeta'), [ydoc])

    const collaborationExtension = React.useMemo(
      () => (document?.id ? Collaboration.configure({ document: ydoc }) : null),
      [document?.id, ydoc]
    )
    const yjsCursorExtension = React.useMemo(
      () => (document?.id ? createYjsCursorExtension(awareness) : null),
      [document?.id, awareness]
    )

    const onErrorCallback = useCallback((error: Error) => {
      console.error('[PagedDocumentEditor] Collaboration error:', error)
    }, [])

    // Get access token for collaboration and avatar fetching - prefer prop, fallback to localStorage
    const accessToken = accessTokenProp || localStorage.getItem('business-app-ide-access-token') || ''

    // Collaboration state
    const { participants: rawParticipants, socket: collaborationSocket } = useCollaboration({
      entityType: 'document',
      entityId: document?.id || '',
      enabled: !!document?.id,
      accessToken,
      onError: onErrorCallback
    })

    const { participants, currentUserId, currentUserName, currentUserAvatar } = useDocumentEditorAvatars({
      accessToken,
      rawParticipants
    })

    // Versioning, Comments, Locking, Publishing hooks
    const versioning = useVersioning({
      entityId: document?.id || '',
      entityType: 'document',
      apiService: DocumentApiService,
      autoSaveEnabled: !!document?.id && !isReadOnly,
      autoSaveInterval: 30000,
      onVersionCreated: () => {}
    })

    const versionUserDisplayMap = useVersionUserDisplays(versioning.versions, accessToken)

    const comments = useComments({
      entityId: document?.id || '',
      entityType: 'document',
      apiService: DocumentApiService
    })

    const fileLock = useFileLock({
      entityId: document?.id || '',
      entityType: 'document',
      currentUserId: currentUserId || undefined,
      apiService: DocumentApiService
    })

    const publishing = usePublishing({
      entityId: document?.id || '',
      entityType: 'document',
      currentStatus: document?.publishMetadata?.status || 'draft',
      apiService: DocumentApiService
    })

    const { isYjsSynced } = useYjsDocumentSync({
      documentId: document?.id,
      collaborationSocket,
      ydoc,
      awareness,
      editorRef,
      isReadOnly,
      title,
      setLastSaved,
      setHasUnsavedChanges
    })

    // Seed collaborative title once synced (do not overwrite an existing value from the room).
    useEffect(() => {
      if (!document?.id) return
      if (!isYjsSynced) return
      if (metaYMap.get('title')) return
      const initial = (document?.title || '').trim()
      if (!initial) return
      metaYMap.set('title', initial)
    }, [document?.id, document?.title, isYjsSynced, metaYMap])

    // Seed collaborative formatting once synced (do not overwrite an existing value from the room).
    useEffect(() => {
      if (!document?.id) return
      if (!isYjsSynced) return
      if (formattingYMap.get('formatting')) return
      if (!document?.formatting) return
      formattingYMap.set('formatting', document.formatting)
    }, [document?.id, document?.formatting, formattingYMap, isYjsSynced])

    // Apply title updates from other collaborators.
    useEffect(() => {
      if (!document?.id) return

      const applyFromYjs = () => {
        const next = metaYMap.get('title')
        if (typeof next !== 'string') return
        const nextTitle = next.trim()
        if (!nextTitle) return
        setTitle(prev => (prev === nextTitle ? prev : nextTitle))
        lastSavedTitleRef.current = nextTitle
      }

      applyFromYjs()
      const handler = () => applyFromYjs()
      metaYMap.observe(handler)
      return () => metaYMap.unobserve(handler)
    }, [document?.id, metaYMap])

    // Apply formatting updates from other collaborators.
    useEffect(() => {
      if (!document?.id) return

      const applyFromYjs = () => {
        const next = formattingYMap.get('formatting') as DocumentFormatting | undefined
        if (!next) return
        setLayoutFormatting(prev => {
          const prevJson = JSON.stringify(prev ?? {})
          const nextJson = JSON.stringify(next ?? {})
          if (prevJson === nextJson) return prev
          return next
        })
      }

      // Apply immediately in case the map already has a value.
      applyFromYjs()

      const handler = () => applyFromYjs()
      formattingYMap.observe(handler)
      return () => formattingYMap.unobserve(handler)
    }, [document?.id, formattingYMap])

    const editorContent = React.useMemo(
      () => (document?.id ? '<p></p>' : document?.content || initialContent || '<p></p>'),
      [document?.id, document?.content, initialContent]
    )
    const editorEditable = React.useMemo(
      () => !isReadOnly && (!document?.id || (isYjsSynced && fileLock.canEdit)),
      [isReadOnly, document?.id, isYjsSynced, fileLock.canEdit]
    )

    // Set local awareness state (user meta shown in cursors/selections)
    useEffect(() => {
      if (!document?.id) return
      if (!currentUserId) return
      if (!isYjsSynced) return

      awareness.setLocalStateField('user', {
        id: currentUserId,
        userId: currentUserId,
        name: currentUserName || t('editor-user-fallback'),
        color: participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4',
        avatar: currentUserAvatar // Include avatar URL for cursor rendering
      })
    }, [document?.id, awareness, currentUserId, currentUserName, currentUserAvatar, participants, isYjsSynced])

    // Broadcast document activity to Spaces app
    useEffect(() => {
      if (!document?.id || !currentUserId) return

      const activityType = isReadOnly ? 'viewing' : 'editing'
      const docTitle = document.title || t('title-untitled-document')
      const urlSpaceId =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('spaceId') : null

      // Emit activity when starting
      emitDocumentActivity({
        userId: currentUserId,
        userName: currentUserName || t('editor-user-fallback'),
        userAvatar: currentUserAvatar,
        documentId: document.id,
        documentTitle: docTitle,
        documentType: 'document',
        activityType,
        spaceId: urlSpaceId || undefined
      })

      // Keep-alive: re-emit activity every 30 seconds
      const keepAliveInterval = setInterval(() => {
        emitDocumentActivity({
          userId: currentUserId,
          userName: currentUserName || t('editor-user-fallback'),
          userAvatar: currentUserAvatar,
          documentId: document.id,
          documentTitle: docTitle,
          documentType: 'document',
          activityType,
          spaceId: urlSpaceId || undefined
        })
      }, 30000)

      // Cleanup: emit activity end when leaving
      return () => {
        clearInterval(keepAliveInterval)
        emitDocumentActivityEnd(currentUserId, document.id)
      }
    }, [document?.id, document?.title, currentUserId, currentUserName, currentUserAvatar, isReadOnly, t])

    const isCollaborationMode = Boolean(document?.id)

    // Initialize TipTap editor
    const editor = useEditor(
      {
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4, 5, 6]
            },
            // Disable local history/undo-redo in collaboration mode (Yjs provides this).
            ...(isCollaborationMode ? { history: false, undoRedo: false } : {}),
            // Avoid duplicate names when Link/Underline are configured explicitly below.
            link: false,
            underline: false
          }),
          Placeholder.configure({
            placeholder: t('editor-content-placeholder')
          }),
          TextAlign.configure({
            types: ['heading', 'paragraph']
          }),
          LineAndParagraphSpacing.configure({
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
          PageBreak,
          ...(paginationConfig
            ? [
                PaginationPlus.configure({
                  pageWidth: paginationConfig.pageWidth,
                  pageHeight: paginationConfig.pageHeight,
                  pageGap: PAGE_GAP_PX,
                  marginTop: paginationConfig.marginTop,
                  marginBottom: paginationConfig.marginBottom,
                  marginLeft: paginationConfig.marginLeft,
                  marginRight: paginationConfig.marginRight,
                  contentMarginTop: 0,
                  contentMarginBottom: 0,
                  pageBreakBackground: '#f3f4f6',
                  pageGapBorderSize: 0,
                  pageGapBorderColor: '#f3f4f6',
                  headerLeft: '',
                  headerRight: '',
                  footerLeft: '',
                  footerRight: '',
                  customHeader: {},
                  customFooter: {}
                })
              ]
            : []),
          InlineCommentExtension.configure({
            onCommentClick: commentId => {
              setRightSidebar('comments')
              setTimeout(() => {
                const commentElement = globalThis.document.querySelector(`[data-testid="comment-thread-${commentId}"]`)
                commentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 300)
            }
          }),
          ...(collaborationExtension ? [collaborationExtension] : []),
          ...(yjsCursorExtension ? [yjsCursorExtension] : [])
        ],
        // In CRDT mode, the Yjs doc becomes the single source of truth.
        content: editorContent,
        editable: editorEditable,
        editorProps: {
          attributes: {
            dir: 'auto'
          }
        },
        onUpdate: () => {
          schedulePaginationRebuild()
          if (document?.id) versioning.markAsChanged()
          if (!document?.id) {
            setHasUnsavedChanges(true)
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
            autoSaveTimeoutRef.current = setTimeout(() => handleSave(), AUTO_SAVE_DELAY_MS)
          }
        }
      },
      [
        document?.id,
        ydoc,
        editorContent,
        editorEditable,
        isCollaborationMode,
        t,
        isPageless,
        paginationConfig?.pageWidth,
        paginationConfig?.pageHeight,
        paginationConfig?.marginTop,
        paginationConfig?.marginBottom,
        paginationConfig?.marginLeft,
        paginationConfig?.marginRight
      ]
    )

    // Inject collaboration cursor styles once on mount
    useEffect(() => {
      // Guard against SSR / non-browser environments
      if (typeof window === 'undefined') return

      const styleId = 'collaboration-cursor-styles'
      // Use window.document to avoid shadowing from the 'document' prop
      if (!window.document.getElementById(styleId)) {
        const styleEl = window.document.createElement('style')
        styleEl.id = styleId
        styleEl.textContent = CURSOR_STYLES
        window.document.head.appendChild(styleEl)
      }
      return () => {
        // Don't remove on unmount - other editors might need it
      }
    }, [])

    // Update refs when values change
    useEffect(() => {
      editorRef.current = editor
    }, [editor])

    // Expose insertAtCursor for template "Insert field" panel
    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor(htmlOrText: string) {
          const ed = editorRef.current
          if (ed) ed.commands.insertContent(htmlOrText)
        }
      }),
      []
    )

    // Update editor editable state when Yjs sync status or lock changes
    useEffect(() => {
      if (!editor) return
      // For new documents (no ID), always editable if not read-only
      // For existing documents, check Yjs sync and lock status
      const shouldBeEditable = !isReadOnly && (!document?.id || (isYjsSynced && fileLock.canEdit))
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable)
      }
    }, [editor, isReadOnly, document?.id, isYjsSynced, fileLock.canEdit])

    // Handler for inline comment (defined after editor)
    const handleAddInlineComment = useCallback(() => {
      if (!editor) return

      const { from, to } = editor.state.selection
      if (from === to) return // No selection

      const selectedText = editor.state.doc.textBetween(from, to)
      const { view } = editor
      const coords = view.coordsAtPos(from)

      setPendingSelection({ from, to, text: selectedText })
      setInlineCommentPosition({
        top: coords.top + window.scrollY + 30,
        left: coords.left + window.scrollX
      })
      setShowInlineCommentPopover(true)
    }, [editor])

    // Page count and current page from PaginationPlus DOM.
    //
    // PaginationPlus renders a `[data-rm-pagination]` wrapper with one `.rm-page-break` child per page.
    // Each `.rm-page-break` contains a `.breaker` element positioned at the end of that page.
    // We compute:
    // - total pages = number of `.rm-page-break` children (fallback to 1)
    // - current page = 1 + number of *page boundaries* (breaker elements except last page) above viewport center
    const paginationModelRef = useRef<{ totalPages: number; boundaryEls: HTMLElement[] }>({
      totalPages: 1,
      boundaryEls: []
    })
    const paginationRafRef = useRef<number | null>(null)
    const paginationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const PAGINATION_DEBOUNCE_MS = 150

    const computeCurrentPageFromBoundaries = useCallback(
      (container: HTMLDivElement, totalPages: number, boundaryEls: HTMLElement[]) => {
        if (totalPages <= 1 || boundaryEls.length === 0) return 1
        const containerRect = container.getBoundingClientRect()
        const viewportCenterY = containerRect.top + containerRect.height / 2

        let passedBoundaries = 0
        for (const boundaryEl of boundaryEls) {
          const boundaryTop = boundaryEl.getBoundingClientRect().top
          if (viewportCenterY >= boundaryTop) {
            passedBoundaries += 1
          } else {
            break
          }
        }

        return Math.min(Math.max(1, 1 + passedBoundaries), totalPages)
      },
      []
    )

    const rebuildPaginationModel = useCallback(() => {
      const container = editorContainerRef.current
      if (!container) return

      const paginationRoot = container.querySelector('[data-rm-pagination]')
      const pageEls = paginationRoot ? Array.from(paginationRoot.children) : []
      const pageBreakEls = pageEls.filter((el): el is HTMLElement => el instanceof HTMLElement)
      const totalPages = pageBreakEls.length > 0 ? pageBreakEls.length : 1

      // Boundaries between pages are the `.breaker` elements for all but the last page.
      const boundaryEls = pageBreakEls
        .slice(0, -1)
        .map(el => el.querySelector('.breaker'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)

      paginationModelRef.current = { totalPages, boundaryEls }

      setPageCount(totalPages)
      setCurrentPage(computeCurrentPageFromBoundaries(container, totalPages, boundaryEls))
    }, [computeCurrentPageFromBoundaries])

    const schedulePaginationRebuild = useCallback(
      (immediate = false) => {
        const run = () => {
          if (paginationRafRef.current) cancelAnimationFrame(paginationRafRef.current)
          paginationRafRef.current = requestAnimationFrame(() => {
            paginationRafRef.current = null
            rebuildPaginationModel()
          })
        }
        if (immediate) {
          if (paginationDebounceRef.current) {
            clearTimeout(paginationDebounceRef.current)
            paginationDebounceRef.current = null
          }
          run()
          return
        }
        if (paginationDebounceRef.current) clearTimeout(paginationDebounceRef.current)
        paginationDebounceRef.current = setTimeout(() => {
          paginationDebounceRef.current = null
          run()
        }, PAGINATION_DEBOUNCE_MS)
      },
      [rebuildPaginationModel]
    )

    useEffect(() => {
      schedulePaginationRebuild(true)
      const onResize = () => schedulePaginationRebuild(true)
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [schedulePaginationRebuild])

    // Keep pagination model synced in edit/collaboration mode (DOM updates are async).
    useEffect(() => {
      if (!document?.id) return
      schedulePaginationRebuild(true)
    }, [document?.id, isYjsSynced, schedulePaginationRebuild])

    // Observe editor DOM changes so the page model updates when PaginationPlus inserts/reflows its DOM.
    // (In edit/collaboration mode this often happens after initial render, without a user-driven update.)
    useEffect(() => {
      const container = editorContainerRef.current
      if (!container) return

      // Prefer the actual editor DOM root if available.
      const root: HTMLElement | null =
        (editor?.view?.dom as unknown as HTMLElement | null) ??
        (container.querySelector('.ProseMirror') as HTMLElement | null)

      if (!root) return

      const observer = new MutationObserver(() => {
        schedulePaginationRebuild(false)
      })

      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      })

      schedulePaginationRebuild(true)

      return () => {
        observer.disconnect()
        if (paginationDebounceRef.current) {
          clearTimeout(paginationDebounceRef.current)
          paginationDebounceRef.current = null
        }
      }
    }, [editor, schedulePaginationRebuild])

    const scrollThrottleRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget
        if (scrollThrottleRef.current) return
        scrollThrottleRef.current = requestAnimationFrame(() => {
          scrollThrottleRef.current = null
          const { totalPages, boundaryEls } = paginationModelRef.current
          setCurrentPage(computeCurrentPageFromBoundaries(container, totalPages, boundaryEls))
        })
      },
      [computeCurrentPageFromBoundaries]
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

    const handlePageSetupApply = useCallback(
      (nextFormatting: DocumentFormatting) => {
        setLayoutFormatting(nextFormatting)
        // Sync formatting to other collaborators (edit mode only).
        if (document?.id && isYjsSynced) {
          formattingYMap.set('formatting', nextFormatting)
        }
        if (document?.id && onPersistFormatting) {
          void onPersistFormatting(nextFormatting)
        }
      },
      [document?.id, formattingYMap, isYjsSynced, onPersistFormatting]
    )

    // Save document (pass merged formatting so layout is persisted)
    const handleSave = useCallback(async () => {
      if (isReadOnly || isSaving || !editor) return

      setIsSaving(true)
      try {
        const nextTitle = title.trim() || title
        // Keep collaborative title in sync when saving from toolbar/shortcuts
        // (e.g. when user saves without blurring the title input).
        if (document?.id && isYjsSynced) {
          metaYMap.set('title', nextTitle.trim())
        }

        const content = editor.getHTML()
        const formatting: DocumentFormatting = {
          ...document?.formatting,
          ...layoutFormatting,
          pageSize: resolvedLayout.pageSize,
          orientation: resolvedLayout.orientation,
          margins: resolvedLayout.margins,
          marginUnit: resolvedLayout.marginUnit,
          pageColor: resolvedLayout.pageColor,
          pageless: resolvedLayout.pageless
        }
        await onSave(nextTitle, content, formatting)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error('[PagedDocumentEditor] Save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }, [
      title,
      editor,
      onSave,
      isReadOnly,
      isSaving,
      document?.id,
      document?.formatting,
      isYjsSynced,
      metaYMap,
      layoutFormatting,
      resolvedLayout
    ])

    const lastSavedTitleRef = useRef(title)

    useEffect(() => {
      // Keep in sync when title is loaded/changed programmatically.
      lastSavedTitleRef.current = title
    }, [document?.id])

    const persistTitleIfChanged = useCallback(() => {
      if (isReadOnly) return
      if (isSaving) return

      const nextTitle = title.trim()
      if (!nextTitle) return

      if (nextTitle === lastSavedTitleRef.current) return
      lastSavedTitleRef.current = nextTitle
      setTitle(nextTitle)

      // Sync to other collaborators (edit mode only).
      if (document?.id && isYjsSynced) {
        metaYMap.set('title', nextTitle)
      }

      void handleSave()
    }, [document?.id, handleSave, isReadOnly, isSaving, isYjsSynced, metaYMap, title])

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      e.currentTarget.blur()
    }, [])

    const handleTitleBlur = useCallback(() => {
      persistTitleIfChanged()
    }, [persistTitleIfChanged])

    useDocumentEditorShortcuts({
      onSave: () => {
        void handleSave()
      },
      onAddInlineComment: handleAddInlineComment,
      editor,
      editorContainerRef
    })

    useEditorKeyboardIsolation(editorContainerRef)

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
      printHtmlDocument({
        title,
        htmlContent: editor.getHTML(),
        extraCss: `
        .page-break { page-break-after: always; break-after: page; }
        @media print { .page-break { page-break-after: always; break-after: page; height: 0; border: none; } }
      `
      })
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
      if (!date) return t('editor-status-not-saved')
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) return t('editor-status-saved-now')
      if (diffMinutes === 1) return t('editor-status-saved-minute')
      if (diffMinutes < 60) return t('editor-status-saved-minutes', { count: diffMinutes })

      return t('editor-status-saved-at', { time: date.toLocaleTimeString() })
    }

    // Measure header + toolbar height for sidebar alignment
    const headerToolbarRef = useRef<HTMLDivElement>(null)
    const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0)

    useEffect(() => {
      if (!headerToolbarRef.current) return
      const measure = () => {
        const rect = headerToolbarRef.current?.getBoundingClientRect()
        if (rect) setMeasuredHeaderHeight(rect.bottom)
      }
      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(headerToolbarRef.current)
      return () => observer.disconnect()
    }, [])

    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
        {/* Header */}
        <div ref={headerToolbarRef} className="gba:border-b gba:bg-card gba:shadow-sm">
          <div className="gba:px-4 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
              {/* Left side - Back button and title */}
              <div className="gba:flex gba:items-center gba:gap-4 gba:min-w-0 gba:flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  title={t('editor-back-title')}
                  className="gba:shrink-0"
                >
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
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleTitleBlur}
                      placeholder={t('editor-title-placeholder')}
                      disabled={isReadOnly}
                      className="gba:text-lg gba:font-semibold gba:border-0 gba:p-0 gba:h-auto gba:min-w-0 gba:w-full gba:bg-transparent focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0"
                    />
                    <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                      <span>{t('editor-word-count', { count: wordCount })}</span>
                      <span>•</span>
                      <span>{t('editor-character-count', { count: charCount })}</span>
                      <span>•</span>
                      <span>
                        {t('editor-page-of', { current: Math.min(currentPage, pageCount), total: pageCount })}
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
                {/* Save status - main save flow (lastSaved) so user always sees "Saved" feedback */}
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

                {/* Zoom controls */}
                <div className="gba:flex gba:items-center gba:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    title={t('editor-zoom-out')}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    title={t('editor-zoom-in')}
                    className="gba:h-8 gba:w-8"
                  >
                    <ZoomIn className="gba:w-4 gba:h-4" />
                  </Button>
                </div>

                <Separator orientation="vertical" className="gba:h-6" />

                {/* For new documents, show prominent save button */}
                {!document?.id && !isReadOnly && (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="default"
                    size="sm"
                    data-testid="save-new-document-button"
                    className="gba:bg-primary gba:text-primary-foreground"
                  >
                    <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                    {isSaving ? t('editor-saving') : t('editor-save-document')}
                  </Button>
                )}

                {/* Versioning Features - Clean & Compact (for existing documents) */}
                {document?.id && (
                  <>
                    {/* Current checkpoint label + checkpoint button (save status is in header) */}
                    <AutoSaveIndicator
                      isSaving={versioning.isSaving}
                      lastSaveTime={versioning.lastSaveTime}
                      hasUnsavedChanges={versioning.hasUnsavedChanges}
                      currentVersion={(() => {
                        const latestCheckpoint = versioning.versions.find(v => v.isCheckpoint)
                        return latestCheckpoint
                          ? {
                              version: latestCheckpoint.version,
                              changeDescription: latestCheckpoint.changeDescription
                            }
                          : null
                      })()}
                      showVersionOnly
                      onVersionClick={() => setShowVersionHistory(true)}
                      onManualSave={() => setShowCheckpointDialog(true)}
                      data-testid="auto-save-indicator"
                    />

                    {/* Comments button */}
                    <Button
                      variant={rightSidebar === 'comments' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRightSidebar(prev => (prev === 'comments' ? 'closed' : 'comments'))}
                      title={t('editor-comments-title')}
                      data-testid="comments-button"
                      className="gba:h-8"
                    >
                      <MessageSquare className="gba:w-4 gba:h-4" />
                      {comments.unresolvedCount > 0 && (
                        <Badge variant="warning" className="gba:ml-1 gba:px-1 gba:py-0 gba:h-4 gba:text-xs">
                          {comments.unresolvedCount}
                        </Badge>
                      )}
                    </Button>

                    {/* Lock status indicator (compact) */}
                    {fileLock.lock?.isLocked && fileLock.isLockedByMe && (
                      <Badge variant="default" className="gba:flex gba:items-center gba:gap-1">
                        <Lock className="gba:h-3 gba:w-3" />
                        {t('editor-locked')}
                      </Badge>
                    )}

                    {/* Status badge */}
                    <StatusBadge status={publishing.metadata?.status || 'draft'} />
                  </>
                )}

                <Separator orientation="vertical" className="gba:h-6" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPageSetupDialog(true)}
                  data-testid="page-setup-button"
                >
                  <LayoutPanelLeft className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('page-setup-title')}
                </Button>

                {/* Document Actions Menu (includes Export) */}
                {document?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-document-menu')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                        <History className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-version-history')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCheckpointDialog(true)}>
                        <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-save-checkpoint')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {fileLock.isLockedByMe ? (
                        <DropdownMenuItem onClick={() => fileLock.releaseLock()}>
                          <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('editor-unlock-document')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => fileLock.acquireLock()}>
                          <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('editor-lock-document')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowPublishDialog(true)}>
                        <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-publish')}
                      </DropdownMenuItem>
                      {onSaveAsTemplate && (
                        <DropdownMenuItem onClick={() => editor && onSaveAsTemplate(title, editor.getHTML())}>
                          <BookTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('editor-save-template')}
                        </DropdownMenuItem>
                      )}
                      {onSendForApproval && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={onSendForApproval}>
                            <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                            {t('editor-send-for-approval')}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportWord} disabled={isExporting}>
                        <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-export-word')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                        <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-export-pdf')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-print')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* AI Editor button (same style as notes Transform) */}
                {document?.id && (
                  <AiButton
                    size="sm"
                    showIcon
                    icon={<Wand2 className="gba:w-4 gba:h-4" />}
                    iconPosition="before"
                    onClick={() => setRightSidebar(prev => (prev === 'ai' ? 'closed' : 'ai'))}
                    data-testid="ai-edit-button"
                  >
                    {t('editor-ai-edit')}
                  </AiButton>
                )}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <EditorToolbar editor={editor} data-testid={`${testId}-toolbar`} />
        </div>

        {/* Main content: optional left panel + editor area */}
        <div className={`gba:flex gba:flex-1 gba:min-h-0 ${leftPanel ? 'gba:flex-row' : 'gba:flex-col'}`}>
          {leftPanel ? (
            <div className="gba:flex-shrink-0 gba:w-64 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
              {leftPanel}
            </div>
          ) : null}
          {/* Editor Area with Page Layout - background matches page gap for consistent document canvas */}
          <div
            ref={editorContainerRef}
            className="gba:flex-1 gba:overflow-auto gba:min-w-0 document-editor-viewport"
            onScroll={handleScroll}
          >
            <div className="gba:flex gba:justify-center gba:py-8" style={{ minHeight: '100%' }}>
              <div
                className="paged-document-editor"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center'
                }}
              >
                <EditorContent editor={editor} className="editor-content" />
                {/* Cursors/selections are rendered by Yjs cursor plugin inside the editor. */}
              </div>
            </div>
          </div>
        </div>

        {/* Editor Styles — viewport/canvas: light gray; pages: white (match develop branch) */}
        <style>{`
        .document-editor-viewport {
          background-color: #f3f4f6;
        }
        .paged-document-editor .ProseMirror {
          outline: none;
          background-color: ${pageColor};
          font-family: 'Times New Roman', Georgia, serif;
          font-size: 12pt;
          line-height: 1.15;
          color: #1a1a1a;
          min-height: ${paginationConfig ? paginationConfig.pageHeight - paginationConfig.marginTop - paginationConfig.marginBottom : 400}px;
        }

        .paged-document-editor .ProseMirror p {
          margin: 0;
        }

        /* Lists (Tailwind preflight resets list-style to none) */
        .paged-document-editor .ProseMirror ol {
          list-style: decimal;
          list-style-position: outside;
          padding-inline-start: 24pt;
          margin: 0 0 12pt 0;
        }

        .paged-document-editor .ProseMirror ul {
          list-style: disc;
          list-style-position: outside;
          padding-inline-start: 24pt;
          margin: 0 0 12pt 0;
        }

        .paged-document-editor .ProseMirror li {
          margin: 0 0 6pt 0;
        }

        /* TipTap often wraps list-item text in <p>. Keep it inline so markers align nicely. */
        .paged-document-editor .ProseMirror li > p {
          display: inline;
          margin: 0;
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

        /* Tables: print-first (no horizontal scrolling) */
        .paged-document-editor .ProseMirror .tableWrapper {
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          margin: 16pt 0;
          border: 1pt solid #d0d0d0;
          border-radius: 4pt;
          background: #fff;
        }

        .paged-document-editor .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
          margin: 0;
        }

        .paged-document-editor .ProseMirror td,
        .paged-document-editor .ProseMirror th {
          border: 1pt solid #333;
          padding: 4pt 6pt;
          text-align: start;
          vertical-align: top;
          font-size: 10.5pt;
          line-height: 1.3;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .paged-document-editor .ProseMirror th {
          background: #f5f5f5;
          font-weight: bold;
        }

        /* Let header rows behave nicely in print/page flows */
        .paged-document-editor .ProseMirror thead {
          display: table-header-group;
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

        /* AI selection highlight (persistent decoration while AI panel is open) */
        .paged-document-editor .ProseMirror .ai-selection-highlight {
          background: rgba(139, 180, 254, 0.35);
          border-bottom: 2px solid rgba(99, 140, 230, 0.6);
          border-radius: 2px;
          transition: background 0.2s ease;
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

        {/* Versioning Dialogs */}
        {document?.id && showVersionHistory && (
          <VersionHistory
            versions={versioning.versions}
            isLoading={versioning.isLoading}
            userDisplayMap={versionUserDisplayMap}
            onRestore={async versionNumber => {
              // Get the version data first
              const versionData = await DocumentApiService.getVersion(document.id, versionNumber)

              if (!versionData) {
                console.error('[PagedDocumentEditor] Failed to get version data')
                return
              }

              // Now restore on backend
              const success = await versioning.restoreVersion(versionNumber)

              if (success && editor && versionData.content) {
                editor.commands.setContent(versionData.content)
                setTitle(versionData.title)
                setHasUnsavedChanges(false)
                setLastSaved(new Date())

                // Reload versions to show the new "Restored" checkpoint
                await versioning.loadVersions()

                // Close the dialog
                setShowVersionHistory(false)
              }
            }}
            onClose={() => setShowVersionHistory(false)}
            currentVersion={versioning.currentVersion?.version}
            showAutoSaves={false}
            data-testid="document-version-history"
          />
        )}

        {document?.id && showCheckpointDialog && (
          <CheckpointDialog
            isOpen={showCheckpointDialog}
            onClose={() => setShowCheckpointDialog(false)}
            onSave={versioning.createCheckpoint}
            isSaving={versioning.isSaving}
            data-testid="document-checkpoint-dialog"
          />
        )}

        {document?.id && showPublishDialog && (
          <PublishDialog
            isOpen={showPublishDialog}
            onClose={() => setShowPublishDialog(false)}
            onPublish={publishing.publish}
            isPublishing={publishing.isPublishing}
            entityType="document"
            data-testid="document-publish-dialog"
          />
        )}

        {showPageSetupDialog && (
          <PageSetupDialog
            open={showPageSetupDialog}
            onOpenChange={setShowPageSetupDialog}
            formatting={layoutFormatting}
            onApply={handlePageSetupApply}
            data-testid="document-page-setup-dialog"
          />
        )}

        {document?.id && rightSidebar === 'comments' && (
          <CommentPanel
            comments={comments.comments}
            messages={{
              title: t('shared-comment-panel-title'),
              unresolvedCount: t('shared-comment-unresolved'),
              unresolvedTab: t('shared-comment-unresolved-tab'),
              resolvedTab: t('shared-comment-resolved-tab'),
              allCaughtUp: t('shared-comment-all-caught-up'),
              allResolved: t('shared-comment-all-resolved'),
              noResolved: t('shared-comment-no-resolved'),
              resolvedHere: t('shared-comment-resolved-here'),
              loading: t('shared-comment-loading'),
              addPlaceholder: t('shared-comment-placeholder')
            }}
            threadMessages={{
              reply: t('shared-comment-reply'),
              edit: t('shared-comment-edit'),
              resolve: t('shared-comment-resolve'),
              delete: t('shared-comment-delete'),
              resolved: t('shared-comment-resolved'),
              confirmDelete: t('shared-comment-confirm-delete'),
              editPlaceholder: t('shared-comment-edit-placeholder'),
              replyPlaceholder: t('shared-comment-reply-placeholder')
            }}
            editorMessages={{
              cancel: t('shared-comment-cancel'),
              send: t('shared-comment-send'),
              sending: t('shared-comment-sending'),
              sendHint: t('shared-comment-send-hint')
            }}
            unresolvedCount={comments.unresolvedCount}
            isLoading={comments.isLoading}
            onCreateComment={async (content, parentId) => {
              await comments.createComment({
                type: parentId ? 'document' : 'document',
                content,
                parentId,
                createdByName: currentUserName || undefined,
                createdByAvatar: currentUserAvatar || undefined
              })
            }}
            onUpdateComment={async (commentId, content) => {
              await comments.updateComment(commentId, { content })
            }}
            onResolveComment={comments.resolveComment}
            onDeleteComment={comments.deleteComment}
            onClose={() => setRightSidebar('closed')}
            currentUserId={currentUserId || undefined}
            currentUserName={currentUserName || undefined}
            currentUserAvatar={currentUserAvatar || undefined}
            accessToken={accessToken}
            headerHeight={measuredHeaderHeight || 120}
            onUnhighlight={commentId => {
              if (!editor) return
              const selection = findInlineCommentSelection(editor, commentId)
              if (!selection) return
              editor.chain().setTextSelection(selection).unsetInlineComment().run()
            }}
            onScrollToHighlight={commentId => {
              if (!editor) return
              const selection = findInlineCommentSelection(editor, commentId)
              if (!selection) return
              editor.chain().setTextSelection(selection).focus().run()
              scrollInlineCommentDomIntoView(commentId)
            }}
            data-testid="document-comment-panel"
          />
        )}

        {document?.id && rightSidebar === 'ai' && (
          <AiEditPanel
            editor={editor}
            documentId={document.id}
            documentTitle={title}
            onClose={() => setRightSidebar('closed')}
            currentUserId={currentUserId || undefined}
            headerHeight={measuredHeaderHeight || 120}
            data-testid="document-ai-edit-panel"
          />
        )}

        {/* Inline comment popover (Google Docs style) */}
        <InlineCommentPopover
          isOpen={showInlineCommentPopover}
          position={inlineCommentPosition}
          messages={{
            addComment: t('shared-comment-add'),
            placeholder: t('shared-comment-placeholder'),
            comment: t('shared-comment-button')
          }}
          onSubmit={async content => {
            if (!pendingSelection || !editor) return

            const comment = await comments.createComment({
              type: 'inline',
              content,
              selectionStart: pendingSelection.from,
              selectionEnd: pendingSelection.to,
              selectedText: pendingSelection.text,
              createdByName: currentUserName || undefined,
              createdByAvatar: currentUserAvatar || undefined
            })

            if (comment) {
              // Highlight the text with comment marker
              editor
                .chain()
                .focus()
                .setInlineComment({
                  commentId: comment.id,
                  commentType: 'inline',
                  createdBy: currentUserId || '',
                  createdAt: comment.createdAt
                })
                .run()
            }

            setPendingSelection(null)
          }}
          onClose={() => {
            setShowInlineCommentPopover(false)
            setPendingSelection(null)
          }}
          data-testid="document-inline-comment-popover"
        />
      </div>
    )
  }
)

export default PagedDocumentEditor
