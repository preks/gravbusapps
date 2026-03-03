/**
 * SlideEditor Component
 *
 * Professional slide editor with canvas-based editing, shapes, images, and full styling.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
  Input,
  Textarea,
  Badge,
  Label,
  useTranslation,
  cn
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Play,
  Save,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  Palette,
  Image as ImageIcon,
  Code,
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  ArrowRight,
  Hexagon,
  Minus,
  MessageSquare,
  Diamond,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Pencil,
  Video,
  Presentation,
  Clock,
  CheckCircle,
  Download,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Minimize,
  Undo2,
  Redo2,
  ClipboardPaste,
  CopyPlus,
  StickyNote
} from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Slide as SlideType } from '../types'
import { SlidesApiService } from '../services'
import { SlideCanvas } from './SlideCanvas'
import { PropertyPanel } from './PropertyPanel'
import { CollaboratorCursors } from './CollaboratorCursors'
import { PresenceIndicator } from '../../shared/components/PresenceIndicator'
import { SlideEditorHeaderActions } from './editor/SlideEditorHeaderActions'
import { SLIDE_THEMES, getThemeById } from './slideThemes'
import { useSlideCollaboration } from '../hooks/useSlideCollaboration'
import {
  type AnySlideElement,
  type SlideData,
  createTextElement,
  createImageElement,
  createShapeElement,
  createCodeElement,
  createVideoElement,
  PRESET_GRADIENTS,
  gradientToCss,
  COLOR_PRESETS
} from './slideElements'
import { GradientBuilder } from './GradientBuilder'
import { GeneratePresentationButton } from './GeneratePresentationButton'
import { RefineSlideButton } from './RefineSlideButton'
import { SaveTemplateButton } from './SaveTemplateButton'
import { TemplateBrowserButton } from './TemplateBrowserButton'
import { VoiceInputButton } from './VoiceInputButton'
import { VoiceVisualizer } from './VoiceVisualizer'
import { FloatingTextActions } from './FloatingTextActions'
import { PdfExportDialog } from './PdfExportDialog'
import { SpeakerNotesPanel } from './SpeakerNotesPanel'
import { PresenterView } from './PresenterView'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { exportToPptx } from '../utils/exportUtils'
import translations from '../_i18n'
import type { TextElement } from './slideElements'

export interface SlideEditorProps extends BusinessAppContextProps {
  slideId: string
  slide: SlideType
  onBack: () => void
  onSlideUpdated?: (slide: SlideType) => void
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

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slideId,
  slide,
  onBack,
  onSlideUpdated,
  accessToken,
  userInfo,
  initialTemplate,
  onInitialTemplateApplied,
  'data-testid': testId = 'slide-editor'
}) => {
  const { t } = useTranslation(translations)
  const defaultSlide = useMemo(() => createDefaultSlide(t), [t])

  // Snapshot persistence (REST) MUST be driven by LOCAL changes only.
  // This is declared BEFORE initializing collaboration so we can pass a stable callback.
  const latestSlidesRef = useRef<SlideData[]>([])
  const latestThemeIdRef = useRef<string>('corporate')
  const canSnapshotSaveRef = useRef(false)
  const snapshotSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSnapshotSave = useCallback(() => {
    if (!canSnapshotSaveRef.current) return

    if (snapshotSaveTimeoutRef.current) {
      clearTimeout(snapshotSaveTimeoutRef.current)
    }

    snapshotSaveTimeoutRef.current = setTimeout(() => {
      const contentJson = { slides: latestSlidesRef.current, themeId: latestThemeIdRef.current }
      SlidesApiService.updateSlide(slideId, { contentJson }).catch(err => {
        console.error('[SlideEditor] Auto-save error:', err)
      })
    }, 2000)
  }, [slideId])

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

  // Prepare initial data from slide prop (used for bootstrap initializer / pre-sync rendering).
  const initialSlides = useMemo(
    () => (slide.contentJson?.slides as SlideData[] | undefined) || [defaultSlide],
    [slide.id, defaultSlide]
  )
  const initialThemeId = useMemo(
    () => (slide.contentJson?.themeId as string | undefined) || SLIDE_THEMES[0].id,
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
    updateSlide: updateCollaborativeSlide,
    updateElement: updateCollaborativeElement,
    addSlide: addCollaborativeSlide,
    applyContentJsonSnapshot
  } = useSlideCollaboration({
    slideId,
    accessToken: accessToken || '',
    currentUserId,
    currentUserName,
    currentUserAvatar,
    enabled: !!slideId,
    initialSlides,
    initialThemeId,
    onSynced: handleSynced,
    onLocalDocumentChange: scheduleSnapshotSave
  })

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

  // UI state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedSlideIndices, setSelectedSlideIndices] = useState<Set<number>>(new Set([0]))
  const [slideSelectionAnchor, setSlideSelectionAnchor] = useState<number | null>(null)
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set())
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPresentMode, setIsPresentMode] = useState(false)
  const [presentScale, setPresentScale] = useState(1)
  const [canvasScale, setCanvasScale] = useState(0.65)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [showBackgroundDialog, setShowBackgroundDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showPdfExportDialog, setShowPdfExportDialog] = useState(false)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [presenterMode, setPresenterMode] = useState(false)
  const [presentationTitle, setPresentationTitle] = useState(slide.title)
  const [newTitle, setNewTitle] = useState(slide.title)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const bgImageInputRef = useRef<HTMLInputElement>(null)
  const presentationContainerRef = useRef<HTMLDivElement>(null)
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([])
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Voice input state
  const [voiceEditMode, setVoiceEditMode] = useState(false)
  const voiceBaseContentRef = useRef<string>('')
  const editingTextIdRef = useRef<string | null>(null)
  const lastProcessedTranscriptRef = useRef<string>('')
  const currentEditingContentRef = useRef<string>('')

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

  // Always render from collaboration state (it is seeded immediately from initial content).
  const slides = useMemo(() => {
    return collaborativeSlides?.length ? collaborativeSlides : [defaultSlide]
  }, [collaborativeSlides, defaultSlide])

  const currentTheme = useMemo(() => {
    return collaborativeThemeId ? getThemeById(collaborativeThemeId) : SLIDE_THEMES[0]
  }, [collaborativeThemeId])

  const currentSlideRaw = slides[currentSlideIndex] || defaultSlide
  // Ensure elements array always exists
  const currentSlide: SlideData = {
    ...currentSlideRaw,
    elements: currentSlideRaw.elements || [],
    background: currentSlideRaw.background || { type: 'solid', color: '#ffffff' }
  }
  // For property panel, use the first selected element when multiple are selected
  const selectedElementId = selectedElementIds.size > 0 ? [...selectedElementIds][0] : null
  const selectedElement = currentSlide.elements.find(e => e.id === selectedElementId) || null
  const selectedElements = currentSlide.elements.filter(e => selectedElementIds.has(e.id))

  // Note: Initialization is handled by the collaboration hook's onBootstrapRequired callback
  // No need for manual initialization here

  useEffect(() => {
    latestSlidesRef.current = slides
  }, [slides])
  useEffect(() => {
    latestThemeIdRef.current = collaborativeThemeId
  }, [collaborativeThemeId])
  useEffect(() => {
    canSnapshotSaveRef.current = isSynced && isInitialized
  }, [isSynced, isInitialized])

  const handleSave = useCallback(
    async (silent = false) => {
      if (!silent) setIsSaving(true)
      try {
        const contentJson = { slides, themeId: collaborativeThemeId }
        await SlidesApiService.updateSlide(slideId, { contentJson })
        if (!silent) toast.success(t('editor-slide-saved'))
      } catch (err) {
        console.error('[SlideEditor] Save error:', err)
        if (!silent) toast.error(t('editor-save-failed'))
      } finally {
        if (!silent) setIsSaving(false)
      }
    },
    [slideId, slides, collaborativeThemeId, t]
  )

  const canEdit = isSynced && isInitialized

  // Voice input hook - updates text in real-time as speech is recognized
  const voiceInput = useVoiceInput({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    onTranscript: (transcript: string) => {
      const currentEditingId = editingTextIdRef.current
      if (currentEditingId && transcript) {
        const lastProcessed = lastProcessedTranscriptRef.current
        let newPortion = transcript

        // Extract only the new portion of the transcript (delta)
        if (lastProcessed && transcript.toLowerCase().startsWith(lastProcessed.toLowerCase())) {
          newPortion = transcript.slice(lastProcessed.length).trim()
        }

        if (newPortion) {
          // Get current content (includes any manual keyboard edits)
          const currentContent = currentEditingContentRef.current
          const newContent = currentContent ? `${currentContent} ${newPortion}` : newPortion
          updateElement(currentEditingId, { content: newContent })
          currentEditingContentRef.current = newContent
        }

        lastProcessedTranscriptRef.current = transcript
      }
    }
  })

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

  const updateElement = useCallback(
    (id: string, updates: Partial<AnySlideElement>) => {
      if (!canEdit) return
      updateCollaborativeElement(currentSlideIndex, id, updates)
    },
    [canEdit, currentSlideIndex, updateCollaborativeElement]
  )

  const updateMultipleElements = useCallback(
    (updates: { id: string; updates: Partial<AnySlideElement> }[]) => {
      if (!canEdit) return
      // Apply all updates in a single batch
      const updatedElements = currentSlide.elements.map(el => {
        const update = updates.find(u => u.id === el.id)
        return update ? ({ ...el, ...update.updates } as AnySlideElement) : el
      })
      updateSlide({ elements: updatedElements })
    },
    [canEdit, currentSlide.elements, updateSlide]
  )

  const addElement = useCallback(
    (element: AnySlideElement) => {
      const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex))
      const newElement = { ...element, zIndex: maxZIndex + 1 }
      updateSlide({ elements: [...currentSlide.elements, newElement] })
      setSelectedElementIds(new Set([newElement.id]))
      toast.success(t('editor-added-element', { type: element.type }))
    },
    [currentSlide.elements, updateSlide, t]
  )

  const deleteElement = useCallback(() => {
    if (selectedElementIds.size === 0) return
    updateSlide({ elements: currentSlide.elements.filter(e => !selectedElementIds.has(e.id)) })
    setSelectedElementIds(new Set())
    toast.success(t('editor-element-deleted'))
  }, [selectedElementIds, currentSlide.elements, updateSlide, t])

  const duplicateElement = useCallback(() => {
    if (selectedElements.length === 0) return
    const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex))
    const newElements: AnySlideElement[] = []
    const newIds: string[] = []

    selectedElements.forEach((el, idx) => {
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
  }, [selectedElements, currentSlide.elements, updateSlide, t])

  const bringForward = useCallback(() => {
    if (!selectedElementId) return
    const elements = [...currentSlide.elements].sort((a, b) => a.zIndex - b.zIndex)
    const idx = elements.findIndex(e => e.id === selectedElementId)
    if (idx < elements.length - 1) {
      const current = elements[idx]
      const next = elements[idx + 1]
      updateElement(selectedElementId, { zIndex: next.zIndex })
      updateElement(next.id, { zIndex: current.zIndex })
    }
  }, [selectedElementId, currentSlide.elements, updateElement])

  const sendBackward = useCallback(() => {
    if (!selectedElementId) return
    const elements = [...currentSlide.elements].sort((a, b) => a.zIndex - b.zIndex)
    const idx = elements.findIndex(e => e.id === selectedElementId)
    if (idx > 0) {
      const current = elements[idx]
      const prev = elements[idx - 1]
      updateElement(selectedElementId, { zIndex: prev.zIndex })
      updateElement(prev.id, { zIndex: current.zIndex })
    }
  }, [selectedElementId, currentSlide.elements, updateElement])

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
            })
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

    if (clipboard.type === 'element') {
      const element = clipboard.data
      const pastedElement: AnySlideElement = {
        ...element,
        id: `${element.type}-${Date.now()}`,
        position: {
          x: Math.min(element.position.x + 30, 1280 - element.size.width),
          y: Math.min(element.position.y + 30, 720 - element.size.height)
        }
      }
      addElement(pastedElement)
      toast.success(t('editor-element-pasted') || 'Element pasted')
    } else if (clipboard.type === 'elements') {
      // Paste multiple elements
      const elements = clipboard.data as AnySlideElement[]
      const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex))
      const newElements: AnySlideElement[] = []
      const newIds: string[] = []

      elements.forEach((element, idx) => {
        const pastedElement: AnySlideElement = {
          ...element,
          id: `${element.type}-${Date.now()}-${idx}`,
          position: {
            x: Math.min(element.position.x + 30, 1280 - element.size.width),
            y: Math.min(element.position.y + 30, 720 - element.size.height)
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
        addCollaborativeSlide(newSlide, currentSlideIndex + 1)
      }
      setCurrentSlideIndex(currentSlideIndex + 1)
      setSelectedElementIds(new Set())
      toast.success(t('editor-slide-pasted') || 'Slide pasted')
    }
  }, [clipboard, addElement, currentSlide.elements, updateSlide, isSynced, addCollaborativeSlide, currentSlideIndex, t])

  // Check if can undo/redo
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Slide management - use collaborative methods
  const addSlide = useCallback(() => {
    const newSlide: SlideData = {
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
    if (isSynced) {
      addCollaborativeSlide(newSlide, currentSlideIndex + 1)
    }
    setCurrentSlideIndex(currentSlideIndex + 1)
    setSelectedElementIds(new Set())
    toast.success(t('editor-slide-added'))
  }, [currentSlideIndex, isSynced, addCollaborativeSlide, t])

  const deleteSlide = useCallback(() => {
    const indicesToDelete =
      selectedSlideIndices.size > 1 ? Array.from(selectedSlideIndices).sort((a, b) => b - a) : [currentSlideIndex]

    if (slides.length - indicesToDelete.length < 1) {
      toast.error(t('editor-delete-last-slide-error'))
      return
    }

    if (isSynced) {
      // Delete from highest to lowest index to preserve indices
      const newSlides = slides.filter((_, idx) => !indicesToDelete.includes(idx))
      updateCollaborativeSlides(newSlides)
    }

    // Find new current slide index
    const minDeleted = Math.min(...indicesToDelete)
    const newIndex = Math.min(minDeleted, slides.length - indicesToDelete.length - 1)
    setCurrentSlideIndex(Math.max(0, newIndex))
    setSelectedSlideIndices(new Set([Math.max(0, newIndex)]))
    setSelectedElementIds(new Set())

    const count = indicesToDelete.length
    toast.success(
      count > 1 ? t('editor-slides-deleted', { count }) || `${count} slides deleted` : t('editor-slide-deleted')
    )
  }, [slides, currentSlideIndex, selectedSlideIndices, isSynced, updateCollaborativeSlides, t])

  const duplicateSlide = useCallback(() => {
    const indicesToDuplicate =
      selectedSlideIndices.size > 1 ? Array.from(selectedSlideIndices).sort((a, b) => a - b) : [currentSlideIndex]

    if (isSynced) {
      const newSlides = [...slides]
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
      newSlides.splice(insertAt, 0, ...duplicates)
      updateCollaborativeSlides(newSlides)

      // Select the duplicated slides
      const newSelectedIndices = new Set(duplicates.map((_, i) => insertAt + i))
      setCurrentSlideIndex(insertAt)
      setSelectedSlideIndices(newSelectedIndices)
    }

    const count = indicesToDuplicate.length
    toast.success(
      count > 1 ? t('toast-slides-duplicated', { count }) || `${count} slides duplicated` : t('toast-slide-duplicated')
    )
  }, [slides, currentSlideIndex, selectedSlideIndices, isSynced, updateCollaborativeSlides, t])

  // Reorder slides via drag and drop
  const reorderSlides = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !isSynced) return

      const newSlides = [...slides]
      const [movedSlide] = newSlides.splice(fromIndex, 1)
      newSlides.splice(toIndex, 0, movedSlide)

      updateCollaborativeSlides(newSlides)

      // Update current slide index to follow the moved slide
      if (currentSlideIndex === fromIndex) {
        setCurrentSlideIndex(toIndex)
      } else if (fromIndex < currentSlideIndex && toIndex >= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex - 1)
      } else if (fromIndex > currentSlideIndex && toIndex <= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex + 1)
      }
    },
    [slides, currentSlideIndex, isSynced, updateCollaborativeSlides]
  )

  // Handle AI-generated slides
  const handleGeneratedSlides = useCallback(
    (generatedSlides: SlideData[], title: string, matchedTemplate?: { id: string; name: string; themeId?: string }) => {
      if (!isSynced || generatedSlides.length === 0) return

      // Replace all slides with generated ones
      updateCollaborativeSlides(generatedSlides)
      setCurrentSlideIndex(0)
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
    [isSynced, updateCollaborativeSlides, updateCollaborativeTheme, presentationTitle, slideId, t]
  )

  // Handle AI-refined slide
  const handleRefineSlide = useCallback(
    (refinedSlide: SlideData) => {
      if (!isSynced) return

      // Keep the original slide ID when updating
      const updatedSlide = { ...refinedSlide, id: currentSlide.id }
      updateCollaborativeSlide(currentSlideIndex, updatedSlide)
      setSelectedElementIds(new Set())
      toast.success(t('editor-slide-refined') || 'Slide refined')
    },
    [isSynced, currentSlide.id, currentSlideIndex, updateCollaborativeSlide, t]
  )

  // Handle template application
  const handleApplyTemplate = useCallback(
    (templateSlides: SlideData[], themeId: string) => {
      if (!isSynced || templateSlides.length === 0) return

      // Generate new IDs for template slides to avoid conflicts
      const slidesWithNewIds = templateSlides.map(slide => ({
        ...slide,
        id: crypto.randomUUID(),
        elements: slide.elements.map(el => ({
          ...el,
          id: crypto.randomUUID()
        }))
      }))

      // Append template slides to existing slides
      const newSlides = [...slides, ...slidesWithNewIds]
      updateCollaborativeSlides(newSlides)

      // Apply template theme
      updateCollaborativeTheme(themeId)

      // Navigate to first template slide
      setCurrentSlideIndex(slides.length)
      setSelectedElementIds(new Set())
    },
    [isSynced, slides, updateCollaborativeSlides, updateCollaborativeTheme]
  )

  // Handle image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    [addElement]
  )

  const handleImageUrl = useCallback(() => {
    if (!imageUrl.trim()) return
    addElement(
      createImageElement(imageUrl, {
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 }
      })
    )
    setImageUrl('')
    setShowImageDialog(false)
  }, [imageUrl, addElement])

  // Handle video upload
  const handleVideoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    [addElement]
  )

  const handleVideoUrl = useCallback(() => {
    if (!videoUrl.trim()) return
    addElement(
      createVideoElement(videoUrl, {
        position: { x: 100, y: 100 },
        size: { width: 480, height: 270 }
      })
    )
    setVideoUrl('')
    setShowVideoDialog(false)
  }, [videoUrl, addElement])

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
  const handleEditText = useCallback((id: string) => {
    setEditingTextId(id)
  }, [])

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!editingTextId) return
      const newValue = e.target.value
      currentEditingContentRef.current = newValue
      updateElement(editingTextId, { content: newValue })
    },
    [editingTextId, updateElement]
  )

  const finishTextEditing = useCallback(() => {
    editingTextIdRef.current = null
    setEditingTextId(null)
  }, [])

  // Rename presentation
  const handleRename = useCallback(async () => {
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
  }, [slideId, newTitle, slide, onSlideUpdated, t])

  const openRenameDialog = useCallback(() => {
    setNewTitle(presentationTitle)
    setShowRenameDialog(true)
  }, [presentationTitle])

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
      const slideWidth = 1280
      const slideHeight = 720

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
          setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          setCurrentSlideIndex(prev => Math.max(0, prev - 1))
          break
        case 'Home':
          e.preventDefault()
          setCurrentSlideIndex(0)
          break
        case 'End':
          e.preventDefault()
          setCurrentSlideIndex(slides.length - 1)
          break
        case 'Escape':
          exitPresentMode()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresentMode, slides.length, exitPresentMode])

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
                  addElement(
                    createImageElement(src, {
                      position: { x: 200, y: 200 },
                      size: { width: 400, height: 300 }
                    })
                  )
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
    const goToPrevSlide = () => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
    const goToNextSlide = () => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))
    const canGoPrev = currentSlideIndex > 0
    const canGoNext = currentSlideIndex < slides.length - 1

    return (
      <div
        ref={presentationContainerRef}
        className="gba:fixed gba:inset-0 gba:z-[9999] gba:bg-black gba:w-screen gba:h-screen gba:group"
      >
        {/* Slide content */}
        <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center">
          <SlideCanvas
            elements={currentSlide.elements}
            selectedIds={new Set()}
            background={currentSlide.background}
            onSelectElements={() => {}}
            onUpdateElement={() => {}}
            onUpdateMultipleElements={() => {}}
            onEditText={() => {}}
            scale={presentScale}
          />
        </div>

        {/* Left navigation arrow */}
        <button
          onClick={goToPrevSlide}
          disabled={!canGoPrev}
          className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:z-[10000] gba:w-12 gba:h-12 gba:rounded-full gba:bg-white/10 gba:backdrop-blur-sm gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center gba:text-white/90 gba:transition-all gba:duration-200 hover:gba:bg-white/20 hover:gba:scale-110 disabled:gba:opacity-30 disabled:gba:cursor-not-allowed disabled:hover:gba:scale-100 disabled:hover:gba:bg-white/10"
          data-testid={`${testId}-present-prev`}
        >
          <ChevronLeft className="gba:w-6 gba:h-6" />
        </button>

        {/* Right navigation arrow */}
        <button
          onClick={goToNextSlide}
          disabled={!canGoNext}
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
              disabled={!canGoPrev}
              className="gba:text-white gba:bg-white/10 gba:backdrop-blur-sm hover:gba:bg-white/20 gba:disabled:opacity-30"
            >
              <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-previous')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextSlide}
              disabled={!canGoNext}
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
          <div className="gba:flex gba:items-center gba:justify-between">
            {/* Left side - Back button and title */}
            <div className="gba:flex gba:items-center gba:gap-4">
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

            {/* Right side - Actions */}
            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Collaboration presence indicator (same as document editor) */}
              {participantsWithAvatars.length > 0 && (
                <>
                  <PresenceIndicator
                    participants={participantsWithAvatars}
                    maxVisible={3}
                    size="sm"
                    showLabel={false}
                    className="gba:mr-2"
                  />
                  <Separator orientation="vertical" className="gba:h-6" />
                </>
              )}

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

              {/* Save status */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2">
                {isSaving ? (
                  <Badge variant="secondary" className="gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
                    {t('editor-saving')}
                  </Badge>
                ) : isSynced ? (
                  <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                    <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
                    {t('editor-synced')}
                  </span>
                ) : (
                  <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
                    {t('editor-connecting')}
                  </span>
                )}
              </div>

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

              <Separator orientation="vertical" className="gba:h-6" />

              {/* Speaker Notes button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotesPanel(!showNotesPanel)}
                className={showNotesPanel ? 'gba:bg-accent' : ''}
              >
                <StickyNote className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('editor-speaker-notes')}
              </Button>

              {/* Present dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-present')}
                    <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setIsPresentMode(true)
                      document.documentElement.requestFullscreen?.().catch(() => {})
                    }}
                  >
                    <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-present')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPresenterMode(true)}>
                    <StickyNote className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('presenter-view')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSave(false)}>
                    <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-save-now')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportToPptx}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export-pptx')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPdfExportDialog(true)}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export-pdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save as Template */}
              <SaveTemplateButton
                slides={slides}
                themeId={currentTheme?.id || 'corporate-blue'}
                disabled={!isSynced || slides.length === 0}
                data-testid={`${testId}-save-template-button`}
              />

              {/* AI Tools */}
              <RefineSlideButton
                currentSlide={currentSlide}
                onRefine={handleRefineSlide}
                accessToken={accessToken || ''}
                theme={currentTheme}
                disabled={!isSynced}
                data-testid={`${testId}-refine-button`}
              />
              <GeneratePresentationButton
                onGenerate={handleGeneratedSlides}
                accessToken={accessToken || ''}
                disabled={!isSynced}
                data-testid={`${testId}-generate-button`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar - Insert & Formatting Tools */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:bg-card gba:flex-wrap">
        {/* Edit Group - Undo/Redo & Copy/Paste */}
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title={`${t('editor-undo') || 'Undo'} (Ctrl+Z)`}
        >
          <Undo2 className="gba:w-4 gba:h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title={`${t('editor-redo') || 'Redo'} (Ctrl+Y)`}
        >
          <Redo2 className="gba:w-4 gba:h-4" />
        </Button>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        <Button variant="ghost" size="sm" onClick={copyElement} title={`${t('editor-copy') || 'Copy'} (Ctrl+C)`}>
          <Copy className="gba:w-4 gba:h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={pasteElement}
          disabled={!clipboard}
          title={`${t('editor-paste') || 'Paste'} (Ctrl+V)`}
        >
          <ClipboardPaste className="gba:w-4 gba:h-4" />
        </Button>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

        {/* Insert Group */}
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('editor-insert')}</span>

        {/* Add Text */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addElement(createTextElement({ position: { x: 100, y: 300 } }))}
        >
          <Type className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-text')}
        </Button>

        {/* Add Shape */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Square className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-shapes')}
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-48">
            <DropdownMenuItem onClick={() => addElement(createShapeElement('rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-rectangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('rounded-rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:rounded" />
              {t('editor-rounded-rectangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('circle'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-circle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('triangle'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-triangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('diamond'))}>
              <Diamond className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-diamond')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('star'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-star')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('hexagon'))}>
              <Hexagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-hexagon')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => addElement(createShapeElement('arrow-right'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-arrow-right')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('line'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-line')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('callout'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-callout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Image */}
        <Button variant="ghost" size="sm" onClick={() => setShowImageDialog(true)}>
          <ImageIcon className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-image')}
        </Button>

        {/* Add Code */}
        <Button variant="ghost" size="sm" onClick={() => addElement(createCodeElement(t('editor-code-placeholder')))}>
          <Code className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-code')}
        </Button>

        {/* Add Video */}
        <Button variant="ghost" size="sm" onClick={() => setShowVideoDialog(true)}>
          <Video className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-video')}
        </Button>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

        {/* Design Group */}
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('editor-design')}</span>

        {/* Background */}
        <Button variant="ghost" size="sm" onClick={() => setShowBackgroundDialog(true)}>
          <Palette className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-background')}
        </Button>

        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Grid3X3 className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-theme')}
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-56">
            {SLIDE_THEMES.map(theme => (
              <DropdownMenuItem key={theme.id} onClick={() => isSynced && updateCollaborativeTheme(theme.id)}>
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                  <div className="gba:flex gba:gap-1">
                    <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: theme.preview.primary }} />
                    <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: theme.preview.secondary }} />
                  </div>
                  <span>{t(`theme-${theme.id}`)}</span>
                </div>
                {currentTheme.id === theme.id && (
                  <Badge variant="secondary" className="gba:text-xs">
                    {t('editor-theme-active')}
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Templates */}
        <TemplateBrowserButton
          onApplyTemplate={handleApplyTemplate}
          disabled={!isSynced}
          data-testid={`${testId}-template-browser-button`}
        />
      </div>

      {/* Main Content */}
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {/* Slide Thumbnails */}
        <div className="gba:w-48 gba:flex-shrink-0 gba:border-r gba:bg-card gba:flex gba:flex-col">
          {/* Scrollable thumbnails */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:p-2 gba:space-y-2">
            {slides.map((s, idx) => {
              // Thumbnail scale: sidebar is w-48 (192px) - p-2 (8px each side) - border (4px) = ~176px
              // Canvas is 1280px wide, so scale = 176/1280 ≈ 0.1375
              const thumbScale = 176 / 1280
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
                  {/* Mini Preview - CSS transform for accurate rendering */}
                  <div
                    className="gba:relative gba:overflow-hidden"
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9'
                    }}
                  >
                    {/* Scaled canvas container */}
                    <div
                      className="gba:absolute gba:inset-0"
                      style={{
                        backgroundColor: s.background?.color || '#fff',
                        background: s.background?.gradient ? gradientToCss(s.background.gradient) : undefined
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 1280,
                          height: 720,
                          transform: `scale(${thumbScale})`,
                          transformOrigin: 'top left'
                        }}
                      >
                        {(s.elements || []).map(el => (
                          <div
                            key={el.id}
                            className="gba:absolute gba:overflow-hidden"
                            style={{
                              left: el.position.x,
                              top: el.position.y,
                              width: el.size.width,
                              height: el.size.height,
                              backgroundColor: el.type === 'shape' ? (el as any).fill : 'transparent'
                            }}
                          >
                            {el.type === 'text' && (
                              <div
                                className="gba:w-full gba:h-full gba:overflow-hidden gba:whitespace-pre-wrap"
                                style={{
                                  color: (el as any).color,
                                  fontSize: (el as any).fontSize,
                                  fontWeight: (el as any).fontWeight,
                                  fontFamily: (el as any).fontFamily,
                                  textAlign: (el as any).textAlign,
                                  lineHeight: (el as any).lineHeight || 1.2
                                }}
                              >
                                {(el as any).content}
                              </div>
                            )}
                            {el.type === 'image' && (
                              <img src={(el as any).src} alt="" className="gba:w-full gba:h-full gba:object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Slide number overlay */}
                    <div className="gba:absolute gba:bottom-1 gba:left-1 gba:min-w-5 gba:h-5 gba:px-1 gba:flex gba:items-center gba:justify-center gba:rounded gba:bg-black/50">
                      <span className="gba:text-[10px] gba:font-medium gba:text-white gba:leading-none">{idx + 1}</span>
                    </div>
                  </div>
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
            <Button
              variant="default"
              size="sm"
              onClick={addSlide}
              className="gba:w-full gba:gap-2 gba:justify-center"
              data-testid={`${testId}-add-slide-btn`}
            >
              <Plus className="gba:w-4 gba:h-4" />
              {t('editor-new-slide')}
            </Button>
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
          </div>
        </div>

        {/* Canvas Area */}
        <div className="gba:flex-1 gba:bg-muted/30 gba:overflow-auto gba:p-4 md:gba:p-8 gba:min-w-0">
          <div className="gba:inline-flex gba:justify-center gba:min-w-full">
            <div
              ref={canvasContainerRef}
              className="gba:shadow-2xl gba:rounded-lg gba:overflow-hidden gba:relative gba:flex-shrink-0"
              style={{ width: 1280 * canvasScale, height: 720 * canvasScale }}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onMouseMove={e => {
                if (isSynced && awareness) {
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
                if (isSynced && awareness) {
                  awareness.setLocalStateField('cursor', null)
                }
              }}
            >
              <SlideCanvas
                elements={currentSlide.elements}
                selectedIds={selectedElementIds}
                background={currentSlide.background}
                onSelectElements={ids => {
                  setSelectedElementIds(ids)
                  // Update awareness with primary selection (first element)
                  if (isSynced && awareness) {
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
              />

              {/* Collaborator cursors overlay */}
              {isInitialized && (
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
            {selectedElementIds.size === 1 && selectedElement?.type === 'text' && !editingTextId && !isPresentMode && (
              <FloatingTextActions
                element={selectedElement as TextElement}
                canvasScale={canvasScale}
                canvasRef={canvasContainerRef}
                isVoiceSupported={voiceInput.isSupported}
                onVoiceClick={() => {
                  const currentContent = (selectedElement as TextElement)?.content || ''
                  voiceBaseContentRef.current = currentContent
                  currentEditingContentRef.current = currentContent
                  lastProcessedTranscriptRef.current = ''
                  editingTextIdRef.current = selectedElement.id
                  setVoiceEditMode(true)
                  setEditingTextId(selectedElement.id)
                  voiceInput.startListening()
                }}
                onEditClick={() => {
                  const currentContent = (selectedElement as TextElement)?.content || ''
                  currentEditingContentRef.current = currentContent
                  editingTextIdRef.current = selectedElement.id
                  setVoiceEditMode(false)
                  setEditingTextId(selectedElement.id)
                }}
                data-testid={`${testId}-floating-text-actions`}
              />
            )}
          </div>
        </div>

        {/* Property Panel */}
        <div className="gba:w-72 gba:flex-shrink-0 gba:border-l gba:bg-card gba:overflow-y-auto">
          <div className="gba:p-3 gba:border-b">
            <h3 className="gba:font-semibold gba:text-sm">{t('editor-properties')}</h3>
          </div>
          <PropertyPanel
            element={selectedElement}
            onUpdate={updates => selectedElementId && updateElement(selectedElementId, updates)}
            onDelete={deleteElement}
            onDuplicate={duplicateElement}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
          />
        </div>
      </div>

      {/* Text Editing Dialog - Enterprise-grade with voice input */}
      <Dialog
        open={editingTextId !== null}
        onOpenChange={open => {
          if (!open) {
            if (voiceInput.isListening) {
              voiceInput.stopListening()
            }
            setVoiceEditMode(false)
            finishTextEditing()
          }
        }}
      >
        <DialogContent className="gba:max-w-2xl gba:p-0 gba:gap-0 gba:overflow-hidden">
          {/* Header with voice toggle */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:bg-muted/30">
            <DialogTitle className="gba:text-lg gba:font-semibold">{t('editor-edit-text')}</DialogTitle>
            {voiceInput.isSupported && (
              <VoiceInputButton
                isListening={voiceInput.isListening}
                isSupported={voiceInput.isSupported}
                volume={voiceInput.volume}
                error={voiceInput.error}
                onStartListening={() => {
                  const currentContent =
                    (currentSlide.elements.find(e => e.id === editingTextId) as TextElement)?.content || ''
                  voiceBaseContentRef.current = currentContent
                  currentEditingContentRef.current = currentContent
                  lastProcessedTranscriptRef.current = ''
                  voiceInput.startListening()
                }}
                onStopListening={voiceInput.stopListening}
                variant="prominent"
                data-testid={`${testId}-voice-input-btn`}
              />
            )}
          </div>

          {/* Voice feedback area */}
          {voiceInput.isListening && (
            <div className="gba:px-6 gba:py-3">
              <VoiceVisualizer
                volume={voiceInput.volume}
                isListening={voiceInput.isListening}
                interimText={voiceInput.interimTranscript}
                data-testid={`${testId}-voice-visualizer`}
              />
            </div>
          )}

          {/* Text input area */}
          <div className="gba:p-6 gba:space-y-3">
            <Textarea
              value={(currentSlide.elements.find(e => e.id === editingTextId) as TextElement)?.content || ''}
              onChange={handleTextChange}
              className={cn(
                'gba:min-h-[200px] gba:text-lg gba:resize-none gba:transition-all gba:duration-200',
                voiceInput.isListening && 'gba:border-primary gba:ring-2 gba:ring-primary/20',
                voiceInput.error && !voiceInput.isListening && 'gba:border-amber-400'
              )}
              autoFocus={!voiceEditMode}
              placeholder={
                voiceInput.isListening
                  ? t('editor-voice-listening') || 'Listening... Speak now'
                  : t('editor-text-placeholder') || 'Enter your text here...'
              }
            />

            {/* Subtle error hint - only when not listening */}
            {voiceInput.error && !voiceInput.isListening && (
              <p className="gba:text-xs gba:text-amber-600 gba:flex gba:items-center gba:gap-1.5">
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-amber-500" />
                Voice input unavailable. Type manually or click Voice Input to retry.
              </p>
            )}
          </div>

          {/* Footer with actions */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-t gba:bg-muted/30">
            <div className="gba:text-sm gba:text-muted-foreground">
              {voiceInput.isListening ? (
                <span className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-red-500 gba:animate-pulse" />
                  {t('editor-voice-recording') || 'Recording...'}
                </span>
              ) : voiceInput.isSupported && !voiceInput.error ? (
                t('editor-voice-hint') || 'Tip: Click "Voice Input" to dictate'
              ) : null}
            </div>
            <div className="gba:flex gba:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (voiceInput.isListening) {
                    voiceInput.stopListening()
                  }
                  setVoiceEditMode(false)
                  finishTextEditing()
                }}
              >
                {t('editor-cancel')}
              </Button>
              <Button variant="default" onClick={finishTextEditing}>
                {t('editor-done')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    src={currentSlide.background.videoUrl}
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
        />
      )}
    </div>
  )
}

export default SlideEditor
