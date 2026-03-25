/**
 * NoteEditor Component
 *
 * A beautiful, modern note editor with TipTap, real-time collaboration,
 * and a clean, distraction-free writing experience.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import './note-editor.css'
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
import { TaskList } from '@tiptap/extension-task-list'
import { LinkedTaskItem } from '../shared/extensions/LinkedTaskItem'
import { Typography } from '@tiptap/extension-typography'
import { CharacterCount } from '@tiptap/extension-character-count'
import {
  Button,
  Badge,
  Dialog,
  useTranslation,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  Clock,
  CheckCircle,
  Share2,
  Pin,
  Archive,
  Copy,
  Trash2,
  Download,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  AtSign,
  History,
  MessageSquare,
  Upload,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  ListTodo,
  RefreshCw,
  LayoutGrid,
  Plus,
  PanelLeft
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCollaboration } from '../shared/hooks/useCollaboration'
import { PresenceIndicator } from '../shared/components/PresenceIndicator'
import { SocketIoYjsProvider } from '../shared/services/SocketIoYjsProvider'
import { createYjsCursorExtension } from '@/business-apps/core/office/apps/documents/components/PagedDocumentEditor/extensions/YjsCursor'
import { InlineComment as InlineCommentExtension } from '../shared/extensions/InlineCommentExtension'
import { useVersioning } from '../shared/hooks/useVersioning'
import { useFileLock } from '../shared/hooks/useFileLock'
import { useComments } from '../shared/hooks/useComments'
import { usePublishing } from '../shared/hooks/usePublishing'
import { useEditorKeyboardIsolation } from '../shared/hooks/useEditorKeyboardIsolation'
import { emitDocumentActivity, emitDocumentActivityEnd } from '../spaces/hooks/useSpaceDocumentActivity'
import { VersionHistory } from '../shared/components/VersionHistory'
import { CheckpointDialog } from '../shared/components/CheckpointDialog'
import { PublishDialog } from '../shared/components/PublishDialog'
import { CommentPanel } from '../shared/components/CommentPanel'
import { InlineCommentPopover } from '../shared/components/InlineCommentPopover'
import { Drawing } from '../shared/extensions/Drawing'
import { Kanban, type KanbanData } from '../shared/extensions/Kanban'
import { useTaskKanbanSync } from './hooks/useTaskKanbanSync'
import { HybridEditorCanvas } from '../shared/components/HybridEditorCanvas'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { NoteApiService } from './services/NoteApiService'
import { DrawingApiService } from './services/DrawingApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import Mention from '@tiptap/extension-mention'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import {
  createMentionSuggestion,
  getEntityUrl,
  ENTITY_ICONS,
  ENTITY_COLORS,
  type EntityType
} from './components/EntityMention'
import { mergeAttributes } from '@tiptap/core'
import { FileText } from 'lucide-react'
import type { Note, NoteColor } from './types'
import { toast } from 'sonner'
import {
  TransformMenu,
  SummaryPanel,
  TranslationPanel,
  ActionItemsModal,
  ActionItemsList,
  type TransformType
} from './components/handwriting'
import type { NoteActionItemFlow } from './types'
import type { NoteTranslation, TranslationLanguage } from './types/translation'
import { TextTransformService } from './services/TextTransformService'
import { useActionItemFlowStatusSync } from './hooks/useActionItemFlowStatusSync'
import { useActionItemAssigneeEnrichment } from './hooks/useActionItemAssigneeEnrichment'
import noteAppTranslations from './_i18n'

// Note color mapping (labels via i18n key editor-color-{value})
const noteColors: Array<{ value: NoteColor; class: string }> = [
  { value: 'default', class: 'gba:bg-sidebar' },
  { value: 'red', class: 'gba:bg-red-100 dark:gba:bg-red-900/20' },
  { value: 'orange', class: 'gba:bg-orange-100 dark:gba:bg-orange-900/20' },
  { value: 'yellow', class: 'gba:bg-yellow-100 dark:gba:bg-yellow-900/20' },
  { value: 'green', class: 'gba:bg-green-100 dark:gba:bg-green-900/20' },
  { value: 'teal', class: 'gba:bg-teal-100 dark:gba:bg-teal-900/20' },
  { value: 'blue', class: 'gba:bg-blue-100 dark:gba:bg-blue-900/20' },
  { value: 'purple', class: 'gba:bg-purple-100 dark:gba:bg-purple-900/20' },
  { value: 'pink', class: 'gba:bg-pink-100 dark:gba:bg-pink-900/20' },
  { value: 'gray', class: 'gba:bg-gray-100 dark:gba:bg-gray-800/50' }
]

/**
 * Helper to format picture URL - handles base64, data URLs, and regular URLs
 */
const formatPictureUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Assume base64 if not a URL
  return `data:image/png;base64,${url}`
}

/**
 * MentionNodeView - Beautiful inline card for entity mentions with drag support
 * Must use NodeViewWrapper as root for ReactNodeViewRenderer
 */
const MentionNodeView: React.FC<{ node: any }> = ({ node }) => {
  const { t } = useTranslation(noteAppTranslations)
  const { id, label, type, subtitle, pictureThumbnail } = node.attrs
  const entityType = (type || 'unknown') as EntityType
  const Icon = ENTITY_ICONS[entityType] || FileText
  const colors = ENTITY_COLORS[entityType] || ENTITY_COLORS.default
  const [isDragging, setIsDragging] = React.useState(false)

  // Show avatar/logo for employees and accounts with pictures
  const hasPicture = pictureThumbnail && (entityType === 'employee' || entityType === 'account')
  const pictureUrl = formatPictureUrl(pictureThumbnail)

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if we were dragging
    if (isDragging) {
      setIsDragging(false)
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const url = getEntityUrl({ id, type: entityType })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <NodeViewWrapper as="span" className="gba:inline" draggable="true" data-drag-handle>
      <span
        onClick={handleClick}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
        className={`entity-mention-card gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:h-10 gba:rounded-lg gba:border gba:text-sm gba:font-medium gba:cursor-grab active:gba:cursor-grabbing gba:transition-all gba:duration-200 hover:gba:shadow-md gba:mx-0.5 gba:my-0.5 gba:select-none ${colors.bg} ${colors.border} ${colors.text} ${isDragging ? 'gba:opacity-50 gba:scale-95' : 'hover:gba:scale-[1.02]'}`}
        contentEditable={false}
        data-entity-id={id}
        data-entity-type={entityType}
        title={t('editor-drag-open-tooltip', { label: label || t('editor-entity-fallback') })}
      >
        {/* Drag handle indicator */}
        <span className="gba:flex gba:flex-col gba:gap-px gba:opacity-40 gba:mr-0.5 gba:shrink-0">
          <span className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-current"></span>
          <span className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-current"></span>
        </span>

        {/* Icon/Avatar/Logo */}
        <span
          className={`gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-lg gba:overflow-hidden gba:shrink-0 ${hasPicture ? '' : `${colors.bg}`}`}
        >
          {hasPicture && pictureUrl ? (
            <img
              src={pictureUrl}
              alt={label}
              className="gba:w-8 gba:h-8 gba:rounded-lg gba:object-cover"
              onError={e => {
                // Hide broken images
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <Icon className="gba:w-5 gba:h-5" />
          )}
        </span>

        {/* Content */}
        <span className="gba:flex gba:flex-col gba:leading-tight gba:justify-center">
          <span className="gba:font-semibold gba:truncate gba:max-w-[150px]">
            {label || t('editor-entity-unknown')}
          </span>
          {subtitle && (
            <span className="gba:text-[10px] gba:opacity-70 gba:truncate gba:max-w-[150px]">{subtitle}</span>
          )}
        </span>

        {/* Type indicator */}
        <span
          className={`gba:text-[9px] gba:font-bold gba:px-1.5 gba:py-0.5 gba:rounded gba:uppercase gba:tracking-wider gba:opacity-60 gba:shrink-0`}
        >
          {entityType.replace(/_/g, ' ').split(' ')[0]}
        </span>
      </span>
    </NodeViewWrapper>
  )
}

export interface NoteEditorProps extends Partial<BusinessAppContextProps> {
  note: Note
  onSave: (title: string, content: string, contentJson?: Record<string, unknown>) => Promise<void>
  onBack: () => void
  onTogglePin?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onShare?: () => void
  onDuplicate?: () => void
  onColorChange?: (color: NoteColor) => void
  isReadOnly?: boolean
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onTitleChanged?: (noteId: string, newTitle: string) => void
  onContentSaved?: (noteId: string) => void
  'data-testid'?: string
}

/**
 * NoteEditor Component
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onBack,
  onTogglePin,
  onArchive,
  onDelete,
  onShare,
  onDuplicate,
  onColorChange,
  isReadOnly = false,
  isSidebarCollapsed,
  onToggleSidebar,
  onTitleChanged,
  onContentSaved,
  accessToken: accessTokenProp,
  userInfo,
  'data-testid': testId = 'note-editor'
}) => {
  const { t } = useTranslation(noteAppTranslations)
  // Editor state
  const [title, setTitle] = useState(note.title || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(note ? new Date(note.updatedAt) : null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [noteColor, setNoteColor] = useState<NoteColor>(note.color || 'default')

  const prevNoteIdRef = useRef(note.id)
  if (prevNoteIdRef.current !== note.id) {
    prevNoteIdRef.current = note.id
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }
    setTitle(note.title || '')
    setNoteColor(note.color || 'default')
    setLastSaved(new Date(note.updatedAt))
    setHasUnsavedChanges(false)
    setIsSaving(false)
  }

  const titleInputRef = useRef<HTMLInputElement>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<any>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const noteIdRef = useRef(note.id)
  const titleRef = useRef(title)
  noteIdRef.current = note.id
  titleRef.current = title

  // AI Transform + Action Items state (persisted in note.contentJson)
  const initialMeta = (note.contentJson as Record<string, unknown> | undefined) || undefined
  const [isTransforming, setIsTransforming] = useState(false)
  const [currentSummary, setCurrentSummary] = useState<string | null>(
    (initialMeta?._summary as string | null | undefined) ?? null
  )
  const [actionItemFlows, setActionItemFlows] = useState<NoteActionItemFlow[]>(
    (initialMeta?.actionItemFlows as unknown[] as NoteActionItemFlow[] | undefined) || []
  )
  const [translations, setTranslations] = useState<NoteTranslation[]>(
    (initialMeta?._translation as unknown[] as NoteTranslation[] | undefined) || []
  )
  const [actionItemsModalOpen, setActionItemsModalOpen] = useState(false)
  const [currentActionItems, setCurrentActionItems] = useState<string[]>([])
  const [actionItemsPanelOpen, setActionItemsPanelOpen] = useState(false)
  const lastMetaPersistSigRef = useRef<string>('')
  const metaPersistTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset metadata when switching notes
  useEffect(() => {
    const meta = (note.contentJson as Record<string, unknown> | undefined) || undefined
    setCurrentSummary((meta?._summary as string | null | undefined) ?? null)
    setActionItemFlows((meta?.actionItemFlows as unknown[] as NoteActionItemFlow[] | undefined) || [])
    setTranslations((meta?._translation as unknown[] as NoteTranslation[] | undefined) || [])
    setActionItemsModalOpen(false)
    setCurrentActionItems([])
    setActionItemsPanelOpen(false)
    lastMetaPersistSigRef.current = ''
  }, [note.id])

  // Collaboration state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)
  const [isYjsSynced, setIsYjsSynced] = useState(false)

  const contextUserId = ((userInfo as any)?.id as string | undefined) || null
  const contextUserName =
    ((userInfo as any)?.employeeDetails?.displayName as string | undefined) ||
    ((userInfo as any)?.userName as string | undefined) ||
    (userInfo?.givenName && userInfo?.familyName ? `${userInfo.givenName} ${userInfo.familyName}` : undefined) ||
    null

  // Versioning UI state
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showInlineCommentPopover, setShowInlineCommentPopover] = useState(false)
  const [inlineCommentPosition, setInlineCommentPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingSelection, setPendingSelection] = useState<{ from: number; to: number; text: string } | null>(null)

  // Task item context menu state - supports multiple positions for batch add
  const [taskContextMenu, setTaskContextMenu] = useState<{
    position: { top: number; left: number }
    taskItemPositions: number[] // Array of positions for multiple task items
    kanbanBoards: Array<{ id: string; data: KanbanData }>
  } | null>(null)

  // Yjs CRDT state
  const ydoc = React.useMemo(() => new Y.Doc(), [note.id])
  const awareness = React.useMemo(() => new Awareness(ydoc), [ydoc])
  const yjsProviderRef = useRef<SocketIoYjsProvider | null>(null)
  const scheduleSnapshotSaveRef = useRef<(editor: any) => void>(() => {})

  const collaborationExtension = React.useMemo(
    () => (note.id ? Collaboration.configure({ document: ydoc }) : null),
    [note.id, ydoc]
  )
  const yjsCursorExtension = React.useMemo(
    () => (note.id ? createYjsCursorExtension(awareness) : null),
    [note.id, awareness]
  )

  const onErrorCallback = useCallback((error: Error) => {
    console.error('[NoteEditor] Collaboration error:', error)
  }, [])

  // Get access token for GraphQL - must be before effects that use it
  const accessToken = accessTokenProp || ''
  const graphqlClient = useGraphQLClient(accessToken)

  // Fill missing avatar/name for older flows
  useActionItemAssigneeEnrichment({
    accessToken,
    flows: actionItemFlows,
    setFlows: next => setActionItemFlows(next)
  })

  const { isSyncing: isFlowStatusSyncing, syncNow: syncFlowStatuses } = useActionItemFlowStatusSync({
    accessToken,
    flows: actionItemFlows,
    onFlowsUpdated: next => setActionItemFlows(next)
  })

  // Collaboration hook
  const {
    participants: rawParticipants,
    isConnected: isCollaborationConnected,
    socket: collaborationSocket
  } = useCollaboration({
    entityType: 'note',
    entityId: note.id,
    enabled: !!note.id,
    accessToken,
    onError: onErrorCallback
  })

  // Enrich participants with avatars
  const [participants, setParticipants] = useState<typeof rawParticipants>([])

  // Versioning, Comments, Locking, Publishing hooks
  const versioning = useVersioning({
    entityId: note.id,
    entityType: 'note',
    apiService: NoteApiService,
    autoSaveEnabled: !!note.id && !isReadOnly,
    autoSaveInterval: 30000
  })

  const comments = useComments({
    entityId: note.id,
    entityType: 'note',
    apiService: NoteApiService
  })

  const fileLock = useFileLock({
    entityId: note.id,
    entityType: 'note',
    currentUserId: currentUserId || undefined,
    apiService: NoteApiService
  })

  const publishing = usePublishing({
    entityId: note.id,
    entityType: 'note',
    currentStatus: note.publishMetadata?.status || 'draft',
    apiService: NoteApiService
  })

  useEditorKeyboardIsolation(editorContainerRef)

  useEffect(() => {
    if (!rawParticipants.length) {
      setParticipants([])
      return
    }

    const fetchAvatars = async () => {
      // Get unique user IDs that don't have avatars yet
      const userIds = rawParticipants
        .filter(p => p.userId && !p.avatarUrl)
        .map(p => p.userId)
        .filter((id, idx, arr) => arr.indexOf(id) === idx)

      if (userIds.length === 0 || !graphqlClient) {
        setParticipants(rawParticipants)
        return
      }

      try {
        const query = `
          query GetEmployeeAvatars($userIds: [String!]!) {
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
          avatarUrl: p.avatarUrl || avatarMap.get(p.userId) || undefined
        }))
        setParticipants(enrichedParticipants)
      } catch (error) {
        console.error('[NoteEditor] Failed to fetch participant avatars:', error)
        setParticipants(rawParticipants)
      }
    }

    fetchAvatars()
  }, [rawParticipants, graphqlClient])

  // Initialize Yjs provider
  useEffect(() => {
    if (!note.id || !collaborationSocket) return

    const provider = new SocketIoYjsProvider({
      socket: collaborationSocket,
      documentId: note.id,
      entityType: 'note',
      ydoc,
      awareness,
      onSyncedChange: setIsYjsSynced,
      onBootstrapRequired: async (html: string) => {
        const start = Date.now()
        while (!editorRef.current && Date.now() - start < 5000) {
          await new Promise(resolve => setTimeout(resolve, 25))
        }
        const ed = editorRef.current
        if (!ed) throw new Error('Editor not ready for bootstrap')

        const wasEditable = ed.isEditable
        if (!wasEditable) ed.setEditable(true)

        ed.commands.setContent(html || '<p></p>', true)
        await new Promise(resolve => setTimeout(resolve, 100))
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
  }, [note.id, collaborationSocket, ydoc, awareness])

  // Set awareness state
  useEffect(() => {
    if (!note.id || !currentUserId || !isYjsSynced) return

    awareness.setLocalStateField('user', {
      id: currentUserId,
      userId: currentUserId,
      name: currentUserName || 'User',
      color: participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4',
      avatar: currentUserAvatar
    })
  }, [note.id, awareness, currentUserId, currentUserName, currentUserAvatar, participants, isYjsSynced])

  // Broadcast document activity to Spaces app
  useEffect(() => {
    if (!note.id || !currentUserId) return

    const activityType = isReadOnly ? 'viewing' : 'editing'
    const docTitle = title || note.title || t('title-untitled-note')
    const urlSpaceId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('spaceId') : null

    // Emit activity when starting
    emitDocumentActivity({
      userId: currentUserId,
      userName: currentUserName || 'User',
      userAvatar: currentUserAvatar,
      documentId: note.id,
      documentTitle: docTitle,
      documentType: 'note',
      activityType,
      spaceId: urlSpaceId || undefined
    })

    // Keep-alive: re-emit activity every 30 seconds
    const keepAliveInterval = setInterval(() => {
      emitDocumentActivity({
        userId: currentUserId,
        userName: currentUserName || 'User',
        userAvatar: currentUserAvatar,
        documentId: note.id,
        documentTitle: docTitle,
        documentType: 'note',
        activityType,
        spaceId: urlSpaceId || undefined
      })
    }, 30000)

    // Cleanup: emit activity end when leaving
    return () => {
      clearInterval(keepAliveInterval)
      emitDocumentActivityEnd(currentUserId, note.id)
    }
  }, [note.id, note.title, currentUserId, currentUserName, currentUserAvatar, isReadOnly, title])

  // Debounced snapshot save - works even without Yjs collaboration
  const scheduleSnapshotSave = useCallback(
    (currentEditor: any) => {
      if (!note.id || isReadOnly) return
      if (currentEditor !== editorRef.current) return

      const scheduledForNoteId = note.id
      setHasUnsavedChanges(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        if (noteIdRef.current !== scheduledForNoteId) return
        const html = currentEditor?.getHTML?.() || ''
        NoteApiService.updateNote(scheduledForNoteId, {
          title: titleRef.current,
          content: html,
          createVersion: false
        })
          .then(() => {
            if (noteIdRef.current === scheduledForNoteId) {
              setLastSaved(new Date())
              setHasUnsavedChanges(false)
              onContentSaved?.(scheduledForNoteId)
            }
          })
          .catch(error => {
            console.error('[NoteEditor] Snapshot save failed:', error)
          })
      }, 2000)
    },
    [note.id, isReadOnly, onContentSaved]
  )

  useEffect(() => {
    scheduleSnapshotSaveRef.current = scheduleSnapshotSave
  }, [scheduleSnapshotSave])

  // Get current user info including avatar
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // Prefer the platform-provided context userInfo (more reliable than decoding the JWT).
        if (contextUserId) {
          setCurrentUserId(contextUserId)
          setCurrentUserName(contextUserName)
        }

        const token = accessToken || null
        if (token) {
          const base64Url = token.split('.')[1]
          if (!base64Url) return
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
          const jsonPayload = decodeURIComponent(
            atob(padded)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
          const payload = JSON.parse(jsonPayload)
          const userId = payload.sub || payload.userId || null
          const userName = payload.name || payload.preferred_username || payload.username || null
          // Only use token-derived values if we didn't get them from userInfo.
          if (!contextUserId) {
            setCurrentUserId(userId)
            setCurrentUserName(userName)
          }

          // Fetch avatar from GraphQL if we have userId and graphqlClient
          const effectiveUserId = (contextUserId || userId) as string | null
          if (effectiveUserId && graphqlClient) {
            try {
              const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(effectiveUserId)
              const result = await graphqlClient.request<{
                Employee: Array<{ displayName: string; pictureThumbnail?: string }>
              }>(query)
              const emp = result.Employee?.[0]
              if (emp?.pictureThumbnail) {
                const avatarUrl = emp.pictureThumbnail.startsWith('data:')
                  ? emp.pictureThumbnail
                  : `data:image/png;base64,${emp.pictureThumbnail}`
                setCurrentUserAvatar(avatarUrl)
              }
              if (emp?.displayName) {
                setCurrentUserName(emp.displayName)
              }
            } catch {
              // Ignore - avatar is optional
            }
          }
        }
      } catch {}
    }

    loadUserInfo()
  }, [graphqlClient, accessToken, contextUserId, contextUserName])

  // Create mention suggestion with access token
  const mentionSuggestion = React.useMemo(() => {
    console.log('[NoteEditor] Creating mention suggestion with token:', accessToken ? 'present' : 'missing')
    return createMentionSuggestion(accessToken)
  }, [accessToken])

  const isCollaborationMode = Boolean(note.id)

  // Initialize TipTap editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          // Disable local history/undo-redo in collaboration mode (Yjs provides this).
          ...(isCollaborationMode ? { history: false, undoRedo: false } : {}),
          // Avoid duplicate names when Link/Underline are configured explicitly below.
          link: false,
          underline: false
        } as any),
        Placeholder.configure({
          placeholder: t('editor-placeholder')
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
          openOnClick: false
        }),
        Image,
        TaskList,
        LinkedTaskItem.configure({
          nested: true
        }),
        Typography,
        CharacterCount,
        InlineCommentExtension.configure({
          onCommentClick: commentId => {
            setShowComments(true)
            setTimeout(() => {
              const commentElement = document.querySelector(`[data-testid="comment-thread-${commentId}"]`)
              commentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 300)
          }
        }),
        Mention.extend({
          // Enable drag and drop for entity cards
          draggable: true,

          addAttributes() {
            return {
              id: {
                default: null,
                parseHTML: element => element.getAttribute('data-entity-id') || element.getAttribute('data-id'),
                renderHTML: attributes => ({ 'data-entity-id': attributes.id })
              },
              label: {
                default: null,
                parseHTML: element => element.getAttribute('data-entity-label') || element.getAttribute('data-label'),
                renderHTML: attributes => ({ 'data-entity-label': attributes.label })
              },
              type: {
                default: 'unknown',
                parseHTML: element =>
                  element.getAttribute('data-entity-type') || element.getAttribute('data-type') || 'unknown',
                renderHTML: attributes => ({ 'data-entity-type': attributes.type })
              },
              subtitle: {
                default: null,
                parseHTML: element => element.getAttribute('data-entity-subtitle'),
                renderHTML: attributes => (attributes.subtitle ? { 'data-entity-subtitle': attributes.subtitle } : {})
              },
              pictureThumbnail: {
                default: null,
                parseHTML: element => element.getAttribute('data-entity-thumbnail'),
                renderHTML: attributes =>
                  attributes.pictureThumbnail ? { 'data-entity-thumbnail': attributes.pictureThumbnail } : {}
              }
            }
          },
          parseHTML() {
            return [
              {
                tag: 'span[data-entity-id]',
                getAttrs: element => {
                  const el = element as HTMLElement
                  return {
                    id: el.getAttribute('data-entity-id'),
                    label: el.getAttribute('data-entity-label') || el.textContent?.replace('@', ''),
                    type: el.getAttribute('data-entity-type') || 'unknown',
                    subtitle: el.getAttribute('data-entity-subtitle'),
                    pictureThumbnail: el.getAttribute('data-entity-thumbnail')
                  }
                }
              },
              {
                tag: 'span[data-mention]',
                getAttrs: element => {
                  const el = element as HTMLElement
                  return {
                    id: el.getAttribute('data-entity-id') || el.getAttribute('data-id'),
                    label:
                      el.getAttribute('data-entity-label') ||
                      el.getAttribute('data-label') ||
                      el.textContent?.replace('@', ''),
                    type: el.getAttribute('data-entity-type') || el.getAttribute('data-type') || 'unknown',
                    subtitle: el.getAttribute('data-entity-subtitle'),
                    pictureThumbnail: el.getAttribute('data-entity-thumbnail')
                  }
                }
              }
            ]
          },
          renderHTML({ node, HTMLAttributes }) {
            return [
              'span',
              mergeAttributes(
                {
                  class: 'entity-mention-inline',
                  'data-entity-id': node.attrs.id,
                  'data-entity-type': node.attrs.type,
                  'data-entity-label': node.attrs.label,
                  'data-entity-subtitle': node.attrs.subtitle || '',
                  'data-entity-thumbnail': node.attrs.pictureThumbnail || '',
                  'data-mention': ''
                },
                HTMLAttributes
              ),
              `@${node.attrs.label || 'Entity'}`
            ]
          },
          addNodeView() {
            return ReactNodeViewRenderer(({ node }) => <MentionNodeView node={node} />)
          }
        }).configure({
          HTMLAttributes: {
            class: 'entity-mention'
          },
          suggestion: mentionSuggestion
        }),
        Drawing,
        Kanban,
        ...(collaborationExtension ? [collaborationExtension] : []),
        ...(yjsCursorExtension ? [yjsCursorExtension] : [])
      ],
      content: note.id ? '<p></p>' : note.content || '<p></p>', // Empty for synced notes (Yjs will populate)
      // Allow editing even if Yjs sync fails - user should be able to edit their own notes
      editable: !isReadOnly,
      onUpdate: () => {
        // For notes with Yjs sync, changes are auto-saved via the Yjs provider
        // Just mark as having unsaved changes for UI
        if (!isReadOnly) {
          setHasUnsavedChanges(true)
          versioning.markAsChanged()
        }
      }
    },
    [note.id, note.content, ydoc, isReadOnly, mentionSuggestion, isCollaborationMode]
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Task-Kanban sync hook
  const { addTaskToKanban, findKanbanBoards } = useTaskKanbanSync({
    editor,
    enabled: !isReadOnly && !!note.id
  })

  // Fetch shared users and combine with collaboration participants for Kanban
  const [kanbanParticipants, setKanbanParticipants] = useState<
    Array<{
      userId: string
      userName: string
      userAvatar?: string
      userColor?: string
    }>
  >([])
  const [kanbanParticipantsDebug, setKanbanParticipantsDebug] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error'
    noteId?: string
    hasOwnerId?: boolean
    hasCurrentUserId?: boolean
    sharedUsersCount?: number
    collaborationParticipantsCount?: number
    finalCount?: number
    lastError?: string
    updatedAt?: string
  }>({ status: 'idle' })

  useEffect(() => {
    if (!note.id) {
      setKanbanParticipants([])
      setKanbanParticipantsDebug({
        status: 'idle',
        noteId: note.id,
        hasOwnerId: Boolean(note.ownerId),
        hasCurrentUserId: Boolean(currentUserId || contextUserId),
        collaborationParticipantsCount: participants.length,
        updatedAt: new Date().toISOString()
      })
      return
    }

    const fetchKanbanParticipants = async () => {
      try {
        const effectiveCurrentUserId = currentUserId || contextUserId
        const effectiveCurrentUserName = currentUserName || contextUserName
        setKanbanParticipantsDebug({
          status: 'loading',
          noteId: note.id,
          hasOwnerId: Boolean(note.ownerId),
          hasCurrentUserId: Boolean(effectiveCurrentUserId),
          collaborationParticipantsCount: participants.length,
          updatedAt: new Date().toISOString()
        })

        // Fetch shared users
        const sharedUsers = await NoteApiService.getSharedUsers(note.id)

        // Get all unique user IDs (owner + shared users + collaboration participants)
        const userIds = new Set<string>()
        if (effectiveCurrentUserId) userIds.add(effectiveCurrentUserId)
        if (note.ownerId) userIds.add(note.ownerId)
        sharedUsers.forEach(s => userIds.add(s.userId))
        participants.forEach(p => userIds.add(p.userId))

        // Always include at least the owner if we have one
        if (userIds.size === 0 && note.ownerId) {
          userIds.add(note.ownerId)
        }
        // Always include at least the current user if we have one (shared-users lookup may fail silently).
        if (userIds.size === 0 && effectiveCurrentUserId) {
          userIds.add(effectiveCurrentUserId)
        }

        if (userIds.size === 0) {
          setKanbanParticipants([])
          setKanbanParticipantsDebug({
            status: 'ready',
            noteId: note.id,
            hasOwnerId: Boolean(note.ownerId),
            hasCurrentUserId: Boolean(effectiveCurrentUserId),
            sharedUsersCount: sharedUsers.length,
            collaborationParticipantsCount: participants.length,
            finalCount: 0,
            updatedAt: new Date().toISOString()
          })
          return
        }

        const userMap = new Map<
          string,
          {
            userId: string
            userName: string
            userAvatar?: string
            userColor?: string
          }
        >()

        // Add current user from token as immediate fallback (helps shared notes and empty GraphQL).
        if (effectiveCurrentUserId) {
          userMap.set(effectiveCurrentUserId, {
            userId: effectiveCurrentUserId,
            userName: effectiveCurrentUserName || `User ${effectiveCurrentUserId.slice(0, 8)}`,
            userAvatar: currentUserAvatar || undefined
          })
        }

        // Fetch user info if we have GraphQL client
        if (accessToken && graphqlClient) {
          const query = `
            query GetEmployeeInfo($userIds: [String!]!) {
              Employee(where: {userId: {_in: $userIds}}) {
                userId
                displayName
                firstName
                lastName
                pictureThumbnail
              }
            }
          `
          const result = await graphqlClient.request<{
            Employee: Array<{
              userId: string
              displayName?: string
              firstName?: string
              lastName?: string
              pictureThumbnail?: string | null
            }>
          }>(query, { userIds: Array.from(userIds) })

          // Add owner
          if (note.ownerId) {
            const owner = result.Employee?.find(e => e.userId === note.ownerId)
            if (owner) {
              const displayName =
                owner.displayName ||
                `${owner.firstName || ''} ${owner.lastName || ''}`.trim() ||
                `User ${owner.userId.slice(0, 8)}`
              const avatarUrl = owner.pictureThumbnail
                ? owner.pictureThumbnail.startsWith('data:')
                  ? owner.pictureThumbnail
                  : `data:image/png;base64,${owner.pictureThumbnail}`
                : undefined
              userMap.set(note.ownerId, {
                userId: note.ownerId,
                userName: displayName,
                userAvatar: avatarUrl
              })
            } else {
              // Owner not found in Employee table, add with fallback name
              userMap.set(note.ownerId, {
                userId: note.ownerId,
                userName: `User ${note.ownerId.slice(0, 8)}`
              })
            }
          }

          // Add shared users
          sharedUsers.forEach(share => {
            if (!userMap.has(share.userId)) {
              const emp = result.Employee?.find(e => e.userId === share.userId)
              const displayName =
                emp?.displayName ||
                share.userName ||
                `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() ||
                `User ${share.userId.slice(0, 8)}`
              const avatarUrl = emp?.pictureThumbnail
                ? emp.pictureThumbnail.startsWith('data:')
                  ? emp.pictureThumbnail
                  : `data:image/png;base64,${emp.pictureThumbnail}`
                : share.userAvatar
              userMap.set(share.userId, {
                userId: share.userId,
                userName: displayName,
                userAvatar: avatarUrl
              })
            }
          })
        } else {
          // No GraphQL client, use basic info from shared users
          if (note.ownerId) {
            userMap.set(note.ownerId, {
              userId: note.ownerId,
              userName: `User ${note.ownerId.slice(0, 8)}`
            })
          }
          sharedUsers.forEach(share => {
            if (!userMap.has(share.userId)) {
              userMap.set(share.userId, {
                userId: share.userId,
                userName: share.userName || `User ${share.userId.slice(0, 8)}`,
                userAvatar: share.userAvatar
              })
            }
          })
        }

        // Add collaboration participants (may override with their colors and better names)
        participants.forEach(p => {
          const existing = userMap.get(p.userId)
          userMap.set(p.userId, {
            userId: p.userId,
            userName: p.name || existing?.userName || p.userId,
            userAvatar: p.avatarUrl || existing?.userAvatar,
            userColor: p.color
          })
        })

        const finalParticipants = Array.from(userMap.values())
        setKanbanParticipants(finalParticipants)
        setKanbanParticipantsDebug({
          status: 'ready',
          noteId: note.id,
          hasOwnerId: Boolean(note.ownerId),
          hasCurrentUserId: Boolean(effectiveCurrentUserId),
          sharedUsersCount: sharedUsers.length,
          collaborationParticipantsCount: participants.length,
          finalCount: finalParticipants.length,
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('[NoteEditor] Failed to fetch kanban participants:', error)
        // Fallback: include owner and collaboration participants
        const fallback: Array<{
          userId: string
          userName: string
          userAvatar?: string
          userColor?: string
        }> = []

        const effectiveCurrentUserId = currentUserId || contextUserId
        const effectiveCurrentUserName = currentUserName || contextUserName
        if (effectiveCurrentUserId) {
          fallback.push({
            userId: effectiveCurrentUserId,
            userName: effectiveCurrentUserName || `User ${effectiveCurrentUserId.slice(0, 8)}`,
            userAvatar: currentUserAvatar || undefined
          })
        }

        if (note.ownerId) {
          if (!fallback.find(f => f.userId === note.ownerId)) {
            fallback.push({
              userId: note.ownerId,
              userName: `User ${note.ownerId.slice(0, 8)}`
            })
          }
        }

        participants.forEach(p => {
          if (!fallback.find(f => f.userId === p.userId)) {
            fallback.push({
              userId: p.userId,
              userName: p.name || p.userId,
              userAvatar: p.avatarUrl,
              userColor: p.color
            })
          }
        })

        setKanbanParticipants(fallback)
        setKanbanParticipantsDebug({
          status: 'error',
          noteId: note.id,
          hasOwnerId: Boolean(note.ownerId),
          hasCurrentUserId: Boolean(currentUserId || contextUserId),
          collaborationParticipantsCount: participants.length,
          finalCount: fallback.length,
          lastError: error instanceof Error ? error.message : t('editor-error-unknown'),
          updatedAt: new Date().toISOString()
        })
      }
    }

    fetchKanbanParticipants()
  }, [
    note.id,
    note.ownerId,
    accessToken,
    graphqlClient,
    participants,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    contextUserId,
    contextUserName,
    t
  ])

  // Sync participants to Kanban extension storage
  useEffect(() => {
    if (!editor) return
    const kanbanExt = editor.extensionManager.extensions.find((ext: { name: string }) => ext.name === 'kanban')
    if (kanbanExt?.storage) {
      kanbanExt.storage.participants = kanbanParticipants
      ;(kanbanExt.storage as any).participantsDebug = kanbanParticipantsDebug
    }
    // Also write to editor.storage (NodeView reads from extension.storage, but this keeps TipTap storage in sync too).
    const anyEditor = editor as unknown as { storage?: Record<string, any> }
    if (anyEditor?.storage?.kanban) {
      anyEditor.storage.kanban.participants = kanbanParticipants
      ;(anyEditor.storage.kanban as any).participantsDebug = kanbanParticipantsDebug
    }
  }, [editor, kanbanParticipants, kanbanParticipantsDebug])

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

  // Update editable state - allow editing even if Yjs sync fails
  useEffect(() => {
    if (!editor) return
    const shouldBeEditable = !isReadOnly
    if (editor.isEditable !== shouldBeEditable) {
      editor.setEditable(shouldBeEditable)
    }
  }, [editor, isReadOnly])

  const flushSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }
    const id = noteIdRef.current
    const currentTitle = titleRef.current
    const html = editorRef.current?.getHTML?.()
    if (!id || isReadOnly || !html) return
    NoteApiService.updateNote(id, { title: currentTitle, content: html, createVersion: false }).catch(() => {})
  }, [isReadOnly])

  const handleBack = useCallback(() => {
    void flushSave()
    onBack()
  }, [flushSave, onBack])

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      const id = noteIdRef.current
      const currentTitle = titleRef.current
      const html = editorRef.current?.getHTML?.()
      if (id && !isReadOnly && html) {
        NoteApiService.updateNote(id, { title: currentTitle, content: html, createVersion: false }).catch(() => {})
      }
    }
  }, [])

  // Handle title change with auto-save
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setTitle(newTitle)
      setHasUnsavedChanges(true)

      // Debounced auto-save for title
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      const targetNoteId = note.id
      autoSaveTimeoutRef.current = setTimeout(async () => {
        if (isReadOnly || noteIdRef.current !== targetNoteId) return

        const html = editor?.getHTML() || note.content || ''

        if (targetNoteId) {
          try {
            await NoteApiService.updateNote(targetNoteId, {
              title: newTitle,
              content: html,
              createVersion: false
            })
            if (noteIdRef.current === targetNoteId) {
              setLastSaved(new Date())
              setHasUnsavedChanges(false)
            }
            onTitleChanged?.(targetNoteId, newTitle)
          } catch (error) {
            console.error('[NoteEditor] Title auto-save failed:', error)
          }
        }
      }, 1500)
    },
    [editor, note.id, note.content, isReadOnly, onTitleChanged]
  )

  // Handle title keydown - Enter moves to editor
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (editor) {
          editor.commands.focus('start')
        } else {
          const editorElement = document.querySelector('.ProseMirror') as HTMLElement
          editorElement?.focus()
        }
      }
    },
    [editor]
  )

  const getPlainTextForTransform = useCallback((): string => {
    if (editor) {
      return (editor.getText() || '').trim()
    }
    return ((note.content || '') as string)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [editor, note.content])

  const persistMeta = useCallback(
    async (nextSummary: string | null, nextFlows: NoteActionItemFlow[], nextTranslations: NoteTranslation[]) => {
      const base = ((note.contentJson as Record<string, unknown> | undefined) || {}) as Record<string, unknown>
      const next: Record<string, unknown> = { ...base }

      if (nextSummary && nextSummary.trim().length > 0) {
        next._summary = nextSummary
      } else {
        delete next._summary
      }

      if (nextFlows.length > 0) {
        next.actionItemFlows = nextFlows
      } else {
        delete next.actionItemFlows
      }

      if (nextTranslations.length > 0) {
        next._translation = nextTranslations
      } else {
        delete next._translation
      }

      const sig = `${note.id}::${next._summary ? String(next._summary).slice(0, 80) : ''}::${nextFlows
        .map(f => `${f.workflowId}:${f.status}:${f.completedAt || ''}:${f.assigneeAvatarUrl || ''}`)
        .join('|')}::${nextTranslations.map(t => `${t.id}:${t.targetLanguage}`).join('|')}`
      if (sig === lastMetaPersistSigRef.current) return

      lastMetaPersistSigRef.current = sig
      await NoteApiService.updateNote(note.id, { contentJson: next })
    },
    [note.contentJson, note.id]
  )

  const queuePersistMeta = useCallback(
    (nextSummary: string | null, nextFlows: NoteActionItemFlow[], nextTranslations: NoteTranslation[]) => {
      if (metaPersistTimerRef.current) clearTimeout(metaPersistTimerRef.current)
      metaPersistTimerRef.current = setTimeout(() => {
        void persistMeta(nextSummary, nextFlows, nextTranslations)
      }, 800)
    },
    [persistMeta]
  )

  useEffect(() => {
    return () => {
      if (metaPersistTimerRef.current) clearTimeout(metaPersistTimerRef.current)
    }
  }, [])

  // Persist metadata when it changes (debounced)
  useEffect(() => {
    queuePersistMeta(currentSummary, actionItemFlows, translations)
  }, [queuePersistMeta, currentSummary, actionItemFlows, translations])

  // Sync flow statuses once on open (no background polling)
  useEffect(() => {
    void syncFlowStatuses()
  }, [note.id, syncFlowStatuses])

  const handleTextTransform = useCallback(
    async (type: TransformType, options?: { targetLanguage?: TranslationLanguage }) => {
      if (!accessToken) {
        toast.error(t('editor-toast-not-authenticated'))
        return
      }

      const text = getPlainTextForTransform()
      if (!text) {
        toast.error(t('editor-toast-no-text'))
        return
      }

      setIsTransforming(true)
      try {
        const service = new TextTransformService(accessToken)
        const result = await service.transform(type, text, { ...options, translate: t })
        if (!result.success) {
          toast.error(result.error || t('editor-toast-transform-failed'))
          return
        }

        switch (type) {
          case 'copy-text':
            await navigator.clipboard.writeText(result.transformedContent)
            toast.success(t('editor-toast-copied'))
            break
          case 'to-text':
            // For typed notes, this just copies a plain-text version
            await navigator.clipboard.writeText(result.transformedContent)
            toast.success(t('editor-toast-plain-text-copied'))
            break
          case 'create-text-note':
            await navigator.clipboard.writeText(result.transformedContent)
            toast.success(t('editor-toast-copied-create-manually'))
            break
          case 'summarize':
            setCurrentSummary(result.transformedContent)
            void persistMeta(result.transformedContent, actionItemFlows, translations)
            toast.success(t('editor-toast-summary-generated'))
            break
          case 'translate':
            setTranslations(prev => {
              const targetLang = options?.targetLanguage || 'en'
              const targetLanguageName = t(`translation-language-${targetLang}`)
              const entry: NoteTranslation = {
                id: `tr_${Date.now()}`,
                targetLanguage: targetLang,
                targetLanguageName,
                text: result.transformedContent,
                createdAt: new Date().toISOString()
              }
              const next = [entry, ...prev]
              void persistMeta(currentSummary, actionItemFlows, next)
              return next
            })
            toast.success(t('editor-toast-translation-created'))
            break
          case 'action-items':
            if (result.actionItems && result.actionItems.length > 0) {
              setCurrentActionItems(result.actionItems)
              setActionItemsModalOpen(true)
              toast.success(t('editor-toast-action-items-found', { count: result.actionItems.length }))
            } else {
              toast.success(t('editor-toast-no-action-items'))
            }
            break
          default:
            setCurrentSummary(result.transformedContent)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('editor-toast-transform-failed'))
      } finally {
        setIsTransforming(false)
      }
    },
    [accessToken, actionItemFlows, currentSummary, getPlainTextForTransform, persistMeta, t, translations]
  )

  const handleDeleteTranslation = useCallback(
    (id: string) => {
      setTranslations(prev => {
        const next = prev.filter(t => t.id !== id)
        void persistMeta(currentSummary, actionItemFlows, next)
        return next
      })
      toast.success(t('editor-toast-translation-deleted'))
    },
    [actionItemFlows, currentSummary, persistMeta]
  )

  const handleFlowsCreated = useCallback((created: NoteActionItemFlow[]) => {
    setActionItemFlows(prev => {
      const existing = new Set(prev.map(f => f.workflowId))
      return [...prev, ...created.filter(f => !existing.has(f.workflowId))]
    })
    setActionItemsPanelOpen(true)
  }, [])

  // Save
  const handleSave = useCallback(async () => {
    if (isReadOnly || isSaving || !editor) return

    setIsSaving(true)
    try {
      const content = editor.getHTML()
      await onSave(title, content)
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('[NoteEditor] Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [title, editor, onSave, isReadOnly, isSaving])

  /**
   * Handle stroke completion from hybrid canvas (Apple Pencil handwriting)
   * GoodNotes/Apple Notes approach: Store only vector data, generate PNG temporarily for OCR
   */
  const handleStrokeComplete = useCallback(
    async (
      svgData: string,
      strokeData: { points: Array<{ x: number; y: number; pressure: number }>; color?: string; width?: number },
      bounds: { x: number; y: number; width: number; height: number }
    ) => {
      if (!editor) return

      const drawingId = `drawing-${Date.now()}`

      // Insert drawing inline at current position (vector only, no PNG!)
      editor.commands.insertDrawing({
        id: drawingId,
        svgData,
        pngDataUrl: '', // No longer needed - SVG is all we need
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        strokeCount: strokeData.points.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      setHasUnsavedChanges(true)

      // Send to backend for OCR processing (GoodNotes approach)
      // Backend will generate PNG temporarily from SVG, extract text, discard PNG
      try {
        const drawingService = new DrawingApiService(accessToken)
        await drawingService.createDrawing({
          entityType: 'note',
          entityId: note.id,
          svgData, // Vector format only
          strokeData, // Raw points for future editing
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          strokeCount: strokeData.points.length,
          metadata: {
            drawingId,
            createdInEditor: true
          }
        })
        console.log('[NoteEditor] Drawing (vector only) sent to backend for OCR processing')
      } catch (error) {
        console.error('[NoteEditor] Failed to send drawing to backend:', error)
        // Don't fail the UI - drawing is still saved in the note content
      }
    },
    [editor, note.id, accessToken]
  )

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

  // Context menu for inline comments and task items
  useEffect(() => {
    if (!editor) return

    const handleContextMenu = (e: Event) => {
      const mouseEvent = e as unknown as MouseEvent
      const target = mouseEvent.target as HTMLElement

      // Check if right-clicked on a task item
      const taskItemElement = target.closest('li[data-type="taskItem"]') as HTMLElement | null
      if (taskItemElement) {
        mouseEvent.preventDefault()

        // Collect task items to add - check if there's a selection spanning multiple items
        const { from, to } = editor.state.selection
        const taskItemPositionsSet = new Set<number>()

        // Build a set of valid kanban IDs in this document
        const validKanbanIds = new Set<string>()
        editor.state.doc.descendants(node => {
          if (node.type.name === 'kanban' && node.attrs.id) {
            validKanbanIds.add(node.attrs.id)
          }
        })

        // If there's a selection, find all task items within it
        if (from !== to) {
          editor.state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'taskItem') {
              // Include if: no kanban link, OR kanban link is orphaned (kanban doesn't exist in doc)
              const hasValidKanbanLink =
                node.attrs.kanbanCardId && node.attrs.kanbanId && validKanbanIds.has(node.attrs.kanbanId)
              if (!hasValidKanbanLink) {
                taskItemPositionsSet.add(pos)
              }
            }
          })
        }

        const taskItemPositions = Array.from(taskItemPositionsSet)

        // If no selection or no task items in selection, use the clicked item
        if (taskItemPositions.length === 0) {
          // Try to get position from data attribute (set by LinkedTaskItemView)
          const nodePosAttr = taskItemElement.getAttribute('data-node-pos')
          let resolvedPos = nodePosAttr ? parseInt(nodePosAttr, 10) : -1

          // Fallback: try to find position from DOM
          if (resolvedPos < 0 || isNaN(resolvedPos)) {
            const editorView = editor.view
            const pos = editorView.posAtDOM(taskItemElement, 0)

            // posAtDOM returns position inside the node, we need to find the actual taskItem node
            const node = editor.state.doc.nodeAt(pos)

            // If we're inside the content, resolve to find the parent taskItem
            if (!node || node.type.name !== 'taskItem') {
              const $pos = editor.state.doc.resolve(pos)
              // Walk up the tree to find taskItem
              for (let d = $pos.depth; d >= 0; d--) {
                const parentNode = $pos.node(d)
                if (parentNode.type.name === 'taskItem') {
                  resolvedPos = $pos.before(d)
                  break
                }
              }
            } else {
              resolvedPos = pos
            }
          }

          const node = editor.state.doc.nodeAt(resolvedPos)

          // Verify we found a valid taskItem
          if (!node || node.type.name !== 'taskItem') {
            console.debug('[NoteEditor] Could not find taskItem node at pos:', resolvedPos)
            return
          }

          // Check if task is already linked to a VALID kanban in this document
          const hasValidKanbanLink =
            node.attrs.kanbanCardId && node.attrs.kanbanId && validKanbanIds.has(node.attrs.kanbanId)
          if (hasValidKanbanLink) {
            console.debug('[NoteEditor] Task already linked to valid Kanban')
            return
          }

          taskItemPositions.push(resolvedPos)
        }

        console.debug('[NoteEditor] Task context menu:', {
          taskItemCount: taskItemPositions.length,
          positions: taskItemPositions
        })

        // Find available Kanban boards (may be empty - we'll offer to create one)
        const boards = findKanbanBoards()

        // Show the task context menu (even if no boards - will offer to create one)
        setTaskContextMenu({
          position: {
            top: mouseEvent.clientY,
            left: mouseEvent.clientX
          },
          taskItemPositions,
          kanbanBoards: boards
        })
        return
      }

      // Default behavior: inline comment for text selection
      const { from, to } = editor.state.selection
      if (from === to) return // No selection

      mouseEvent.preventDefault()
      handleAddInlineComment()
    }

    const editorElement = document.querySelector('.note-editor-content .ProseMirror')
    if (editorElement) {
      editorElement.addEventListener('contextmenu', handleContextMenu)
      return () => editorElement.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [editor, handleAddInlineComment, findKanbanBoards])

  // Handler for adding task(s) to Kanban - supports multiple items
  const handleAddTaskToKanban = useCallback(
    (kanbanId: string, columnId: string = 'todo') => {
      if (!taskContextMenu) return

      const positions = taskContextMenu.taskItemPositions
      const addedCards: string[] = []

      // Add each task item to Kanban (in reverse order to maintain positions after edits)
      for (const pos of [...positions].reverse()) {
        const cardId = addTaskToKanban(pos, kanbanId, columnId)
        if (cardId) {
          addedCards.push(cardId)
        }
      }

      console.debug('[NoteEditor] Tasks linked to Kanban:', {
        count: addedCards.length,
        kanbanId,
        columnId,
        cardIds: addedCards
      })

      setTaskContextMenu(null)
    },
    [taskContextMenu, addTaskToKanban]
  )

  // Handler for creating a new Kanban and adding selected tasks
  const handleCreateKanbanWithTasks = useCallback(() => {
    if (!taskContextMenu || !editor) return

    // Capture the text content of selected task items to find them after kanban insertion
    // (positions become invalid after inserting the kanban)
    const taskContents: string[] = []
    for (const pos of taskContextMenu.taskItemPositions) {
      const node = editor.state.doc.nodeAt(pos)
      if (node?.type.name === 'taskItem') {
        taskContents.push(node.textContent)
      }
    }

    const kanbanId = `kanban-${Date.now()}`

    // First, create the Kanban board
    const inserted = editor.chain().focus().insertKanban({ id: kanbanId }).run()

    if (!inserted) {
      console.error('[NoteEditor] Failed to create Kanban')
      setTaskContextMenu(null)
      return
    }

    // Wait a tick for the Kanban to be inserted, then find and add tasks
    setTimeout(() => {
      const addedCards: string[] = []
      const addedContents = new Set<string>()

      // Build set of valid kanban IDs to check for orphaned links
      const validKanbanIds = new Set<string>()
      editor.state.doc.descendants(node => {
        if (node.type.name === 'kanban' && node.attrs.id) {
          validKanbanIds.add(node.attrs.id)
        }
      })

      // Find task items by their content (positions have shifted after kanban insertion)
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'taskItem') {
          const content = node.textContent
          // Check if this content matches one of our selected tasks
          if (taskContents.includes(content) && !addedContents.has(content)) {
            // Only add if not already linked to a valid kanban
            const hasValidKanbanLink =
              node.attrs.kanbanCardId && node.attrs.kanbanId && validKanbanIds.has(node.attrs.kanbanId)
            if (!hasValidKanbanLink) {
              const cardId = addTaskToKanban(pos, kanbanId, 'todo')
              if (cardId) {
                addedCards.push(cardId)
                addedContents.add(content) // Prevent duplicates
              }
            }
          }
        }
      })

      console.debug('[NoteEditor] Created Kanban and linked tasks:', {
        kanbanId,
        count: addedCards.length,
        cardIds: addedCards
      })
    }, 100)

    setTaskContextMenu(null)
  }, [taskContextMenu, editor, addTaskToKanban])

  // Color change handler
  const handleColorChange = useCallback(
    (color: NoteColor) => {
      setNoteColor(color)
      onColorChange?.(color)
    },
    [onColorChange]
  )

  // Format last saved
  const formatLastSaved = (date: Date | null): string => {
    if (!date) return t('editor-not-saved')
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return t('editor-saved-just-now')
    if (diffMinutes === 1) return t('editor-saved-1-min')
    if (diffMinutes < 60) return t('editor-saved-mins', { count: diffMinutes })
    return t('editor-saved-at', { time: date.toLocaleTimeString() })
  }

  // Word count
  const wordCount = editor?.storage.characterCount?.words() || 0
  const charCount = editor?.storage.characterCount?.characters() || 0

  // Get background color class based on note color
  const bgColorClass = noteColors.find(c => c.value === noteColor)?.class || 'gba:bg-card'

  return (
    <div className={`gba:flex gba:flex-col gba:h-full ${bgColorClass}`} data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:border-sidebar-border/40 gba:bg-sidebar gba:sticky gba:top-0 gba:z-10">
        <div className="gba:px-4 gba:py-1.5">
          <div className="gba:flex gba:items-center gba:justify-between">
            {/* Left side */}
            <div className="gba:flex gba:items-center gba:gap-2">
              {isSidebarCollapsed && onToggleSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-8 gba:w-8"
                  onClick={onToggleSidebar}
                  data-testid="editor-expand-sidebar"
                >
                  <PanelLeft className="gba:w-4 gba:h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-foreground"
              >
                <ArrowLeft className="gba:w-4 gba:h-4" />
                {t('editor-back')}
              </Button>

              <span className="gba:text-xs gba:text-muted-foreground/60 gba:hidden gba:sm:inline-flex gba:items-center gba:gap-1.5">
                {isSaving ? (
                  <>
                    <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
                    {t('editor-saving')}
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Clock className="gba:w-3 gba:h-3" />
                    {t('editor-unsaved')}
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
                    {formatLastSaved(lastSaved)}
                  </>
                ) : null}
                <span className="gba:mx-0.5">·</span>
                {t('editor-word-count', { count: wordCount })}
              </span>
            </div>

            {/* Right side - Actions */}
            <div className="gba:flex gba:items-center gba:gap-0.5">
              {/* Active collaborators */}
              {participants.length > 0 && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:mr-1.5 gba:pr-1.5 gba:border-r gba:border-sidebar-border/40">
                  <PresenceIndicator participants={participants} maxVisible={4} size="sm" showLabel={false} />
                  <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:hidden gba:md:inline">
                    {t('editor-active-collaborators', { count: participants.length })}
                  </span>
                </div>
              )}

              {/* Icon actions group */}
              <TooltipProvider delayDuration={300}>
                {/* Color picker */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
                        >
                          <Palette className="gba:w-3.5 gba:h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-change-color')}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <div className="gba:grid gba:grid-cols-5 gba:gap-1 gba:p-2">
                      {noteColors.map(color => (
                        <button
                          key={color.value}
                          className={`gba:w-6 gba:h-6 gba:rounded-full gba:border-2 gba:transition-transform hover:gba:scale-110 ${
                            noteColor === color.value ? 'gba:border-primary gba:scale-110' : 'gba:border-transparent'
                          } ${color.class}`}
                          onClick={() => handleColorChange(color.value)}
                          title={t(`editor-color-${color.value}`)}
                        />
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Share */}
                {onShare && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
                        onClick={onShare}
                      >
                        <Share2 className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-share-tooltip')}</TooltipContent>
                  </Tooltip>
                )}

                {/* Pin */}
                {onTogglePin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`gba:h-7 gba:w-7 ${note.isPinned ? 'gba:text-primary' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                        onClick={onTogglePin}
                      >
                        <Pin className={`gba:w-3.5 gba:h-3.5 ${note.isPinned ? 'gba:fill-current' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {note.isPinned ? t('editor-unpin-tooltip') : t('editor-pin-tooltip')}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Comments */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowComments(!showComments)}
                      data-testid="note-comments-button"
                      className={`gba:h-7 gba:w-7 gba:relative ${showComments ? 'gba:text-primary' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                    >
                      <MessageSquare className="gba:w-3.5 gba:h-3.5" />
                      {comments.unresolvedCount > 0 && (
                        <span className="gba:absolute gba:-top-0.5 gba:-right-0.5 gba:w-3.5 gba:h-3.5 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:text-[9px] gba:flex gba:items-center gba:justify-center gba:font-medium">
                          {comments.unresolvedCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('editor-comments-tooltip')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Divider */}
              <div className="gba:w-px gba:h-4 gba:bg-sidebar-border/40 gba:mx-1" />

              {/* Action items (mobile only) */}
              {actionItemFlows.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActionItemsPanelOpen(true)}
                  className="gba:gap-1.5 gba:h-7 gba:text-xs gba:text-muted-foreground hover:gba:text-foreground gba:lg:hidden"
                  data-testid={`${testId}-action-items-open`}
                >
                  <ListTodo className="gba:w-3.5 gba:h-3.5" />
                  {actionItemFlows.length}
                </Button>
              )}

              {/* Note actions overflow menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-7 gba:px-2 gba:text-xs gba:text-muted-foreground hover:gba:text-foreground gba:gap-1"
                  >
                    <FileText className="gba:w-3.5 gba:h-3.5" />
                    <span className="gba:hidden gba:sm:inline">{t('editor-note-menu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="gba:w-48">
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
                      <UnlockIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('editor-unlock-note')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => fileLock.acquireLock()}>
                      <LockIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('editor-lock-note')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPublishDialog(true)}>
                    <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-publish')}
                  </DropdownMenuItem>
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('editor-duplicate')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export')}
                  </DropdownMenuItem>
                  {onArchive && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onArchive}>
                        <Archive className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('editor-archive')}
                      </DropdownMenuItem>
                    </>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="gba:text-destructive">
                      <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('editor-delete')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Transform (AI) */}
              {!isReadOnly && (
                <TransformMenu
                  onTransform={handleTextTransform}
                  isProcessing={isTransforming}
                  disabled={!editor}
                  mode="text"
                  compact
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="gba:flex-1 gba:flex gba:overflow-hidden">
        <div className="gba:flex-1 gba:overflow-auto gba:relative">
          {/* Formatting Toolbar -- sticky inside scroll area for frosted glass blur */}
          {editor && !isReadOnly && (
            <div className="gba:sticky gba:top-0 gba:z-[9] gba:bg-sidebar/70 gba:backdrop-blur-md gba:backdrop-saturate-125 gba:px-6 gba:py-1.5 gba:border-b gba:border-sidebar-border/10">
              <div className="gba:max-w-3xl gba:lg:max-w-[48rem] gba:mx-auto gba:flex gba:items-center gba:gap-1 gba:flex-wrap">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                      >
                        <Bold className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-bold')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                      >
                        <Italic className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-italic')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                      >
                        <UnderlineIcon className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-underline')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                      >
                        <Strikethrough className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-strikethrough')}</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="gba:h-4 gba:mx-0.5" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      >
                        <Heading1 className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-heading-1')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      >
                        <Heading2 className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-heading-2')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      >
                        <Heading3 className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-heading-3')}</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="gba:h-4 gba:mx-0.5" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                      >
                        <List className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-bullet-list')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      >
                        <ListOrdered className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-numbered-list')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('taskList') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                      >
                        <CheckSquare className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-task-list')}</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="gba:h-4 gba:mx-0.5" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      >
                        <Quote className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-quote')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                      >
                        <Code className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-code-block')}</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="gba:h-4 gba:mx-0.5" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => {
                          editor?.chain().focus().insertContent('@').run()
                        }}
                      >
                        <AtSign className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-mention')}</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="gba:h-4 gba:mx-0.5" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-7 gba:w-7"
                        onClick={() => {
                          if (!editor || !isYjsSynced) return
                          const kanbanId = `kanban-${Date.now()}`
                          editor.chain().focus().insertKanban({ id: kanbanId }).run()
                        }}
                        data-testid="note-editor-insert-kanban"
                        disabled={!isYjsSynced}
                      >
                        <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('editor-format-insert-kanban')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          <div className="gba:max-w-3xl gba:lg:max-w-[48rem] gba:mx-auto gba:px-6 gba:sm:px-8 gba:md:px-12 gba:py-8 gba:md:py-12">
            {/* Title */}
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder={t('editor-title-placeholder')}
              disabled={isReadOnly}
              className="gba:w-full gba:text-3xl gba:md:text-4xl gba:font-display gba:font-semibold gba:tracking-tight gba:bg-transparent gba:border-0 gba:outline-none gba:mb-6 gba:text-foreground placeholder:gba:text-muted-foreground/30"
              data-testid="note-editor-title-input"
            />

            {/* Summary (below title) */}
            {currentSummary && (
              <div className="gba:mb-6">
                <SummaryPanel
                  summary={currentSummary}
                  onDismiss={() => {
                    setCurrentSummary(null)
                    void persistMeta(null, actionItemFlows, translations)
                  }}
                  data-testid={`${testId}-summary-panel`}
                />
              </div>
            )}

            {/* Translations (history) */}
            {translations.length > 0 && (
              <div className="gba:mb-6 gba:space-y-3" data-testid={`${testId}-translations`}>
                {translations.map(t => (
                  <TranslationPanel
                    key={t.id}
                    translation={t}
                    onDelete={handleDeleteTranslation}
                    data-testid={`${testId}-translation-${t.id}`}
                  />
                ))}
              </div>
            )}

            {/* Tags area */}
            {note.tags && note.tags.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-6">
                {note.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Editor content with hybrid canvas overlay for Apple Pencil */}
            <div ref={editorContainerRef} className="gba:relative">
              <EditorContent editor={editor} className="note-editor-content" />

              {/* Hybrid Canvas - Automatically captures Apple Pencil input */}
              {editor && !isReadOnly && (
                <HybridEditorCanvas
                  editorRef={editorContainerRef}
                  onStrokeComplete={handleStrokeComplete}
                  disabled={isReadOnly}
                  className="gba:z-10"
                />
              )}
            </div>
          </div>
        </div>

        {/* Action Items Sidebar (desktop) - only after tasks exist */}
        {actionItemFlows.length > 0 && (
          <div className="gba:hidden gba:lg:block gba:w-80 gba:border-l gba:border-border gba:bg-card gba:overflow-y-auto gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <div className="gba:text-sm gba:font-semibold gba:text-foreground">{t('handwriting-action-items')}</div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:text-xs gba:text-muted-foreground">{actionItemFlows.length}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void syncFlowStatuses()}
                  disabled={isFlowStatusSyncing}
                  className="gba:h-7 gba:w-7 gba:p-0"
                  data-testid={`${testId}-action-items-refresh`}
                >
                  <RefreshCw className={`gba:w-4 gba:h-4 ${isFlowStatusSyncing ? 'gba:animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <ActionItemsList flows={actionItemFlows} data-testid={`${testId}-action-items-list`} />
          </div>
        )}
      </div>

      {/* Action Items Panel (iPad/mobile) */}
      {actionItemFlows.length > 0 && (
        <Dialog open={actionItemsPanelOpen} onOpenChange={setActionItemsPanelOpen}>
          <DialogContent className="gba:sm:max-w-[650px] gba:max-h-[80vh] gba:overflow-y-auto">
            <DialogHeader>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                <DialogTitle>{t('handwriting-action-items')}</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void syncFlowStatuses()}
                  disabled={isFlowStatusSyncing}
                  className="gba:h-8 gba:w-8 gba:p-0"
                  data-testid={`${testId}-action-items-refresh-dialog`}
                >
                  <RefreshCw className={`gba:w-4 gba:h-4 ${isFlowStatusSyncing ? 'gba:animate-spin' : ''}`} />
                </Button>
              </div>
              <DialogDescription>{t('handwriting-action-items-desc')}</DialogDescription>
            </DialogHeader>
            <ActionItemsList flows={actionItemFlows} data-testid={`${testId}-action-items-list-dialog`} />
          </DialogContent>
        </Dialog>
      )}

      {/* Action Items Modal (after AI extraction) */}
      <ActionItemsModal
        open={actionItemsModalOpen}
        onOpenChange={setActionItemsModalOpen}
        actionItems={currentActionItems}
        noteTitle={title || note.title || t('title-untitled')}
        noteId={note.id}
        accessToken={accessToken}
        currentUserId={currentUserId || note.ownerId || 'unknown'}
        onFlowsCreated={handleFlowsCreated}
        data-testid={`${testId}-action-items-modal`}
      />

      {/* Footer */}
      <div className="gba:border-t gba:bg-background/80 gba:px-6 gba:py-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:gap-4">
            <span>{t('editor-word-count', { count: wordCount })}</span>
            <span>{t('editor-char-count', { count: charCount })}</span>
          </div>
          {isCollaborationConnected && (
            <span className="gba:flex gba:items-center gba:gap-1">
              <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
              {t('editor-synced')}
            </span>
          )}
        </div>
      </div>

      {/* Editor Styles */}
      <style>{`
        .note-editor-content .ProseMirror {
          outline: none;
          font-family: 'Inter', var(--font-sans);
          font-size: 1rem;
          line-height: 1.8;
          color: hsl(var(--foreground));
          min-height: 300px;
          user-select: text;
          -webkit-user-select: text;
          -moz-osx-font-smoothing: grayscale;
          -webkit-font-smoothing: antialiased;
          cursor: text;
        }

        .note-editor-content {
          user-select: text;
          -webkit-user-select: text;
        }

        .note-editor-content .ProseMirror p {
          margin: 0 0 0.75em 0;
        }

        .note-editor-content .ProseMirror h1 {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: -0.025em;
          margin: 1.5em 0 0.5em 0;
          line-height: 1.2;
        }

        .note-editor-content .ProseMirror h2 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 1.25em 0 0.5em 0;
          line-height: 1.3;
        }

        .note-editor-content .ProseMirror h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1em 0 0.5em 0;
          line-height: 1.4;
        }

        .note-editor-content .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0 0 0.75em 0;
        }

        .note-editor-content .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0 0 0.75em 0;
        }

        .note-editor-content .ProseMirror li {
          margin-bottom: 0.25rem;
          display: list-item;
        }

        .note-editor-content .ProseMirror li p {
          margin: 0;
        }

        .note-editor-content .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .note-editor-content .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .note-editor-content .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .note-editor-content .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
          accent-color: hsl(var(--primary));
        }

        .note-editor-content .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }

        .note-editor-content .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          opacity: 0.6;
        }

        /* Blockquote -- decorative pull-quote */
        .note-editor-content .ProseMirror blockquote {
          position: relative;
          border: none;
          border-left: none;
          margin: 1.5em 0;
          padding: 1.25em 1.5em 1.25em 2.5em;
          background: hsl(var(--muted));
          border-radius: 0.75rem;
          color: hsl(var(--foreground));
          font-style: italic;
          font-size: 1.05em;
          line-height: 1.7;
        }

        .note-editor-content .ProseMirror blockquote::before {
          content: '\\201C';
          position: absolute;
          top: 0.15em;
          left: 0.5em;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 3em;
          line-height: 1;
          color: hsl(var(--primary));
          opacity: 0.3;
        }

        .note-editor-content .ProseMirror blockquote p {
          margin-bottom: 0.25em;
        }

        /* Code block -- IDE-style dark theme */
        .note-editor-content .ProseMirror pre {
          background: #1e1e2e;
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem;
          overflow-x: auto;
          margin: 1.5em 0;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .note-editor-content .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: 0.875em;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', monospace;
          color: #cdd6f4;
          line-height: 1.65;
          -webkit-font-smoothing: antialiased;
        }

        /* Inline code */
        .note-editor-content .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.375rem;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', monospace;
          font-size: 0.875em;
          color: hsl(var(--primary));
        }

        .note-editor-content .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          cursor: pointer;
        }

        .note-editor-content .ProseMirror a:hover {
          text-decoration-thickness: 2px;
        }

        .note-editor-content .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5em 0;
        }

        .note-editor-content .ProseMirror mark {
          background-color: hsl(var(--warning) / 0.3);
          border-radius: 0.2em;
          padding: 0.1em 0.15em;
        }

        .note-editor-content .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2em 0;
        }

        .note-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          opacity: 0.35;
          font-style: italic;
          pointer-events: none;
          height: 0;
        }

        .note-editor-content .ProseMirror ::selection {
          background-color: rgba(99, 102, 241, 0.4) !important;
          color: inherit !important;
        }

        .note-editor-content .ProseMirror *::selection {
          background-color: rgba(99, 102, 241, 0.4) !important;
          color: inherit !important;
        }

        /* Nested lists */
        .note-editor-content .ProseMirror ul ul {
          list-style-type: circle;
        }

        .note-editor-content .ProseMirror ul ul ul {
          list-style-type: square;
        }

        .note-editor-content .ProseMirror ol ol {
          list-style-type: lower-alpha;
        }

        .note-editor-content .ProseMirror ol ol ol {
          list-style-type: lower-roman;
        }

        /* Entity Mentions - NodeView cards */
        .note-editor-content .ProseMirror .entity-mention-card {
          display: inline-flex;
          vertical-align: middle;
          user-select: none;
        }

        /* Drag and drop styling */
        .note-editor-content .ProseMirror [draggable="true"] {
          cursor: grab;
        }
        
        .note-editor-content .ProseMirror [draggable="true"]:active {
          cursor: grabbing;
        }
        
        .note-editor-content .ProseMirror .ProseMirror-selectednode .entity-mention-card {
          box-shadow: 0 0 0 2px hsl(var(--primary));
          outline: none;
        }
        
        /* Drop indicator when dragging */
        .note-editor-content .ProseMirror.ProseMirror-focused .ProseMirror-gapcursor::after {
          border-color: hsl(var(--primary));
        }

        .note-editor-content .ProseMirror .entity-mention-inline {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          margin: 0 2px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05));
          border: 1px solid hsl(var(--primary) / 0.2);
          color: hsl(var(--primary));
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .note-editor-content .ProseMirror .entity-mention-inline:hover {
          background: linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.1));
          border-color: hsl(var(--primary) / 0.3);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px hsl(var(--primary) / 0.15);
        }

        /* React NodeView wrapper */
        .note-editor-content .ProseMirror [data-node-view-wrapper] {
          display: inline;
        }

        /* Kanban Board Styles */
        .note-editor-content .ProseMirror .kanban-board-wrapper {
          margin: 1.5rem 0;
        }

        .note-editor-content .ProseMirror .kanban-node {
          display: block;
          margin: 1.5rem 0;
        }

        .note-editor-content .ProseMirror .kanban-board-wrapper .kanban-board-wrapper {
          margin: 0;
        }

        /* Tippy mention dropdown styling */
        .tippy-box[data-theme~='light-border'] {
          background-color: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
        }

        .tippy-box[data-theme~='light-border'] .tippy-content {
          padding: 0;
        }

        .tippy-box[data-theme~='light-border'] .tippy-arrow {
          color: hsl(var(--popover));
        }

        .tippy-box[data-animation='shift-away'][data-state='hidden'] {
          opacity: 0;
          transform: translateY(-4px);
        }
      `}</style>

      {/* Versioning Dialogs */}
      {showVersionHistory && (
        <VersionHistory
          versions={versioning.versions}
          isLoading={versioning.isLoading}
          onRestore={async versionNumber => {
            const versionData = await NoteApiService.getVersion(note.id, versionNumber)

            if (!versionData) return

            const success = await versioning.restoreVersion(versionNumber)

            if (success && editor && versionData.content) {
              editor.commands.setContent(versionData.content)
              setTitle(versionData.title || '')
              setHasUnsavedChanges(false)
              setLastSaved(new Date())

              await versioning.loadVersions()
              setShowVersionHistory(false)
            }
          }}
          onClose={() => setShowVersionHistory(false)}
          currentVersion={versioning.currentVersion?.version}
          showAutoSaves={false}
          data-testid="note-version-history"
        />
      )}

      {showCheckpointDialog && (
        <CheckpointDialog
          isOpen={showCheckpointDialog}
          onClose={() => setShowCheckpointDialog(false)}
          onSave={async description => {
            await versioning.createCheckpoint(description)
          }}
          isSaving={versioning.isSaving}
          data-testid="note-checkpoint-dialog"
        />
      )}

      {showPublishDialog && (
        <PublishDialog
          isOpen={showPublishDialog}
          onClose={() => setShowPublishDialog(false)}
          onPublish={async (publishNotes, createCheckpoint) => {
            await publishing.publish(publishNotes, createCheckpoint)
          }}
          isPublishing={publishing.isPublishing}
          entityType="note"
          data-testid="note-publish-dialog"
        />
      )}

      {showComments && (
        <CommentPanel
          comments={comments.comments}
          unresolvedCount={comments.unresolvedCount}
          isLoading={comments.isLoading}
          onCreateComment={async (content, parentId, userName, userAvatar) => {
            await comments.createComment({
              type: parentId ? 'document' : 'document',
              content,
              parentId,
              createdByName: userName,
              createdByAvatar: userAvatar
            })
          }}
          onUpdateComment={async (commentId, content) => {
            await comments.updateComment(commentId, { content })
          }}
          onResolveComment={async commentId => {
            await comments.resolveComment(commentId)
          }}
          onDeleteComment={async commentId => {
            await comments.deleteComment(commentId)
          }}
          onClose={() => setShowComments(false)}
          currentUserId={currentUserId || undefined}
          currentUserName={currentUserName || undefined}
          currentUserAvatar={currentUserAvatar || undefined}
          accessToken={accessToken}
          headerHeight={80}
          onUnhighlight={commentId => {
            if (editor) {
              const { doc } = editor.state
              let foundPos: { from: number; to: number } | null = null

              doc.descendants((node, pos) => {
                if (node.marks) {
                  node.marks.forEach(mark => {
                    if (mark.type.name === 'inlineComment' && mark.attrs.commentId === commentId) {
                      foundPos = { from: pos, to: pos + node.nodeSize }
                    }
                  })
                }
              })

              if (foundPos) {
                editor.chain().setTextSelection(foundPos).unsetInlineComment().run()
              }
            }
          }}
          onScrollToHighlight={commentId => {
            if (editor) {
              const { doc } = editor.state

              doc.descendants((node, pos) => {
                if (node.marks) {
                  node.marks.forEach(mark => {
                    if (mark.type.name === 'inlineComment' && mark.attrs.commentId === commentId) {
                      editor
                        .chain()
                        .setTextSelection({ from: pos, to: pos + node.nodeSize })
                        .focus()
                        .run()

                      setTimeout(() => {
                        const element = document.querySelector(`[data-comment-id="${commentId}"]`)
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }
                  })
                }
              })
            }
          }}
          data-testid="note-comment-panel"
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
        data-testid="note-inline-comment-popover"
      />

      {/* Task item context menu for Kanban linking */}
      {taskContextMenu && (
        <div
          className="gba:fixed gba:z-50 gba:min-w-[200px] gba:rounded-md gba:border gba:bg-popover gba:p-1 gba:shadow-md"
          style={{
            top: taskContextMenu.position.top,
            left: taskContextMenu.position.left
          }}
        >
          <div className="gba:px-2 gba:py-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:justify-between">
            <span>{t('editor-add-to-kanban')}</span>
            {taskContextMenu.taskItemPositions.length > 1 && (
              <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4">
                {t('editor-items-count', { count: taskContextMenu.taskItemPositions.length })}
              </Badge>
            )}
          </div>
          {taskContextMenu.kanbanBoards.length === 0 ? (
            // No Kanban boards - offer to create one
            <button
              type="button"
              className="gba:w-full gba:flex gba:items-center gba:px-2 gba:py-1.5 gba:text-sm gba:rounded-sm hover:gba:bg-accent hover:gba:text-accent-foreground gba:cursor-pointer"
              onClick={handleCreateKanbanWithTasks}
            >
              <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-2 gba:text-muted-foreground" />
              {t('editor-create-kanban-board')}
            </button>
          ) : taskContextMenu.kanbanBoards.length === 1 ? (
            // Single Kanban - show columns directly
            <>
              {taskContextMenu.kanbanBoards[0].data.columns.map(column => (
                <button
                  key={column.id}
                  type="button"
                  className="gba:w-full gba:flex gba:items-center gba:px-2 gba:py-1.5 gba:text-sm gba:rounded-sm hover:gba:bg-accent hover:gba:text-accent-foreground gba:cursor-pointer"
                  onClick={() => handleAddTaskToKanban(taskContextMenu.kanbanBoards[0].id, column.id)}
                >
                  <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:mr-2 gba:text-muted-foreground" />
                  {column.title}
                </button>
              ))}
            </>
          ) : (
            // Multiple Kanbans - show board names, then columns on hover (simplified: just add to first column)
            <>
              {taskContextMenu.kanbanBoards.map(board => (
                <button
                  key={board.id}
                  type="button"
                  className="gba:w-full gba:flex gba:items-center gba:px-2 gba:py-1.5 gba:text-sm gba:rounded-sm hover:gba:bg-accent hover:gba:text-accent-foreground gba:cursor-pointer"
                  onClick={() => handleAddTaskToKanban(board.id, 'todo')}
                >
                  <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:mr-2 gba:text-muted-foreground" />
                  {board.data.columns[0]?.title || t('editor-kanban-fallback')}
                  <span className="gba:ml-auto gba:text-xs gba:text-muted-foreground">
                    {t('editor-cards-count', {
                      count: board.data.columns.reduce((sum, col) => sum + col.cards.length, 0)
                    })}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Click outside to close task context menu */}
      {taskContextMenu && <div className="gba:fixed gba:inset-0 gba:z-40" onClick={() => setTaskContextMenu(null)} />}
    </div>
  )
}

export default NoteEditor
