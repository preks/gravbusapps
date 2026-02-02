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
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  FileText,
  Download,
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
  XCircle,
  History,
  Lock,
  Unlock,
  MessageSquare,
  Upload
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Document, DocumentApprovalRequest } from '../../types'
import { PageBreak } from './extensions/PageBreak'
import { createYjsCursorExtension } from './extensions/YjsCursor'
import { EditorToolbar } from './EditorToolbar'
import { exportToWord, exportToPDF, printHtmlDocument } from '../../utils/exportUtils'
import { DocumentApiService } from '../../services/DocumentApiService'
import { useCollaboration } from '../../../shared/hooks/useCollaboration'
import type { DocumentParticipant } from '../../../shared/services/CollaborationClient'
import { PresenceIndicator } from '../../../shared/components/PresenceIndicator'
import { SocketIoYjsProvider } from '../../../shared/services/SocketIoYjsProvider'
import { useVersioning } from '../../../shared/hooks/useVersioning'
import { useFileLock } from '../../../shared/hooks/useFileLock'
import { useComments } from '../../../shared/hooks/useComments'
import { usePublishing } from '../../../shared/hooks/usePublishing'
import { VersionHistory } from '../../../shared/components/VersionHistory'
import { CheckpointDialog } from '../../../shared/components/CheckpointDialog'
import { AutoSaveIndicator } from '../../../shared/components/AutoSaveIndicator'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { PublishDialog } from '../../../shared/components/PublishDialog'
import { CommentPanel } from '../../../shared/components/CommentPanel'
import { InlineCommentPopover } from '../../../shared/components/InlineCommentPopover'
import { InlineComment as InlineCommentExtension } from '../../../shared/extensions/InlineCommentExtension'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

// A4 dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794 // 210mm
const A4_HEIGHT_PX = 1123 // 297mm
const PAGE_MARGIN_PX = 96 // 1 inch = 96px at 96 DPI

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
      initialTitle = 'Untitled Document',
      onSave,
      onBack,
      onSaveAsTemplate,
      onSendForApproval,
      isReadOnly = false,
      leftPanel,
      accessToken: accessTokenProp,
      'data-testid': testId = 'paged-document-editor'
    },
    ref
  ) {
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
    const editorRef = useRef<any>(null) // Store editor instance

    useEffect(() => {
      DocumentApiService.setAccessToken(accessTokenProp || null)
    }, [accessTokenProp])

    // Current user (used for Yjs awareness user info)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserName, setCurrentUserName] = useState<string | null>(null)
    const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)

    // Versioning UI state
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
    const [showPublishDialog, setShowPublishDialog] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [showInlineCommentPopover, setShowInlineCommentPopover] = useState(false)
    const [inlineCommentPosition, setInlineCommentPosition] = useState<{ top: number; left: number } | null>(null)
    const [pendingSelection, setPendingSelection] = useState<{ from: number; to: number; text: string } | null>(null)

    // Yjs CRDT state for true concurrent co-editing
    const [isYjsSynced, setIsYjsSynced] = useState(false)
    const ydoc = React.useMemo(() => new Y.Doc(), [document?.id])
    const awareness = React.useMemo(() => new Awareness(ydoc), [ydoc])
    const yjsProviderRef = useRef<SocketIoYjsProvider | null>(null)
    const scheduleSnapshotSaveRef = useRef<(editor: any) => void>(() => {})

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

    // Enriched participants with avatars (populated by useEffect after graphqlClient is initialized)
    const [participants, setParticipants] = useState<DocumentParticipant[]>(rawParticipants)

    // Versioning, Comments, Locking, Publishing hooks
    const versioning = useVersioning({
      entityId: document?.id || '',
      entityType: 'document',
      apiService: DocumentApiService,
      autoSaveEnabled: !!document?.id && !isReadOnly,
      autoSaveInterval: 30000,
      onVersionCreated: () => {}
    })

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

    // Drive Yjs sync + awareness over our existing Socket.IO connection.
    useEffect(() => {
      if (!document?.id) return
      if (!collaborationSocket) return

      // Build provider (and keep it stable while the socket/doc changes).
      const provider = new SocketIoYjsProvider({
        socket: collaborationSocket,
        documentId: document.id,
        ydoc,
        awareness,
        onSyncedChange: setIsYjsSynced,
        onBootstrapRequired: async (html: string) => {
          // Initializer: seed Yjs from legacy HTML (best-effort).
          // We keep it simple: set the editor content once TipTap is ready.
          // The collaboration extension will translate this into Yjs state.
          const start = Date.now()
          while (!editorRef.current && Date.now() - start < 5000) {
            await new Promise(resolve => setTimeout(resolve, 25))
          }
          const ed = editorRef.current
          if (!ed) {
            throw new Error('Editor not ready for bootstrap')
          }

          // Temporarily make editor editable for setContent to work with Collaboration extension
          const wasEditable = ed.isEditable
          if (!wasEditable) {
            ed.setEditable(true)
          }

          ed.commands.setContent(html || '<p></p>', true)

          // Give TipTap time to propagate the change to Yjs
          await new Promise(resolve => setTimeout(resolve, 100))

          // Note: Don't restore editable to false - the bootstrap process will mark sync as complete
          // which will trigger the setEditable effect to set the correct state
        },
        onLocalDocumentChange: () => {
          const ed = editorRef.current
          if (!ed) return
          scheduleSnapshotSaveRef.current(ed)
        }
      })

      yjsProviderRef.current = provider
      provider.start()

      return () => {
        provider.destroy()
        yjsProviderRef.current = null
        setIsYjsSynced(false)
      }
    }, [document?.id, collaborationSocket, ydoc, awareness])

    // Set local awareness state (user meta shown in cursors/selections)
    useEffect(() => {
      if (!document?.id) return
      if (!currentUserId) return
      if (!isYjsSynced) return

      awareness.setLocalStateField('user', {
        id: currentUserId,
        userId: currentUserId,
        name: currentUserName || 'User',
        color: participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4',
        avatar: currentUserAvatar // Include avatar URL for cursor rendering
      })
    }, [document?.id, awareness, currentUserId, currentUserName, currentUserAvatar, participants, isYjsSynced])

    // Debounced snapshot save for exports/search. This does NOT drive collaboration.
    const scheduleSnapshotSave = useCallback(
      (currentEditor: any) => {
        if (!document?.id || isReadOnly) return
        if (!isYjsSynced) return

        setHasUnsavedChanges(true)
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
          const html = currentEditor?.getHTML?.() || ''
          // Persist HTML snapshot without version churn (CRDT updates are the source of truth).
          DocumentApiService.updateDocument(
            document.id,
            {
              title,
              content: html
            },
            { createVersion: false }
          )
            .then(() => {
              setLastSaved(new Date())
              setHasUnsavedChanges(false)
            })
            .catch(error => {
              console.error('[PagedDocumentEditor] Snapshot save failed:', error)
            })
        }, 2000)
      },
      [document?.id, isReadOnly, isYjsSynced, title]
    )

    useEffect(() => {
      scheduleSnapshotSaveRef.current = scheduleSnapshotSave
    }, [scheduleSnapshotSave])

    const graphqlClient = useGraphQLClient(accessToken)

    // Fetch avatars for participants when they change
    useEffect(() => {
      const fetchParticipantAvatars = async () => {
        if (!rawParticipants.length || !accessToken) {
          setParticipants(rawParticipants)
          return
        }

        const userIds = rawParticipants.map(p => p.userId).filter(Boolean)
        if (userIds.length === 0) {
          setParticipants(rawParticipants)
          return
        }

        try {
          const query = `
          query GetEmployeeAvatars($userIds: [String!]) {
            Employee(where: {userId: {_in: $userIds}}) {
              userId
              pictureThumbnail
            }
          }
        `
          const result = await graphqlClient.request<{
            Employee: Array<{ userId: string; pictureThumbnail: string | null }>
          }>(query, { userIds })

          const avatarMap = new Map<string, string>()
          result?.Employee?.forEach(emp => {
            if (emp.pictureThumbnail) {
              const avatarUrl = emp.pictureThumbnail.startsWith('data:')
                ? emp.pictureThumbnail
                : `data:image/png;base64,${emp.pictureThumbnail}`
              avatarMap.set(emp.userId, avatarUrl)
            }
          })

          // Enrich participants with avatar URLs
          const enrichedParticipants = rawParticipants.map(p => ({
            ...p,
            avatarUrl: avatarMap.get(p.userId) || undefined
          }))
          setParticipants(enrichedParticipants)
        } catch (error) {
          console.error('[PagedDocumentEditor] Failed to fetch participant avatars:', error)
          setParticipants(rawParticipants)
        }
      }

      fetchParticipantAvatars()
    }, [rawParticipants, accessToken, graphqlClient])

    // Get current user ID
    useEffect(() => {
      try {
        // Prefer accessToken prop (published screens may not have token in localStorage)
        const token = accessToken || localStorage.getItem('business-app-ide-access-token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setCurrentUserId(payload.sub || payload.userId || null)
          setCurrentUserName(payload.name || payload.preferred_username || payload.username || null)
        }
      } catch {}
    }, [accessToken])

    // Fetch current user's avatar from Employee table
    useEffect(() => {
      if (!currentUserId || !accessToken) return

      const fetchAvatar = async () => {
        try {
          const query = `
          query GetEmployeeAvatar($userId: String!) {
            Employee(where: {userId: {_eq: $userId}}, limit: 1) {
              pictureThumbnail
            }
          }
        `
          const result = await graphqlClient.request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(query, {
            userId: currentUserId
          })

          if (result?.Employee?.[0]?.pictureThumbnail) {
            const thumbnail = result.Employee[0].pictureThumbnail
            // Convert to data URL if it's raw base64
            const avatarUrl = thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
            setCurrentUserAvatar(avatarUrl)
          }
        } catch (error) {
          console.error('[PagedDocumentEditor] Failed to fetch user avatar:', error)
        }
      }

      fetchAvatar()
    }, [currentUserId, accessToken, graphqlClient])

    // Initialize TipTap editor
    const editor = useEditor(
      {
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4, 5, 6]
            },
            // Disable history when using Collaboration (Yjs provides its own history)
            history: document?.id ? false : {}
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
          PageBreak,
          InlineCommentExtension.configure({
            onCommentClick: commentId => {
              // Open comment panel
              setShowComments(true)
              // Scroll to the specific comment after panel opens
              setTimeout(() => {
                const commentElement = document.querySelector(`[data-testid="comment-thread-${commentId}"]`)
                commentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 300)
            }
          }),
          ...(collaborationExtension ? [collaborationExtension] : []),
          ...(yjsCursorExtension ? [yjsCursorExtension] : [])
        ],
        // In CRDT mode, the Yjs doc becomes the single source of truth.
        content: document?.id ? '<p></p>' : document?.content || initialContent || '<p></p>',
        editable: !isReadOnly && (!document?.id || (isYjsSynced && fileLock.canEdit)),
        onUpdate: () => {
          updatePageCount()

          // Mark as changed for versioning system
          if (document?.id) {
            versioning.markAsChanged()
          }

          // For documents without an ID (not yet persisted), fallback to REST save debounce.
          if (!document?.id) {
            setHasUnsavedChanges(true)
            if (autoSaveTimeoutRef.current) {
              clearTimeout(autoSaveTimeoutRef.current)
            }
            autoSaveTimeoutRef.current = setTimeout(() => {
              handleSave()
            }, 3000)
          }
        }
      },
      [document?.id, ydoc]
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
        // Cmd/Ctrl+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          handleSave()
        }

        // Cmd/Ctrl+Shift+M - Add inline comment
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'm') {
          e.preventDefault()
          handleAddInlineComment()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleSave, handleAddInlineComment])

    // Context menu for inline comments
    useEffect(() => {
      const handleContextMenu = (e: MouseEvent) => {
        // Only show if text is selected
        if (!editor) return

        const { from, to } = editor.state.selection
        if (from === to) return // No selection

        e.preventDefault()
        handleAddInlineComment()
      }

      const editorElement = editorContainerRef.current?.querySelector('.ProseMirror')
      if (editorElement) {
        editorElement.addEventListener('contextmenu', handleContextMenu)
        return () => editorElement.removeEventListener('contextmenu', handleContextMenu)
      }
    }, [editor, handleAddInlineComment])

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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    title="Zoom In"
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
                    {isSaving ? 'Saving...' : 'Save Document'}
                  </Button>
                )}

                {/* Versioning Features - Clean & Compact (for existing documents) */}
                {document?.id && (
                  <>
                    {/* Auto-save indicator */}
                    <AutoSaveIndicator
                      isSaving={versioning.isSaving}
                      lastSaveTime={versioning.lastSaveTime}
                      hasUnsavedChanges={versioning.hasUnsavedChanges}
                      onManualSave={() => setShowCheckpointDialog(true)}
                      data-testid="auto-save-indicator"
                    />

                    {/* Comments button */}
                    <Button
                      variant={showComments ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                      title="Comments (Right-click on text to add inline comment)"
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
                        Locked
                      </Badge>
                    )}

                    {/* Status badge */}
                    <StatusBadge status={publishing.metadata?.status || 'draft'} />
                  </>
                )}

                <Separator orientation="vertical" className="gba:h-6" />

                {/* Document Actions Menu */}
                {document?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                        Document
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                        <History className="gba:w-4 gba:h-4 gba:mr-2" />
                        Version History
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCheckpointDialog(true)}>
                        <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                        Save Checkpoint
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {fileLock.isLockedByMe ? (
                        <DropdownMenuItem onClick={() => fileLock.releaseLock()}>
                          <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
                          Unlock Document
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => fileLock.acquireLock()}>
                          <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
                          Lock Document
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowPublishDialog(true)}>
                        <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                        Publish...
                      </DropdownMenuItem>
                      {onSaveAsTemplate && (
                        <DropdownMenuItem onClick={() => editor && onSaveAsTemplate(title, editor.getHTML())}>
                          <BookTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
                          Save as Template
                        </DropdownMenuItem>
                      )}
                      {onSendForApproval && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={onSendForApproval}>
                            <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                            Send for Approval
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

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
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <EditorToolbar editor={editor} data-testid={`${testId}-toolbar`} />
        </div>

        {/* Main content: optional left panel + editor area */}
        <div className={`gba:flex gba:flex-1 gba:min-h-0 ${leftPanel ? 'gba:flex-row' : 'gba:flex-col'}`}>
          {leftPanel != null ? (
            <div className="gba:flex-shrink-0 gba:w-64 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
              {leftPanel}
            </div>
          ) : null}
          {/* Editor Area with Page Layout */}
          <div
            ref={editorContainerRef}
            className="gba:flex-1 gba:overflow-auto gba:bg-muted/50 gba:min-w-0"
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

                  {/* Cursors/selections are rendered by Yjs cursor plugin inside the editor. */}
                </div>
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

        {/* Versioning Dialogs */}
        {document?.id && showVersionHistory && (
          <VersionHistory
            versions={versioning.versions}
            isLoading={versioning.isLoading}
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

        {document?.id && showComments && (
          <CommentPanel
            comments={comments.comments}
            unresolvedCount={comments.unresolvedCount}
            isLoading={comments.isLoading}
            onCreateComment={async (content, parentId) => {
              await comments.createComment({
                type: parentId ? 'document' : 'document',
                content,
                parentId,
                // Pass current user info to avoid fetching on every comment
                createdByName: currentUserName || undefined,
                createdByAvatar: currentUserAvatar || undefined
              })
            }}
            onUpdateComment={async (commentId, content) => {
              await comments.updateComment(commentId, { content })
            }}
            onResolveComment={comments.resolveComment}
            onDeleteComment={comments.deleteComment}
            onClose={() => setShowComments(false)}
            currentUserId={currentUserId || undefined}
            currentUserName={currentUserName || undefined}
            currentUserAvatar={currentUserAvatar || undefined}
            accessToken={accessToken}
            headerHeight={120}
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

        {/* Inline comment popover (Google Docs style) */}
        <InlineCommentPopover
          isOpen={showInlineCommentPopover}
          position={inlineCommentPosition}
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
