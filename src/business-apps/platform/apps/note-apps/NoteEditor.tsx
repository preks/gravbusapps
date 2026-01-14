/**
 * NoteEditor Component
 *
 * A beautiful, modern note editor with TipTap, real-time collaboration,
 * and a clean, distraction-free writing experience.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
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
import { TaskItem } from '@tiptap/extension-task-item'
import { Typography } from '@tiptap/extension-typography'
import { CharacterCount } from '@tiptap/extension-character-count'
import {
  Button,
  Badge,
  Separator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Save,
  MoreVertical,
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
  AtSign
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCollaboration } from '../shared/hooks/useCollaboration'
import { PresenceIndicator } from '../shared/components/PresenceIndicator'
import { SocketIoYjsProvider } from '../shared/services/SocketIoYjsProvider'
import { createYjsCursorExtension } from '../document-apps/components/PagedDocumentEditor/extensions/YjsCursor'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { NoteApiService } from './services/NoteApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import Mention from '@tiptap/extension-mention'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { createMentionSuggestion, getEntityUrl, ENTITY_ICONS, ENTITY_COLORS, type EntityType } from './components/EntityMention'
import { mergeAttributes } from '@tiptap/core'
import { FileText } from 'lucide-react'
import type { Note, NoteColor } from './types'

// Note color mapping
const noteColors: Array<{ value: NoteColor; label: string; class: string }> = [
  { value: 'default', label: 'Default', class: 'gba:bg-card' },
  { value: 'red', label: 'Red', class: 'gba:bg-red-100 dark:gba:bg-red-900/20' },
  { value: 'orange', label: 'Orange', class: 'gba:bg-orange-100 dark:gba:bg-orange-900/20' },
  { value: 'yellow', label: 'Yellow', class: 'gba:bg-yellow-100 dark:gba:bg-yellow-900/20' },
  { value: 'green', label: 'Green', class: 'gba:bg-green-100 dark:gba:bg-green-900/20' },
  { value: 'teal', label: 'Teal', class: 'gba:bg-teal-100 dark:gba:bg-teal-900/20' },
  { value: 'blue', label: 'Blue', class: 'gba:bg-blue-100 dark:gba:bg-blue-900/20' },
  { value: 'purple', label: 'Purple', class: 'gba:bg-purple-100 dark:gba:bg-purple-900/20' },
  { value: 'pink', label: 'Pink', class: 'gba:bg-pink-100 dark:gba:bg-pink-900/20' },
  { value: 'gray', label: 'Gray', class: 'gba:bg-gray-100 dark:gba:bg-gray-800/50' }
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
    <NodeViewWrapper 
      as="span" 
      className="gba:inline"
      draggable="true"
      data-drag-handle
    >
      <span
        onClick={handleClick}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
        className={`entity-mention-card gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-lg gba:border gba:text-sm gba:font-medium gba:cursor-grab active:gba:cursor-grabbing gba:transition-all gba:duration-200 hover:gba:shadow-md gba:mx-0.5 gba:my-0.5 gba:select-none ${colors.bg} ${colors.border} ${colors.text} ${isDragging ? 'gba:opacity-50 gba:scale-95' : 'hover:gba:scale-[1.02]'}`}
        contentEditable={false}
        data-entity-id={id}
        data-entity-type={entityType}
        title={`Drag to move • Click to open ${label || 'entity'}`}
      >
        {/* Drag handle indicator */}
        <span className="gba:flex gba:flex-col gba:gap-px gba:opacity-40 gba:mr-0.5">
          <span className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-current"></span>
          <span className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-current"></span>
        </span>
        
        {/* Icon/Avatar/Logo */}
        <span className={`gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 gba:rounded-md ${hasPicture ? '' : `${colors.bg}`}`}>
          {hasPicture && pictureUrl ? (
            <img
              src={pictureUrl}
              alt={label}
              className="gba:w-5 gba:h-5 gba:rounded-md gba:object-cover"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <Icon className="gba:w-3.5 gba:h-3.5" />
          )}
        </span>
        
        {/* Content */}
        <span className="gba:flex gba:flex-col gba:leading-tight">
          <span className="gba:font-semibold gba:truncate gba:max-w-[150px]">{label || 'Unknown'}</span>
          {subtitle && (
            <span className="gba:text-[10px] gba:opacity-70 gba:truncate gba:max-w-[150px]">{subtitle}</span>
          )}
        </span>
        
        {/* Type indicator */}
        <span className={`gba:text-[9px] gba:font-bold gba:px-1.5 gba:py-0.5 gba:rounded gba:uppercase gba:tracking-wider gba:opacity-60`}>
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
  accessToken: accessTokenProp,
  'data-testid': testId = 'note-editor'
}) => {
  // Editor state
  const [title, setTitle] = useState(note.title || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(note ? new Date(note.updatedAt) : null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [noteColor, setNoteColor] = useState<NoteColor>(note.color || 'default')

  const titleInputRef = useRef<HTMLInputElement>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<any>(null)

  // Collaboration state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)
  const [isYjsSynced, setIsYjsSynced] = useState(false)

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
  const accessToken = accessTokenProp || (note as any).accessToken || ''
  const graphqlClient = useGraphQLClient(accessToken)

  // Collaboration hook
  const {
    participants: rawParticipants,
    isConnected: isCollaborationConnected,
    socket: collaborationSocket
  } = useCollaboration({
    entityType: 'note',
    entityId: note.id,
    enabled: !!note.id,
    onError: onErrorCallback
  })

  // Enrich participants with avatars
  const [participants, setParticipants] = useState<typeof rawParticipants>([])

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
        const result = await graphqlClient.request<{ Employee: Array<{ userId: string; pictureThumbnail: string | null }> }>(query, { userIds })

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
      name: currentUserName || 'User',
      color: participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4',
      avatar: currentUserAvatar
    })
  }, [note.id, awareness, currentUserId, currentUserName, currentUserAvatar, participants, isYjsSynced])

  // Debounced snapshot save
  const scheduleSnapshotSave = useCallback(
    (currentEditor: any) => {
      if (!note.id || isReadOnly) return
      if (!isYjsSynced) return

      setHasUnsavedChanges(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        const html = currentEditor?.getHTML?.() || ''
        NoteApiService.updateNote(note.id, {
          title,
          content: html,
          createVersion: false
        })
          .then(() => {
            setLastSaved(new Date())
            setHasUnsavedChanges(false)
          })
          .catch(error => {
            console.error('[NoteEditor] Snapshot save failed:', error)
          })
      }, 2000)
    },
    [note.id, isReadOnly, isYjsSynced, title]
  )

  useEffect(() => {
    scheduleSnapshotSaveRef.current = scheduleSnapshotSave
  }, [scheduleSnapshotSave])

  // Get current user info including avatar
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const token = localStorage.getItem('business-app-ide-access-token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const userId = payload.sub || payload.userId || null
          const userName = payload.name || payload.preferred_username || payload.username || null
          
          setCurrentUserId(userId)
          setCurrentUserName(userName)

          // Fetch avatar from GraphQL if we have userId and graphqlClient
          if (userId && graphqlClient) {
            try {
              const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
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
            } catch (err) {
              // Ignore - avatar is optional
            }
          }
        }
      } catch {}
    }

    loadUserInfo()
  }, [graphqlClient])

  // Create mention suggestion with access token
  const mentionSuggestion = React.useMemo(
    () => {
      console.log('[NoteEditor] Creating mention suggestion with token:', accessToken ? 'present' : 'missing')
      return createMentionSuggestion(accessToken)
    },
    [accessToken]
  )

  // Initialize TipTap editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          // Disable history when using Yjs collaboration (Yjs provides its own history)
          ...(note.id ? { history: false } : {})
        } as any),
        Placeholder.configure({
          placeholder: 'Start writing... Type @ to mention entities'
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
        TaskItem.configure({
          nested: true
        }),
        Typography,
        CharacterCount,
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
                parseHTML: element => element.getAttribute('data-entity-type') || element.getAttribute('data-type') || 'unknown',
                renderHTML: attributes => ({ 'data-entity-type': attributes.type })
              },
              subtitle: {
                default: null,
                parseHTML: element => element.getAttribute('data-entity-subtitle'),
                renderHTML: attributes => attributes.subtitle ? { 'data-entity-subtitle': attributes.subtitle } : {}
              },
              pictureThumbnail: {
                default: null,
                parseHTML: element => element.getAttribute('data-entity-thumbnail'),
                renderHTML: attributes => attributes.pictureThumbnail ? { 'data-entity-thumbnail': attributes.pictureThumbnail } : {}
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
                    label: el.getAttribute('data-entity-label') || el.getAttribute('data-label') || el.textContent?.replace('@', ''),
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
        ...(collaborationExtension ? [collaborationExtension] : []),
        ...(yjsCursorExtension ? [yjsCursorExtension] : [])
      ],
      content: note.id ? '<p></p>' : note.content || '<p></p>', // Empty for synced notes (Yjs will populate)
      editable: !isReadOnly && (!note.id || isYjsSynced),
      onUpdate: () => {
        // For notes with Yjs sync, changes are auto-saved via the Yjs provider
        // Just mark as having unsaved changes for UI
        if (!isReadOnly) {
          setHasUnsavedChanges(true)
        }
      }
    },
    [note.id, note.content, ydoc, isReadOnly, isYjsSynced, mentionSuggestion]
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Update editable state based on sync status
  useEffect(() => {
    if (!editor) return
    const shouldBeEditable = !isReadOnly && (!note.id || isYjsSynced)
    if (editor.isEditable !== shouldBeEditable) {
      editor.setEditable(shouldBeEditable)
    }
  }, [editor, isReadOnly, note.id, isYjsSynced])

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Handle title change with auto-save
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setHasUnsavedChanges(true)
    
    // Debounced auto-save for title
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (isReadOnly) return
      
      const html = editor?.getHTML() || note.content || ''
      
      if (note.id) {
        try {
          await NoteApiService.updateNote(note.id, {
            title: newTitle,
            content: html,
            createVersion: false
          })
          setLastSaved(new Date())
          setHasUnsavedChanges(false)
          console.log('[NoteEditor] Auto-saved title:', newTitle)
        } catch (error) {
          console.error('[NoteEditor] Title auto-save failed:', error)
        }
      }
    }, 1500)
  }, [editor, note.id, note.content, isReadOnly])

  // Handle title keydown - Enter moves to editor
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (editor) {
        editor.commands.focus('start')
      } else {
        const editorElement = document.querySelector('.ProseMirror') as HTMLElement
        editorElement?.focus()
      }
    }
  }, [editor])

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
    if (!date) return 'Not saved'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return 'Saved just now'
    if (diffMinutes === 1) return 'Saved 1 minute ago'
    if (diffMinutes < 60) return `Saved ${diffMinutes} minutes ago`
    return `Saved at ${date.toLocaleTimeString()}`
  }

  // Word count
  const wordCount = editor?.storage.characterCount?.words() || 0
  const charCount = editor?.storage.characterCount?.characters() || 0

  // Get background color class based on note color
  const bgColorClass = noteColors.find(c => c.value === noteColor)?.class || 'gba:bg-card'

  return (
    <div className={`gba:flex gba:flex-col gba:h-full ${bgColorClass}`} data-testid={testId}>
      {/* Header - Modern spreadsheet-style */}
      <div className="gba:border-b gba:bg-card gba:sticky gba:top-0 gba:z-10">
        <div className="gba:px-4 gba:py-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            {/* Left side - Back & Title */}
            <div className="gba:flex gba:items-center gba:gap-3">
              <Button variant="ghost" size="sm" onClick={onBack} className="gba:gap-2">
                <ArrowLeft className="gba:w-4 gba:h-4" />
                Back
              </Button>

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Note icon/emoji */}
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-gradient-to-br gba:from-amber-500/20 gba:to-orange-500/20 gba:flex gba:items-center gba:justify-center gba:text-lg">
                  {note.icon || '📝'}
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:max-w-[200px]">
                    {title || 'Untitled Note'}
                  </span>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                    {isSaving ? (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
                        Saving...
                      </span>
                    ) : hasUnsavedChanges ? (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:text-warning-foreground">
                        <Clock className="gba:w-3 gba:h-3" />
                        Unsaved changes
                      </span>
                    ) : lastSaved ? (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
                        {formatLastSaved(lastSaved)}
                      </span>
                    ) : null}
                    <span>•</span>
                    <span>{wordCount} words</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Active collaborators */}
              {participants.length > 0 && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2 gba:pr-2 gba:border-r">
                  <PresenceIndicator participants={participants} maxVisible={4} size="sm" showLabel={false} />
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {participants.length} active
                  </span>
                </div>
              )}

              {/* Color picker */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8">
                          <Palette className="gba:w-4 gba:h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="gba:grid gba:grid-cols-5 gba:gap-1 gba:p-2">
                          {noteColors.map(color => (
                            <button
                              key={color.value}
                              className={`gba:w-6 gba:h-6 gba:rounded-full gba:border-2 gba:transition-transform hover:gba:scale-110 ${
                                noteColor === color.value ? 'gba:border-primary gba:scale-110' : 'gba:border-transparent'
                              } ${color.class}`}
                              onClick={() => handleColorChange(color.value)}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent>Change color</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Share button */}
              {onShare && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8" onClick={onShare}>
                        <Share2 className="gba:w-4 gba:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Pin button */}
              {onTogglePin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`gba:h-8 gba:w-8 ${note.isPinned ? 'gba:text-amber-500' : ''}`}
                        onClick={onTogglePin}
                      >
                        <Pin className={`gba:w-4 gba:h-4 ${note.isPinned ? 'gba:fill-current' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{note.isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* More actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8">
                    <MoreVertical className="gba:w-4 gba:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    Export
                  </DropdownMenuItem>
                  {onArchive && (
                    <>
                      <Separator className="gba:my-1" />
                      <DropdownMenuItem onClick={onArchive}>
                        <Archive className="gba:w-4 gba:h-4 gba:mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="gba:text-destructive">
                      <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save button */}
              {!isReadOnly && (
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !hasUnsavedChanges} 
                  size="sm"
                  className="gba:bg-gradient-to-r gba:from-amber-500 gba:to-orange-600 gba:text-white hover:gba:from-amber-600 hover:gba:to-orange-700"
                >
                  <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {editor && !isReadOnly && (
        <div className="gba:border-b gba:bg-muted/30 gba:px-4 gba:py-2">
          <div className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap">
            {/* Text formatting */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <Bold className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold (⌘B)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic (⌘I)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                  >
                    <UnderlineIcon className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Underline (⌘U)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                  >
                    <Strikethrough className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Strikethrough</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

            {/* Headings */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  >
                    <Heading1 className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 1</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  >
                    <Heading2 className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 2</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  >
                    <Heading3 className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 3</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

            {/* Lists */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    <List className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    <ListOrdered className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('taskList') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                  >
                    <CheckSquare className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Task List</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

            {/* Quote and Code */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  >
                    <Quote className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quote</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  >
                    <Code className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Code Block</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

            {/* Mention Entity */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gba:h-8 gba:w-8"
                    onClick={() => {
                      editor?.chain().focus().insertContent('@').run()
                    }}
                  >
                    <AtSign className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mention Entity (@)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="gba:flex-1 gba:overflow-auto gba:relative">

        <div className="gba:max-w-3xl gba:mx-auto gba:px-8 gba:py-8">
          {/* Title */}
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            disabled={isReadOnly}
            className="gba:w-full gba:text-4xl gba:font-bold gba:bg-transparent gba:border-0 gba:outline-none gba:mb-4 gba:text-foreground placeholder:gba:text-muted-foreground/50"
            data-testid="note-editor-title-input"
          />

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


          {/* Editor content */}
          <EditorContent editor={editor} className="note-editor-content" />
        </div>
      </div>

      {/* Footer */}
      <div className="gba:border-t gba:bg-background/80 gba:px-6 gba:py-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
          {isCollaborationConnected && (
            <span className="gba:flex gba:items-center gba:gap-1">
              <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
              Synced
            </span>
          )}
        </div>
      </div>

      {/* Editor Styles */}
      <style>{`
        .note-editor-content .ProseMirror {
          outline: none;
          font-size: 16px;
          line-height: 1.75;
          color: hsl(var(--foreground));
          min-height: 300px;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          cursor: text;
        }

        .note-editor-content {
          user-select: text;
          -webkit-user-select: text;
        }

        .note-editor-content .ProseMirror p {
          margin: 0 0 1rem 0;
        }

        .note-editor-content .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 2rem 0 1rem 0;
          line-height: 1.2;
        }

        .note-editor-content .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem 0;
          line-height: 1.3;
        }

        .note-editor-content .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.4;
        }

        .note-editor-content .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0 0 1rem 0;
        }

        .note-editor-content .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0 0 1rem 0;
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

        .note-editor-content .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }

        .note-editor-content .ProseMirror pre {
          background: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
          margin: 1rem 0;
        }

        .note-editor-content .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, monospace;
          font-size: 0.875em;
        }

        .note-editor-content .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }

        .note-editor-content .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        .note-editor-content .ProseMirror mark {
          background-color: hsl(var(--warning) / 0.3);
          padding: 0.125rem 0;
        }

        .note-editor-content .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2rem 0;
        }

        .note-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
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
    </div>
  )
}

export default NoteEditor
