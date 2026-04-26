/**
 * SlideEditor Component
 *
 * Professional slide editor with canvas-based editing, shapes, images, and full styling.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Play,
  Trash2,
  ZoomIn,
  ZoomOut,
  Pencil,
  Presentation,
  Cast,
  MonitorX,
  ChevronLeft,
  ChevronRight,
  Minimize,
  CopyPlus,
  X,
  PanelRight,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Slide as SlideType } from '../types'
import { SlidesApiService } from '../services'
import { SlideCanvas } from './SlideCanvas'
import { SlideThumbnail } from './SlideThumbnail'
import { PropertyPanel } from './PropertyPanel'
import { CollaboratorCursors } from './CollaboratorCursors'
import { PresenceIndicator } from '../../shared/components/PresenceIndicator'
import { AutoSaveIndicator } from '../../shared/components/AutoSaveIndicator'
import { SlideEditorHeaderActions } from './editor/SlideEditorHeaderActions'
import { SLIDE_THEMES, getThemeById } from './slideThemes'
import { SlideToolbarRibbon } from './toolbar'
import { useToolbarContext, type ToolbarContext } from '../hooks/useToolbarContext'
import { useSlideCollaboration } from '../hooks/useSlideCollaboration'
import { clearImageObjectUrlCache } from '../hooks/useImageObjectUrls'
import { usePresentationCast, type CastSlideData } from '../hooks/usePresentationCast'
import { useEffectManager } from '../hooks/useEffectManager'
import { useSpeechMatcher, type MatchResult, type VideoTriggerResult } from '../hooks/useSpeechMatcher'
import { AIAssistSettings, loadAIAssistConfig, saveAIAssistConfig } from './AIAssistSettings'
import type { AIAssistStatus } from './PresenterView'
import {
  type AIAssistConfig,
  type AnySlideElement,
  type SlideData,
  type SlideTransition,
  type TextElement,
  type TextLink,
  type ShapeElement,
  type ShapeInText,
  type GroupElement,
  type ConnectorElement,
  type ShapeGeometryMetadata,
  createTextElement,
  createImageElement,
  createVideoElement,
  PRESET_GRADIENTS,
  gradientToCss,
  COLOR_PRESETS,
  getSlideCanvasSize,
  getShapeGeometry,
  textElementStubForShapeInText
} from './slideElements'
import { SlideLayoutPicker } from './SlideLayoutPicker'
import { SlideMasterView } from './SlideMasterView'
import type { SlideMaster } from '../types/slideMaster'
import {
  getEffectiveMasters,
  cloneLayoutToSlide,
  findLayoutById,
  ensureTextFits,
  recolorSlidesForTheme
} from '../data/defaultSlideMaster'
import { GradientBuilder } from './GradientBuilder'
import { FloatingTextActions } from './FloatingTextActions'
import { LinkDialog } from './LinkDialog'
import { PdfExportDialog } from './PdfExportDialog'
import { SpeakerNotesPanel } from './SpeakerNotesPanel'
import { PresenterView } from './PresenterView'
import { SlideTransitionPlayer } from './SlideTransitionPlayer'
import { SpellCheckPanel } from './SpellCheckPanel'
import { useVoiceInput } from '../../shared'
import { useSlideSpellCheck } from '../hooks/useSlideSpellCheck'
import { useSlideTransition } from '../hooks/useSlideTransition'
import type { SlideAnnotation } from '../types/slideSpellCheck'
import { exportToPptx } from '../utils/exportUtils'
import { adjustLinksAfterEdit, detectUrls, mergeLinks, createLink } from '../utils/linkUtils'
import translations from '../_i18n'
import {
  alignElements,
  distributeElements,
  flipShape,
  groupElements,
  refreshConnectorFromBindings,
  ungroupElement,
  type AlignAxis,
  type DistributeAxis,
  type ElementBounds
} from './shapeOperations'

import { sanitizeSlideMediaUrl, type SlideMediaKind } from '../utils/slideMediaUrl'
import {
  applyCaretFormattingToInsertedText,
  applyRichTextFormatting,
  createDefaultShapeText,
  getCharacterRichTextFormattingUpdate,
  getTextEditDelta,
  getRichTextStyleAtRange,
  hasCharacterRichTextFormattingUpdate,
  isRichTextFormattingUpdate,
  replaceRichTextContent,
  type RichTextFormattingUpdate,
  type RichTextSelectionRange
} from '../utils/richTextEditing'
import {
  serializeEditingDraftValue,
  serializeLiveEditingValue,
  shouldRehydrateFromLiveUpdate
} from '../utils/liveEditingSync'

/**
 * Local adapter over the shared slide-media sanitizer so existing call sites
 * can keep passing the `['image/', 'video/']`-style `allowedDataTypes` array.
 */
function sanitizeMediaUrl(url: string | undefined, allowedDataTypes: string[] = ['image/', 'video/']): string {
  const allowImage = allowedDataTypes.some(t => t.startsWith('image/'))
  const allowVideo = allowedDataTypes.some(t => t.startsWith('video/'))
  const kinds: SlideMediaKind[] = []
  if (allowImage) kinds.push('image')
  if (allowVideo) kinds.push('video')
  for (const kind of kinds) {
    const sanitized = sanitizeSlideMediaUrl(url, kind)
    if (sanitized) return sanitized
  }
  return ''
}

type ActiveRichTextDraft =
  | { id: string; kind: 'text'; element: TextElement }
  | { id: string; kind: 'shape'; element: ShapeInText }

type PendingCaretFormatting = {
  id: string
  formatting: RichTextFormattingUpdate
}

function createActiveRichTextDraft(element: AnySlideElement): ActiveRichTextDraft | null {
  if (element.type === 'text') {
    return { id: element.id, kind: 'text', element }
  }
  if (element.type === 'shape') {
    return {
      id: element.id,
      kind: 'shape',
      element: element.shapeText ?? createDefaultShapeText()
    }
  }
  return null
}

function getActiveRichTextDraftContent(draft: ActiveRichTextDraft | null): string {
  return draft?.element.content ?? ''
}

function toEditingTextElement(
  draft: ActiveRichTextDraft | null,
  sourceElement: AnySlideElement | undefined
): TextElement | null {
  if (!draft) return null
  if (draft.kind === 'text') return draft.element
  if (!sourceElement || sourceElement.type !== 'shape') return null
  return {
    ...textElementStubForShapeInText(sourceElement, draft.element),
    id: sourceElement.id
  }
}

export interface SlideEditorProps extends BusinessAppContextProps {
  slideId: string
  slide: SlideType
  onBack: () => void
  onSlideUpdated?: (slide: SlideType) => void
  isReadOnly?: boolean
  isTrashedSlide?: boolean
  /** Initial template to apply when editor loads (for "Create from Template" flow) */
  initialTemplate?: {
    slides: SlideData[]
    themeId: string
  }
  /** Callback when initial template has been applied */
  onInitialTemplateApplied?: () => void
  'data-testid'?: string
}

function createDefaultSlide(t: (k: string) => string): SlideData {
  return {
    id: 'slide-1',
    elements: [
      createTextElement({
        id: 'title-1',
        content: t('editor-placeholder-title'),
        position: { x: 80, y: 80 },
        size: { width: 1120, height: 100 },
        fontSize: 64,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1e293b'
      }),
      createTextElement({
        id: 'subtitle-1',
        content: t('editor-placeholder-subtitle'),
        position: { x: 80, y: 200 },
        size: { width: 1120, height: 60 },
        fontSize: 32,
        textAlign: 'center',
        color: '#64748b'
      })
    ],
    background: { type: 'solid', color: '#ffffff' }
  }
}

function normalizeSlideData(slide: Partial<SlideData> | undefined, fallbackId: string): SlideData {
  return {
    id: slide?.id || fallbackId,
    notes: slide?.notes || '',
    elements: Array.isArray(slide?.elements) ? slide.elements : [],
    background: slide?.background || { type: 'solid', color: '#ffffff' },
    ...(slide?.transition ? { transition: slide.transition } : {})
  }
}

function normalizeSlidesData(slides: Partial<SlideData>[] | undefined, fallbackSlide: SlideData): SlideData[] {
  if (!Array.isArray(slides) || slides.length === 0) {
    return [fallbackSlide]
  }

  return slides.map((slide, index) => normalizeSlideData(slide, slide?.id || `${fallbackSlide.id}-${index}`))
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slideId,
  slide,
  onBack,
  onSlideUpdated,
  isReadOnly = false,
  isTrashedSlide = false,
  accessToken,
  userInfo,
  initialTemplate,
  onInitialTemplateApplied,
  'data-testid': testId = 'slide-editor'
}) => {
  const { t } = useTranslation(translations)
  const defaultSlide = useMemo(() => createDefaultSlide(t), [t])

  // Get user info (BusinessAppContext userInfo does NOT provide displayName/pictureThumbnail)
  const currentUserId = userInfo?.id || ''
  const currentUserName = useMemo(() => {
    const first = userInfo?.givenName || userInfo?.employeeDetails?.firstName
    const last = userInfo?.familyName || userInfo?.employeeDetails?.lastName
    const full = [first, last].filter(Boolean).join(' ').trim()
    return full || userInfo?.userName || currentUserId || t('editor-user-fallback')
  }, [currentUserId, userInfo, t])

  const graphqlClient = useGraphQLClient(accessToken || '')
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined)
  const collaborationEnabled = Boolean(slideId) && !isTrashedSlide

  // Prepare initial data from slide prop (used for bootstrap initializer / pre-sync rendering).
  const initialSlides = useMemo(
    () => normalizeSlidesData(slide.contentJson?.slides as SlideData[] | undefined, defaultSlide),
    [slide.id, defaultSlide]
  )
  const initialThemeId = useMemo(
    () => (slide.contentJson?.themeId as string | undefined) || SLIDE_THEMES[0].id,
    [slide.id]
  )
  const initialMasters = useMemo(
    () => (slide.contentJson?.masters as SlideMaster[] | undefined) || undefined,
    [slide.id]
  )

  // Memoize callback to prevent recreation
  const handleSynced = useCallback((synced: boolean) => {
    console.log('[SlideEditor] Collaboration synced:', synced)
  }, [])

  // Collaboration hook - manages Yjs sync and real-time updates
  const {
    slides: collaborativeSlides,
    themeId: collaborativeThemeId,
    participants,
    isSynced,
    isInitialized,
    awareness,
    updateSlides: updateCollaborativeSlides,
    updateTheme: updateCollaborativeTheme,
    updateMasters: updateCollaborativeMasters,
    updateSlide: updateCollaborativeSlide,
    updateElement: updateCollaborativeElement,
    updateSlideById: updateCollaborativeSlideById,
    addSlideAfterId: addCollaborativeSlideAfterId,
    removeSlideById: removeCollaborativeSlideById,
    moveSlideById: moveCollaborativeSlideById,
    duplicateSlideById: duplicateCollaborativeSlideById,
    masters: collaborativeMasters,
    flushPendingUpdates,
    applyContentJsonSnapshot
  } = useSlideCollaboration({
    slideId,
    accessToken: accessToken || '',
    currentUserId,
    currentUserName,
    currentUserAvatar,
    enabled: collaborationEnabled,
    initialSlides,
    initialThemeId,
    onSynced: handleSynced
  })

  const editorIsSynced = collaborationEnabled ? isSynced : true
  const editorIsInitialized = collaborationEnabled ? isInitialized : true

  // Sync collaborative masters to local state
  useEffect(() => {
    if (collaborativeMasters) {
      setMasters(collaborativeMasters)
    }
  }, [collaborativeMasters])

  // Enrich participants with avatars (same pattern as document editor)
  const [participantsWithAvatars, setParticipantsWithAvatars] = useState(participants)

  useEffect(() => {
    setParticipantsWithAvatars(participants)
  }, [participants])

  useEffect(() => {
    const fetchParticipantAvatars = async () => {
      if (!accessToken || participants.length === 0) return

      const userIds = participants.map(p => p.userId).filter(Boolean)
      if (userIds.length === 0) return

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

        setParticipantsWithAvatars(prev =>
          prev.map(p => ({
            ...p,
            avatarUrl: avatarMap.get(p.userId) || p.avatarUrl
          }))
        )
      } catch (err) {
        console.error('[SlideEditor] Failed to fetch participant avatars:', err)
      }
    }

    fetchParticipantAvatars()
  }, [participants, accessToken, graphqlClient])

  // Fetch current user's avatar from Employee table
  useEffect(() => {
    if (!accessToken || !currentUserId) return

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
        const thumbnail = result?.Employee?.[0]?.pictureThumbnail
        if (!thumbnail) return
        setCurrentUserAvatar(thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`)
      } catch (err) {
        console.error('[SlideEditor] Failed to fetch user avatar:', err)
      }
    }

    fetchAvatar()
  }, [currentUserId, accessToken, graphqlClient])

  // Slide Master & Layout state
  const [masters, setMasters] = useState<SlideMaster[] | undefined>(initialMasters)
  const [lastUsedLayoutId, setLastUsedLayoutId] = useState('title-content')
  const [editorView, setEditorView] = useState<'normal' | 'master'>('normal')

  // UI state
  const [currentSlideId, setCurrentSlideId] = useState(() => initialSlides[0]?.id || defaultSlide.id)
  const [selectedSlideIndices, setSelectedSlideIndices] = useState<Set<number>>(new Set([0]))
  const [slideSelectionAnchor, setSlideSelectionAnchor] = useState<number | null>(null)
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set())
  const [showPropertyPanel, setShowPropertyPanel] = useState(true)
  const [showSpellCheckPanel, setShowSpellCheckPanel] = useState(false)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [activeTextSelection, setActiveTextSelection] = useState<RichTextSelectionRange | null>(null)
  const [activeRichTextDraft, setActiveRichTextDraft] = useState<ActiveRichTextDraft | null>(null)
  const [pendingCaretFormatting, setPendingCaretFormatting] = useState<PendingCaretFormatting | null>(null)
  const [richTextEditorRehydrateToken, setRichTextEditorRehydrateToken] = useState(0)
  // Edit Points mode: when set, SlideCanvas mounts the ShapePointEditor
  // overlay for this shape and the PropertyPanel's "Edit Points" button is
  // highlighted. Only one shape at a time may be in the mode.
  const [editingPointsId, setEditingPointsId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [isPresentMode, setIsPresentMode] = useState(false)
  const [presentScale, setPresentScale] = useState(1)

  const [canvasScale, setCanvasScale] = useState(0.65)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [showBackgroundDialog, setShowBackgroundDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showPdfExportDialog, setShowPdfExportDialog] = useState(false)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [presenterMode, setPresenterMode] = useState(false)
  const [presentationTitle, setPresentationTitle] = useState(slide.title)

  // AI Assist state
  const [aiAssistConfig, setAiAssistConfig] = useState<AIAssistConfig>(() => loadAIAssistConfig())
  const [showAIAssistSettings, setShowAIAssistSettings] = useState(false)
  const [newTitle, setNewTitle] = useState(slide.title)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const bgImageInputRef = useRef<HTMLInputElement>(null)
  const presentationContainerRef = useRef<HTMLDivElement>(null)
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([])
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Voice input state
  const voiceBaseContentRef = useRef<string>('')
  const editingTextIdRef = useRef<string | null>(null)
  const lastProcessedTranscriptRef = useRef<string>('')
  const currentEditingContentRef = useRef<string>('')
  const activeRichTextDraftRef = useRef<ActiveRichTextDraft | null>(null)
  const pendingCaretFormattingRef = useRef<PendingCaretFormatting | null>(null)
  const preservePendingCaretFormattingRef = useRef(false)
  const applyEditingTextValueRef = useRef<((id: string, value: string, rehydrate?: boolean) => void) | null>(null)
  const lastObservedEditingTargetSnapshotRef = useRef<string | null>(null)

  // Slide drag and drop state
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Undo/Redo history state
  const [history, setHistory] = useState<SlideData[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoAction = useRef(false)
  const isDraggingRef = useRef(false)
  const pendingHistoryRef = useRef(false)

  // Clipboard for copy/paste (supports both elements and slides)
  const [clipboard, setClipboard] = useState<
    | { type: 'element'; data: AnySlideElement }
    | { type: 'elements'; data: AnySlideElement[] }
    | { type: 'slide'; data: SlideData }
    | null
  >(null)

  // Track if we've received initial connection ack
  const hasReceivedConnectionAck = useRef(false)

  // Build receiver URL with hash to survive authentication redirects
  const castReceiverUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const appParam = params.get('app')
    if (appParam) {
      return `${window.location.pathname}?app=${encodeURIComponent(appParam)}#cast-receiver`
    }
    return `${window.location.pathname}#cast-receiver`
  }, [])

  // Presentation casting hook
  const {
    isConnected: isCastConnected,
    isFallbackMode: isCastFallback,
    connectionState: castConnectionState,
    startCasting,
    stopCasting,
    sendSlideData,
    sendEffects,
    sendClearEffects,
    sendVideoControl
  } = usePresentationCast({
    receiverUrl: castReceiverUrl,
    onConnectionChange: state => {
      switch (state) {
        case 'connecting':
          hasReceivedConnectionAck.current = false
          toast.loading(t('cast-connecting'), { id: 'cast-status' })
          break
        case 'connected':
          // Initial connection - wait for receiver ack for full confirmation
          if (!hasReceivedConnectionAck.current) {
            toast.loading(t('cast-connecting'), { id: 'cast-status' })
          }
          break
        case 'closed':
        case 'disconnected':
          hasReceivedConnectionAck.current = false
          toast.dismiss('cast-status')
          break
      }
    },
    onReceiverAck: ack => {
      if (ack.ackType === 'connected' && !hasReceivedConnectionAck.current) {
        hasReceivedConnectionAck.current = true
        toast.success(t('cast-connected-success'), { id: 'cast-status' })
      }
    },
    onError: error => {
      // Dismiss the loading toast first
      toast.dismiss('cast-status')

      if (error.message === 'CHROMECAST_LOCALHOST_ERROR') {
        // Use different id so it won't be dismissed by onConnectionChange
        toast.error(t('cast-chromecast-localhost-error'), {
          id: 'cast-error',
          duration: 10000
        })
      } else {
        toast.error(error.message || t('cast-error'), { id: 'cast-error' })
      }
    }
  })

  // Handler for stopping cast with feedback
  const handleStopCast = useCallback(() => {
    stopCasting()
    toast.success(t('cast-disconnected'), { id: 'cast-status' })
  }, [stopCasting, t])

  // Connection timeout warning - if connected but no ack after 15 seconds, show troubleshooting info
  useEffect(() => {
    if (castConnectionState !== 'connected' || hasReceivedConnectionAck.current) {
      return
    }

    const timeout = setTimeout(() => {
      if (!hasReceivedConnectionAck.current && castConnectionState === 'connected') {
        toast.loading(t('cast-waiting-receiver') || 'Waiting for receiver to load...', { id: 'cast-status' })
      }
    }, 10000) // 10 seconds

    const warningTimeout = setTimeout(() => {
      if (!hasReceivedConnectionAck.current && castConnectionState === 'connected') {
        toast.error(
          t('cast-connection-timeout') ||
            'Connection taking too long. The receiver window may need to complete authentication.',
          { id: 'cast-status', duration: 10000 }
        )
      }
    }, 30000) // 30 seconds

    return () => {
      clearTimeout(timeout)
      clearTimeout(warningTimeout)
    }
  }, [castConnectionState, t])

  // Always render from collaboration state (it is seeded immediately from initial content).
  const slides = useMemo(() => {
    return normalizeSlidesData(collaborativeSlides, defaultSlide)
  }, [collaborativeSlides, defaultSlide])

  const currentSlideIndex = useMemo(() => {
    const index = slides.findIndex(s => s.id === currentSlideId)
    return Math.max(index, 0)
  }, [currentSlideId, slides])

  const setCurrentSlideIndex = useCallback(
    (next: React.SetStateAction<number>) => {
      setCurrentSlideId(previousSlideId => {
        const previousIndex = slides.findIndex(s => s.id === previousSlideId)
        const safePreviousIndex = Math.max(previousIndex, 0)
        const nextIndex = typeof next === 'function' ? next(safePreviousIndex) : next
        const maxIndex = Math.max(0, slides.length - 1)
        const clampedIndex = Math.min(Math.max(nextIndex, 0), maxIndex)
        return slides[clampedIndex]?.id || defaultSlide.id
      })
    },
    [defaultSlide.id, slides]
  )

  useEffect(() => {
    if (slides.length === 0) return
    if (!slides.some(s => s.id === currentSlideId)) {
      setCurrentSlideId(slides[0].id)
    }
  }, [currentSlideId, slides])

  useEffect(() => {
    setSelectedSlideIndices(prev => {
      const validIndices = new Set([...prev].filter(index => index >= 0 && index < slides.length))
      if (validIndices.size === 0) {
        validIndices.add(currentSlideIndex)
      }
      if (validIndices.size === prev.size && [...validIndices].every(index => prev.has(index))) {
        return prev
      }
      return validIndices
    })
  }, [currentSlideIndex, slides.length])

  // AI Assist - Effect Manager
  const effectManager = useEffectManager({
    config: aiAssistConfig,
    onSendEffect: sendEffects,
    onSendClear: sendClearEffects
  })

  // AI Assist - Speech Matcher (handles matching + video triggers)
  const handleSpeechMatch = useCallback(
    (matches: MatchResult[]) => {
      console.log('[SlideEditor] handleSpeechMatch called with', matches.length, 'matches')
      console.log('[SlideEditor] aiAssistConfig.enabled:', aiAssistConfig.enabled)
      console.log('[SlideEditor] isCastConnected:', isCastConnected)

      if (!aiAssistConfig.enabled || !isCastConnected) {
        console.log('[SlideEditor] Skipping effects - enabled:', aiAssistConfig.enabled, 'connected:', isCastConnected)
        return
      }

      // Pick a random enabled effect type for each match
      const enabledEffects = aiAssistConfig.enabledEffects
      console.log('[SlideEditor] Enabled effects:', enabledEffects)
      if (enabledEffects.length === 0) return

      matches.forEach(match => {
        const randomEffect = enabledEffects[Math.floor(Math.random() * enabledEffects.length)]
        console.log('[SlideEditor] Queueing effect:', randomEffect, 'for element:', match.elementId)
        effectManager.queueEffect(match.elementId, randomEffect)
      })
    },
    [aiAssistConfig.enabled, aiAssistConfig.enabledEffects, isCastConnected, effectManager]
  )

  const handleVideoTrigger = useCallback(
    (result: VideoTriggerResult) => {
      if (!aiAssistConfig.enabled || !isCastConnected) return
      sendVideoControl(result.elementId, result.action)
    },
    [aiAssistConfig.enabled, isCastConnected, sendVideoControl]
  )

  const speechMatcher = useSpeechMatcher({
    slides,
    currentIndex: currentSlideIndex,
    config: aiAssistConfig,
    onMatch: handleSpeechMatch,
    onVideoTrigger: handleVideoTrigger
  })

  // AI Assist toggle handler
  const handleToggleAIAssist = useCallback(() => {
    const newEnabled = !aiAssistConfig.enabled
    const newConfig = { ...aiAssistConfig, enabled: newEnabled }
    setAiAssistConfig(newConfig)
    saveAIAssistConfig(newConfig)

    if (newEnabled) {
      speechMatcher.startListening()
    } else {
      speechMatcher.stopListening()
      effectManager.clearAllEffects()
    }
  }, [aiAssistConfig, speechMatcher, effectManager])

  // AI Assist config change handler
  const handleAIAssistConfigChange = useCallback(
    (changes: Partial<AIAssistConfig>) => {
      const newConfig = { ...aiAssistConfig, ...changes }
      setAiAssistConfig(newConfig)
      saveAIAssistConfig(newConfig)
    },
    [aiAssistConfig]
  )

  // Handle element click from presenter view - trigger highlight effect on presenting window
  const handlePresenterElementClick = useCallback(
    (elementId: string) => {
      if (!isCastConnected) return

      // Get a random enabled effect, default to highlight
      const enabledEffects =
        aiAssistConfig.enabledEffects.length > 0 ? aiAssistConfig.enabledEffects : ['highlight' as const]
      const effectType = enabledEffects[Math.floor(Math.random() * enabledEffects.length)]

      effectManager.queueEffect(elementId, effectType)
    },
    [isCastConnected, aiAssistConfig.enabledEffects, effectManager]
  )

  // AI Assist status for PresenterView - list specific dependencies to avoid excessive re-renders
  const aiAssistStatus: AIAssistStatus = useMemo(
    () => ({
      enabled: aiAssistConfig.enabled,
      isListening: speechMatcher.isListening,
      isSupported: speechMatcher.isSupported,
      transcript: speechMatcher.transcript,
      recentMatches: speechMatcher.recentMatches,
      error: speechMatcher.error,
      volumeLevel: speechMatcher.volumeLevel,
      cooldownProgress: speechMatcher.cooldownProgress
    }),
    [
      aiAssistConfig.enabled,
      speechMatcher.isListening,
      speechMatcher.isSupported,
      speechMatcher.transcript,
      speechMatcher.recentMatches,
      speechMatcher.error,
      speechMatcher.volumeLevel,
      speechMatcher.cooldownProgress
    ]
  )

  const currentTheme = useMemo(() => {
    return collaborativeThemeId ? getThemeById(collaborativeThemeId) : SLIDE_THEMES[0]
  }, [collaborativeThemeId])

  const handleUpdateTheme = useCallback(
    (newThemeId: string) => {
      const newTheme = getThemeById(newThemeId)
      if (newTheme && currentTheme && newTheme.id !== currentTheme.id) {
        const recolored = recolorSlidesForTheme(slides, currentTheme, newTheme)
        if (recolored !== slides) {
          updateCollaborativeSlides(recolored)
        }
      }
      updateCollaborativeTheme(newThemeId)
    },
    [currentTheme, slides, updateCollaborativeSlides, updateCollaborativeTheme]
  )

  const currentSlideRaw = slides[currentSlideIndex] || defaultSlide
  const currentSlide = normalizeSlideData(currentSlideRaw, defaultSlide.id)
  // For property panel, use the first selected element when multiple are selected
  const selectedElementId = selectedElementIds.size > 0 ? [...selectedElementIds][0] : null
  const selectedElement = currentSlide.elements.find(e => e.id === selectedElementId) || null
  const selectedElements = currentSlide.elements.filter(e => selectedElementIds.has(e.id))
  const unlockedSelectedElements = selectedElements.filter(element => !element.locked)
  const hasUnlockedSelection = unlockedSelectedElements.length > 0
  const hasLockedSelection = unlockedSelectedElements.length !== selectedElements.length
  const storeActiveRichTextDraft = useCallback((nextDraft: ActiveRichTextDraft | null) => {
    activeRichTextDraftRef.current = nextDraft
    setActiveRichTextDraft(nextDraft)
  }, [])

  const storePendingCaretFormatting = useCallback((nextFormatting: PendingCaretFormatting | null) => {
    pendingCaretFormattingRef.current = nextFormatting
    setPendingCaretFormatting(nextFormatting)
  }, [])

  const bumpRichTextEditorRehydrateToken = useCallback(() => {
    setRichTextEditorRehydrateToken(previous => previous + 1)
  }, [])

  useEffect(() => {
    const currentElementIds = new Set(currentSlide.elements.map(e => e.id))
    setSelectedElementIds(prev => {
      const next = new Set([...prev].filter(id => currentElementIds.has(id)))
      if (next.size === prev.size && [...next].every(id => prev.has(id))) {
        return prev
      }
      return next
    })
    if (editingTextId && !currentElementIds.has(editingTextId)) {
      editingTextIdRef.current = null
      storeActiveRichTextDraft(null)
      storePendingCaretFormatting(null)
      setEditingTextId(null)
      setActiveTextSelection(null)
    }
    if (editingPointsId && !currentElementIds.has(editingPointsId)) {
      setEditingPointsId(null)
    }
  }, [currentSlide.elements, editingPointsId, editingTextId, storeActiveRichTextDraft, storePendingCaretFormatting])

  // Toolbar context for contextual formatting tools
  const { context: toolbarContext } = useToolbarContext({
    selectedElement,
    selectedElements,
    selectedCount: selectedElementIds.size
  })

  const activeEditingTarget = useMemo(
    () => currentSlide.elements.find(element => element.id === editingTextId),
    [currentSlide.elements, editingTextId]
  )

  const activeEditingTextElement = useMemo(
    () =>
      toEditingTextElement(
        activeRichTextDraft?.id === editingTextId ? activeRichTextDraft : null,
        activeEditingTarget
      ) ??
      (activeEditingTarget?.type === 'text'
        ? activeEditingTarget
        : activeEditingTarget?.type === 'shape'
          ? {
              ...textElementStubForShapeInText(
                activeEditingTarget,
                activeEditingTarget.shapeText ?? createDefaultShapeText()
              ),
              id: activeEditingTarget.id
            }
          : null),
    [activeRichTextDraft, activeEditingTarget, editingTextId]
  )

  const activeEditingDraftSnapshot = useMemo(
    () => serializeEditingDraftValue(activeRichTextDraft?.id === editingTextId ? activeRichTextDraft : null),
    [activeRichTextDraft, editingTextId]
  )
  const activeEditingTargetSnapshot = useMemo(
    () => serializeLiveEditingValue(activeEditingTarget),
    [activeEditingTarget]
  )

  useEffect(() => {
    if (!editingTextId || !activeEditingTargetSnapshot) {
      lastObservedEditingTargetSnapshotRef.current = null
      return
    }

    const previousTargetSnapshot = lastObservedEditingTargetSnapshotRef.current
    if (previousTargetSnapshot === null) {
      lastObservedEditingTargetSnapshotRef.current = activeEditingTargetSnapshot
      return
    }

    if (previousTargetSnapshot === activeEditingTargetSnapshot) {
      return
    }

    lastObservedEditingTargetSnapshotRef.current = activeEditingTargetSnapshot

    if (
      !shouldRehydrateFromLiveUpdate(previousTargetSnapshot, activeEditingTargetSnapshot, activeEditingDraftSnapshot)
    ) {
      return
    }

    const nextDraft = createActiveRichTextDraft(activeEditingTarget)
    if (!nextDraft || nextDraft.id !== editingTextId) return

    currentEditingContentRef.current = getActiveRichTextDraftContent(nextDraft)
    storeActiveRichTextDraft(nextDraft)
    storePendingCaretFormatting(null)
    preservePendingCaretFormattingRef.current = false
    bumpRichTextEditorRehydrateToken()
  }, [
    activeEditingDraftSnapshot,
    activeEditingTarget,
    activeEditingTargetSnapshot,
    bumpRichTextEditorRehydrateToken,
    editingTextId,
    storeActiveRichTextDraft,
    storePendingCaretFormatting
  ])

  const effectiveToolbarContext = useMemo<ToolbarContext>(() => {
    if (activeEditingTextElement) {
      const formatting = getRichTextStyleAtRange(activeEditingTextElement, activeTextSelection)
      const hasCollapsedSelection = !!activeTextSelection && activeTextSelection.start === activeTextSelection.end

      const effectiveFormatting =
        hasCollapsedSelection && pendingCaretFormatting?.id === activeEditingTextElement.id
          ? {
              ...formatting,
              ...pendingCaretFormatting.formatting,
              isFontFamilyMixed:
                pendingCaretFormatting.formatting.fontFamily !== undefined ? false : formatting.isFontFamilyMixed,
              isFontSizeMixed:
                pendingCaretFormatting.formatting.fontSize !== undefined ? false : formatting.isFontSizeMixed,
              isColorMixed: pendingCaretFormatting.formatting.color !== undefined ? false : formatting.isColorMixed,
              isTextTransformMixed:
                pendingCaretFormatting.formatting.textTransform !== undefined ? false : formatting.isTextTransformMixed,
              fontWeightState:
                pendingCaretFormatting.formatting.fontWeight !== undefined
                  ? pendingCaretFormatting.formatting.fontWeight === 'bold'
                    ? 'on'
                    : 'off'
                  : formatting.fontWeightState,
              fontStyleState:
                pendingCaretFormatting.formatting.fontStyle !== undefined
                  ? pendingCaretFormatting.formatting.fontStyle === 'italic'
                    ? 'on'
                    : 'off'
                  : formatting.fontStyleState,
              underlineState:
                pendingCaretFormatting.formatting.textDecoration !== undefined
                  ? pendingCaretFormatting.formatting.textDecoration === 'underline'
                    ? 'on'
                    : 'off'
                  : formatting.underlineState,
              strikethroughState:
                pendingCaretFormatting.formatting.textDecoration !== undefined
                  ? pendingCaretFormatting.formatting.textDecoration === 'line-through'
                    ? 'on'
                    : 'off'
                  : formatting.strikethroughState
            }
          : formatting

      return { type: 'text', element: activeEditingTextElement, formatting: effectiveFormatting }
    }

    return toolbarContext
  }, [activeEditingTextElement, activeTextSelection, pendingCaretFormatting, toolbarContext])

  // Presentation mode transitions using shared hook
  const {
    previousSlide: presentPreviousSlide,
    currentTransition: presentTransition,
    navigateToSlide: navigateToPresentSlide,
    handleTransitionComplete: handlePresentTransitionComplete,
    canNavigatePrev,
    canNavigateNext
  } = useSlideTransition({
    slides,
    currentIndex: currentSlideIndex,
    onIndexChange: setCurrentSlideIndex,
    enabled: isPresentMode
  })

  // Note: Initialization is handled by the collaboration hook's onBootstrapRequired callback
  // No need for manual initialization here

  // Release cached Object URLs on unmount.
  useEffect(() => {
    return () => {
      clearImageObjectUrlCache()
    }
  }, [])

  // Set initial save time when collaboration syncs
  useEffect(() => {
    if (editorIsSynced && !lastSaveTime) {
      setLastSaveTime(new Date())
    }
  }, [editorIsSynced, lastSaveTime])

  const handleSave = useCallback(
    async (silent = false) => {
      if (isReadOnly) return
      if (!silent) setIsSaving(true)
      try {
        if (!editorIsSynced || !editorIsInitialized) {
          throw new Error('Slide collaboration is still syncing')
        }
        flushPendingUpdates()
        setLastSaveTime(new Date())
        if (!silent) toast.success(t('editor-slide-saved'))
      } catch (err) {
        console.error('[SlideEditor] Save error:', err)
        if (!silent) toast.error(t('editor-save-failed'))
      } finally {
        if (!silent) setIsSaving(false)
      }
    },
    [editorIsInitialized, editorIsSynced, flushPendingUpdates, isReadOnly, t]
  )

  const canEdit = !isReadOnly && editorIsSynced && editorIsInitialized

  // Spell check hook for presentation-wide grammar/spelling checks
  const spellCheck = useSlideSpellCheck(slides, {
    accessToken,
    onCheckComplete: totalIssues => {
      if (totalIssues > 0) {
        toast.info(t('spell-check-issues-found', { count: totalIssues }))
      } else {
        toast.success(t('spell-check-no-issues'))
      }
    },
    onError: error => {
      toast.error(t('spell-check-error') || error)
    }
  })

  // Voice input hook - real-time speech recognition
  const voiceInput = useVoiceInput({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    autoStopOnSilence: false
  })

  // Track previous listening state to detect when voice input stops
  const wasListeningRef = useRef(false)

  // Update text in real-time based on voice input transcript
  useEffect(() => {
    const currentEditingId = editingTextIdRef.current
    if (!currentEditingId) return

    const isListening = voiceInput.isListening
    const wasListening = wasListeningRef.current

    // When voice input just stopped, commit the final transcript
    if (wasListening && !isListening) {
      wasListeningRef.current = false
      const finalTranscript = voiceInput.transcript
      if (finalTranscript) {
        const baseContent = voiceBaseContentRef.current
        const newContent = baseContent ? `${baseContent} ${finalTranscript}` : finalTranscript
        applyEditingTextValueRef.current?.(currentEditingId, newContent, true)
      }
      return
    }

    // While listening, show live preview with interim transcript
    if (isListening) {
      wasListeningRef.current = true

      // Combine finalized transcript with current interim for live preview
      const combinedTranscript = voiceInput.transcript
        ? voiceInput.interimTranscript
          ? `${voiceInput.transcript} ${voiceInput.interimTranscript}`
          : voiceInput.transcript
        : voiceInput.interimTranscript || ''

      if (!combinedTranscript) return

      const baseContent = voiceBaseContentRef.current
      const newContent = baseContent ? `${baseContent} ${combinedTranscript}` : combinedTranscript

      applyEditingTextValueRef.current?.(currentEditingId, newContent, true)
    }
  }, [voiceInput.transcript, voiceInput.interimTranscript, voiceInput.isListening])

  // Stop voice input when dialog closes
  useEffect(() => {
    if (!editingTextId && voiceInput.isListening) {
      voiceInput.stopListening()
    }
  }, [editingTextId, voiceInput.isListening])

  // Track whether initial template has been applied
  const initialTemplateAppliedRef = useRef(false)

  // Apply initial template when editor is ready
  useEffect(() => {
    if (!initialTemplate || !canEdit || initialTemplateAppliedRef.current) return

    // Apply template slides and theme
    const templatedSlides = initialTemplate.slides.map((slide, idx) => ({
      ...slide,
      id: `slide-${Date.now()}-${idx}`
    }))

    updateCollaborativeSlides(templatedSlides)
    updateCollaborativeTheme(initialTemplate.themeId)
    initialTemplateAppliedRef.current = true

    // Notify parent that template has been applied
    onInitialTemplateApplied?.()

    toast.success(t('toast-template-applied') || 'Template applied')
  }, [initialTemplate, canEdit, updateCollaborativeSlides, updateCollaborativeTheme, onInitialTemplateApplied, t])

  const updateSlide = useCallback(
    (updates: Partial<SlideData>) => {
      if (!canEdit) return
      updateCollaborativeSlide(currentSlideIndex, updates)
    },
    [canEdit, currentSlideIndex, updateCollaborativeSlide]
  )

  const updateCurrentSlideNotes = useCallback(
    (notes: string) => {
      updateSlide({ notes })
    },
    [updateSlide]
  )

  const updateCurrentSlideTransition = useCallback(
    (transition: SlideTransition) => {
      updateSlide({ transition })
    },
    [updateSlide]
  )

  const updateElement = useCallback(
    (id: string, updates: Partial<AnySlideElement>) => {
      if (!canEdit) return
      updateCollaborativeElement(currentSlideIndex, id, updates)

      // If the moved/resized element is the target of any bound connector,
      // re-snap that connector's endpoint to the shape. This keeps diagrams
      // stable under moves/resizes without requiring the caller to know
      // which connectors are affected.
      const geometryChanged = updates.position !== undefined || updates.size !== undefined
      if (!geometryChanged) return
      const targetElement = currentSlide.elements.find(e => e.id === id)
      if (!targetElement) return
      const nextTarget = { ...targetElement, ...updates } as AnySlideElement
      const elementsById = new Map<string, AnySlideElement>(
        currentSlide.elements.map(el => [el.id, el.id === id ? nextTarget : el])
      )
      currentSlide.elements.forEach(el => {
        if (el.type !== 'connector') return
        const c: ConnectorElement = el
        if (c.startBinding?.elementId !== id && c.endBinding?.elementId !== id) return
        const refreshed = refreshConnectorFromBindings(c, elementsById)
        if (refreshed === c) return
        updateCollaborativeElement(currentSlideIndex, c.id, {
          startPoint: refreshed.startPoint,
          endPoint: refreshed.endPoint,
          position: refreshed.position,
          size: refreshed.size
        } as Partial<AnySlideElement>)
      })
    },
    [canEdit, currentSlideIndex, updateCollaborativeElement, currentSlide.elements]
  )

  const applyEditingTextValue = useCallback(
    (id: string, newValue: string, rehydrate = false) => {
      const currentElement = currentSlide.elements.find(element => element.id === id)
      if (!currentElement) return

      const oldValue = currentEditingContentRef.current
      const editDelta = getTextEditDelta(oldValue, newValue)
      currentEditingContentRef.current = newValue

      if (currentElement.type === 'code') {
        updateElement(id, { code: newValue })
        return
      }

      const activeDraft =
        activeRichTextDraftRef.current?.id === id
          ? activeRichTextDraftRef.current
          : createActiveRichTextDraft(currentElement)

      if (currentElement.type === 'shape') {
        const shapeDraft =
          activeDraft?.kind === 'shape' ? activeDraft.element : (currentElement.shapeText ?? createDefaultShapeText())
        const pendingFormatting =
          pendingCaretFormattingRef.current?.id === id ? pendingCaretFormattingRef.current.formatting : null
        const nextShapeText = applyCaretFormattingToInsertedText(
          replaceRichTextContent(shapeDraft, newValue),
          pendingFormatting,
          editDelta
        )
        storeActiveRichTextDraft({ id, kind: 'shape', element: nextShapeText })
        updateElement(id, { shapeText: nextShapeText } as Partial<ShapeElement>)
        if (pendingFormatting && editDelta.insertedLength > 0) {
          preservePendingCaretFormattingRef.current = true
        }
        if (rehydrate) {
          bumpRichTextEditorRehydrateToken()
        }
        return
      }

      if (currentElement.type !== 'text') return

      const textDraft = activeDraft?.kind === 'text' ? activeDraft.element : currentElement

      let updatedLinks: TextLink[] | undefined
      if (textDraft.links && textDraft.links.length > 0) {
        const editStart = editDelta.start
        const deletedLength = editDelta.deletedLength
        const insertedLength = editDelta.insertedLength

        const manualLinks = textDraft.links.filter(link => !link.isAutoDetected)
        const adjustedManualLinks = adjustLinksAfterEdit(manualLinks, editStart, deletedLength, insertedLength)
        const autoLinks = detectUrls(newValue)
        updatedLinks = mergeLinks(autoLinks, adjustedManualLinks)
      }

      const pendingFormatting =
        pendingCaretFormattingRef.current?.id === id ? pendingCaretFormattingRef.current.formatting : null

      const nextTextDraft: TextElement = {
        ...applyCaretFormattingToInsertedText(
          replaceRichTextContent(textDraft, newValue),
          pendingFormatting,
          editDelta
        ),
        ...(updatedLinks !== undefined && { links: updatedLinks })
      }

      storeActiveRichTextDraft({ id, kind: 'text', element: nextTextDraft })
      updateElement(id, nextTextDraft)
      if (pendingFormatting && editDelta.insertedLength > 0) {
        preservePendingCaretFormattingRef.current = true
      }

      if (rehydrate) {
        bumpRichTextEditorRehydrateToken()
      }
    },
    [bumpRichTextEditorRehydrateToken, currentSlide.elements, storeActiveRichTextDraft, updateElement]
  )

  useEffect(() => {
    applyEditingTextValueRef.current = applyEditingTextValue
  }, [applyEditingTextValue])

  const updateMultipleElements = useCallback(
    (updates: { id: string; updates: Partial<AnySlideElement> }[]) => {
      if (!canEdit) return
      const updatedElements = currentSlide.elements.map(el => {
        const update = updates.find(u => u.id === el.id)
        return update ? ({ ...el, ...update.updates } as AnySlideElement) : el
      })

      // If any updated element is the target of a connector binding and its
      // position/size changed, re-snap those connectors in the same batch so
      // every caller benefits from live connector binding without needing
      // extra plumbing.
      const changedIds = new Set(
        updates.filter(u => u.updates.position !== undefined || u.updates.size !== undefined).map(u => u.id)
      )
      const elementsById = new Map<string, AnySlideElement>(updatedElements.map(el => [el.id, el]))
      const finalElements = updatedElements.map(el => {
        if (el.type !== 'connector') return el
        const c: ConnectorElement = el
        const startHit = c.startBinding && changedIds.has(c.startBinding.elementId)
        const endHit = c.endBinding && changedIds.has(c.endBinding.elementId)
        if (!startHit && !endHit) return el
        return refreshConnectorFromBindings(c, elementsById)
      })

      updateSlide({ elements: finalElements })
    },
    [canEdit, currentSlide.elements, updateSlide]
  )

  const applyTextFormattingUpdates = useCallback(
    (
      element: AnySlideElement,
      updates: Partial<AnySlideElement>,
      selection?: RichTextSelectionRange | null
    ): Partial<AnySlideElement> => {
      if (element.type !== 'text' || !isRichTextFormattingUpdate(updates as Partial<TextElement>)) return updates

      return applyRichTextFormatting(
        element,
        updates as RichTextFormattingUpdate,
        selection && selection.end > selection.start ? selection : null
      ) as Partial<AnySlideElement>
    },
    []
  )

  // Applies updates to all selected elements (for toolbar and property panel multi-select)
  const updateSelectedElements = useCallback(
    (triggerId: string, updates: Partial<AnySlideElement>) => {
      if (!canEdit) return
      if (selectedElementIds.size > 1) {
        if (unlockedSelectedElements.length === 0) return
        updateMultipleElements(
          unlockedSelectedElements.map(element => {
            const { id } = element
            return { id, updates: applyTextFormattingUpdates(element, updates) }
          })
        )
      } else {
        const element = currentSlide.elements.find(el => el.id === triggerId)
        updateElement(triggerId, element ? applyTextFormattingUpdates(element, updates) : updates)
      }
    },
    [
      applyTextFormattingUpdates,
      canEdit,
      currentSlide.elements,
      selectedElementIds,
      unlockedSelectedElements,
      updateElement,
      updateMultipleElements
    ]
  )

  const handleToolbarUpdateElement = useCallback(
    (id: string, updates: Partial<AnySlideElement>) => {
      const activeElement = currentSlide.elements.find(element => element.id === editingTextId)
      const isActiveTextUpdate =
        !!activeElement &&
        id === activeElement.id &&
        (activeElement.type === 'text' || activeElement.type === 'shape') &&
        isRichTextFormattingUpdate(updates as Partial<TextElement>)

      if (!isActiveTextUpdate || !activeElement) {
        updateSelectedElements(id, updates)
        return
      }

      const selection =
        activeTextSelection && activeTextSelection.end > activeTextSelection.start ? activeTextSelection : null
      const hasCollapsedSelection = !!activeTextSelection && activeTextSelection.start === activeTextSelection.end
      const characterUpdates = getCharacterRichTextFormattingUpdate(updates as RichTextFormattingUpdate)
      const hasCharacterUpdates = hasCharacterRichTextFormattingUpdate(characterUpdates as Partial<TextElement>)

      if (hasCollapsedSelection && hasCharacterUpdates && updates.textAlign === undefined) {
        const existingPending =
          pendingCaretFormattingRef.current?.id === activeElement.id ? pendingCaretFormattingRef.current.formatting : {}
        storePendingCaretFormatting({
          id: activeElement.id,
          formatting: {
            ...existingPending,
            ...characterUpdates
          }
        })
        return
      }

      if (activeElement.type === 'text') {
        const textDraft =
          activeRichTextDraftRef.current?.id === activeElement.id && activeRichTextDraftRef.current.kind === 'text'
            ? activeRichTextDraftRef.current.element
            : activeElement
        const nextTextDraft = applyRichTextFormatting(textDraft, updates as RichTextFormattingUpdate, selection)
        storeActiveRichTextDraft({ id: activeElement.id, kind: 'text', element: nextTextDraft })
        updateElement(activeElement.id, nextTextDraft as Partial<AnySlideElement>)
        bumpRichTextEditorRehydrateToken()
        return
      }

      const shapeText =
        activeRichTextDraftRef.current?.id === activeElement.id && activeRichTextDraftRef.current.kind === 'shape'
          ? activeRichTextDraftRef.current.element
          : (activeElement.shapeText ?? createDefaultShapeText())
      const nextShapeText = applyRichTextFormatting(shapeText, updates as RichTextFormattingUpdate, selection)
      storeActiveRichTextDraft({ id: activeElement.id, kind: 'shape', element: nextShapeText })
      updateElement(activeElement.id, {
        shapeText: nextShapeText
      } as Partial<ShapeElement>)
      bumpRichTextEditorRehydrateToken()
    },
    [
      activeTextSelection,
      bumpRichTextEditorRehydrateToken,
      currentSlide.elements,
      editingTextId,
      storePendingCaretFormatting,
      storeActiveRichTextDraft,
      updateElement,
      updateSelectedElements
    ]
  )

  const addElement = useCallback(
    (element: AnySlideElement, options?: { positionMode?: 'center' | 'preserve' }) => {
      const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex ?? 0))
      const { width: cw, height: ch } = getSlideCanvasSize(currentSlide)
      const ew = element.size?.width ?? 150
      const eh = element.size?.height ?? 150
      const centered =
        options?.positionMode === 'preserve' ? null : { x: Math.max(0, (cw - ew) / 2), y: Math.max(0, (ch - eh) / 2) }

      const newElement: AnySlideElement = {
        ...element,
        zIndex: maxZIndex + 1,
        ...(centered ? { position: centered } : {})
      }
      updateSlide({ elements: [...currentSlide.elements, newElement] })
      setSelectedElementIds(new Set([newElement.id]))
      toast.success(t('editor-added-element', { type: element.type }))
    },
    [currentSlide, currentSlide.elements, updateSlide, t]
  )

  const deleteElement = useCallback(() => {
    if (unlockedSelectedElements.length === 0) return
    const deletableIds = new Set(unlockedSelectedElements.map(element => element.id))
    updateSlide({ elements: currentSlide.elements.filter(element => !deletableIds.has(element.id)) })
    setSelectedElementIds(new Set([...selectedElementIds].filter(id => !deletableIds.has(id))))
    toast.success(t('editor-element-deleted'))
  }, [currentSlide.elements, selectedElementIds, unlockedSelectedElements, updateSlide, t])

  const duplicateElement = useCallback(() => {
    if (unlockedSelectedElements.length === 0) return
    const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex ?? 0))
    const newElements: AnySlideElement[] = []
    const newIds: string[] = []

    unlockedSelectedElements.forEach((el, idx) => {
      const copy = {
        ...el,
        id: `${el.type}-${Date.now()}-${idx}`,
        position: { x: el.position.x + 20, y: el.position.y + 20 },
        zIndex: maxZIndex + 1 + idx
      }
      newElements.push(copy)
      newIds.push(copy.id)
    })

    updateSlide({ elements: [...currentSlide.elements, ...newElements] })
    setSelectedElementIds(new Set(newIds))
    toast.success(t('editor-element-duplicated'))
  }, [unlockedSelectedElements, currentSlide.elements, updateSlide, t])

  const bringForward = useCallback(() => {
    if (!selectedElementId || selectedElement?.locked) return
    const elements = [...currentSlide.elements].sort((a, b) => a.zIndex - b.zIndex)
    const idx = elements.findIndex(e => e.id === selectedElementId)
    if (idx < elements.length - 1) {
      const current = elements[idx]
      const next = elements[idx + 1]
      updateElement(selectedElementId, { zIndex: next.zIndex })
      updateElement(next.id, { zIndex: current.zIndex })
    }
  }, [selectedElement, selectedElementId, currentSlide.elements, updateElement])

  const sendBackward = useCallback(() => {
    if (!selectedElementId || selectedElement?.locked) return
    const elements = [...currentSlide.elements].sort((a, b) => a.zIndex - b.zIndex)
    const idx = elements.findIndex(e => e.id === selectedElementId)
    if (idx > 0) {
      const current = elements[idx]
      const prev = elements[idx - 1]
      updateElement(selectedElementId, { zIndex: prev.zIndex })
      updateElement(prev.id, { zIndex: current.zIndex })
    }
  }, [selectedElement, selectedElementId, currentSlide.elements, updateElement])

  /**
   * Align the current multi-selection along the requested axis. Delegates to
   * {@link alignElements} so the same math is shared between the toolbar,
   * keyboard shortcuts, and programmatic callers.
   */
  const alignSelection = useCallback(
    (axis: AlignAxis) => {
      if (!canEdit) return
      const items = unlockedSelectedElements
      if (items.length === 0) return
      const { width, height } = getSlideCanvasSize(currentSlide)
      const canvasBounds: ElementBounds = {
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        centerX: width / 2,
        centerY: height / 2
      }
      const positions = alignElements(items, axis, canvasBounds)
      if (positions.size === 0) return
      const updates = Array.from(positions.entries()).map(([id, position]) => ({
        id,
        updates: { position } as Partial<AnySlideElement>
      }))
      updateMultipleElements(updates)
    },
    [canEdit, unlockedSelectedElements, currentSlide, updateMultipleElements]
  )

  /** Distribute three-or-more selected elements evenly along an axis. */
  const distributeSelection = useCallback(
    (axis: DistributeAxis) => {
      if (!canEdit) return
      const items = unlockedSelectedElements
      if (items.length < 3) return
      const positions = distributeElements(items, axis)
      if (positions.size === 0) return
      const updates = Array.from(positions.entries()).map(([id, position]) => ({
        id,
        updates: { position } as Partial<AnySlideElement>
      }))
      updateMultipleElements(updates)
    },
    [canEdit, unlockedSelectedElements, updateMultipleElements]
  )

  /**
   * Flip every selected shape along the requested axis. Updates the shared
   * {@link ShapeGeometryMetadata} so the flip survives PPTX round-trip and
   * lines up with the PropertyPanel flip controls.
   */
  const flipSelection = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (!canEdit) return
      const items = unlockedSelectedElements.filter(el => el.type === 'shape') as ShapeElement[]
      if (items.length === 0) return
      const updates = items.map(shape => {
        const flipped = flipShape(shape, axis)
        return {
          id: shape.id,
          updates: { geometry: flipped.geometry, importMeta: flipped.importMeta } as Partial<AnySlideElement>
        }
      })
      updateMultipleElements(updates)
    },
    [canEdit, unlockedSelectedElements, updateMultipleElements]
  )

  /**
   * Wrap the current multi-selection in a new group element. Children are
   * moved into group-relative coordinates so the group behaves as a single
   * unit on subsequent moves/resizes.
   */
  const groupSelection = useCallback(() => {
    if (!canEdit) return
    if (unlockedSelectedElements.length < 2) return
    const group = groupElements(unlockedSelectedElements)
    if (!group) return
    const groupedIds = new Set(unlockedSelectedElements.map(element => element.id))
    const remaining = currentSlide.elements.filter(el => !groupedIds.has(el.id))
    const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex ?? 0))
    const groupElement = { ...group, zIndex: maxZIndex + 1 }
    updateSlide({ elements: [...remaining, groupElement] })
    setSelectedElementIds(new Set([groupElement.id]))
    toast.success(t('editor-elements-grouped'))
  }, [canEdit, unlockedSelectedElements, currentSlide.elements, updateSlide, t])

  /** Explode the currently-selected group(s) back into individual children. */
  const ungroupSelection = useCallback(() => {
    if (!canEdit) return
    const groups = unlockedSelectedElements.filter(el => el.type === 'group') as GroupElement[]
    if (groups.length === 0) return
    const groupIds = new Set(groups.map(g => g.id))
    const nonGroups = currentSlide.elements.filter(el => !groupIds.has(el.id))
    const children = groups.flatMap(group => ungroupElement(group))
    const newIds = new Set(children.map(child => child.id))
    updateSlide({ elements: [...nonGroups, ...children] })
    setSelectedElementIds(newIds)
    toast.success(t('editor-elements-ungrouped'))
  }, [canEdit, unlockedSelectedElements, currentSlide.elements, updateSlide, t])

  // Drag-and-drop image handlers for canvas
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!canEdit) return

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      if (files.length === 0) return

      const canvasRect = canvasContainerRef.current?.getBoundingClientRect()
      if (!canvasRect) return

      const dropX = (e.clientX - canvasRect.left) / canvasScale
      const dropY = (e.clientY - canvasRect.top) / canvasScale

      files.forEach((file, index) => {
        const reader = new FileReader()
        reader.onload = () => {
          const src = reader.result as string
          addElement(
            createImageElement(src, {
              position: { x: dropX + index * 20, y: dropY + index * 20 },
              size: { width: 400, height: 300 }
            }),
            { positionMode: 'preserve' }
          )
        }
        reader.readAsDataURL(file)
      })
    },
    [canEdit, canvasScale, addElement]
  )

  // Track history for undo/redo (skip during active drag/resize)
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false
      return
    }
    if (!isSynced || !isInitialized) return

    // Skip recording during active drag - mark as pending
    if (isDraggingRef.current) {
      pendingHistoryRef.current = true
      return
    }

    const slidesSnapshot = JSON.stringify(slides)
    const lastSnapshot = history[historyIndex] ? JSON.stringify(history[historyIndex]) : null

    if (slidesSnapshot !== lastSnapshot) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(slidesSnapshot))
      // Keep max 50 history entries
      if (newHistory.length > 50) newHistory.shift()
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [slides, isSynced, isInitialized])

  // Callbacks for drag start/end to manage history recording
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true
  }, [])

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
    // If there were changes during drag, record them now
    if (pendingHistoryRef.current) {
      pendingHistoryRef.current = false
      const slidesSnapshot = JSON.stringify(slides)
      const lastSnapshot = history[historyIndex] ? JSON.stringify(history[historyIndex]) : null
      if (slidesSnapshot !== lastSnapshot) {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(JSON.parse(slidesSnapshot))
        if (newHistory.length > 50) newHistory.shift()
        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
      }
    }
  }, [slides, history, historyIndex])

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex <= 0) {
      toast.info(t('editor-nothing-to-undo') || 'Nothing to undo')
      return
    }
    isUndoRedoAction.current = true
    const previousState = history[historyIndex - 1]
    setHistoryIndex(historyIndex - 1)
    updateCollaborativeSlides(previousState)
    toast.success(t('editor-undo') || 'Undo')
  }, [historyIndex, history, updateCollaborativeSlides, t])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) {
      toast.info(t('editor-nothing-to-redo') || 'Nothing to redo')
      return
    }
    isUndoRedoAction.current = true
    const nextState = history[historyIndex + 1]
    setHistoryIndex(historyIndex + 1)
    updateCollaborativeSlides(nextState)
    toast.success(t('editor-redo') || 'Redo')
  }, [historyIndex, history, updateCollaborativeSlides, t])

  // Copy element(s) or slide to clipboard
  const copyElement = useCallback(() => {
    if (selectedElements.length > 0) {
      if (selectedElements.length === 1) {
        // Copy single element
        setClipboard({ type: 'element', data: JSON.parse(JSON.stringify(selectedElements[0])) })
        toast.success(t('editor-element-copied') || 'Element copied')
      } else {
        // Copy multiple elements
        setClipboard({ type: 'elements', data: JSON.parse(JSON.stringify(selectedElements)) })
        toast.success(t('editor-elements-copied') || `${selectedElements.length} elements copied`)
      }
    } else {
      // Copy current slide
      setClipboard({ type: 'slide', data: JSON.parse(JSON.stringify(currentSlide)) })
      toast.success(t('editor-slide-copied') || 'Slide copied')
    }
  }, [selectedElements, currentSlide, t])

  // Paste element(s) or slide from clipboard
  const pasteElement = useCallback(() => {
    if (!clipboard) {
      toast.info(t('editor-nothing-to-paste') || 'Nothing to paste')
      return
    }

    const canvasW = currentSlide?.canvasSize?.width ?? 1280
    const canvasH = currentSlide?.canvasSize?.height ?? 720

    if (clipboard.type === 'element') {
      const element = clipboard.data
      const pastedElement: AnySlideElement = {
        ...element,
        id: `${element.type}-${Date.now()}`,
        position: {
          x: Math.min(element.position.x + 30, canvasW - element.size.width),
          y: Math.min(element.position.y + 30, canvasH - element.size.height)
        }
      }
      addElement(pastedElement, { positionMode: 'preserve' })
      toast.success(t('editor-element-pasted') || 'Element pasted')
    } else if (clipboard.type === 'elements') {
      // Paste multiple elements
      const elements = clipboard.data as AnySlideElement[]
      const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex ?? 0))
      const newElements: AnySlideElement[] = []
      const newIds: string[] = []

      elements.forEach((element, idx) => {
        const pastedElement: AnySlideElement = {
          ...element,
          id: `${element.type}-${Date.now()}-${idx}`,
          position: {
            x: Math.min(element.position.x + 30, canvasW - element.size.width),
            y: Math.min(element.position.y + 30, canvasH - element.size.height)
          },
          zIndex: maxZIndex + 1 + idx
        }
        newElements.push(pastedElement)
        newIds.push(pastedElement.id)
      })

      updateSlide({ elements: [...currentSlide.elements, ...newElements] })
      setSelectedElementIds(new Set(newIds))
      toast.success(t('editor-elements-pasted') || `${elements.length} elements pasted`)
    } else if (clipboard.type === 'slide') {
      // Paste slide as a new slide
      const slideData = clipboard.data
      const newSlide: SlideData = {
        ...slideData,
        id: `slide-${Date.now()}`,
        elements: slideData.elements.map(el => ({
          ...el,
          id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }))
      }
      if (isSynced) {
        addCollaborativeSlideAfterId(currentSlide.id, newSlide)
      }
      setCurrentSlideId(newSlide.id)
      setSelectedElementIds(new Set())
      toast.success(t('editor-slide-pasted') || 'Slide pasted')
    }
  }, [clipboard, addElement, currentSlide, updateSlide, isSynced, addCollaborativeSlideAfterId, t])

  // Check if can undo/redo
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Slide management - use collaborative methods
  const addSlideWithLayout = useCallback(
    (layoutId: string) => {
      const effectiveMasters = getEffectiveMasters(masters, currentTheme, t)
      const found = findLayoutById(effectiveMasters, layoutId)

      let newSlide: SlideData
      if (found) {
        const { elements, background } = cloneLayoutToSlide(found.layout, found.master)
        newSlide = {
          id: `slide-${Date.now()}`,
          elements: elements.map(el => ensureTextFits(el)),
          background,
          layoutId,
          masterId: found.master.id
        }
      } else {
        newSlide = {
          id: `slide-${Date.now()}`,
          elements: [
            createTextElement({
              id: `title-${Date.now()}`,
              content: t('editor-new-slide'),
              position: { x: 80, y: 280 },
              size: { width: 1120, height: 100 },
              fontSize: 64,
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#1e293b'
            })
          ],
          background: { type: 'solid', color: '#ffffff' }
        }
      }

      if (isSynced) {
        addCollaborativeSlideAfterId(currentSlide.id, newSlide)
      }
      setCurrentSlideId(newSlide.id)
      setSelectedElementIds(new Set())
      setLastUsedLayoutId(layoutId)
      toast.success(t('editor-slide-added'))
    },
    [currentSlide.id, isSynced, addCollaborativeSlideAfterId, masters, currentTheme, t]
  )

  const handleChangeLayout = useCallback(
    (layoutId: string) => {
      const effectiveMasters = getEffectiveMasters(masters, currentTheme, t)
      const found = findLayoutById(effectiveMasters, layoutId)
      if (!found) return

      const slide = slides[currentSlideIndex]
      if (!slide) return

      const { elements: freshElements, background } = cloneLayoutToSlide(found.layout, found.master)

      const oldTexts = slide.elements.filter(e => e.type === 'text').map(e => (e as any).content as string)
      const oldImages = slide.elements.filter(e => e.type === 'image').map(e => (e as any).src as string)
      const userContent = slide.elements.filter(e => e.type === 'chart' || e.type === 'video' || e.type === 'code')

      const freshTexts = freshElements.filter(e => e.type === 'text')
      const freshImages = freshElements.filter(e => e.type === 'image')

      freshTexts.forEach((el, i) => {
        if (i < oldTexts.length) {
          ;(el as any).content = oldTexts[i]
        }
      })

      freshImages.forEach((el, i) => {
        if (i < oldImages.length && oldImages[i]) {
          ;(el as any).src = oldImages[i]
        }
      })

      const fittedElements = freshElements.map(el => ensureTextFits(el))
      const newElements = [...fittedElements, ...userContent]

      const updatedSlide: SlideData = {
        ...slide,
        elements: newElements,
        background,
        layoutId,
        masterId: found.master.id
      }

      if (isSynced) {
        updateCollaborativeSlide(currentSlideIndex, updatedSlide)
      }
      setSelectedElementIds(new Set())
      toast.success(t('layout-changed') || 'Layout changed')
    },
    [masters, currentTheme, slides, currentSlideIndex, isSynced, updateCollaborativeSlide, t]
  )

  const deleteSlide = useCallback(() => {
    if (!canEdit) return
    const indicesToDelete =
      selectedSlideIndices.size > 1 ? Array.from(selectedSlideIndices).sort((a, b) => b - a) : [currentSlideIndex]

    if (slides.length - indicesToDelete.length < 1) {
      toast.error(t('editor-delete-last-slide-error'))
      return
    }

    if (isSynced) {
      indicesToDelete.forEach(index => {
        const slideId = slides[index]?.id
        if (slideId) removeCollaborativeSlideById(slideId)
      })
    }

    // Find new current slide index
    const minDeleted = Math.min(...indicesToDelete)
    const newIndex = Math.min(minDeleted, slides.length - indicesToDelete.length - 1)
    const remainingSlides = slides.filter((_, idx) => !indicesToDelete.includes(idx))
    setCurrentSlideId(remainingSlides[Math.max(0, newIndex)]?.id || defaultSlide.id)
    setSelectedSlideIndices(new Set([Math.max(0, newIndex)]))
    setSelectedElementIds(new Set())

    const count = indicesToDelete.length
    toast.success(
      count > 1 ? t('editor-slides-deleted', { count }) || `${count} slides deleted` : t('editor-slide-deleted')
    )
  }, [
    canEdit,
    slides,
    currentSlideIndex,
    selectedSlideIndices,
    isSynced,
    removeCollaborativeSlideById,
    defaultSlide.id,
    t
  ])

  const duplicateSlide = useCallback(() => {
    if (!canEdit) return
    const indicesToDuplicate =
      selectedSlideIndices.size > 1 ? Array.from(selectedSlideIndices).sort((a, b) => a - b) : [currentSlideIndex]

    if (isSynced) {
      const duplicates: SlideData[] = []

      indicesToDuplicate.forEach(idx => {
        const original = slides[idx]
        duplicates.push({
          ...original,
          id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          elements: original.elements.map(e => ({
            ...e,
            id: `${e.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
          }))
        })
      })

      // Insert all duplicates after the last selected slide
      const insertAt = Math.max(...indicesToDuplicate) + 1
      let afterSlideId = slides[indicesToDuplicate[indicesToDuplicate.length - 1]]?.id || null
      duplicates.forEach(duplicate => {
        if (afterSlideId) {
          duplicateCollaborativeSlideById(afterSlideId, duplicate)
        } else {
          addCollaborativeSlideAfterId(null, duplicate)
        }
        afterSlideId = duplicate.id
      })

      // Select the duplicated slides
      const newSelectedIndices = new Set(duplicates.map((_, i) => insertAt + i))
      if (duplicates[0]) setCurrentSlideId(duplicates[0].id)
      setSelectedSlideIndices(newSelectedIndices)
    }

    const count = indicesToDuplicate.length
    toast.success(
      count > 1 ? t('toast-slides-duplicated', { count }) || `${count} slides duplicated` : t('toast-slide-duplicated')
    )
  }, [
    canEdit,
    slides,
    currentSlideIndex,
    selectedSlideIndices,
    isSynced,
    duplicateCollaborativeSlideById,
    addCollaborativeSlideAfterId,
    t
  ])

  // Reorder slides via drag and drop
  const reorderSlides = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !isSynced) return
      const slideId = slides[fromIndex]?.id
      if (!slideId) return
      moveCollaborativeSlideById(slideId, toIndex)
    },
    [slides, isSynced, moveCollaborativeSlideById]
  )

  // Handle AI-generated slides
  const handleGeneratedSlides = useCallback(
    (generatedSlides: SlideData[], title: string, matchedTemplate?: { id: string; name: string; themeId?: string }) => {
      if (!canEdit || !isSynced || generatedSlides.length === 0) return

      // AI generate is a replace-all intent; peers converge through one Yjs array reset.
      updateCollaborativeSlides(generatedSlides)
      setCurrentSlideId(generatedSlides[0].id)
      setSelectedElementIds(new Set())

      // Apply matched template's theme if available
      if (matchedTemplate?.themeId) {
        updateCollaborativeTheme(matchedTemplate.themeId)
        toast.info(
          t('toast-template-matched', { name: matchedTemplate.name }) || `Using template: ${matchedTemplate.name}`
        )
      }

      // Update presentation title if changed
      if (title && title !== presentationTitle) {
        setPresentationTitle(title)
        SlidesApiService.updateSlide(slideId, { title }).catch(err => {
          console.error('[SlideEditor] Failed to update title:', err)
        })
      }
    },
    [canEdit, isSynced, updateCollaborativeSlides, updateCollaborativeTheme, presentationTitle, slideId, t]
  )

  // Handle AI-refined slide
  const handleRefineSlide = useCallback(
    (refinedSlide: SlideData) => {
      if (!canEdit || !isSynced) return

      // Keep the original slide ID when updating
      const updatedSlide = { ...refinedSlide, id: currentSlide.id }
      updateCollaborativeSlideById(currentSlide.id, updatedSlide)
      setSelectedElementIds(new Set())
      toast.success(t('editor-slide-refined') || 'Slide refined')
    },
    [canEdit, isSynced, currentSlide.id, updateCollaborativeSlideById, t]
  )

  // Handle template application
  const handleApplyTemplate = useCallback(
    (templateSlides: SlideData[], themeId: string, templateMasters?: SlideMaster[]) => {
      if (!canEdit || !isSynced || templateSlides.length === 0) return

      // Generate new IDs for template slides to avoid conflicts
      const slidesWithNewIds = templateSlides.map(slide => ({
        ...slide,
        id: crypto.randomUUID(),
        elements: slide.elements.map(el => ({
          ...el,
          id: crypto.randomUUID()
        }))
      }))

      let afterSlideId = slides[slides.length - 1]?.id || null
      slidesWithNewIds.forEach(slide => {
        addCollaborativeSlideAfterId(afterSlideId, slide)
        afterSlideId = slide.id
      })

      // Apply template theme
      updateCollaborativeTheme(themeId)

      // Import template masters if present
      if (templateMasters && templateMasters.length > 0) {
        setMasters(templateMasters)
        updateCollaborativeMasters(templateMasters)
      }

      // Navigate to first template slide
      setCurrentSlideId(slidesWithNewIds[0].id)
      setSelectedElementIds(new Set())
    },
    [canEdit, isSynced, slides, addCollaborativeSlideAfterId, updateCollaborativeTheme, updateCollaborativeMasters]
  )

  // Handle image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canEdit) return
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = event => {
        const src = event.target?.result as string
        addElement(
          createImageElement(src, {
            position: { x: 100, y: 100 },
            size: { width: 400, height: 300 }
          })
        )
      }
      reader.readAsDataURL(file)
      setShowImageDialog(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [addElement, canEdit]
  )

  const handleImageUrl = useCallback(() => {
    if (!canEdit) return
    if (!imageUrl.trim()) return
    addElement(
      createImageElement(imageUrl, {
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 }
      })
    )
    setImageUrl('')
    setShowImageDialog(false)
  }, [imageUrl, addElement, canEdit])

  // Handle video upload
  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canEdit) return
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = event => {
        const src = event.target?.result as string
        addElement(
          createVideoElement(src, {
            position: { x: 100, y: 100 },
            size: { width: 480, height: 270 }
          })
        )
      }
      reader.readAsDataURL(file)
      setShowVideoDialog(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    },
    [addElement, canEdit]
  )

  const handleVideoUrl = useCallback(() => {
    if (!canEdit) return
    if (!videoUrl.trim()) return
    addElement(
      createVideoElement(videoUrl, {
        position: { x: 100, y: 100 },
        size: { width: 480, height: 270 }
      })
    )
    setVideoUrl('')
    setShowVideoDialog(false)
  }, [videoUrl, addElement, canEdit])

  const handleVideoBackground = useCallback(
    (url: string) => {
      updateSlide({
        background: {
          type: 'video',
          videoUrl: url,
          videoMuted: true,
          videoLoop: true
        }
      })
      setShowBackgroundDialog(false)
    },
    [updateSlide]
  )

  const handleImageBackground = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        updateSlide({
          background: {
            type: 'image',
            imageUrl: reader.result as string
          }
        })
        setShowBackgroundDialog(false)
      }
      reader.readAsDataURL(file)

      if (bgImageInputRef.current) {
        bgImageInputRef.current.value = ''
      }
    },
    [updateSlide]
  )

  // Text editing
  const handleActiveTextSelectionChange = useCallback(
    (range: RichTextSelectionRange | null) => {
      setActiveTextSelection(range)

      const pendingFormatting = pendingCaretFormattingRef.current
      if (!pendingFormatting || pendingFormatting.id !== editingTextIdRef.current) {
        return
      }

      if (preservePendingCaretFormattingRef.current) {
        preservePendingCaretFormattingRef.current = false
        return
      }

      // PowerPoint-style stored formatting should follow continuous typing, but
      // a manual caret move / new selection should restore the actual style at
      // the new position instead of keeping the previous pending format.
      storePendingCaretFormatting(null)
    },
    [storePendingCaretFormatting]
  )

  const handleEditText = useCallback(
    (id: string) => {
      if (!canEdit) return
      const element = currentSlide.elements.find(currentElement => currentElement.id === id)
      if (!element || element.locked) return
      const nextDraft = createActiveRichTextDraft(element)
      const initialContent =
        element.type === 'code' ? element.code : nextDraft ? getActiveRichTextDraftContent(nextDraft) : ''

      storeActiveRichTextDraft(nextDraft)
      storePendingCaretFormatting(null)
      preservePendingCaretFormattingRef.current = false
      voiceBaseContentRef.current = initialContent
      currentEditingContentRef.current = initialContent
      lastProcessedTranscriptRef.current = ''
      editingTextIdRef.current = id
      lastObservedEditingTargetSnapshotRef.current = null
      setActiveTextSelection(null)
      setEditingTextId(id)
    },
    [canEdit, currentSlide.elements, storeActiveRichTextDraft, storePendingCaretFormatting]
  )

  const handleTextChange = useCallback(
    (valueOrEvent: string | React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!editingTextId) return
      const newValue = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value
      applyEditingTextValue(editingTextId, newValue)
    },
    [applyEditingTextValue, editingTextId]
  )

  const finishTextEditing = useCallback(() => {
    editingTextIdRef.current = null
    lastObservedEditingTargetSnapshotRef.current = null
    storeActiveRichTextDraft(null)
    storePendingCaretFormatting(null)
    preservePendingCaretFormattingRef.current = false
    setEditingTextId(null)
    setActiveTextSelection(null)
  }, [storeActiveRichTextDraft, storePendingCaretFormatting])

  // Rename presentation
  const handleRename = useCallback(async () => {
    if (isReadOnly) return
    if (!newTitle.trim()) {
      toast.error(t('editor-title-empty'))
      return
    }
    try {
      await SlidesApiService.updateSlide(slideId, { title: newTitle.trim() })
      setPresentationTitle(newTitle.trim())
      setShowRenameDialog(false)
      toast.success(t('editor-presentation-renamed'))
      if (onSlideUpdated) {
        onSlideUpdated({ ...slide, title: newTitle.trim() })
      }
    } catch (err) {
      console.error('[SlideEditor] Rename error:', err)
      toast.error(t('editor-rename-failed'))
    }
  }, [isReadOnly, slideId, newTitle, slide, onSlideUpdated, t])

  const openRenameDialog = useCallback(() => {
    if (isReadOnly) return
    setNewTitle(presentationTitle)
    setShowRenameDialog(true)
  }, [isReadOnly, presentationTitle])

  const getExistingLinkUrl = useCallback((): string | undefined => {
    if (!selectedElement || selectedElement.type !== 'text') return undefined
    const textElement: TextElement = selectedElement
    const links = textElement.links || []
    if (links.length > 0) {
      return links[0].url
    }
    return undefined
  }, [selectedElement])

  const handleSaveLink = useCallback(
    (url: string) => {
      if (!selectedElement || selectedElement.type !== 'text') return

      const textElement: TextElement = selectedElement
      const content = textElement.content

      const newLink = createLink(0, content.length, url)
      updateElement(selectedElement.id, { links: [newLink] })
    },
    [selectedElement, updateElement]
  )

  const handleRemoveLink = useCallback(() => {
    if (!selectedElement || selectedElement.type !== 'text') return
    updateElement(selectedElement.id, { links: [] })
  }, [selectedElement, updateElement])

  // Export to PowerPoint
  const handleExportToPptx = useCallback(async () => {
    try {
      const success = await exportToPptx(slides, currentTheme, presentationTitle)
      if (success) {
        toast.success(t('editor-export-pptx-success'))
      } else {
        toast.error(t('editor-export-failed'))
      }
    } catch (err) {
      console.error('[SlideEditor] Export error:', err)
      toast.error(t('editor-export-failed'))
    }
  }, [slides, currentTheme, presentationTitle, t])

  // Sync state when user exits fullscreen via Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresentMode) {
        setIsPresentMode(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [isPresentMode])

  // Calculate presentation scale to fit screen
  useEffect(() => {
    if (!isPresentMode) return

    const calculateScale = () => {
      // Pull the canvas dimensions from the current slide so imported 4:3 /
      // A4 / custom-size decks fill the viewport correctly in present mode.
      const slideWidth = currentSlide?.canvasSize?.width ?? 1280
      const slideHeight = currentSlide?.canvasSize?.height ?? 720

      const scaleX = window.innerWidth / slideWidth
      const scaleY = window.innerHeight / slideHeight
      const scale = Math.min(scaleX, scaleY)

      setPresentScale(scale)
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)

    return () => {
      window.removeEventListener('resize', calculateScale)
    }
  }, [isPresentMode])

  // Exit presentation mode handler
  const exitPresentMode = useCallback(() => {
    setIsPresentMode(false)
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Sync slide data to cast receiver when casting and slide changes
  useEffect(() => {
    if (!isCastConnected) return

    const castData: CastSlideData = {
      type: 'slide-update',
      slideIndex: currentSlideIndex,
      totalSlides: slides.length,
      slide: currentSlide,
      theme: currentTheme,
      slides
    }
    sendSlideData(castData)
  }, [isCastConnected, currentSlideIndex, currentSlide, currentTheme, slides, sendSlideData])

  // Handle starting cast to external display (Presentation API only)
  const handleStartCast = useCallback(async () => {
    try {
      await startCasting(slides, currentTheme, currentSlideIndex, 'cast')
    } catch {
      // Error handled by hook's onError callback
    }
  }, [startCasting, slides, currentTheme, currentSlideIndex])

  // Handle starting presentation in new window (also opens presenter view on control screen)
  const handleStartWindowPresent = useCallback(async () => {
    try {
      await startCasting(slides, currentTheme, currentSlideIndex, 'window')
      // Open presenter view on control screen for speaker notes and controls
      setPresenterMode(true)
    } catch {
      // Error handled by hook's onError callback
    }
  }, [startCasting, slides, currentTheme, currentSlideIndex])

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!isPresentMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          navigateToPresentSlide(currentSlideIndex + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          navigateToPresentSlide(currentSlideIndex - 1)
          break
        case 'Home':
          e.preventDefault()
          navigateToPresentSlide(0)
          break
        case 'End':
          e.preventDefault()
          navigateToPresentSlide(slides.length - 1)
          break
        case 'Escape':
          exitPresentMode()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresentMode, slides.length, exitPresentMode, navigateToPresentSlide, currentSlideIndex])

  // Keyboard navigation for editor mode (up/down arrows to change slides, Delete to remove elements)
  useEffect(() => {
    if (isPresentMode) return

    const handleEditorKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Undo: Ctrl+Z (works even when input is focused, but not for text inputs)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (!isInputFocused) {
          e.preventDefault()
          undo()
          return
        }
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (!isInputFocused) {
          e.preventDefault()
          redo()
          return
        }
      }

      // Copy: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isInputFocused) {
        e.preventDefault()
        copyElement()
        return
      }

      // Paste: Ctrl+V (check for clipboard images first, then fall back to element paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isInputFocused) {
        e.preventDefault()

        // Try to paste image from clipboard
        navigator.clipboard
          .read()
          .then(async items => {
            for (const item of items) {
              const imageType = item.types.find(type => type.startsWith('image/'))
              if (imageType) {
                const blob = await item.getType(imageType)
                const reader = new FileReader()
                reader.onload = () => {
                  const src = reader.result as string
                  addElement(createImageElement(src, { size: { width: 400, height: 300 } }))
                  toast.success(t('editor-image-pasted'))
                }
                reader.readAsDataURL(blob)
                return
              }
            }
            // No image found in clipboard, fall back to element paste
            pasteElement()
          })
          .catch(() => {
            // Clipboard API not available or denied, fall back to element paste
            pasteElement()
          })
        return
      }

      // Select All: Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInputFocused) {
        e.preventDefault()
        const allElementIds = new Set(currentSlide.elements.map(e => e.id))
        setSelectedElementIds(allElementIds)
        return
      }

      // Group: Ctrl/Cmd+G. Ungroup: Ctrl/Cmd+Shift+G. Matches PowerPoint.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G') && !isInputFocused) {
        e.preventDefault()
        if (e.shiftKey) {
          ungroupSelection()
        } else {
          groupSelection()
        }
        return
      }

      // Escape: Close notes panel or deselect all
      if (e.key === 'Escape' && !isInputFocused) {
        e.preventDefault()
        if (showNotesPanel) {
          setShowNotesPanel(false)
        } else {
          setSelectedElementIds(new Set())
        }
        return
      }

      if (isInputFocused) return

      // Delete with Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selectedElementId) {
          // Delete selected element
          deleteElement()
        } else {
          // Delete current slide
          deleteSlide()
        }
        return
      }

      // Navigate slides with arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (e.key === 'ArrowUp') {
          setCurrentSlideIndex(prev => Math.max(0, prev - 1))
        } else {
          setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))
        }
        return
      }

      // Toggle speaker notes panel with 'N'
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setShowNotesPanel(prev => !prev)
        return
      }

      // Start presenter view with 'P'
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        setPresenterMode(true)
        return
      }
    }

    window.addEventListener('keydown', handleEditorKeyDown)
    return () => window.removeEventListener('keydown', handleEditorKeyDown)
  }, [
    isPresentMode,
    slides.length,
    selectedElementId,
    currentSlide.elements,
    deleteElement,
    deleteSlide,
    undo,
    redo,
    copyElement,
    pasteElement,
    addElement,
    showNotesPanel,
    groupSelection,
    ungroupSelection,
    t
  ])

  // Scroll selected thumbnail into view
  useEffect(() => {
    const thumbnail = thumbnailRefs.current[currentSlideIndex]
    if (thumbnail) {
      thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentSlideIndex])

  // Present Mode (true fullscreen)
  if (isPresentMode) {
    const goToPrevSlide = () => navigateToPresentSlide(currentSlideIndex - 1)
    const goToNextSlide = () => navigateToPresentSlide(currentSlideIndex + 1)

    return (
      <div
        ref={presentationContainerRef}
        className="gba:fixed gba:inset-0 gba:z-[9999] gba:bg-black gba:w-screen gba:h-screen gba:group"
      >
        {/* Slide content */}
        <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center">
          <div
            className="gba:relative gba:overflow-hidden gba:flex-shrink-0"
            style={{
              width: (currentSlide?.canvasSize?.width ?? 1280) * presentScale,
              height: (currentSlide?.canvasSize?.height ?? 720) * presentScale
            }}
          >
            <SlideTransitionPlayer
              currentSlideId={currentSlide.id}
              previousSlideId={presentPreviousSlide?.id || null}
              transition={presentTransition}
              onTransitionComplete={handlePresentTransitionComplete}
              previousContent={
                presentPreviousSlide && (
                  <SlideCanvas
                    elements={presentPreviousSlide.elements}
                    selectedIds={new Set()}
                    background={presentPreviousSlide.background}
                    onSelectElements={() => {}}
                    onUpdateElement={() => {}}
                    onUpdateMultipleElements={() => {}}
                    onEditText={() => {}}
                    scale={presentScale}
                    isPresenting={true}
                    canvasSize={presentPreviousSlide.canvasSize}
                  />
                )
              }
            >
              <SlideCanvas
                elements={currentSlide.elements}
                selectedIds={new Set()}
                background={currentSlide.background}
                onSelectElements={() => {}}
                onUpdateElement={() => {}}
                onUpdateMultipleElements={() => {}}
                onEditText={() => {}}
                scale={presentScale}
                isPresenting={true}
                canvasSize={currentSlide.canvasSize}
              />
            </SlideTransitionPlayer>
          </div>
        </div>

        {/* Left navigation arrow */}
        <button
          onClick={goToPrevSlide}
          disabled={!canNavigatePrev}
          className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:z-[10000] gba:w-12 gba:h-12 gba:rounded-full gba:bg-white/10 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center gba:text-white/90 gba:transition-all gba:duration-200 hover:gba:bg-white/20 hover:gba:scale-110 disabled:gba:opacity-30 disabled:gba:cursor-not-allowed disabled:hover:gba:scale-100 disabled:hover:gba:bg-white/10"
          data-testid={`${testId}-present-prev`}
        >
          <ChevronLeft className="gba:w-6 gba:h-6" />
        </button>

        {/* Right navigation arrow */}
        <button
          onClick={goToNextSlide}
          disabled={!canNavigateNext}
          className="gba:absolute gba:right-4 gba:top-1/2 gba:-translate-y-1/2 gba:z-[10000] gba:w-12 gba:h-12 gba:rounded-full gba:bg-white/10 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center gba:text-white/90 gba:transition-all gba:duration-200 hover:gba:bg-white/20 hover:gba:scale-110 disabled:gba:opacity-30 disabled:gba:cursor-not-allowed disabled:hover:gba:scale-100 disabled:hover:gba:bg-white/10"
          data-testid={`${testId}-present-next`}
        >
          <ChevronRight className="gba:w-6 gba:h-6" />
        </button>

        {/* Bottom control bar */}
        <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:z-[10000] gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:bg-gradient-to-t gba:from-black/80 gba:to-transparent">
          {/* Left: Slide counter */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <span className="gba:text-sm gba:text-white/90 gba:font-medium gba:tabular-nums gba:bg-white/10 gba:px-3 gba:py-1.5 gba:rounded-md gba:backdrop-blur-sm">
              {currentSlideIndex + 1} / {slides.length}
            </span>
          </div>

          {/* Center: Navigation buttons */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevSlide}
              disabled={!canNavigatePrev}
              className="gba:text-white gba:bg-white/10 gba:backdrop-blur-sm hover:gba:bg-white/20 gba:disabled:opacity-30"
            >
              <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-previous')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextSlide}
              disabled={!canNavigateNext}
              className="gba:text-white gba:bg-white/10 gba:backdrop-blur-sm hover:gba:bg-white/20 gba:disabled:opacity-30"
            >
              {t('editor-next')}
              <ChevronRight className="gba:w-4 gba:h-4 gba:ml-1" />
            </Button>
          </div>

          {/* Right: Exit button */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exitPresentMode}
              className="gba:text-white gba:bg-white/10 gba:backdrop-blur-sm hover:gba:bg-white/20"
              data-testid={`${testId}-present-exit`}
            >
              <Minimize className="gba:w-4 gba:h-4 gba:mr-1.5" />
              {t('editor-exit')}
            </Button>
          </div>
        </div>

        {/* Keyboard shortcuts hint - appears briefly then fades */}
        <div className="gba:absolute gba:top-4 gba:left-1/2 gba:-translate-x-1/2 gba:z-[10000] gba:text-xs gba:text-white/50 gba:bg-black/40 gba:px-3 gba:py-1.5 gba:rounded-md gba:backdrop-blur-sm gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300">
          {t('editor-presentation-hint') || 'Use arrow keys or click to navigate • ESC to exit'}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header - matching PagedDocumentEditor style */}
      <div className="gba:border-b gba:bg-card gba:shadow-sm">
        <div className="gba:px-4 gba:py-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            {/* Back button and title */}
            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={onBack} title={t('editor-back-to-slides')}>
                <ArrowLeft className="gba:w-5 gba:h-5" />
              </Button>

              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-gradient-to-br gba:from-orange-500/20 gba:to-pink-500/20 gba:flex gba:items-center gba:justify-center">
                  <Presentation className="gba:w-5 gba:h-5 gba:text-orange-600" />
                </div>
                <div className="gba:flex gba:flex-col">
                  <button
                    onClick={openRenameDialog}
                    disabled={isReadOnly}
                    className="gba:flex gba:items-center gba:gap-2 gba:group gba:cursor-pointer hover:gba:opacity-80 gba:transition-opacity gba:text-left"
                    title={t('editor-click-to-rename')}
                  >
                    <span className="gba:text-lg gba:font-semibold gba:text-foreground gba:truncate gba:max-w-md">
                      {presentationTitle}
                    </span>
                    <Pencil className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                  </button>
                  <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                    <span>{t('editor-slide-count', { count: slides.length })}</span>
                    <span>•</span>
                    <span>{t('editor-slide-of', { current: currentSlideIndex + 1, total: slides.length })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaboration presence indicator */}
            {!isReadOnly && participantsWithAvatars.length > 0 && (
              <>
                <Separator orientation="vertical" className="gba:h-6" />
                <PresenceIndicator participants={participantsWithAvatars} maxVisible={3} size="sm" showLabel={false} />
              </>
            )}

            {/* Spacer to push right-aligned items */}
            <div className="gba:flex-1" />

            {/* Right-aligned header controls */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
              {!isReadOnly ? (
                <>
                  <SlideEditorHeaderActions
                    slideId={slideId}
                    slideTitle={presentationTitle}
                    accessToken={accessToken}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    applyContentJsonSnapshot={contentJson => {
                      applyContentJsonSnapshot(contentJson)
                    }}
                    data-testid={`${testId}-header-actions`}
                  />

                  <Separator orientation="vertical" className="gba:h-6" />
                </>
              ) : null}

              {/* Auto-save status - consistent with document-apps */}
              <AutoSaveIndicator
                isSaving={isSaving}
                lastSaveTime={lastSaveTime}
                hasUnsavedChanges={!editorIsSynced}
                data-testid={`${testId}-auto-save`}
              />

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Zoom controls */}
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCanvasScale(Math.max(0.25, canvasScale - 0.1))}
                  title={t('editor-zoom-out')}
                  className="gba:h-8 gba:w-8"
                >
                  <ZoomOut className="gba:w-4 gba:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCanvasScale(0.65)}
                  className="gba:h-8 gba:px-2 gba:text-xs gba:min-w-[50px]"
                >
                  {Math.round(canvasScale * 100)}%
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCanvasScale(Math.min(1.5, canvasScale + 0.1))}
                  title={t('editor-zoom-in')}
                  className="gba:h-8 gba:w-8"
                >
                  <ZoomIn className="gba:w-4 gba:h-4" />
                </Button>
              </div>

              {/* Cast status indicator - keep in header as status */}
              {isCastConnected && (
                <>
                  <Separator orientation="vertical" className="gba:h-6" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopCast}
                    className="gba:gap-2 gba:text-green-600 gba:border-green-600"
                    data-testid={`${testId}-cast-stop`}
                  >
                    <Cast className="gba:w-4 gba:h-4" />
                    {isCastFallback ? t('cast-connected-window') : t('cast-connected')}
                    <MonitorX className="gba:w-4 gba:h-4" />
                  </Button>
                </>
              )}

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Present button - primary action, more options in ribbon Slideshow tab */}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsPresentMode(true)
                  document.documentElement.requestFullscreen?.().catch(() => {})
                }}
                data-testid={`${testId}-present`}
              >
                <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('editor-present')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ribbon Toolbar */}
      {!isReadOnly ? (
        <SlideToolbarRibbon
          context={effectiveToolbarContext}
          canUndo={canUndo}
          canRedo={canRedo}
          hasClipboardContent={clipboard !== null}
          isSynced={editorIsSynced}
          currentTheme={currentTheme}
          showSpellCheckPanel={showSpellCheckPanel}
          spellCheckIssueCount={spellCheck.totalIssues}
          spellCheckIsChecking={spellCheck.isChecking}
          showNotesPanel={showNotesPanel}
          isCastConnected={isCastConnected}
          isCastConnecting={castConnectionState === 'connecting'}
          slides={slides}
          currentSlide={currentSlide}
          accessToken={accessToken}
          onUndo={undo}
          onRedo={redo}
          onCopy={copyElement}
          onPaste={pasteElement}
          onAddElement={addElement}
          onUpdateElement={handleToolbarUpdateElement}
          onShowBackgroundDialog={() => setShowBackgroundDialog(true)}
          onShowImageDialog={() => setShowImageDialog(true)}
          onShowVideoDialog={() => setShowVideoDialog(true)}
          onShowLinkDialog={() => setShowLinkDialog(true)}
          onUpdateTheme={handleUpdateTheme}
          onToggleSpellCheck={() => {
            if (!showSpellCheckPanel) {
              setShowSpellCheckPanel(true)
              spellCheck.checkAllSlides()
            } else {
              setShowSpellCheckPanel(false)
            }
          }}
          onApplyTemplate={handleApplyTemplate}
          onPresent={() => {
            setIsPresentMode(true)
            document.documentElement.requestFullscreen?.().catch(() => {})
          }}
          onPresenterView={() => setPresenterMode(true)}
          onPresentInWindow={handleStartWindowPresent}
          onCastToDisplay={handleStartCast}
          onToggleNotes={() => setShowNotesPanel(!showNotesPanel)}
          onShowTransitions={() => {
            // Select the current slide in the property panel to show transitions
            setShowPropertyPanel(true)
          }}
          onSaveNow={() => handleSave(false)}
          onExportPptx={handleExportToPptx}
          onExportPdf={() => setShowPdfExportDialog(true)}
          onRefineSlide={handleRefineSlide}
          onGenerateSlides={handleGeneratedSlides}
          onOpenMasterView={() => setEditorView('master')}
          masters={masters}
          onChangeLayout={handleChangeLayout}
          data-testid={`${testId}-toolbar`}
        />
      ) : null}

      {/* Property Panel Toggle - only show when panel is hidden */}
      {!isReadOnly && !showPropertyPanel && (
        <div className="gba:flex gba:items-center gba:justify-end gba:px-4 gba:py-1 gba:border-b gba:bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPropertyPanel(true)}
            title={t('editor-show-properties') || 'Show Properties'}
            data-testid={`${testId}-show-property-panel`}
          >
            <PanelRight className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      )}

      {/* Slide Master View */}
      {editorView === 'master' && (
        <SlideMasterView
          masters={getEffectiveMasters(masters, currentTheme, t)}
          currentTheme={currentTheme}
          onUpdateMasters={newMasters => {
            setMasters(newMasters)
            if (isSynced) updateCollaborativeMasters(newMasters)
          }}
          onClose={() => setEditorView('normal')}
          data-testid={`${testId}-master-view`}
        />
      )}

      {/* Main Content -- Normal View */}
      {editorView === 'normal' && (
        <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
          {/* Slide Thumbnails */}
          <div className="gba:w-48 gba:flex-shrink-0 gba:border-r gba:bg-card gba:flex gba:flex-col">
            {/* Scrollable thumbnails */}
            <div className="gba:flex-1 gba:overflow-y-auto gba:p-2 gba:space-y-2">
              {slides.map((s, idx) => {
                // Thumbnail scale: sidebar is w-48 (192px) - p-2 (8px each side) - border (4px) = ~176px
                // Derive the thumbnail scale from the slide's actual canvas so
                // imported 4:3 / custom-size decks thumb correctly (not cropped).
                const thumbSourceWidth = s.canvasSize?.width ?? 1280
                const thumbScale = 176 / thumbSourceWidth
                const isDraggedOver = dragOverIndex === idx && draggedSlideIndex !== idx

                return (
                  <div
                    key={`${s.id}-${idx}`}
                    ref={el => {
                      thumbnailRefs.current[idx] = el
                    }}
                    draggable
                    onDragStart={e => {
                      setDraggedSlideIndex(idx)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(idx))
                    }}
                    onDragEnd={() => {
                      setDraggedSlideIndex(null)
                      setDragOverIndex(null)
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (draggedSlideIndex !== null && draggedSlideIndex !== idx) {
                        setDragOverIndex(idx)
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverIndex(null)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      if (draggedSlideIndex !== null && draggedSlideIndex !== idx) {
                        reorderSlides(draggedSlideIndex, idx)
                      }
                      setDraggedSlideIndex(null)
                      setDragOverIndex(null)
                    }}
                    onClick={e => {
                      const isCtrlKey = e.ctrlKey || e.metaKey
                      const isShiftKey = e.shiftKey

                      if (isShiftKey && slideSelectionAnchor !== null) {
                        // Shift+click: Select range
                        const start = Math.min(slideSelectionAnchor, idx)
                        const end = Math.max(slideSelectionAnchor, idx)
                        const rangeIndices = new Set<number>()
                        for (let i = start; i <= end; i++) {
                          rangeIndices.add(i)
                        }
                        if (isCtrlKey) {
                          // Ctrl+Shift: Add range to existing selection
                          setSelectedSlideIndices(prev => new Set([...prev, ...rangeIndices]))
                        } else {
                          setSelectedSlideIndices(rangeIndices)
                        }
                        setCurrentSlideIndex(idx)
                      } else if (isCtrlKey) {
                        // Ctrl+click: Toggle individual selection
                        setSelectedSlideIndices(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(idx)) {
                            if (newSet.size > 1) {
                              newSet.delete(idx)
                              // If deleting current, move to another selected
                              if (idx === currentSlideIndex) {
                                setCurrentSlideIndex(Math.min(...newSet))
                              }
                            }
                          } else {
                            newSet.add(idx)
                          }
                          return newSet
                        })
                        setSlideSelectionAnchor(idx)
                        if (!selectedSlideIndices.has(idx)) {
                          setCurrentSlideIndex(idx)
                        }
                      } else {
                        // Regular click: Select only this slide
                        setCurrentSlideIndex(idx)
                        setSelectedSlideIndices(new Set([idx]))
                        setSlideSelectionAnchor(idx)
                      }
                      setSelectedElementIds(new Set())
                    }}
                    className={`gba:rounded-lg gba:cursor-grab gba:transition-all gba:border-2 gba:overflow-hidden gba:bg-card ${
                      idx === currentSlideIndex
                        ? 'gba:border-primary gba:shadow-md'
                        : selectedSlideIndices.has(idx)
                          ? 'gba:border-primary/60 gba:shadow-sm gba:bg-primary/5'
                          : 'gba:border-border hover:gba:border-muted-foreground/40'
                    } ${draggedSlideIndex === idx ? 'gba:opacity-50' : ''} ${
                      isDraggedOver ? 'gba:border-primary gba:border-dashed gba:bg-primary/10' : ''
                    }`}
                  >
                    <SlideThumbnail slide={s} index={idx} thumbScale={thumbScale} />
                  </div>
                )
              })}
            </div>

            {/* Slide Actions */}
            <div className="gba:p-3 gba:border-t gba:bg-card/50 gba:space-y-2">
              {selectedSlideIndices.size > 1 && (
                <div className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-1">
                  {selectedSlideIndices.size} {t('editor-slides-selected') || 'slides selected'}
                </div>
              )}
              {!isReadOnly ? (
                <>
                  <SlideLayoutPicker
                    masters={masters}
                    currentTheme={currentTheme}
                    onSelectLayout={addSlideWithLayout}
                    onDuplicateSlide={duplicateSlide}
                    lastUsedLayoutId={lastUsedLayoutId}
                    data-testid={`${testId}-add-slide-btn`}
                  />
                  <div className="gba:flex gba:items-center gba:justify-center gba:rounded-lg gba:border gba:bg-muted/30 gba:p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={duplicateSlide}
                      title={t('editor-duplicate-slide')}
                      className="gba:flex-1 gba:h-8 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-background"
                      data-testid={`${testId}-duplicate-slide-btn`}
                    >
                      <CopyPlus className="gba:w-4 gba:h-4" />
                    </Button>
                    <div className="gba:w-px gba:h-5 gba:bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deleteSlide}
                      title={t('editor-delete-slide')}
                      className="gba:flex-1 gba:h-8 gba:text-muted-foreground hover:gba:text-destructive hover:gba:bg-destructive/10"
                      data-testid={`${testId}-delete-slide-btn`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="gba:flex-1 gba:bg-muted/30 gba:overflow-auto gba:p-4 md:gba:p-8 gba:min-w-0">
            <div className="gba:inline-flex gba:justify-center gba:min-w-full">
              <div
                ref={canvasContainerRef}
                role="application"
                aria-label={t('editor-canvas-aria-label')}
                className="gba:shadow-2xl gba:rounded-lg gba:overflow-hidden gba:relative gba:flex-shrink-0"
                style={{
                  width: (currentSlide?.canvasSize?.width ?? 1280) * canvasScale,
                  height: (currentSlide?.canvasSize?.height ?? 720) * canvasScale
                }}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
                onMouseMove={e => {
                  if (collaborationEnabled && awareness) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = (e.clientX - rect.left) / canvasScale
                    const y = (e.clientY - rect.top) / canvasScale
                    awareness.setLocalStateField('cursor', {
                      x,
                      y,
                      slideIndex: currentSlideIndex
                    })
                  }
                }}
                onMouseLeave={() => {
                  if (collaborationEnabled && awareness) {
                    awareness.setLocalStateField('cursor', null)
                  }
                }}
              >
                <SlideCanvas
                  key={currentSlide.id || currentSlideIndex}
                  elements={currentSlide.elements}
                  selectedIds={selectedElementIds}
                  background={currentSlide.background}
                  onSelectElements={ids => {
                    setSelectedElementIds(ids)
                    if (!showPropertyPanel && ids.size > 0) {
                      setShowPropertyPanel(true)
                    }
                    if (collaborationEnabled && awareness) {
                      const primaryId = ids.size > 0 ? [...ids][0] : null
                      awareness.setLocalStateField(
                        'selection',
                        primaryId
                          ? {
                              slideIndex: currentSlideIndex,
                              elementId: primaryId
                            }
                          : null
                      )
                    }
                  }}
                  onUpdateElement={updateElement}
                  onUpdateMultipleElements={updateMultipleElements}
                  onEditText={handleEditText}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  scale={canvasScale}
                  canvasSize={currentSlide.canvasSize}
                  inlineEditing={{
                    editingTextId,
                    editorElement: activeEditingTextElement,
                    onTextChange: handleTextChange,
                    onSelectionChange: handleActiveTextSelectionChange,
                    onFinishEditing: () => {
                      if (voiceInput.isListening) {
                        voiceInput.stopListening()
                      }
                      finishTextEditing()
                    },
                    rehydrateToken: richTextEditorRehydrateToken,
                    voiceInput: {
                      isListening: voiceInput.isListening,
                      isSupported: voiceInput.isSupported,
                      volume: voiceInput.volume,
                      error: voiceInput.error,
                      interimTranscript: voiceInput.interimTranscript,
                      startListening: () => {
                        // Capture current content as base for voice input
                        voiceBaseContentRef.current = currentEditingContentRef.current
                        lastProcessedTranscriptRef.current = ''
                        voiceInput.startListening()
                      },
                      stopListening: voiceInput.stopListening
                    }
                  }}
                  editingPointsId={editingPointsId}
                  onPointsChange={(id, nextCustGeomPath) => {
                    const el = currentSlide.elements.find(e => e.id === id)
                    if (!el || el.type !== 'shape') return
                    const shapeEl: ShapeElement = el
                    const prevGeometry = getShapeGeometry(shapeEl)
                    const nextGeometry: ShapeGeometryMetadata = prevGeometry
                      ? { ...prevGeometry, custGeomPath: nextCustGeomPath }
                      : { sourceFormat: 'native', custGeomPath: nextCustGeomPath }
                    const updates: Partial<ShapeElement> = { geometry: nextGeometry }
                    if (prevGeometry?.sourceFormat === 'pptx') updates.importMeta = nextGeometry
                    updateElement(id, updates as Partial<AnySlideElement>)
                  }}
                  onExitPointEditing={() => setEditingPointsId(null)}
                  onShapeContextMenu={id => setEditingPointsId(id)}
                />

                {/* Collaborator cursors overlay */}
                {collaborationEnabled && isInitialized && (
                  <CollaboratorCursors
                    awareness={awareness}
                    currentSlideIndex={currentSlideIndex}
                    canvasScale={canvasScale}
                    currentUserId={currentUserId}
                    data-testid={`${testId}-collaborator-cursors`}
                  />
                )}
              </div>

              {/* Floating Text Actions - outside canvas container to avoid overflow clipping */}
              {selectedElementIds.size === 1 &&
                selectedElement?.type === 'text' &&
                !selectedElement.locked &&
                !editingTextId &&
                !isReadOnly &&
                !isPresentMode && (
                  <FloatingTextActions
                    element={selectedElement}
                    canvasScale={canvasScale}
                    canvasRef={canvasContainerRef}
                    isVoiceSupported={voiceInput.isSupported}
                    onVoiceClick={() => {
                      handleEditText(selectedElement.id)
                      voiceInput.startListening()
                    }}
                    onEditClick={() => {
                      handleEditText(selectedElement.id)
                    }}
                    data-testid={`${testId}-floating-text-actions`}
                  />
                )}
            </div>
          </div>

          {/* Property Panel - Always visible until X button is clicked */}
          {!isReadOnly && showPropertyPanel && (
            <div className="gba:w-72 gba:flex-shrink-0 gba:border-l gba:bg-card gba:overflow-y-auto">
              <div className="gba:p-3 gba:border-b gba:flex gba:items-center gba:justify-between">
                <h3 className="gba:font-semibold gba:text-sm">{t('editor-properties')}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-6 gba:w-6"
                  onClick={() => setShowPropertyPanel(false)}
                  data-testid={`${testId}-close-property-panel`}
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              </div>
              <PropertyPanel
                element={selectedElement}
                textFormatting={
                  effectiveToolbarContext.type === 'text' ? (effectiveToolbarContext.formatting ?? null) : null
                }
                onUpdate={updates => selectedElementId && updateSelectedElements(selectedElementId, updates)}
                onDelete={deleteElement}
                onDuplicate={duplicateElement}
                onBringForward={bringForward}
                onSendBackward={sendBackward}
                slideTransition={currentSlide.transition}
                onSlideTransitionChange={canEdit ? updateCurrentSlideTransition : undefined}
                selectionCount={selectedElementIds.size}
                hasGroupInSelection={selectedElements.some(el => el.type === 'group')}
                hasUnlockedSelection={hasUnlockedSelection}
                hasLockedSelection={hasLockedSelection}
                onAlign={canEdit ? alignSelection : undefined}
                onDistribute={canEdit ? distributeSelection : undefined}
                onFlip={canEdit ? flipSelection : undefined}
                onGroup={canEdit ? groupSelection : undefined}
                onUngroup={canEdit ? ungroupSelection : undefined}
                onEditPoints={canEdit ? (id: string) => setEditingPointsId(id) : undefined}
                slideIndex={currentSlideIndex}
              />
            </div>
          )}

          {/* Spell Check Panel */}
          {showSpellCheckPanel && (
            <div className="gba:w-80 gba:flex-shrink-0 gba:h-full">
              <SpellCheckPanel
                annotations={spellCheck.annotations}
                annotationsBySlide={spellCheck.annotationsBySlide}
                isChecking={spellCheck.isChecking}
                totalIssues={spellCheck.totalIssues}
                selectedAnnotationId={spellCheck.selectedAnnotation?.id || null}
                onCheck={() => spellCheck.checkAllSlides()}
                onSelectAnnotation={spellCheck.selectAnnotation}
                onAcceptSuggestion={(annotation: SlideAnnotation) => {
                  const newContent = spellCheck.acceptSuggestion(annotation)
                  if (newContent !== null) {
                    updateElement(annotation.elementId, { content: newContent })
                  }
                }}
                onIgnoreAnnotation={spellCheck.ignoreAnnotation}
                onIgnoreWord={spellCheck.ignoreWord}
                onNavigateToSlide={slideId => {
                  const idx = slides.findIndex(s => s.id === slideId)
                  if (idx >= 0) {
                    setCurrentSlideIndex(idx)
                  }
                }}
                onClose={() => setShowSpellCheckPanel(false)}
                data-testid={`${testId}-spell-check-panel`}
              />
            </div>
          )}
        </div>
      )}

      {editingTextId && voiceInput.isListening && (
        <div
          className="gba:fixed gba:left-1/2 gba:top-24 gba:z-[50000] gba:pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="gba:bg-background gba:rounded-xl gba:shadow-xl gba:border gba:border-border gba:flex gba:flex-col gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:min-w-[320px] gba:max-w-[420px]">
            <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
              <div className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:bg-destructive/10 gba:rounded-md">
                <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse" />
                <span className="gba:text-xs gba:font-semibold gba:text-destructive">REC</span>
              </div>

              <div className="gba:flex gba:items-end gba:gap-0.5 gba:h-5">
                {[0.15, 0.3, 0.5, 0.7, 0.85].map((threshold, i) => {
                  const isActive = voiceInput.volume > threshold
                  return (
                    <div
                      key={i}
                      className={`gba:w-1 gba:rounded-sm gba:transition-colors ${isActive ? 'gba:bg-green-500' : 'gba:bg-border'}`}
                      style={{ height: 6 + i * 3 }}
                    />
                  )
                })}
              </div>

              <span className="gba:text-[11px] gba:text-muted-foreground gba:ml-auto">Speak now...</span>
            </div>

            {voiceInput.interimTranscript && (
              <div className="gba:w-full gba:px-2.5 gba:py-2 gba:bg-muted gba:rounded-md gba:text-sm gba:text-foreground gba:italic gba:leading-relaxed gba:max-h-[60px] gba:overflow-hidden">
                "{voiceInput.interimTranscript}"
              </div>
            )}

            <div className="gba:text-[11px] gba:text-muted-foreground">Click mic button or outside to stop</div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editor-add-image')}</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div>
              <Label>{t('editor-upload-from-computer')}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="gba:mt-2 gba:block gba:w-full gba:text-sm gba:file:mr-4 gba:file:py-2 gba:file:px-4 gba:file:rounded gba:file:border-0 gba:file:bg-primary gba:file:text-primary-foreground gba:cursor-pointer"
              />
            </div>
            <Separator />
            <div>
              <Label>{t('editor-paste-image-url')}</Label>
              <div className="gba:flex gba:gap-2 gba:mt-2">
                <Input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder={t('editor-image-url-placeholder')}
                />
                <Button onClick={handleImageUrl} disabled={!imageUrl.trim()}>
                  {t('editor-add-button')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editor-rename-presentation')}</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div>
              <Label>{t('editor-presentation-title')}</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={t('editor-enter-title-placeholder')}
                className="gba:mt-2"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleRename()
                  }
                }}
              />
            </div>
            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                {t('editor-cancel')}
              </Button>
              <Button onClick={handleRename} disabled={!newTitle.trim()}>
                {t('editor-rename')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editor-add-video')}</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div>
              <Label>{t('editor-upload-from-computer')}</Label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="gba:mt-2 gba:block gba:w-full gba:text-sm gba:file:mr-4 gba:file:py-2 gba:file:px-4 gba:file:rounded gba:file:border-0 gba:file:bg-primary gba:file:text-primary-foreground gba:cursor-pointer"
              />
            </div>
            <Separator />
            <div>
              <Label>{t('editor-paste-video-url')}</Label>
              <div className="gba:flex gba:gap-2 gba:mt-2">
                <Input
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder={t('editor-video-url-placeholder')}
                />
                <Button onClick={handleVideoUrl} disabled={!videoUrl.trim()}>
                  {t('editor-add-button')}
                </Button>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{t('editor-video-formats')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Background Dialog */}
      <Dialog open={showBackgroundDialog} onOpenChange={setShowBackgroundDialog}>
        <DialogContent className="gba:max-w-xl gba:max-h-[90vh] gba:flex gba:flex-col">
          <DialogHeader>
            <DialogTitle>{t('editor-slide-background')}</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4 gba:overflow-y-auto gba:flex-1 gba:pr-2">
            {/* Current Background Preview */}
            <div>
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">
                {t('editor-current-background')}
              </Label>
              <div
                className="gba:h-24 gba:rounded-lg gba:border gba:shadow-inner gba:relative gba:overflow-hidden"
                style={{
                  backgroundColor: currentSlide.background.color || '#ffffff',
                  background: currentSlide.background.gradient
                    ? gradientToCss(currentSlide.background.gradient)
                    : undefined
                }}
              >
                {currentSlide.background.type === 'video' && (
                  <video
                    src={sanitizeMediaUrl(currentSlide.background.videoUrl, ['video/'])}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover"
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Solid Colors */}
            <div>
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">{t('editor-solid-colors')}</Label>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateSlide({ background: { type: 'solid', color } })}
                    className={`gba:w-8 gba:h-8 gba:rounded gba:border-2 hover:gba:scale-110 gba:transition-transform ${currentSlide.background.type === 'solid' && currentSlide.background.color === color ? 'gba:border-primary gba:shadow-md' : 'gba:border-muted'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Gradient Presets */}
            <div>
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">{t('editor-gradient-presets')}</Label>
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-4">
                {PRESET_GRADIENTS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => updateSlide({ background: { type: 'gradient', gradient: preset.gradient } })}
                    className="gba:w-10 gba:h-10 gba:rounded gba:border-2 gba:border-muted hover:gba:scale-110 gba:transition-transform hover:gba:shadow-md"
                    style={{ background: gradientToCss(preset.gradient) }}
                    title={preset.name}
                  />
                ))}
              </div>

              {/* Custom Gradient Builder */}
              <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-muted/30">
                <Label className="gba:text-xs gba:font-semibold gba:mb-3 gba:block">
                  🎨 {t('editor-create-custom-gradient')}
                </Label>
                <GradientBuilder
                  gradient={currentSlide.background.type === 'gradient' ? currentSlide.background.gradient : undefined}
                  onChange={gradient => {
                    if (gradient) {
                      updateSlide({ background: { type: 'gradient', gradient } })
                    }
                  }}
                />
              </div>
            </div>

            <Separator />

            {/* Video Background */}
            <div>
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">
                🎬 {t('editor-video-background')}
              </Label>
              <div className="gba:flex gba:gap-2">
                <Input
                  placeholder={t('editor-video-url-placeholder')}
                  onChange={e => {
                    if (e.target.value) {
                      handleVideoBackground(e.target.value)
                    }
                  }}
                  className="gba:flex-1"
                />
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{t('editor-video-backgrounds-note')}</p>
            </div>

            <Separator />

            {/* Image Background */}
            <div>
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">
                <ImageIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
                {t('editor-image-background')}
              </Label>
              <div className="gba:flex gba:gap-2">
                <Button variant="outline" size="sm" onClick={() => bgImageInputRef.current?.click()}>
                  <ImageIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                  {t('editor-upload-background-image')}
                </Button>
                <input
                  ref={bgImageInputRef}
                  type="file"
                  accept="image/*"
                  className="gba:hidden"
                  onChange={handleImageBackground}
                />
              </div>
              <Input
                placeholder={t('editor-background-image-url')}
                onChange={e => {
                  if (e.target.value) {
                    updateSlide({ background: { type: 'image', imageUrl: e.target.value } })
                    setShowBackgroundDialog(false)
                  }
                }}
                className="gba:mt-2"
              />
            </div>

            <div className="gba:flex gba:justify-end gba:pt-2">
              <Button variant="outline" onClick={() => setShowBackgroundDialog(false)}>
                {t('editor-done')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Export Dialog */}
      <PdfExportDialog
        open={showPdfExportDialog}
        onOpenChange={setShowPdfExportDialog}
        slides={slides}
        currentSlideIndex={currentSlideIndex}
        theme={currentTheme}
        title={presentationTitle}
        t={t}
      />

      {/* Speaker Notes Panel */}
      {showNotesPanel && (
        <SpeakerNotesPanel
          notes={currentSlide.notes || ''}
          slideIndex={currentSlideIndex}
          onNotesChange={updateCurrentSlideNotes}
          onClose={() => setShowNotesPanel(false)}
          t={t}
        />
      )}

      {/* Presenter View */}
      {presenterMode && (
        <PresenterView
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          theme={currentTheme}
          onSlideChange={setCurrentSlideIndex}
          onExit={() => setPresenterMode(false)}
          t={t}
          castConnectionState={castConnectionState}
          isCastFallback={isCastFallback}
          onStopCast={handleStopCast}
          aiAssistStatus={aiAssistStatus}
          onToggleAIAssist={handleToggleAIAssist}
          onOpenAIAssistSettings={() => setShowAIAssistSettings(true)}
          showTranscript={aiAssistConfig.showTranscript}
          showMatchFeedback={aiAssistConfig.showMatchFeedback}
          onElementClick={handlePresenterElementClick}
        />
      )}

      {/* AI Assist Settings Dialog */}
      <AIAssistSettings
        open={showAIAssistSettings}
        onOpenChange={setShowAIAssistSettings}
        config={aiAssistConfig}
        onChange={handleAIAssistConfigChange}
        t={t}
      />

      {/* Link Dialog */}
      <LinkDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        selectedText={selectedElement?.type === 'text' ? selectedElement.content : ''}
        initialUrl={getExistingLinkUrl()}
        onSave={handleSaveLink}
        onRemove={getExistingLinkUrl() ? handleRemoveLink : undefined}
      />
    </div>
  )
}

export default SlideEditor
