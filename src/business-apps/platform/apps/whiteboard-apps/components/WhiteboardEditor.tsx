import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { NW_FUNNEL_DISPLAY_FONT_FAMILY } from '../utils/registerFunnelDisplayExcalidraw'
import { Excalidraw, MainMenu, exportToBlob, exportToSvg, restoreElements } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import '../styles/excalidrawWhiteLabel.css'
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  Zoom
} from '@excalidraw/excalidraw/types'
import { useCurrentUserPicture } from '../../every-ai/hooks/useCurrentUserPicture'
import { installExcalidrawWhiteLabelDomPatches } from '../utils/excalidrawWhiteLabelDom'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, Download, Share2, Image as ImageIcon, Sparkles } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCollaboration } from '../../shared/hooks/useCollaboration'
import { SocketIoYjsProvider } from '../../shared/services/SocketIoYjsProvider'
import { PresenceIndicator } from '../../shared/components/PresenceIndicator'
import { WhiteboardCollaboratorCursors } from './WhiteboardCollaboratorCursors'
import { ShareWhiteboardDialog } from './ShareWhiteboardDialog'
import { RenameWhiteboardDialog } from './RenameWhiteboardDialog'
import { WhiteboardApiService } from '../services'
import translations from '../_i18n'
import type { WhiteboardSummary } from '../types'
import type { DocumentParticipant } from '../../shared/services/CollaborationClient'

/** Yjs transaction origin for local Excalidraw edits — observer ignores these to avoid feedback loops. */
const WB_YJS_ORIGIN = 'nw-whiteboard-local'
const WB_SCENE_BOOTSTRAP_ORIGIN = 'nw-whiteboard-scene-bootstrap'

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

function serializeAppState(appState: AppState): Record<string, unknown> {
  return {
    viewBackgroundColor: appState.viewBackgroundColor
  }
}

function buildSceneData(
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles,
  appState: AppState
): Record<string, unknown> {
  return {
    elements: elements.map(el => JSON.parse(JSON.stringify(el))),
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

  return JSON.stringify({
    elements,
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)))
  })
}

function sanitizeSceneElements(elements: Record<string, unknown>[]): ExcalidrawElement[] {
  try {
    return restoreElements(elements as never, null, {
      refreshDimensions: true,
      repairBindings: true
    }) as unknown as ExcalidrawElement[]
  } catch (error) {
    console.error('Failed to restore scene elements:', error)
    return []
  }
}

interface WhiteboardEditorProps extends BusinessAppContextProps {
  whiteboardId: string
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
  accessToken,
  userInfo,
  onBack,
  onAiReady,
  onToggleAiChat,
  aiChatVisible,
  'data-testid': testId = 'whiteboard-editor'
}) => {
  const { t } = useTranslation(translations)
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [whiteboard, setWhiteboard] = useState<WhiteboardSummary | null>(null)
  const [hasLoadedWhiteboard, setHasLoadedWhiteboard] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [participantAvatarMap, setParticipantAvatarMap] = useState<Record<string, string>>({})
  const providerRef = useRef<SocketIoYjsProvider | null>(null)
  const excalidrawShellRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef({ scrollX: 0, scrollY: 0, zoom: 1 })
  const isRemoteUpdateRef = useRef(false)
  const hasHydratedCanvasRef = useRef(false)
  const hasPersistedSnapshotRef = useRef(false)
  const hasRestoredViewportRef = useRef(false)
  const hasSeededFromSceneDataRef = useRef(false)
  const lastAppliedRemoteSceneRef = useRef<string | null>(null)
  const sceneSaveTimeoutRef = useRef<number | null>(null)
  const lastSavedSceneRef = useRef<string | null>(null)
  const pendingSaveRef = useRef<Record<string, unknown> | null>(null)
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
  const yElements = useMemo(() => ydoc.getArray('elements'), [ydoc])
  const yFiles = useMemo(() => ydoc.getMap<string>('files'), [ydoc])
  const yAppState = useMemo(() => ydoc.getMap<unknown>('appState'), [ydoc])

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
    lastSavedSceneRef.current = null
    WhiteboardApiService.get(accessToken, whiteboardId)
      .then(loadedWhiteboard => {
        setWhiteboard(loadedWhiteboard)
        initialSceneDataRef.current = loadedWhiteboard.sceneData as Record<string, unknown> | undefined
        hasPersistedSnapshotRef.current = Boolean(
          (loadedWhiteboard.contentJson as Record<string, unknown> | undefined)?.yjsStateBase64
        )
        lastSavedSceneRef.current = serializeSceneDocument(
          (loadedWhiteboard.sceneData as Record<string, unknown> | undefined) || null
        )
      })
      .catch(err => console.error('Failed to load whiteboard:', err.message))
      .finally(() => setHasLoadedWhiteboard(true))
  }, [accessToken, whiteboardId])

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
    enabled: !!whiteboardId && hasLoadedWhiteboard,
    accessToken
  })

  const scheduleSceneSave = useCallback(
    (sceneData: Record<string, unknown>) => {
      if (!accessToken || !whiteboardId) return

      const nextSerialized = serializeSceneDocument(sceneData)
      if (lastSavedSceneRef.current === nextSerialized) return

      pendingSaveRef.current = sceneData

      if (sceneSaveTimeoutRef.current) {
        window.clearTimeout(sceneSaveTimeoutRef.current)
      }

      sceneSaveTimeoutRef.current = window.setTimeout(() => {
        pendingSaveRef.current = null
        WhiteboardApiService.update(accessToken, whiteboardId, { sceneData })
          .then(updatedWhiteboard => {
            initialSceneDataRef.current = sceneData
            lastSavedSceneRef.current = nextSerialized
            setWhiteboard(updated => ({ ...(updated || updatedWhiteboard), sceneData }))
          })
          .catch(err => {
            console.error('Failed to persist whiteboard scene:', err.message)
          })
      }, 800)
    },
    [accessToken, whiteboardId]
  )

  const flushPendingSave = useCallback(() => {
    if (sceneSaveTimeoutRef.current) {
      window.clearTimeout(sceneSaveTimeoutRef.current)
      sceneSaveTimeoutRef.current = null
    }
    const sceneData = pendingSaveRef.current
    if (!sceneData || !accessToken || !whiteboardId) return
    pendingSaveRef.current = null
    WhiteboardApiService.update(accessToken, whiteboardId, { sceneData }).catch(err => {
      console.error('Failed to flush whiteboard save:', err.message)
    })
  }, [accessToken, whiteboardId])

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
            const els = sceneData.elements as Record<string, unknown>[]
            els.forEach((el: Record<string, unknown>) => {
              const yEl = new Y.Map()
              Object.entries(el).forEach(([k, v]) => yEl.set(k, v))
              yElements.push([yEl])
            })
          }
          if (hasNoFiles && sceneData.files && typeof sceneData.files === 'object') {
            const filesObj = sceneData.files as Record<string, unknown>
            for (const [id, file] of Object.entries(filesObj)) {
              yFiles.set(id, JSON.stringify(file))
            }
          }
          if (hasNoAppState && sceneData.appState && typeof sceneData.appState === 'object') {
            for (const [key, value] of Object.entries(sceneData.appState as Record<string, unknown>)) {
              yAppState.set(key, value)
            }
          }
        })
      }
    })

    providerRef.current = provider
    provider.start()

    return () => {
      flushPendingSave()
      provider.destroy()
      providerRef.current = null
      setIsSynced(false)
    }
  }, [
    whiteboardId,
    collaborationSocket,
    hasLoadedWhiteboard,
    ydoc,
    awareness,
    yElements,
    yFiles,
    yAppState,
    flushPendingSave
  ])

  useEffect(() => {
    const sceneData = initialSceneDataRef.current
    if (!isSynced || !sceneData || !hasSceneContent(sceneData) || hasSeededFromSceneDataRef.current) return
    if (yElements.length > 0 || yFiles.size > 0) return

    Y.transact(
      ydoc,
      () => {
        if (Array.isArray(sceneData.elements)) {
          const els = sceneData.elements as Record<string, unknown>[]
          els.forEach(el => {
            const yEl = new Y.Map()
            Object.entries(el).forEach(([k, v]) => yEl.set(k, v))
            yElements.push([yEl])
          })
        }
        if (sceneData.files && typeof sceneData.files === 'object') {
          const filesObj = sceneData.files as Record<string, unknown>
          for (const [id, file] of Object.entries(filesObj)) {
            yFiles.set(id, JSON.stringify(file))
          }
        }
        if (sceneData.appState && typeof sceneData.appState === 'object') {
          for (const [key, value] of Object.entries(sceneData.appState as Record<string, unknown>)) {
            yAppState.set(key, value)
          }
        }
      },
      WB_SCENE_BOOTSTRAP_ORIGIN
    )
    hasSeededFromSceneDataRef.current = true
  }, [isSynced, ydoc, yElements, yFiles, yAppState])

  useEffect(() => {
    const onBeforeUnload = () => flushPendingSave()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [flushPendingSave])

  useEffect(() => {
    const el = excalidrawShellRef.current
    if (!el) return
    return installExcalidrawWhiteLabelDomPatches(el)
  }, [whiteboardId])

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
        const rawAppState =
          yAppState.size > 0
            ? (Object.fromEntries(yAppState.entries()) as Record<string, unknown>)
            : ((initialSceneDataRef.current?.appState as Record<string, unknown> | undefined) ?? undefined)
        const appState = rawAppState
          ? (() => {
              const { ...shared } = rawAppState
              return shared as Partial<AppState>
            })()
          : undefined
        excalidrawApi.updateScene(appState ? { elements, appState } : { elements })

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
        if (!hasRestoredViewportRef.current && elements.length > 0) {
          const hasViewportState =
            typeof appState?.scrollX === 'number' &&
            typeof appState?.scrollY === 'number' &&
            typeof appState?.zoom === 'object' &&
            appState.zoom !== null
          if (!hasViewportState) {
            requestAnimationFrame(() => {
              excalidrawApi.scrollToContent(elements, {
                fitToViewport: true,
                viewportZoomFactor: 0.9,
                animate: false
              })
            })
          }
          hasRestoredViewportRef.current = true
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
      if (transaction.origin === WB_YJS_ORIGIN) return
      pushYjsToCanvas()
    }

    yElements.observeDeep(handleYjsChange)
    if (yElements.length > 0 || yFiles.size > 0) {
      pushYjsToCanvas()
    }

    return () => {
      yElements.unobserveDeep(handleYjsChange)
    }
  }, [excalidrawApi, yElements, yFiles, yAppState])

  useEffect(() => {
    if (!excalidrawApi) return

    const pushFilesOnly = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === WB_YJS_ORIGIN) return
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

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (isRemoteUpdateRef.current) return

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
          yElements.delete(0, yElements.length)
          elements.forEach(el => {
            const yEl = new Y.Map()
            Object.entries(el).forEach(([k, v]) => {
              if (v !== undefined && typeof v !== 'function') {
                yEl.set(k, JSON.parse(JSON.stringify(v)))
              }
            })
            yElements.push([yEl])
          })

          const ids = new Set(Object.keys(files))
          yFiles.forEach((_, id) => {
            if (!ids.has(id)) yFiles.delete(id)
          })
          for (const [id, file] of Object.entries(files)) {
            yFiles.set(id, JSON.stringify(file))
          }
          const persistedAppState = serializeAppState(appState)
          yAppState.clear()
          for (const [key, value] of Object.entries(persistedAppState)) {
            yAppState.set(key, value)
          }
        },
        WB_YJS_ORIGIN
      )

      scheduleSceneSave(sceneData)
    },
    [ydoc, yElements, yFiles, yAppState, isSynced, scheduleSceneSave]
  )

  const handlePointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number; tool: 'pointer' | 'laser' }; button: 'down' | 'up' }) => {
      if (!isSynced) return
      awareness.setLocalStateField('cursor', {
        x: payload.pointer.x,
        y: payload.pointer.y
      })
    },
    [isSynced, awareness]
  )

  const handleScrollChange = useCallback((scrollX: number, scrollY: number, zoomObj: Zoom) => {
    viewportRef.current = { scrollX, scrollY, zoom: zoomObj.value }
  }, [])

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

  const handleEditorRename = useCallback(
    async (newTitle: string) => {
      if (!accessToken || !whiteboardId) return
      const updated = await WhiteboardApiService.update(accessToken, whiteboardId, { title: newTitle })
      setWhiteboard(prev => (prev ? { ...prev, title: updated?.title ?? newTitle } : prev))
    },
    [accessToken, whiteboardId]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:w-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-background">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
            <ArrowLeft className="gba:h-4 gba:w-4" />
          </Button>
          <button
            type="button"
            className="gba:text-lg gba:font-semibold gba:truncate gba:max-w-md gba:hover:underline gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
            onClick={() => setRenameDialogOpen(true)}
            data-testid={`${testId}-title`}
          >
            {whiteboard?.title || t('whiteboard-untitled')}
          </button>
          {isSynced && <span className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-success" />}
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {presenceParticipants.length > 0 && (
            <PresenceIndicator participants={presenceParticipants} data-testid={`${testId}-presence`} />
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleExportPng} data-testid={`${testId}-export-png`}>
                  <ImageIcon className="gba:h-4 gba:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('whiteboard-export-png')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleExportSvg} data-testid={`${testId}-export-svg`}>
                  <Download className="gba:h-4 gba:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('whiteboard-export-svg')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  data-testid={`${testId}-share`}
                >
                  <Share2 className="gba:h-4 gba:w-4 gba:mr-1" />
                  {t('whiteboard-share')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('whiteboard-share')}</TooltipContent>
            </Tooltip>
            {onToggleAiChat && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={aiChatVisible ? 'default' : 'outline'}
                    size="sm"
                    onClick={onToggleAiChat}
                    data-testid={`${testId}-ai-toggle`}
                  >
                    <Sparkles className="gba:h-4 gba:w-4 gba:mr-1" />
                    AI
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('whiteboard-ai-toggle')}</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={excalidrawShellRef}
        className="gba:flex-1 gba:relative gba:overflow-visible nw-whiteboard-excalidraw"
        style={{ minHeight: 0 }}
      >
        <Excalidraw
          excalidrawAPI={api => setExcalidrawApi(api)}
          initialData={{
            appState: {
              currentItemRoughness: 0,
              currentItemFontFamily: NW_FUNNEL_DISPLAY_FONT_FAMILY
            }
          }}
          onChange={handleChange}
          onPointerUpdate={handlePointerUpdate}
          onScrollChange={handleScrollChange}
          aiEnabled={false}
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
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.ClearCanvas />
          </MainMenu>
        </Excalidraw>
        {isSynced && (
          <WhiteboardCollaboratorCursors
            awareness={awareness}
            currentUserId={currentUserId}
            participants={presenceParticipants}
            viewport={viewportRef.current}
            data-testid={`${testId}-cursors`}
          />
        )}
      </div>

      <RenameWhiteboardDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentTitle={whiteboard?.title || ''}
        onRename={handleEditorRename}
        data-testid={`${testId}-rename-dialog`}
      />

      <ShareWhiteboardDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        whiteboardId={whiteboardId}
        whiteboardTitle={whiteboard?.title || t('whiteboard-untitled')}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        accessToken={accessToken}
        data-testid={`${testId}-share-dialog`}
      />
    </div>
  )
}
