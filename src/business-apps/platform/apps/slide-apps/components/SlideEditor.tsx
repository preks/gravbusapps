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
  useTranslation
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
  Minimize
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
import { exportToPptx } from '../utils/exportUtils'
import translations from '../_i18n'

export interface SlideEditorProps extends BusinessAppContextProps {
  slideId: string
  slide: SlideType
  onBack: () => void
  onSlideUpdated?: (slide: SlideType) => void
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
    removeSlide: removeCollaborativeSlide,
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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
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
  const [presentationTitle, setPresentationTitle] = useState(slide.title)
  const [newTitle, setNewTitle] = useState(slide.title)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const presentationContainerRef = useRef<HTMLDivElement>(null)
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([])

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
  const selectedElement = currentSlide.elements.find(e => e.id === selectedElementId) || null

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

  const updateSlide = useCallback(
    (updates: Partial<SlideData>) => {
      if (!canEdit) return
      updateCollaborativeSlide(currentSlideIndex, updates)
    },
    [canEdit, currentSlideIndex, updateCollaborativeSlide]
  )

  const updateElement = useCallback(
    (id: string, updates: Partial<AnySlideElement>) => {
      if (!canEdit) return
      updateCollaborativeElement(currentSlideIndex, id, updates)
    },
    [canEdit, currentSlideIndex, updateCollaborativeElement]
  )

  const addElement = useCallback(
    (element: AnySlideElement) => {
      const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex))
      const newElement = { ...element, zIndex: maxZIndex + 1 }
      updateSlide({ elements: [...currentSlide.elements, newElement] })
      setSelectedElementId(newElement.id)
      toast.success(t('editor-added-element', { type: element.type }))
    },
    [currentSlide.elements, updateSlide, t]
  )

  const deleteElement = useCallback(() => {
    if (!selectedElementId) return
    updateSlide({ elements: currentSlide.elements.filter(e => e.id !== selectedElementId) })
    setSelectedElementId(null)
    toast.success(t('editor-element-deleted'))
  }, [selectedElementId, currentSlide.elements, updateSlide, t])

  const duplicateElement = useCallback(() => {
    if (!selectedElement) return
    const copy = {
      ...selectedElement,
      id: `${selectedElement.type}-${Date.now()}`,
      position: { x: selectedElement.position.x + 20, y: selectedElement.position.y + 20 }
    }
    addElement(copy)
    toast.success(t('editor-element-duplicated'))
  }, [selectedElement, addElement, t])

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
    setSelectedElementId(null)
    toast.success(t('editor-slide-added'))
  }, [currentSlideIndex, isSynced, addCollaborativeSlide, t])

  const deleteSlide = useCallback(() => {
    if (slides.length <= 1) {
      toast.error(t('editor-delete-last-slide-error'))
      return
    }
    if (!window.confirm(t('editor-delete-slide-confirm'))) return
    if (isSynced) {
      removeCollaborativeSlide(currentSlideIndex)
    }
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
    setSelectedElementId(null)
    toast.success(t('editor-slide-deleted'))
  }, [slides.length, currentSlideIndex, isSynced, removeCollaborativeSlide, t])

  const duplicateSlide = useCallback(() => {
    const copy = {
      ...currentSlide,
      id: `slide-${Date.now()}`,
      elements: currentSlide.elements.map(e => ({
        ...e,
        id: `${e.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
      }))
    }
    if (isSynced) {
      addCollaborativeSlide(copy, currentSlideIndex + 1)
    }
    setCurrentSlideIndex(currentSlideIndex + 1)
    toast.success(t('toast-slide-duplicated'))
  }, [currentSlide, currentSlideIndex, isSynced, addCollaborativeSlide, t])

  // Handle AI-generated slides
  const handleGeneratedSlides = useCallback(
    (generatedSlides: SlideData[], title: string) => {
      if (!isSynced || generatedSlides.length === 0) return

      // Replace all slides with generated ones
      updateCollaborativeSlides(generatedSlides)
      setCurrentSlideIndex(0)
      setSelectedElementId(null)

      // Update presentation title if changed
      if (title && title !== presentationTitle) {
        setPresentationTitle(title)
        SlidesApiService.updateSlide(slideId, { title }).catch(err => {
          console.error('[SlideEditor] Failed to update title:', err)
        })
      }
    },
    [isSynced, updateCollaborativeSlides, presentationTitle, slideId]
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

  // Text editing
  const handleEditText = useCallback((id: string) => {
    setEditingTextId(id)
  }, [])

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!editingTextId) return
      updateElement(editingTextId, { content: e.target.value })
    },
    [editingTextId, updateElement]
  )

  const finishTextEditing = useCallback(() => {
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

  // Keyboard navigation for editor mode (up/down arrows to change slides)
  useEffect(() => {
    if (isPresentMode) return

    const handleEditorKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (isInputFocused) return

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (e.key === 'ArrowUp') {
          setCurrentSlideIndex(prev => Math.max(0, prev - 1))
        } else {
          setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))
        }
      }
    }

    window.addEventListener('keydown', handleEditorKeyDown)
    return () => window.removeEventListener('keydown', handleEditorKeyDown)
  }, [isPresentMode, slides.length])

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
            selectedId={null}
            background={currentSlide.background}
            onSelectElement={() => {}}
            onUpdateElement={() => {}}
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

              {/* Present button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsPresentMode(true)
                  document.documentElement.requestFullscreen?.().catch(() => {})
                }}
              >
                <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('editor-present')}
              </Button>

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
                  <DropdownMenuItem onClick={() => toast.info(t('editor-export-pdf-coming'))}>
                    <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('editor-export-pdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* AI Generate - positioned at far right like Transform in NoteEditor */}
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

              return (
                <div
                  key={`${s.id}-${idx}`}
                  ref={el => {
                    thumbnailRefs.current[idx] = el
                  }}
                  onClick={() => {
                    setCurrentSlideIndex(idx)
                    setSelectedElementId(null)
                  }}
                  className={`gba:rounded-lg gba:cursor-pointer gba:transition-all gba:border-2 gba:overflow-hidden ${
                    idx === currentSlideIndex
                      ? 'gba:border-primary gba:shadow-md'
                      : 'gba:border-transparent hover:gba:border-muted-foreground/20'
                  }`}
                >
                  {/* Mini Preview - uses transform scale for accurate rendering */}
                  <div
                    className="gba:aspect-video gba:relative gba:overflow-hidden"
                    style={{
                      backgroundColor: s.background?.color || '#fff',
                      background: s.background?.gradient ? gradientToCss(s.background.gradient) : undefined
                    }}
                  >
                    {/* Scaled container matching main canvas proportions */}
                    <div
                      className="gba:absolute gba:top-0 gba:left-0 gba:origin-top-left"
                      style={{
                        width: 1280,
                        height: 720,
                        transform: `scale(${thumbScale})`
                      }}
                    >
                      {(s.elements || []).map(el => (
                        <div
                          key={el.id}
                          className="gba:absolute"
                          style={{
                            left: el.position.x,
                            top: el.position.y,
                            width: el.size.width,
                            height: el.size.height,
                            backgroundColor: el.type === 'shape' ? (el as any).fill : 'transparent',
                            overflow: 'hidden'
                          }}
                        >
                          {el.type === 'text' && (
                            <div
                              style={{
                                color: (el as any).color,
                                fontSize: (el as any).fontSize,
                                fontWeight: (el as any).fontWeight,
                                fontFamily: (el as any).fontFamily,
                                textAlign: (el as any).textAlign,
                                width: '100%',
                                height: '100%',
                                overflow: 'hidden'
                              }}
                            >
                              {(el as any).content}
                            </div>
                          )}
                          {el.type === 'image' && (
                            <img
                              src={(el as any).src}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: (el as any).objectFit || 'cover'
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="gba:p-1.5 gba:bg-card">
                    <span className="gba:text-xs gba:font-medium">{idx + 1}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Slide Actions */}
          <div className="gba:p-3 gba:border-t gba:bg-card/50 gba:space-y-2">
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
                <Copy className="gba:w-4 gba:h-4" />
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
              className="gba:shadow-2xl gba:rounded-lg gba:overflow-hidden gba:relative gba:flex-shrink-0"
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
                selectedId={selectedElementId}
                background={currentSlide.background}
                onSelectElement={id => {
                  setSelectedElementId(id)
                  if (isSynced && awareness && id) {
                    awareness.setLocalStateField('selection', {
                      slideIndex: currentSlideIndex,
                      elementId: id
                    })
                  }
                }}
                onUpdateElement={updateElement}
                onEditText={handleEditText}
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

      {/* Text Editing Dialog */}
      <Dialog open={editingTextId !== null} onOpenChange={open => !open && finishTextEditing()}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('editor-edit-text')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={(currentSlide.elements.find(e => e.id === editingTextId) as any)?.content || ''}
            onChange={handleTextChange}
            className="gba:min-h-[200px] gba:text-lg"
            autoFocus
          />
          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="default" onClick={finishTextEditing}>
              {t('editor-done')}
            </Button>
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
        <DialogContent className="gba:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('editor-slide-background')}</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
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

            <div className="gba:flex gba:justify-end gba:pt-2">
              <Button variant="outline" onClick={() => setShowBackgroundDialog(false)}>
                {t('editor-done')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SlideEditor
