/**
 * SlideEditor Component
 *
 * Professional slide editor with canvas-based editing, shapes, images, and full styling.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Button,
  Spinner,
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
  Label
} from '@newwork/nw-design-system'
import {
  ChevronLeft,
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
  Video
} from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Slide as SlideType } from '../types'
import { SlidesApiService } from '../services'
import { SlideCanvas } from './SlideCanvas'
import { PropertyPanel } from './PropertyPanel'
import { SLIDE_THEMES, getThemeById, type SlideTheme } from './slideThemes'
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

export interface SlideEditorProps extends BusinessAppContextProps {
  slideId: string
  slide: SlideType
  onBack: () => void
  onSlideUpdated?: (slide: SlideType) => void
  'data-testid'?: string
}

const DEFAULT_SLIDE: SlideData = {
  id: 'slide-1',
  elements: [
    createTextElement({
      id: 'title-1',
      content: 'Click to add title',
      position: { x: 80, y: 80 },
      size: { width: 1120, height: 100 },
      fontSize: 64,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1e293b'
    }),
    createTextElement({
      id: 'subtitle-1',
      content: 'Click to add subtitle',
      position: { x: 80, y: 200 },
      size: { width: 1120, height: 60 },
      fontSize: 32,
      textAlign: 'center',
      color: '#64748b'
    })
  ],
  background: { type: 'solid', color: '#ffffff' }
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slideId,
  slide,
  onBack,
  onSlideUpdated,
  'data-testid': testId = 'slide-editor'
}) => {
  const [slides, setSlides] = useState<SlideData[]>([DEFAULT_SLIDE])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [currentTheme, setCurrentTheme] = useState<SlideTheme>(SLIDE_THEMES[0])
  const [isSaving, setIsSaving] = useState(false)
  const [isPresentMode, setIsPresentMode] = useState(false)
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

  const currentSlideRaw = slides[currentSlideIndex] || DEFAULT_SLIDE
  // Ensure elements array always exists
  const currentSlide: SlideData = {
    ...currentSlideRaw,
    elements: currentSlideRaw.elements || [],
    background: currentSlideRaw.background || { type: 'solid', color: '#ffffff' }
  }
  const selectedElement = currentSlide.elements.find(e => e.id === selectedElementId) || null

  // Load slides from backend on mount
  useEffect(() => {
    if (slide.contentJson?.slides) {
      const loadedSlides = (slide.contentJson.slides as SlideData[]).map(s => ({
        ...s,
        elements: s.elements || [],
        background: s.background || { type: 'solid', color: '#ffffff' }
      }))
      if (loadedSlides.length > 0) {
        setSlides(loadedSlides)
      }
    }
    if (slide.contentJson?.themeId) {
      setCurrentTheme(getThemeById(slide.contentJson.themeId as string))
    }
  }, [slide])

  // Auto-save every 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave(true)
    }, 5000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line -- handleSave is defined after this effect
  }, [slides, currentTheme])

  const handleSave = useCallback(async (silent = false) => {
    if (!silent) setIsSaving(true)
    try {
      const contentJson = { slides, themeId: currentTheme.id }
      await SlidesApiService.updateSlide(slideId, { contentJson })
      if (!silent) toast.success('Presentation saved')
    } catch (err) {
      console.error('[SlideEditor] Save error:', err)
      if (!silent) toast.error('Failed to save')
    } finally {
      if (!silent) setIsSaving(false)
    }
  }, [slideId, slides, currentTheme])

  const updateSlide = useCallback((updates: Partial<SlideData>) => {
    setSlides(prev => prev.map((s, i) => i === currentSlideIndex ? { ...s, ...updates } : s))
  }, [currentSlideIndex])

  const updateElement = useCallback((id: string, updates: Partial<AnySlideElement>) => {
    setSlides(prev => prev.map((s, i) => {
      if (i !== currentSlideIndex) return s
      return {
        ...s,
        elements: s.elements.map(el => el.id === id ? { ...el, ...updates } as AnySlideElement : el)
      }
    }))
  }, [currentSlideIndex])

  const addElement = useCallback((element: AnySlideElement) => {
    const maxZIndex = Math.max(0, ...currentSlide.elements.map(e => e.zIndex))
    const newElement = { ...element, zIndex: maxZIndex + 1 }
    updateSlide({ elements: [...currentSlide.elements, newElement] })
    setSelectedElementId(newElement.id)
    toast.success(`Added ${element.type}`)
  }, [currentSlide.elements, updateSlide])

  const deleteElement = useCallback(() => {
    if (!selectedElementId) return
    updateSlide({ elements: currentSlide.elements.filter(e => e.id !== selectedElementId) })
    setSelectedElementId(null)
    toast.success('Element deleted')
  }, [selectedElementId, currentSlide.elements, updateSlide])

  const duplicateElement = useCallback(() => {
    if (!selectedElement) return
    const copy = { ...selectedElement, id: `${selectedElement.type}-${Date.now()}`, position: { x: selectedElement.position.x + 20, y: selectedElement.position.y + 20 } }
    addElement(copy)
    toast.success('Element duplicated')
  }, [selectedElement, addElement])

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

  // Slide management
  const addSlide = useCallback(() => {
    const newSlide: SlideData = {
      id: `slide-${Date.now()}`,
      elements: [
        createTextElement({
          id: `title-${Date.now()}`,
          content: 'New Slide',
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
    setSlides(prev => [...prev.slice(0, currentSlideIndex + 1), newSlide, ...prev.slice(currentSlideIndex + 1)])
    setCurrentSlideIndex(currentSlideIndex + 1)
    setSelectedElementId(null)
    toast.success('Slide added')
  }, [currentSlideIndex])

  const deleteSlide = useCallback(() => {
    if (slides.length <= 1) {
      toast.error('Cannot delete the last slide')
      return
    }
    if (!window.confirm('Delete this slide?')) return
    setSlides(prev => prev.filter((_, i) => i !== currentSlideIndex))
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
    setSelectedElementId(null)
    toast.success('Slide deleted')
  }, [slides.length, currentSlideIndex])

  const duplicateSlide = useCallback(() => {
    const copy = { ...currentSlide, id: `slide-${Date.now()}`, elements: currentSlide.elements.map(e => ({ ...e, id: `${e.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })) }
    setSlides(prev => [...prev.slice(0, currentSlideIndex + 1), copy, ...prev.slice(currentSlideIndex + 1)])
    setCurrentSlideIndex(currentSlideIndex + 1)
    toast.success('Slide duplicated')
  }, [currentSlide, currentSlideIndex])

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      addElement(createImageElement(src, {
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 }
      }))
    }
    reader.readAsDataURL(file)
    setShowImageDialog(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [addElement])

  const handleImageUrl = useCallback(() => {
    if (!imageUrl.trim()) return
    addElement(createImageElement(imageUrl, {
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 }
    }))
    setImageUrl('')
    setShowImageDialog(false)
  }, [imageUrl, addElement])

  // Handle video upload
  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      addElement(createVideoElement(src, {
        position: { x: 100, y: 100 },
        size: { width: 480, height: 270 }
      }))
    }
    reader.readAsDataURL(file)
    setShowVideoDialog(false)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }, [addElement])

  const handleVideoUrl = useCallback(() => {
    if (!videoUrl.trim()) return
    addElement(createVideoElement(videoUrl, {
      position: { x: 100, y: 100 },
      size: { width: 480, height: 270 }
    }))
    setVideoUrl('')
    setShowVideoDialog(false)
  }, [videoUrl, addElement])

  const handleVideoBackground = useCallback((url: string) => {
    updateSlide({ 
      background: { 
        type: 'video', 
        videoUrl: url,
        videoMuted: true,
        videoLoop: true
      } 
    })
    setShowBackgroundDialog(false)
  }, [updateSlide])

  // Text editing
  const handleEditText = useCallback((id: string) => {
    setEditingTextId(id)
  }, [])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!editingTextId) return
    updateElement(editingTextId, { content: e.target.value })
  }, [editingTextId, updateElement])

  const finishTextEditing = useCallback(() => {
    setEditingTextId(null)
  }, [])

  // Rename presentation
  const handleRename = useCallback(async () => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty')
      return
    }
    try {
      await SlidesApiService.updateSlide(slideId, { title: newTitle.trim() })
      setPresentationTitle(newTitle.trim())
      setShowRenameDialog(false)
      toast.success('Presentation renamed')
      if (onSlideUpdated) {
        onSlideUpdated({ ...slide, title: newTitle.trim() })
      }
    } catch (err) {
      console.error('[SlideEditor] Rename error:', err)
      toast.error('Failed to rename presentation')
    }
  }, [slideId, newTitle, slide, onSlideUpdated])

  const openRenameDialog = useCallback(() => {
    setNewTitle(presentationTitle)
    setShowRenameDialog(true)
  }, [presentationTitle])

  // Present Mode
  if (isPresentMode) {
    return (
      <div className="gba:fixed gba:inset-0 gba:z-50 gba:bg-black">
        <div className="gba:absolute gba:top-4 gba:right-4 gba:z-10">
          <Button variant="secondary" size="sm" onClick={() => setIsPresentMode(false)}>
            Exit (ESC)
          </Button>
        </div>
        <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
          <SlideCanvas
            elements={currentSlide.elements}
            selectedId={null}
            background={currentSlide.background}
            onSelectElement={() => {}}
            onUpdateElement={() => {}}
            onEditText={() => {}}
            scale={1}
          />
        </div>
        {/* Navigation */}
        <div className="gba:absolute gba:bottom-8 gba:left-1/2 gba:-translate-x-1/2 gba:flex gba:items-center gba:gap-4 gba:bg-black/50 gba:px-6 gba:py-3 gba:rounded-full">
          <Button variant="ghost" size="sm" onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} disabled={currentSlideIndex === 0} className="gba:text-white">
            ← Previous
          </Button>
          <span className="gba:text-sm gba:text-white">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} disabled={currentSlideIndex === slides.length - 1} className="gba:text-white">
            Next →
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Top Toolbar */}
      <header className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:px-4 gba:py-2 gba:bg-card">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="gba:w-4 gba:h-4" />
        </Button>
        <button 
          onClick={openRenameDialog}
          className="gba:flex gba:items-center gba:gap-2 gba:group gba:cursor-pointer gba:px-2 gba:py-1 gba:rounded hover:gba:bg-muted gba:transition-colors"
          title="Click to rename"
        >
          <h1 className="gba:text-lg gba:font-semibold gba:truncate gba:max-w-md">{presentationTitle}</h1>
          <Pencil className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
        </button>
        <div className="gba:flex-1" />
        
        {/* Zoom Controls */}
        <div className="gba:flex gba:items-center gba:gap-1 gba:mr-4">
          <Button variant="ghost" size="icon-sm" onClick={() => setCanvasScale(Math.max(0.25, canvasScale - 0.1))}>
            <ZoomOut className="gba:w-4 gba:h-4" />
          </Button>
          <span className="gba:text-xs gba:w-12 gba:text-center">{Math.round(canvasScale * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setCanvasScale(Math.min(1.5, canvasScale + 0.1))}>
            <ZoomIn className="gba:w-4 gba:h-4" />
          </Button>
        </div>
        
        <Button variant="outlined" size="sm" onClick={() => setIsPresentMode(true)}>
          <Play className="gba:w-4 gba:h-4 gba:mr-1" />
          Present
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleSave(false)} disabled={isSaving}>
          {isSaving ? <Spinner size="sm" /> : <><Save className="gba:w-4 gba:h-4 gba:mr-1" />Save</>}
        </Button>
      </header>

      {/* Second Toolbar - Insert Tools */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:bg-muted/30 gba:flex-wrap">
        {/* Add Text */}
        <Button variant="ghost" size="sm" onClick={() => addElement(createTextElement({ position: { x: 100, y: 300 } }))}>
          <Type className="gba:w-4 gba:h-4 gba:mr-1" />
          Text
        </Button>

        {/* Add Shape */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Square className="gba:w-4 gba:h-4 gba:mr-1" />
              Shapes
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-48">
            <DropdownMenuItem onClick={() => addElement(createShapeElement('rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('rounded-rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:rounded" />
              Rounded Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('circle'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              Circle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('triangle'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2" />
              Triangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('diamond'))}>
              <Diamond className="gba:w-4 gba:h-4 gba:mr-2" />
              Diamond
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('star'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              Star
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('hexagon'))}>
              <Hexagon className="gba:w-4 gba:h-4 gba:mr-2" />
              Hexagon
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => addElement(createShapeElement('arrow-right'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              Arrow Right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('line'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              Line
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(createShapeElement('callout'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              Callout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Image */}
        <Button variant="ghost" size="sm" onClick={() => setShowImageDialog(true)}>
          <ImageIcon className="gba:w-4 gba:h-4 gba:mr-1" />
          Image
        </Button>

        {/* Add Code */}
        <Button variant="ghost" size="sm" onClick={() => addElement(createCodeElement('// Your code here\nconst hello = "world";'))}>
          <Code className="gba:w-4 gba:h-4 gba:mr-1" />
          Code
        </Button>

        {/* Add Video */}
        <Button variant="ghost" size="sm" onClick={() => setShowVideoDialog(true)}>
          <Video className="gba:w-4 gba:h-4 gba:mr-1" />
          Video
        </Button>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

        {/* Background */}
        <Button variant="ghost" size="sm" onClick={() => setShowBackgroundDialog(true)}>
          <Palette className="gba:w-4 gba:h-4 gba:mr-1" />
          Background
        </Button>

        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Grid3X3 className="gba:w-4 gba:h-4 gba:mr-1" />
              Theme
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-56">
            {SLIDE_THEMES.map(theme => (
              <DropdownMenuItem key={theme.id} onClick={() => setCurrentTheme(theme)}>
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                  <div className="gba:flex gba:gap-1">
                    <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: theme.preview.primary }} />
                    <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: theme.preview.secondary }} />
                  </div>
                  <span>{theme.name}</span>
                </div>
                {currentTheme.id === theme.id && <Badge variant="secondary" className="gba:text-xs">Active</Badge>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-2" />

        {/* Slide Actions */}
        <Button variant="ghost" size="sm" onClick={addSlide}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
          Slide
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={duplicateSlide} title="Duplicate slide">
          <Copy className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={deleteSlide} title="Delete slide" className="gba:text-destructive">
          <Trash2 className="gba:w-4 gba:h-4" />
        </Button>

        <div className="gba:flex-1" />
        <span className="gba:text-xs gba:text-muted-foreground">Auto-saves • {slides.length} slides</span>
      </div>

      {/* Main Content */}
      <div className="gba:flex gba:flex-1 gba:min-h-0">
        {/* Slide Thumbnails */}
        <div className="gba:w-48 gba:border-r gba:bg-card gba:overflow-y-auto gba:p-2 gba:space-y-2">
          {slides.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => { setCurrentSlideIndex(idx); setSelectedElementId(null) }}
              className={`gba:rounded-lg gba:cursor-pointer gba:transition-all gba:border-2 gba:overflow-hidden ${
                idx === currentSlideIndex
                  ? 'gba:border-primary gba:shadow-md'
                  : 'gba:border-transparent hover:gba:border-muted-foreground/20'
              }`}
            >
              {/* Mini Preview */}
              <div 
                className="gba:aspect-video gba:relative"
                style={{ 
                  backgroundColor: s.background?.color || '#fff',
                  background: s.background?.gradient ? gradientToCss(s.background.gradient) : undefined
                }}
              >
                {/* Simplified mini elements */}
                {(s.elements || []).slice(0, 3).map(el => (
                  <div
                    key={el.id}
                    className="gba:absolute"
                    style={{
                      left: el.position.x / 16,
                      top: el.position.y / 16,
                      width: el.size.width / 16,
                      height: el.size.height / 16,
                      backgroundColor: el.type === 'shape' ? (el as any).fill : 'transparent',
                      fontSize: 4,
                      overflow: 'hidden'
                    }}
                  >
                    {el.type === 'text' && (
                      <span style={{ color: (el as any).color, fontSize: Math.max(4, (el as any).fontSize / 16) }}>
                        {(el as any).content?.slice(0, 20)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="gba:p-1.5 gba:bg-card">
                <span className="gba:text-xs gba:font-medium">{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Canvas Area */}
        <div className="gba:flex-1 gba:bg-muted/30 gba:overflow-auto gba:p-8">
          <div className="gba:flex gba:justify-center">
            <div className="gba:shadow-2xl gba:rounded-lg gba:overflow-hidden">
              <SlideCanvas
                elements={currentSlide.elements}
                selectedId={selectedElementId}
                background={currentSlide.background}
                onSelectElement={setSelectedElementId}
                onUpdateElement={updateElement}
                onEditText={handleEditText}
                scale={canvasScale}
              />
            </div>
          </div>
        </div>

        {/* Property Panel */}
        <div className="gba:w-72 gba:border-l gba:bg-card gba:overflow-y-auto">
          <div className="gba:p-3 gba:border-b">
            <h3 className="gba:font-semibold gba:text-sm">Properties</h3>
          </div>
          <PropertyPanel
            element={selectedElement}
            onUpdate={(updates) => selectedElementId && updateElement(selectedElementId, updates)}
            onDelete={deleteElement}
            onDuplicate={duplicateElement}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
          />
        </div>
      </div>

      {/* Text Editing Dialog */}
      <Dialog open={editingTextId !== null} onOpenChange={(open) => !open && finishTextEditing()}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
          </DialogHeader>
          <Textarea
            value={(currentSlide.elements.find(e => e.id === editingTextId) as any)?.content || ''}
            onChange={handleTextChange}
            className="gba:min-h-[200px] gba:text-lg"
            autoFocus
          />
          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="default" onClick={finishTextEditing}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div>
              <Label>Upload from computer</Label>
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
              <Label>Or paste image URL</Label>
              <div className="gba:flex gba:gap-2 gba:mt-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button onClick={handleImageUrl} disabled={!imageUrl.trim()}>Add</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div>
              <Label>Presentation Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter presentation title"
                className="gba:mt-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename()
                  }
                }}
              />
            </div>
            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button variant="outlined" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={!newTitle.trim()}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Video</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div>
              <Label>Upload from computer</Label>
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
              <Label>Or paste video URL</Label>
              <div className="gba:flex gba:gap-2 gba:mt-2">
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                />
                <Button onClick={handleVideoUrl} disabled={!videoUrl.trim()}>Add</Button>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                Supports MP4, WebM, and other video formats
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Background Dialog */}
      <Dialog open={showBackgroundDialog} onOpenChange={setShowBackgroundDialog}>
        <DialogContent className="gba:max-w-xl">
          <DialogHeader>
            <DialogTitle>Slide Background</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            {/* Current Background Preview */}
            <div>
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">Current Background</Label>
              <div 
                className="gba:h-24 gba:rounded-lg gba:border gba:shadow-inner gba:relative gba:overflow-hidden"
                style={{ 
                  backgroundColor: currentSlide.background.color || '#ffffff',
                  background: currentSlide.background.gradient ? gradientToCss(currentSlide.background.gradient) : undefined
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
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">Solid Colors</Label>
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
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">Gradient Presets</Label>
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
                <Label className="gba:text-xs gba:font-semibold gba:mb-3 gba:block">🎨 Create Custom Gradient</Label>
                <GradientBuilder
                  gradient={currentSlide.background.type === 'gradient' ? currentSlide.background.gradient : undefined}
                  onChange={(gradient) => {
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
              <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">🎬 Video Background</Label>
              <div className="gba:flex gba:gap-2">
                <Input
                  placeholder="Paste video URL (MP4)"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleVideoBackground(e.target.value)
                    }
                  }}
                  className="gba:flex-1"
                />
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                Video backgrounds loop automatically and play muted
              </p>
            </div>

            <div className="gba:flex gba:justify-end gba:pt-2">
              <Button variant="outlined" onClick={() => setShowBackgroundDialog(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SlideEditor
