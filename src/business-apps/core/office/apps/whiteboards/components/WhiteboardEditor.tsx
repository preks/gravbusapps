import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { NW_FUNNEL_DISPLAY_FONT_FAMILY, patchFontsFromContainer } from '../utils/registerFunnelDisplayExcalidraw'
import { Excalidraw, MainMenu, exportToBlob, exportToSvg, restoreElements } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import '../styles/excalidrawWhiteLabel.css'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI, Zoom } from '@excalidraw/excalidraw/types'
import { useCurrentUserPicture } from '@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture'
import { installExcalidrawWhiteLabelDomPatches } from '../utils/excalidrawWhiteLabelDom'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { toast } from 'sonner'
import {
  AiButton,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useLocale,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CaretDownIcon,
  ChatCenteredTextIcon,
  DownloadSimpleIcon,
  ImageIcon,
  PaintBucketIcon,
  ShareNetworkIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import { MessageSquare } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { CommentPanel } from '@/business-apps/platform/apps/shared/components/CommentPanel'
import { InlineCommentPopover } from '@/business-apps/platform/apps/shared/components/InlineCommentPopover'
import { useComments } from '@/business-apps/platform/apps/shared/hooks/useComments'
import type {
  Comment,
  CommentQueryOptions,
  CreateCommentInput,
  WhiteboardCommentAnchor
} from '@/business-apps/platform/apps/shared/types/versioning'
import { useCollaboration } from '@/business-apps/platform/apps/shared/hooks/useCollaboration'
import { SocketIoYjsProvider } from '@/business-apps/platform/apps/shared/services/SocketIoYjsProvider'
import { PresenceIndicator } from '@/business-apps/platform/apps/shared/components/PresenceIndicator'
import { WhiteboardCollaboratorCursors } from './WhiteboardCollaboratorCursors'
import { WhiteboardCommentPins } from './WhiteboardCommentPins'
import { ShareWhiteboardDialog } from './ShareWhiteboardDialog'
import { ManageSharesDialog } from './ManageSharesDialog'
import { WhiteboardApiService } from '../services'
import {
  WHITEBOARD_LOCAL_YJS_ORIGIN,
  WHITEBOARD_SCENE_BOOTSTRAP_ORIGIN,
  dedupeWhiteboardElementRecords,
  normalizeWhiteboardElementOrder,
  syncWhiteboardAppState,
  syncWhiteboardElements,
  syncWhiteboardFiles
} from '../services/whiteboardYjsScene'
import translations from '../_i18n'
import type { WhiteboardSummary } from '../types'
import type { DocumentParticipant } from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import {
  createWhiteboardCommentAnchorFromElements,
  createWhiteboardCommentAnchorFromViewportPoint,
  getWhiteboardCommentAnchorCenter,
  resolveWhiteboardCommentAnchor
} from '../utils/whiteboardCommentAnchors'
import { normalizeWhiteboardLink } from '../utils/normalizeWhiteboardLink'
import { openInNewTab } from '@/common/utils/navigationUtils'

type SceneElement = ReturnType<ExcalidrawImperativeAPI['getSceneElements']>[number]

type CommentAnchorSceneElement = {
  id?: string
  x: number
  y: number
  width: number
  height: number
  isDeleted?: boolean
}

type WhiteboardLinkElement = {
  link?: string | null
}

type WhiteboardLinkOpenEvent = {
  preventDefault?: () => void
}

function normalizeAvatarUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined
  return raw.startsWith('data:') || /^https?:\/\//i.test(raw) ? raw : `data:image/png;base64,${raw}`
}

function hasSceneContent(sceneData: Record<string, unknown> | undefined): boolean {
  if (!sceneData) return false
  const elements = sceneData.elements
  const files = sceneData.files
  return (
    (Array.isArray(elements) && elements.length > 0) ||
    (files !== null && typeof files === 'object' && Object.keys(files as Record<string, unknown>).length > 0)
  )
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const VIEWPORT_KEYS = new Set(['scrollX', 'scrollY', 'zoom'])

const WHITEBOARD_BACKGROUND_COLORS = [
  '#ffffff',
  '#f8fafc',
  '#f1f5f9',
  '#fef3c7',
  '#fde68a',
  '#fecaca',
  '#fca5a5',
  '#bbf7d0',
  '#86efac',
  '#bfdbfe',
  '#93c5fd',
  '#e9d5ff'
]

function serializeAppState(appState: AppState): Record<string, unknown> {
  return {
    viewBackgroundColor: appState.viewBackgroundColor
  }
}

function buildSceneData(
  elements: readonly SceneElement[],
  files: BinaryFiles,
  appState: AppState
): Record<string, unknown> {
  const normalizedElements = normalizeWhiteboardElementOrder(
    elements.map(el => JSON.parse(JSON.stringify(el)) as Record<string, unknown>)
  )

  return {
    elements: normalizedElements,
    files: Object.fromEntries(
      Object.entries(JSON.parse(JSON.stringify(files)) as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b)
      )
    ),
    appState: serializeAppState(appState)
  }
}

function serializeSceneDocument(sceneData: Record<string, unknown> | null | undefined): string {
  const elements = Array.isArray(sceneData?.elements) ? sceneData.elements : []
  const files =
    sceneData?.files && typeof sceneData.files === 'object' ? (sceneData.files as Record<string, unknown>) : {}
  const appState =
    sceneData?.appState && typeof sceneData.appState === 'object' ? (sceneData.appState as Record<string, unknown>) : {}

  return JSON.stringify({
    elements,
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
    appState: Object.fromEntries(Object.entries(appState).sort(([a], [b]) => a.localeCompare(b)))
  })
}

function sanitizeSceneElements(elements: Record<string, unknown>[]): SceneElement[] {
  try {
    const normalizedElements = normalizeWhiteboardElementOrder(dedupeWhiteboardElementRecords(elements))
    return restoreElements(normalizedElements as never, null, {
      refreshDimensions: true,
      repairBindings: true
    }) as unknown as SceneElement[]
  } catch (error) {
    console.error('Failed to restore scene elements:', error)
    return []
  }
}

function snapshotCommentAnchorElements(elements: readonly SceneElement[]): CommentAnchorSceneElement[] {
  return elements.map(element => ({
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    isDeleted: element.isDeleted
  }))
}

function serializeCommentAnchorElements(elements: readonly CommentAnchorSceneElement[]): string {
  return JSON.stringify(elements)
}

interface WhiteboardEditorProps extends BusinessAppContextProps {
  whiteboardId: string
  isReadOnly?: boolean
  canComment?: boolean
  canManageSharing?: boolean
  canRename?: boolean
  onBack: () => void
  onAiReady?: (
    api: ExcalidrawImperativeAPI,
    ydoc: Y.Doc,
    yElements: Y.Array<Y.Map<unknown>>,
    yFiles: Y.Map<string>
  ) => void
  onToggleAiChat?: () => void
  aiChatVisible?: boolean
  'data-testid'?: string
}

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({
  whiteboardId,
  isReadOnly = false,
  canComment = false,
  canManageSharing = false,
  accessToken,
  userInfo,
  onBack,
  onAiReady,
  onToggleAiChat,
  aiChatVisible,
  'data-testid': testId = 'whiteboard-editor'
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()
  const excalidrawLangCode = useMemo(() => {
    if (!locale) return 'en'
    if (/^de/i.test(locale)) return 'de-DE'
    if (/^ro/i.test(locale)) return 'ro-RO'
    if (/^en/i.test(locale)) return 'en'
    return locale
  }, [locale])
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [whiteboard, setWhiteboard] = useState<WhiteboardSummary | null>(null)
  const [hasLoadedWhiteboard, setHasLoadedWhiteboard] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [hasSharedUsers, setHasSharedUsers] = useState(false)
  const [isRenamingTitle, setIsRenamingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [isRenameSaving, setIsRenameSaving] = useState(false)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const isRenamingTitleRef = useRef(false)
  const [bgColorPopoverOpen, setBgColorPopoverOpen] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [participantAvatarMap, setParticipantAvatarMap] = useState<Record<string, string>>({})
  const [commentsVisible, setCommentsVisible] = useState(false)
  const [commentPopoverPosition, setCommentPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const [commentContextMenu, setCommentContextMenu] = useState<{
    top: number
    left: number
    anchor: WhiteboardCommentAnchor
  } | null>(null)
  const [pendingCommentAnchor, setPendingCommentAnchor] = useState<WhiteboardCommentAnchor | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [commentAnchorVersion, setCommentAnchorVersion] = useState(0)
  const providerRef = useRef<SocketIoYjsProvider | null>(null)
  const excalidrawShellRef = useRef<HTMLDivElement | null>(null)
  const sceneElementsForCommentsRef = useRef<readonly CommentAnchorSceneElement[]>([])
  const sceneElementsForCommentsSignatureRef = useRef('')
  const sceneElementsForCommentsFrameRef = useRef<number | null>(null)
  const [viewport, setViewport] = useState({ scrollX: 0, scrollY: 0, zoom: 1 })
  const viewportRef = useRef(viewport)
  const isRemoteUpdateRef = useRef(false)
  const hasHydratedCanvasRef = useRef(false)
  const hasPersistedSnapshotRef = useRef(false)
  const hasRestoredViewportRef = useRef(false)
  const hasSeededFromSceneDataRef = useRef(false)
  const lastAppliedRemoteSceneRef = useRef<string | null>(null)
  const initialSceneDataRef = useRef<Record<string, unknown> | undefined>(undefined)

  const { pictureThumbnail: pictureFromGraphql } = useCurrentUserPicture(
    userInfo?.employeeDetails?.employeeId,
    accessToken ?? ''
  )

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const currentUserName =
    [userInfo?.givenName, userInfo?.familyName].filter(Boolean).join(' ') || userInfo?.userName || ''
  const graphqlClient = useGraphQLClient(accessToken ?? '')
  const currentUserAvatar = useMemo(
    () => normalizeAvatarUrl(pictureFromGraphql || userInfo?.employeeDetails?.pictureThumbnail),
    [pictureFromGraphql, userInfo?.employeeDetails?.pictureThumbnail]
  )

  const ydoc = useMemo(() => new Y.Doc(), [whiteboardId])
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc])
  const yElements = useMemo(() => ydoc.getArray<Y.Map<unknown>>('elements'), [ydoc])
  const yFiles = useMemo(() => ydoc.getMap<string>('files'), [ydoc])
  const yAppState = useMemo(() => ydoc.getMap<unknown>('appState'), [ydoc])
  const isActuallyTrashed = Boolean(whiteboard?.trashedAt)
  const isReadonlyCanvas = isReadOnly || isActuallyTrashed
  const commentsEnabled = canComment && !isActuallyTrashed && !!accessToken

  useEffect(() => {
    if (excalidrawApi && onAiReady) {
      onAiReady(excalidrawApi, ydoc, yElements, yFiles)
    }
  }, [excalidrawApi, onAiReady, ydoc, yElements, yFiles])

  useEffect(() => {
    if (!accessToken || !whiteboardId) return
    setHasLoadedWhiteboard(false)
    setWhiteboard(null)
    hasHydratedCanvasRef.current = false
    hasPersistedSnapshotRef.current = false
    hasRestoredViewportRef.current = false
    hasSeededFromSceneDataRef.current = false
    lastAppliedRemoteSceneRef.current = null
    initialSceneDataRef.current = undefined
    WhiteboardApiService.getTrashedPreview(accessToken, whiteboardId)
      .then(loadedWhiteboard => {
        setWhiteboard(loadedWhiteboard)
        initialSceneDataRef.current = loadedWhiteboard.sceneData as Record<string, unknown> | undefined
        hasPersistedSnapshotRef.current = Boolean(
          (loadedWhiteboard.contentJson as Record<string, unknown> | undefined)?.yjsStateBase64
        )
      })
      .catch(err => console.error('Failed to load whiteboard:', err.message))
      .finally(() => setHasLoadedWhiteboard(true))
  }, [accessToken, whiteboardId])

  const refreshShareCount = useCallback(async () => {
    if (!accessToken || !whiteboardId || !canManageSharing) {
      setHasSharedUsers(false)
      return
    }

    try {
      const shares = await WhiteboardApiService.getSharedUsers(accessToken, whiteboardId)
      setHasSharedUsers(Array.isArray(shares) && shares.length > 0)
    } catch {
      setHasSharedUsers(false)
    }
  }, [accessToken, canManageSharing, whiteboardId])

  useEffect(() => {
    if (hasLoadedWhiteboard) {
      void refreshShareCount()
    }
  }, [hasLoadedWhiteboard, refreshShareCount])

  useEffect(() => {
    const persistedSnapshot = (whiteboard?.contentJson as Record<string, unknown> | undefined)?.yjsStateBase64
    if (typeof persistedSnapshot !== 'string' || persistedSnapshot.length === 0) return
    if (yElements.length > 0 || yFiles.size > 0) return

    try {
      Y.applyUpdate(ydoc, base64ToUint8Array(persistedSnapshot), 'remote')
      hasPersistedSnapshotRef.current = true
    } catch (error) {
      console.error('Failed to apply persisted whiteboard snapshot:', error)
    }
  }, [whiteboard, ydoc, yElements, yFiles])

  const { participants, socket: collaborationSocket } = useCollaboration({
    entityType: 'whiteboard',
    entityId: whiteboardId,
    enabled: !!whiteboardId && hasLoadedWhiteboard && !isActuallyTrashed,
    accessToken
  })

  const commentApiService = useMemo(() => {
    if (!accessToken || !commentsEnabled) {
      return undefined
    }

    return {
      createComment: (id: string, input: CreateCommentInput) =>
        WhiteboardApiService.createComment(accessToken, id, input),
      listComments: (id: string, options?: CommentQueryOptions) =>
        WhiteboardApiService.listComments(accessToken, id, options),
      updateComment: (commentId: string, updates: Partial<Comment>) =>
        WhiteboardApiService.updateComment(accessToken, commentId, updates),
      resolveComment: (commentId: string) => WhiteboardApiService.resolveComment(accessToken, commentId),
      unresolveComment: (commentId: string) => WhiteboardApiService.unresolveComment(accessToken, commentId),
      deleteComment: (commentId: string) => WhiteboardApiService.deleteComment(accessToken, commentId),
      replyToComment: (commentId: string, reply: string, userName?: string, userAvatar?: string) =>
        WhiteboardApiService.replyToComment(accessToken, commentId, reply, userName, userAvatar)
    }
  }, [accessToken, commentsEnabled])

  const comments = useComments({
    entityId: whiteboardId,
    entityType: 'whiteboard',
    socket: commentsEnabled ? collaborationSocket : null,
    apiService: commentApiService,
    t
  })

  const updateCommentAnchorElements = useCallback((elements: readonly SceneElement[]) => {
    const snapshot = snapshotCommentAnchorElements(elements)
    const signature = serializeCommentAnchorElements(snapshot)
    if (signature === sceneElementsForCommentsSignatureRef.current) {
      return
    }

    sceneElementsForCommentsRef.current = snapshot
    sceneElementsForCommentsSignatureRef.current = signature
    if (sceneElementsForCommentsFrameRef.current !== null) {
      return
    }

    sceneElementsForCommentsFrameRef.current = requestAnimationFrame(() => {
      sceneElementsForCommentsFrameRef.current = null
      setCommentAnchorVersion(version => version + 1)
    })
  }, [])

  const handleExcalidrawApi = useCallback((api: ExcalidrawImperativeAPI | null) => {
    setExcalidrawApi(current => (current === api ? current : api))
  }, [])

  const handleLinkOpen = useCallback((element: WhiteboardLinkElement, event?: WhiteboardLinkOpenEvent) => {
    const targetLink = normalizeWhiteboardLink(element.link)

    if (!targetLink) {
      return
    }

    event?.preventDefault?.()
    openInNewTab(targetLink)
  }, [])

  const initialExcalidrawData = useMemo(
    () => ({
      appState: {
        currentItemRoughness: 0,
        currentItemFontFamily: NW_FUNNEL_DISPLAY_FONT_FAMILY,
        viewModeEnabled: isReadonlyCanvas
      }
    }),
    [isReadonlyCanvas]
  )

  useEffect(() => {
    return () => {
      if (sceneElementsForCommentsFrameRef.current !== null) {
        cancelAnimationFrame(sceneElementsForCommentsFrameRef.current)
        sceneElementsForCommentsFrameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (participants.length === 0) {
      setParticipantAvatarMap({})
      return
    }
    if (!accessToken) return

    let cancelled = false

    const fetchParticipantAvatars = async () => {
      const userIds = [...new Set(participants.map(p => p.userId).filter(Boolean))]
      if (userIds.length === 0) return

      try {
        const result = await graphqlClient.request<{
          Employee: Array<{ userId: string; pictureThumbnail: string | null }>
        }>(
          `
            query GetWhiteboardParticipantAvatars($userIds: [String!]) {
              Employee(where: {userId: {_in: $userIds}}) {
                userId
                pictureThumbnail
              }
            }
          `,
          { userIds }
        )

        if (cancelled) return

        const nextAvatarMap = Object.fromEntries(
          (result?.Employee || [])
            .map(employee => [employee.userId, normalizeAvatarUrl(employee.pictureThumbnail)] as const)
            .filter((entry): entry is [string, string] => Boolean(entry[1]))
        )
        setParticipantAvatarMap(nextAvatarMap)
      } catch (error) {
        if (!cancelled) {
          console.error('[WhiteboardEditor] Failed to fetch participant avatars:', error)
        }
      }
    }

    void fetchParticipantAvatars()

    return () => {
      cancelled = true
    }
  }, [participants, accessToken, graphqlClient])

  const presenceParticipants: DocumentParticipant[] = useMemo(() => {
    const selfIds = new Set([userInfo?.id, userInfo?.employeeDetails?.employeeId].filter(Boolean) as string[])
    return participants.map(participant => {
      const resolvedAvatar = selfIds.has(participant.userId)
        ? currentUserAvatar || participantAvatarMap[participant.userId] || participant.avatarUrl
        : participantAvatarMap[participant.userId] || participant.avatarUrl

      return resolvedAvatar && resolvedAvatar !== participant.avatarUrl
        ? { ...participant, avatarUrl: resolvedAvatar }
        : participant
    })
  }, [participants, currentUserAvatar, participantAvatarMap, userInfo?.id, userInfo?.employeeDetails?.employeeId])

  useEffect(() => {
    if (!whiteboardId || !collaborationSocket || !hasLoadedWhiteboard) return

    const provider = new SocketIoYjsProvider({
      socket: collaborationSocket,
      documentId: whiteboardId,
      entityType: 'whiteboard',
      ydoc,
      awareness,
      onSyncedChange: synced => {
        setIsSynced(synced)
      },
      onBootstrapRequired: async () => {
        const sceneData = initialSceneDataRef.current
        const hasNoElements = yElements.length === 0
        const hasNoFiles = yFiles.size === 0
        const hasNoAppState = yAppState.size === 0
        if (!sceneData || (!hasNoElements && !hasNoFiles && !hasNoAppState)) return

        Y.transact(ydoc, () => {
          if (hasNoElements && Array.isArray(sceneData.elements)) {
            syncWhiteboardElements(yElements, sceneData.elements as Record<string, unknown>[])
          }
          if (hasNoFiles && sceneData.files && typeof sceneData.files === 'object') {
            syncWhiteboardFiles(yFiles, sceneData.files as Record<string, unknown>)
          }
          if (hasNoAppState && sceneData.appState && typeof sceneData.appState === 'object') {
            syncWhiteboardAppState(
              yAppState,
              Object.fromEntries(
                Object.entries(sceneData.appState as Record<string, unknown>).filter(([key]) => !VIEWPORT_KEYS.has(key))
              )
            )
          }
        })
      }
    })

    providerRef.current = provider
    provider.start()

    return () => {
      provider.destroy()
      providerRef.current = null
      setIsSynced(false)
    }
  }, [whiteboardId, collaborationSocket, hasLoadedWhiteboard, ydoc, awareness, yElements, yFiles, yAppState])

  useEffect(() => {
    const sceneData = initialSceneDataRef.current
    if (!isSynced || !sceneData || !hasSceneContent(sceneData) || hasSeededFromSceneDataRef.current) return
    if (yElements.length > 0 || yFiles.size > 0) return

    Y.transact(
      ydoc,
      () => {
        if (Array.isArray(sceneData.elements)) {
          syncWhiteboardElements(yElements, sceneData.elements as Record<string, unknown>[])
        }
        if (sceneData.files && typeof sceneData.files === 'object') {
          syncWhiteboardFiles(yFiles, sceneData.files as Record<string, unknown>)
        }
        if (sceneData.appState && typeof sceneData.appState === 'object') {
          syncWhiteboardAppState(
            yAppState,
            Object.fromEntries(
              Object.entries(sceneData.appState as Record<string, unknown>).filter(([key]) => !VIEWPORT_KEYS.has(key))
            )
          )
        }
      },
      WHITEBOARD_SCENE_BOOTSTRAP_ORIGIN
    )
    hasSeededFromSceneDataRef.current = true
  }, [isSynced, ydoc, yElements, yFiles, yAppState])

  useEffect(() => {
    const el = excalidrawShellRef.current
    if (!el) return
    return installExcalidrawWhiteLabelDomPatches(el)
  }, [whiteboardId])

  useEffect(() => {
    if (!excalidrawApi || !excalidrawShellRef.current) return
    const timer = setTimeout(() => {
      if (excalidrawShellRef.current) patchFontsFromContainer(excalidrawShellRef.current)
    }, 200)
    return () => clearTimeout(timer)
  }, [excalidrawApi])

  useEffect(() => {
    if (!isSynced || !currentUserId) return
    const userColor = participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4'
    awareness.setLocalStateField('user', {
      id: currentUserId,
      userId: currentUserId,
      name: currentUserName || 'User',
      color: userColor,
      avatar: currentUserAvatar
    })
  }, [isSynced, awareness, currentUserId, currentUserName, currentUserAvatar, participants])

  useEffect(() => {
    if (!excalidrawApi) return

    const pushYjsToCanvas = () => {
      if (isRemoteUpdateRef.current) return
      isRemoteUpdateRef.current = true
      try {
        const rawElements: Record<string, unknown>[] = []
        yElements.forEach(yEl => {
          const el: any = {}
          ;(yEl as Y.Map<any>).forEach((v, k) => {
            el[k] = v
          })
          rawElements.push(el)
        })
        const elements = sanitizeSceneElements(rawElements)
        updateCommentAnchorElements(elements)
        const rawAppState =
          yAppState.size > 0
            ? (Object.fromEntries(yAppState.entries()) as Record<string, unknown>)
            : ((initialSceneDataRef.current?.appState as Record<string, unknown> | undefined) ?? undefined)
        const appState = rawAppState
          ? (() => {
              const copy = { ...rawAppState }
              delete copy.scrollX
              delete copy.scrollY
              delete copy.zoom
              return copy as Partial<AppState>
            })()
          : undefined
        excalidrawApi.updateScene(appState ? { elements, appState: appState as AppState } : { elements })

        const fileRecords: any[] = []
        const filesForScene: Record<string, unknown> = {}
        yFiles.forEach(json => {
          try {
            const file = JSON.parse(json)
            fileRecords.push(file)
            if (file?.id) {
              filesForScene[file.id] = file
            }
          } catch {
            /* skip invalid */
          }
        })
        lastAppliedRemoteSceneRef.current = serializeSceneDocument({
          elements: elements.map(el => JSON.parse(JSON.stringify(el))),
          files: Object.fromEntries(Object.entries(filesForScene).sort(([a], [b]) => a.localeCompare(b))),
          appState: appState ? JSON.parse(JSON.stringify(appState)) : undefined
        })
        if (fileRecords.length > 0) {
          excalidrawApi.addFiles(fileRecords)
        }
        if (
          elements.length > 0 ||
          fileRecords.length > 0 ||
          (!hasSceneContent(initialSceneDataRef.current) && !hasPersistedSnapshotRef.current)
        ) {
          hasHydratedCanvasRef.current = true
        }
      } finally {
        requestAnimationFrame(() => {
          isRemoteUpdateRef.current = false
        })
      }
    }

    const handleYjsChange = (_events: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === WHITEBOARD_LOCAL_YJS_ORIGIN) return
      pushYjsToCanvas()
    }

    yElements.observeDeep(handleYjsChange)
    yAppState.observeDeep(handleYjsChange)
    if (yElements.length > 0 || yFiles.size > 0) {
      pushYjsToCanvas()
    }

    return () => {
      yElements.unobserveDeep(handleYjsChange)
      yAppState.unobserveDeep(handleYjsChange)
    }
  }, [excalidrawApi, updateCommentAnchorElements, yElements, yFiles, yAppState])

  useEffect(() => {
    if (!excalidrawApi) return

    const pushFilesOnly = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === WHITEBOARD_LOCAL_YJS_ORIGIN) return
      if (isRemoteUpdateRef.current) return
      const fileRecords: any[] = []
      yFiles.forEach(json => {
        try {
          fileRecords.push(JSON.parse(json))
        } catch {
          /* skip */
        }
      })
      if (fileRecords.length === 0) return
      isRemoteUpdateRef.current = true
      try {
        excalidrawApi.addFiles(fileRecords)
      } finally {
        requestAnimationFrame(() => {
          isRemoteUpdateRef.current = false
        })
      }
    }

    yFiles.observe(pushFilesOnly)
    return () => {
      yFiles.unobserve(pushFilesOnly)
    }
  }, [excalidrawApi, yFiles])

  useEffect(() => {
    if (!excalidrawApi || !isSynced || hasRestoredViewportRef.current) return

    const resetInitialViewport = () => {
      if (!excalidrawApi || hasRestoredViewportRef.current) return
      hasRestoredViewportRef.current = true
      const defaultViewport = {
        scrollX: 0,
        scrollY: 0,
        zoom: 1
      }

      viewportRef.current = defaultViewport
      setViewport(defaultViewport)

      // Reset undo/redo so the loaded scene is the baseline. Without this, Ctrl+Z can
      // step past the initial state and wipe pre-existing whiteboard content.
      const clearHistory = () => {
        try {
          ;(excalidrawApi as unknown as { history?: { clear?: () => void } }).history?.clear?.()
        } catch {
          /* no-op */
        }
      }

      requestAnimationFrame(() => {
        excalidrawApi.updateScene({
          appState: {
            scrollX: defaultViewport.scrollX,
            scrollY: defaultViewport.scrollY,
            zoom: { value: defaultViewport.zoom as Zoom['value'] }
          } as Partial<AppState> as AppState
        })
        requestAnimationFrame(clearHistory)
      })
    }

    const timer = window.setTimeout(resetInitialViewport, 80)
    return () => window.clearTimeout(timer)
  }, [excalidrawApi, isSynced])

  const handleChange = useCallback(
    (elements: readonly SceneElement[], appState: AppState, files: BinaryFiles) => {
      updateCommentAnchorElements(elements)
      if (isRemoteUpdateRef.current || isReadonlyCanvas) return

      const hasLocalContent = elements.length > 0 || Object.keys(files).length > 0
      const hasPersistedBaseline = hasSceneContent(initialSceneDataRef.current) || hasPersistedSnapshotRef.current
      if (!hasLocalContent && !hasPersistedBaseline) return
      if (hasHydratedCanvasRef.current && !hasLocalContent) return
      const canBufferBeforeSync = !hasPersistedBaseline && hasLocalContent
      const isPreHydrationEmptyEcho = hasPersistedBaseline && !hasHydratedCanvasRef.current && !hasLocalContent
      if (isPreHydrationEmptyEcho) return
      const sceneData = buildSceneData(elements, files, appState)
      const nextSerialized = serializeSceneDocument(sceneData)
      if (lastAppliedRemoteSceneRef.current === nextSerialized) return
      if (!isSynced && !canBufferBeforeSync) return

      Y.transact(
        ydoc,
        () => {
          syncWhiteboardElements(yElements, elements as unknown as Record<string, unknown>[])
          syncWhiteboardFiles(yFiles, files as unknown as Record<string, unknown>)
          const persistedAppState = serializeAppState(appState)
          syncWhiteboardAppState(yAppState, persistedAppState)
        },
        WHITEBOARD_LOCAL_YJS_ORIGIN
      )
    },
    [ydoc, yElements, yFiles, yAppState, isSynced, isReadonlyCanvas, updateCommentAnchorElements]
  )

  const handlePointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number; tool: 'pointer' | 'laser' }; button: 'down' | 'up' }) => {
      if (!isSynced || isActuallyTrashed) return
      awareness.setLocalStateField('cursor', {
        x: payload.pointer.x,
        y: payload.pointer.y
      })
    },
    [isSynced, isActuallyTrashed, awareness]
  )

  const handleScrollChange = useCallback((scrollX: number, scrollY: number, zoomObj: Zoom) => {
    const nextViewport = { scrollX, scrollY, zoom: zoomObj.value }
    viewportRef.current = nextViewport
    setViewport(nextViewport)
  }, [])

  useEffect(() => {
    const shell = excalidrawShellRef.current
    if (!shell || !excalidrawApi) return

    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      event.stopPropagation()
      const appState = excalidrawApi.getAppState()
      const currentZoom = appState.zoom.value || 1
      const factor = Math.exp(-event.deltaY * 0.0015)
      const nextZoom = Math.min(30, Math.max(0.1, currentZoom * factor))
      excalidrawApi.updateScene({
        appState: {
          zoom: { value: nextZoom as Zoom['value'] }
        } as Partial<AppState> as AppState
      })
    }

    shell.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return () => {
      shell.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions)
    }
  }, [excalidrawApi])

  useEffect(() => {
    setCommentsVisible(false)
    setCommentPopoverPosition(null)
    setCommentContextMenu(null)
    setPendingCommentAnchor(null)
    setActiveCommentId(null)
  }, [whiteboardId])

  useEffect(() => {
    if (commentsEnabled) {
      return
    }

    setCommentsVisible(false)
    setCommentPopoverPosition(null)
    setCommentContextMenu(null)
    setPendingCommentAnchor(null)
    setActiveCommentId(null)
  }, [commentsEnabled])

  const openCommentPopover = useCallback((anchor: WhiteboardCommentAnchor, top: number, left: number) => {
    setPendingCommentAnchor(anchor)
    setCommentPopoverPosition({ top, left })
    setCommentContextMenu(null)
    setCommentsVisible(true)
  }, [])

  const handleCanvasContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!commentsEnabled || !excalidrawShellRef.current) {
        return
      }

      const bounds = excalidrawShellRef.current.getBoundingClientRect()
      const viewportX = event.clientX - bounds.left
      const viewportY = event.clientY - bounds.top
      const selectedElementIds = excalidrawApi?.getAppState().selectedElementIds ?? {}
      const selectedElements = excalidrawApi
        ?.getSceneElements()
        .filter(element => !element.isDeleted && Boolean(selectedElementIds[element.id]))
      const selectionAnchor =
        selectedElements && selectedElements.length > 0
          ? createWhiteboardCommentAnchorFromElements(selectedElements)
          : null
      const anchor =
        selectionAnchor ?? createWhiteboardCommentAnchorFromViewportPoint(viewportX, viewportY, viewportRef.current)

      setCommentContextMenu({
        top: event.clientY,
        left: event.clientX,
        anchor
      })
    },
    [commentsEnabled, excalidrawApi]
  )

  const handleContextMenuAddComment = useCallback(() => {
    if (!commentContextMenu) {
      return
    }

    openCommentPopover(commentContextMenu.anchor, commentContextMenu.top + 8, commentContextMenu.left + 8)
    setCommentContextMenu(null)
  }, [commentContextMenu, openCommentPopover])

  useEffect(() => {
    if (!commentContextMenu || !commentsEnabled) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const contextMenu = excalidrawShellRef.current?.querySelector('.context-menu')
      if (!contextMenu || contextMenu.querySelector('[data-whiteboard-add-comment="true"]')) {
        return
      }

      const separator = document.createElement('hr')
      separator.className = 'context-menu-item-separator'
      separator.dataset.whiteboardAddComment = 'true'

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'context-menu-item'
      button.dataset.whiteboardAddComment = 'true'

      const label = document.createElement('div')
      label.className = 'context-menu-item__label'
      label.textContent = t('whiteboard-comments-add')
      button.append(label)

      button.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        handleContextMenuAddComment()
      })

      contextMenu.append(separator, button)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [commentContextMenu, commentsEnabled, handleContextMenuAddComment, t])

  const closeCommentPopover = useCallback(() => {
    setCommentPopoverPosition(null)
    setPendingCommentAnchor(null)
  }, [])

  const jumpToCommentAnchor = useCallback(
    (commentId: string) => {
      const comment = comments.comments.find(item => item.id === commentId)
      if (!comment?.anchorData || !excalidrawApi || !excalidrawShellRef.current) {
        return
      }

      const zoom = excalidrawApi.getAppState().zoom.value
      const shell = excalidrawShellRef.current.getBoundingClientRect()
      const resolvedAnchor = resolveWhiteboardCommentAnchor(comment.anchorData, sceneElementsForCommentsRef.current)
      const center = getWhiteboardCommentAnchorCenter(resolvedAnchor)
      const scrollX = shell.width / (2 * zoom) - center.x
      const scrollY = shell.height / (2 * zoom) - center.y

      viewportRef.current = {
        scrollX,
        scrollY,
        zoom
      }
      setViewport(viewportRef.current)

      excalidrawApi.updateScene({
        appState: {
          scrollX,
          scrollY
        }
      })

      setActiveCommentId(commentId)
      setCommentsVisible(true)
      requestAnimationFrame(() => {
        const thread = document.querySelector(`[data-testid="comment-thread-${commentId}"]`)
        if (thread instanceof HTMLElement) {
          thread.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    },
    [comments.comments, excalidrawApi]
  )

  const handleCreateWhiteboardComment = useCallback(
    async (content: string) => {
      if (!pendingCommentAnchor) {
        toast.error(t('whiteboard-comment-select-location'))
        return
      }

      const created = await comments.createComment({
        type: 'selection',
        content,
        selectedText: t('whiteboard-comment-anchor-label'),
        anchorData: pendingCommentAnchor,
        createdByName: currentUserName,
        createdByAvatar: currentUserAvatar
      })

      if (created) {
        setActiveCommentId(created.id)
      } else {
        toast.error(t('whiteboard-comment-create-failed'))
      }

      closeCommentPopover()
    },
    [closeCommentPopover, comments, currentUserAvatar, currentUserName, pendingCommentAnchor, t]
  )

  const handleCommentThreadCreate = useCallback(
    async (content: string, parentId?: string, userName?: string, userAvatar?: string) => {
      if (!parentId) {
        toast.error(t('whiteboard-comment-panel-disabled'))
        return
      }

      const reply = await comments.replyToComment(parentId, content, userName, userAvatar)
      if (!reply) {
        toast.error(t('whiteboard-comment-reply-failed'))
        return
      }

      setActiveCommentId(parentId)
    },
    [comments, t]
  )

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      await comments.resolveComment(commentId)
      setActiveCommentId(current => (current === commentId ? null : current))
    },
    [comments]
  )

  const handleUnresolveComment = useCallback(
    async (commentId: string) => {
      const ok = await comments.unresolveComment(commentId)
      if (ok) {
        setActiveCommentId(commentId)
      }
      return ok
    },
    [comments]
  )

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await comments.deleteComment(commentId)
      setActiveCommentId(current => (current === commentId ? null : current))
    },
    [comments]
  )

  const handleExportPng = useCallback(async () => {
    if (!excalidrawApi) return
    const elements = excalidrawApi.getSceneElements()
    const blob = await exportToBlob({
      elements,
      appState: excalidrawApi.getAppState(),
      files: excalidrawApi.getFiles()
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${whiteboard?.title || 'whiteboard'}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, [excalidrawApi, whiteboard])

  const handleExportSvg = useCallback(async () => {
    if (!excalidrawApi) return
    const elements = excalidrawApi.getSceneElements()
    const svg = await exportToSvg({
      elements,
      appState: excalidrawApi.getAppState(),
      files: excalidrawApi.getFiles()
    })
    const svgStr = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${whiteboard?.title || 'whiteboard'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [excalidrawApi, whiteboard])

  const canEditTitle = !isReadonlyCanvas
  const handleEditorRename = useCallback(
    async (newTitle: string) => {
      if (!accessToken || !whiteboardId || isActuallyTrashed || !canEditTitle) return
      const updated = await WhiteboardApiService.update(accessToken, whiteboardId, { title: newTitle })
      setWhiteboard(prev => (prev ? { ...prev, title: updated?.title ?? newTitle } : prev))
    },
    [accessToken, canEditTitle, isActuallyTrashed, whiteboardId]
  )

  useEffect(() => {
    if (!collaborationSocket) return
    const handleTitleUpdated = (payload: { documentId: string; title?: string; userId?: string }) => {
      if (payload.documentId !== whiteboardId) return
      if (payload.userId && payload.userId === currentUserId) return
      const nextTitle = payload.title ?? ''
      setWhiteboard(prev => (prev ? { ...prev, title: nextTitle } : prev))
      if (!isRenamingTitleRef.current) {
        setDraftTitle(nextTitle)
      }
    }
    collaborationSocket.on('whiteboard_title_updated', handleTitleUpdated)
    return () => {
      collaborationSocket.off('whiteboard_title_updated', handleTitleUpdated)
    }
  }, [collaborationSocket, whiteboardId, currentUserId])

  const beginRenameTitle = useCallback(() => {
    if (!canEditTitle || isRenameSaving) return
    setDraftTitle(whiteboard?.title ?? '')
    setIsRenamingTitle(true)
  }, [canEditTitle, isRenameSaving, whiteboard?.title])

  const cancelRenameTitle = useCallback(() => {
    setDraftTitle(whiteboard?.title ?? '')
    setIsRenamingTitle(false)
  }, [whiteboard?.title])

  const commitRenameTitle = useCallback(async () => {
    if (!isRenamingTitle || isRenameSaving) return
    const trimmed = draftTitle.trim()
    const current = whiteboard?.title ?? ''
    if (!trimmed || trimmed === current) {
      setDraftTitle(current)
      setIsRenamingTitle(false)
      return
    }
    setIsRenameSaving(true)
    try {
      await handleEditorRename(trimmed)
      setIsRenamingTitle(false)
    } catch (error) {
      console.error('Failed to rename whiteboard:', error)
    } finally {
      setIsRenameSaving(false)
    }
  }, [draftTitle, handleEditorRename, isRenameSaving, isRenamingTitle, whiteboard?.title])

  useEffect(() => {
    isRenamingTitleRef.current = isRenamingTitle
    if (isRenamingTitle) {
      const id = window.setTimeout(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      }, 0)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [isRenamingTitle])

  const handleBackgroundColorChange = useCallback(
    (color: string) => {
      if (!excalidrawApi || isReadonlyCanvas) return
      excalidrawApi.updateScene({ appState: { viewBackgroundColor: color } as Partial<AppState> as AppState })
      setBgColorPopoverOpen(false)
    },
    [excalidrawApi, isReadonlyCanvas]
  )
  const sceneElementsForComments = sceneElementsForCommentsRef.current

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:w-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-background">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
            <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          </Button>
          {isRenamingTitle ? (
            <input
              ref={renameInputRef}
              type="text"
              value={draftTitle}
              onChange={event => setDraftTitle(event.target.value)}
              onBlur={() => {
                void commitRenameTitle()
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  ;(event.currentTarget as HTMLInputElement).blur()
                  return
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelRenameTitle()
                }
              }}
              disabled={isRenameSaving}
              className="gba:w-full gba:max-w-[320px] gba:h-8 gba:px-2 gba:text-lg gba:font-semibold gba:text-foreground gba:border gba:border-input gba:rounded-md gba:bg-background focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
              placeholder={t('whiteboard-rename-placeholder')}
              data-testid={`${testId}-title-input`}
            />
          ) : canEditTitle ? (
            <button
              type="button"
              className="gba:text-lg gba:font-semibold gba:truncate gba:max-w-md gba:hover:underline gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
              onClick={beginRenameTitle}
              data-testid={`${testId}-title`}
            >
              {whiteboard?.title || t('whiteboard-untitled')}
            </button>
          ) : (
            <span className="gba:text-lg gba:font-semibold gba:truncate gba:max-w-md" data-testid={`${testId}-title`}>
              {whiteboard?.title || t('whiteboard-untitled')}
            </span>
          )}
          {isSynced && <span className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-success" />}
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {presenceParticipants.length > 0 && (
            <PresenceIndicator participants={presenceParticipants} data-testid={`${testId}-presence`} />
          )}
          {!isReadonlyCanvas && excalidrawApi ? (
            <Popover open={bgColorPopoverOpen} onOpenChange={setBgColorPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('whiteboard-background-color')}
                  title={t('whiteboard-background-color')}
                  data-testid={`${testId}-background-color`}
                >
                  <PaintBucketIcon className="gba:h-4 gba:w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="gba:w-auto gba:p-2">
                <div className="gba:grid gba:grid-cols-6 gba:gap-2">
                  {WHITEBOARD_BACKGROUND_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleBackgroundColorChange(color)}
                      className="gba:h-7 gba:w-7 gba:rounded-md gba:border gba:border-input gba:transition-transform gba:hover:scale-110"
                      style={{ backgroundColor: color }}
                      aria-label={color}
                      data-testid={`${testId}-background-color-${color}`}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gba:gap-1.5" data-testid={`${testId}-whiteboard-menu`}>
                {t('whiteboard-menu-label')}
                <CaretDownIcon className="gba:h-3 gba:w-3 gba:opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gba:w-52">
              <DropdownMenuItem onClick={handleExportPng} data-testid={`${testId}-export-png`}>
                <ImageIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('whiteboard-export-png')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSvg} data-testid={`${testId}-export-svg`}>
                <DownloadSimpleIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('whiteboard-export-svg')}
              </DropdownMenuItem>
              {!isActuallyTrashed && canManageSharing ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShareDialogOpen(true)} data-testid={`${testId}-share`}>
                    <ShareNetworkIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('whiteboard-share')}
                  </DropdownMenuItem>
                  {hasSharedUsers ? (
                    <DropdownMenuItem
                      onClick={() => setManageSharesDialogOpen(true)}
                      data-testid={`${testId}-manage-shares`}
                    >
                      <UsersThreeIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('whiteboard-manage-shares')}
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {commentsEnabled ? (
            <Button
              variant={commentsVisible ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCommentsVisible(current => !current)}
              aria-label={t('whiteboard-comments-toggle')}
              title={t('whiteboard-comments-toggle')}
              data-testid={`${testId}-comments-toggle`}
            >
              <MessageSquare className="gba:h-4 gba:w-4" />
              {comments.unresolvedCount > 0 ? (
                <Badge variant="warning" className="gba:ml-1 gba:h-4 gba:px-1 gba:py-0 gba:text-xs">
                  {comments.unresolvedCount}
                </Badge>
              ) : null}
            </Button>
          ) : null}
          {onToggleAiChat && !isReadonlyCanvas ? (
            <AiButton
              variant={aiChatVisible ? 'default' : 'outline'}
              size="sm"
              active={aiChatVisible}
              onClick={onToggleAiChat}
              aria-label={t('whiteboard-ai-toggle')}
              title={t('whiteboard-ai-toggle')}
              data-testid={`${testId}-ai-toggle`}
            >
              AI
            </AiButton>
          ) : null}
        </div>
      </div>

      {!isActuallyTrashed && isReadonlyCanvas ? (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-warning/30 gba:bg-warning/10 gba:px-4 gba:py-2 gba:text-sm gba:text-foreground"
          data-testid={`${testId}-readonly-banner`}
        >
          <ChatCenteredTextIcon className="gba:h-4 gba:w-4 gba:text-warning" />
          <span>
            {commentsEnabled ? t('whiteboard-comment-readonly-banner') : t('whiteboard-view-readonly-banner')}
          </span>
        </div>
      ) : null}

      {/* Canvas + docked comments panel row */}
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:w-full">
        <div
          ref={excalidrawShellRef}
          className="gba:flex-1 gba:relative gba:overflow-visible nw-whiteboard-excalidraw"
          style={{ minHeight: 0 }}
          onContextMenu={handleCanvasContextMenu}
        >
          <Excalidraw
            excalidrawAPI={handleExcalidrawApi}
            initialData={initialExcalidrawData}
            viewModeEnabled={isReadonlyCanvas}
            onChange={handleChange}
            onPointerUpdate={handlePointerUpdate}
            onScrollChange={handleScrollChange}
            langCode={excalidrawLangCode}
            aiEnabled={false}
            {...({ onLinkOpen: handleLinkOpen } as Record<string, unknown>)}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                export: false,
                saveAsImage: false
              }
            }}
            theme="light"
          >
            <MainMenu>
              <MainMenu.DefaultItems.ToggleTheme />
              {!isActuallyTrashed && !isReadonlyCanvas ? <MainMenu.DefaultItems.ClearCanvas /> : null}
            </MainMenu>
          </Excalidraw>
          {commentsEnabled ? (
            <WhiteboardCommentPins
              key={commentAnchorVersion}
              comments={comments.comments}
              viewport={viewport}
              sceneElements={sceneElementsForComments}
              activeCommentId={activeCommentId}
              onSelectComment={jumpToCommentAnchor}
              data-testid={`${testId}-comment-pins`}
            />
          ) : null}
          {isSynced && (
            <WhiteboardCollaboratorCursors
              awareness={awareness}
              currentUserId={currentUserId}
              participants={presenceParticipants}
              viewport={viewport}
              data-testid={`${testId}-cursors`}
            />
          )}
        </div>

        {commentsEnabled && commentsVisible ? (
          <CommentPanel
            comments={comments.comments}
            unresolvedCount={comments.unresolvedCount}
            isLoading={comments.isLoading}
            onCreateComment={handleCommentThreadCreate}
            onUpdateComment={async (commentId, content) => {
              await comments.updateComment(commentId, { content })
            }}
            onResolveComment={handleResolveComment}
            onUnresolveComment={handleUnresolveComment}
            onDeleteComment={handleDeleteComment}
            onClose={() => setCommentsVisible(false)}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onUnhighlight={commentId => {
              setActiveCommentId(current => (current === commentId ? null : current))
            }}
            onScrollToHighlight={jumpToCommentAnchor}
            disableCreateComment
            disabledCreateMessage={t('whiteboard-comment-panel-disabled')}
            layout="docked"
            messages={{
              addPlaceholder: t('whiteboard-comment-panel-placeholder')
            }}
            data-testid={`${testId}-comments-panel`}
          />
        ) : null}
      </div>

      <ShareWhiteboardDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        whiteboardId={whiteboardId}
        whiteboardTitle={whiteboard?.title || t('whiteboard-untitled')}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        accessToken={accessToken}
        onManageAccess={
          hasSharedUsers
            ? () => {
                setShareDialogOpen(false)
                setManageSharesDialogOpen(true)
              }
            : undefined
        }
        onShareComplete={() => void refreshShareCount()}
        data-testid={`${testId}-share-dialog`}
      />

      {accessToken ? (
        <ManageSharesDialog
          open={manageSharesDialogOpen}
          onOpenChange={setManageSharesDialogOpen}
          whiteboardId={whiteboardId}
          whiteboardTitle={whiteboard?.title || t('whiteboard-untitled')}
          accessToken={accessToken}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          onSharesChanged={() => void refreshShareCount()}
          onAddMoreUsers={() => {
            setManageSharesDialogOpen(false)
            setShareDialogOpen(true)
          }}
          data-testid={`${testId}-manage-shares-dialog`}
        />
      ) : null}

      <InlineCommentPopover
        isOpen={!!commentPopoverPosition && !!pendingCommentAnchor}
        position={commentPopoverPosition}
        onSubmit={content => {
          void handleCreateWhiteboardComment(content)
        }}
        onClose={closeCommentPopover}
        messages={{
          addComment: t('whiteboard-comments-add'),
          placeholder: t('whiteboard-comment-popover-placeholder'),
          comment: t('whiteboard-comments-add')
        }}
        data-testid={`${testId}-comment-popover`}
      />
    </div>
  )
}
