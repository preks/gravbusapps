/**
 * Slide Element Types - Define all element types for the slide editor
 */

export type ElementType = 'text' | 'image' | 'shape' | 'code' | 'video'

export type ShapeType = 
  | 'rectangle' 
  | 'rounded-rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'triangle' 
  | 'diamond'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'star'
  | 'hexagon'
  | 'line'
  | 'callout'

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface GradientStop {
  color: string
  position: number
}

export interface GradientConfig {
  type: 'linear' | 'radial'
  angle: number
  stops: GradientStop[]
}

export interface SlideElement {
  id: string
  type: ElementType
  position: Position
  size: Size
  rotation: number
  opacity: number
  locked: boolean
  zIndex: number
}

export interface TextElement extends SlideElement {
  type: 'text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold' | 'light'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  color: string
  backgroundColor: string
  gradient?: GradientConfig
  lineHeight: number
  letterSpacing: number
  padding: number
}

export interface ImageElement extends SlideElement {
  type: 'image'
  src: string
  alt: string
  objectFit: 'cover' | 'contain' | 'fill' | 'none'
  borderRadius: number
  borderWidth: number
  borderColor: string
  shadow: boolean
}

export interface ShapeElement extends SlideElement {
  type: 'shape'
  shapeType: ShapeType
  fill: string
  gradient?: GradientConfig
  strokeColor: string
  strokeWidth: number
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  cornerRadius: number
  shadow: boolean
}

export interface CodeElement extends SlideElement {
  type: 'code'
  code: string
  language: string
  theme: 'dark' | 'light'
  showLineNumbers: boolean
  fontSize: number
}

export interface VideoElement extends SlideElement {
  type: 'video'
  src: string
  autoplay: boolean
  loop: boolean
  muted: boolean
  objectFit: 'cover' | 'contain' | 'fill'
  borderRadius: number
  shadow: boolean
}

export type AnySlideElement = TextElement | ImageElement | ShapeElement | CodeElement | VideoElement

export interface SlideData {
  id: string
  elements: AnySlideElement[]
  background: {
    type: 'solid' | 'gradient' | 'image' | 'video'
    color?: string
    gradient?: GradientConfig
    imageUrl?: string
    videoUrl?: string
    videoMuted?: boolean
    videoLoop?: boolean
  }
  notes?: string
}

// Default element factories
export const createTextElement = (partial?: Partial<TextElement>): TextElement => ({
  id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'text',
  position: { x: 100, y: 100 },
  size: { width: 400, height: 60 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  content: 'Click to edit text',
  fontFamily: 'Inter',
  fontSize: 32,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  verticalAlign: 'top',
  color: '#1e293b',
  backgroundColor: 'transparent',
  lineHeight: 1.4,
  letterSpacing: 0,
  padding: 8,
  ...partial
})

export const createImageElement = (src: string, partial?: Partial<ImageElement>): ImageElement => ({
  id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'image',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 200 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  src,
  alt: 'Image',
  objectFit: 'cover',
  borderRadius: 0,
  borderWidth: 0,
  borderColor: '#000000',
  shadow: false,
  ...partial
})

export const createShapeElement = (shapeType: ShapeType, partial?: Partial<ShapeElement>): ShapeElement => ({
  id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'shape',
  position: { x: 100, y: 100 },
  size: { width: 150, height: 150 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  shapeType,
  fill: '#3b82f6',
  strokeColor: '#1e40af',
  strokeWidth: 0,
  strokeStyle: 'solid',
  cornerRadius: shapeType === 'rounded-rectangle' ? 12 : 0,
  shadow: false,
  ...partial
})

export const createCodeElement = (code: string, partial?: Partial<CodeElement>): CodeElement => ({
  id: `code-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'code',
  position: { x: 100, y: 100 },
  size: { width: 500, height: 200 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  code,
  language: 'javascript',
  theme: 'dark',
  showLineNumbers: true,
  fontSize: 14,
  ...partial
})

export const createVideoElement = (src: string, partial?: Partial<VideoElement>): VideoElement => ({
  id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'video',
  position: { x: 100, y: 100 },
  size: { width: 480, height: 270 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  src,
  autoplay: true,
  loop: true,
  muted: true,
  objectFit: 'cover',
  borderRadius: 0,
  shadow: false,
  ...partial
})

// Font options
export const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Impact', label: 'Impact' }
]

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128]

// Shape definitions for rendering
export const SHAPE_DEFINITIONS: Record<ShapeType, { name: string; icon: string }> = {
  'rectangle': { name: 'Rectangle', icon: '▬' },
  'rounded-rectangle': { name: 'Rounded Rectangle', icon: '▢' },
  'circle': { name: 'Circle', icon: '●' },
  'ellipse': { name: 'Ellipse', icon: '⬭' },
  'triangle': { name: 'Triangle', icon: '▲' },
  'diamond': { name: 'Diamond', icon: '◆' },
  'arrow-right': { name: 'Arrow Right', icon: '➡' },
  'arrow-left': { name: 'Arrow Left', icon: '⬅' },
  'arrow-up': { name: 'Arrow Up', icon: '⬆' },
  'arrow-down': { name: 'Arrow Down', icon: '⬇' },
  'star': { name: 'Star', icon: '★' },
  'hexagon': { name: 'Hexagon', icon: '⬡' },
  'line': { name: 'Line', icon: '─' },
  'callout': { name: 'Callout', icon: '💬' }
}

// Preset gradients
export const PRESET_GRADIENTS: { name: string; gradient: GradientConfig }[] = [
  {
    name: 'Sunset',
    gradient: { type: 'linear', angle: 135, stops: [{ color: '#f97316', position: 0 }, { color: '#ec4899', position: 100 }] }
  },
  {
    name: 'Ocean',
    gradient: { type: 'linear', angle: 135, stops: [{ color: '#06b6d4', position: 0 }, { color: '#3b82f6', position: 100 }] }
  },
  {
    name: 'Forest',
    gradient: { type: 'linear', angle: 135, stops: [{ color: '#22c55e', position: 0 }, { color: '#14b8a6', position: 100 }] }
  },
  {
    name: 'Purple Haze',
    gradient: { type: 'linear', angle: 135, stops: [{ color: '#8b5cf6', position: 0 }, { color: '#ec4899', position: 100 }] }
  },
  {
    name: 'Fire',
    gradient: { type: 'linear', angle: 180, stops: [{ color: '#ef4444', position: 0 }, { color: '#f97316', position: 50 }, { color: '#fbbf24', position: 100 }] }
  },
  {
    name: 'Night Sky',
    gradient: { type: 'linear', angle: 180, stops: [{ color: '#0f172a', position: 0 }, { color: '#1e3a5f', position: 50 }, { color: '#3b82f6', position: 100 }] }
  },
  {
    name: 'Rainbow',
    gradient: { type: 'linear', angle: 90, stops: [
      { color: '#ef4444', position: 0 },
      { color: '#f97316', position: 20 },
      { color: '#fbbf24', position: 40 },
      { color: '#22c55e', position: 60 },
      { color: '#3b82f6', position: 80 },
      { color: '#8b5cf6', position: 100 }
    ]}
  }
]

// Color presets
export const COLOR_PRESETS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#fbbf24', '#22c55e', 
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
  '#1e293b', '#475569', '#94a3b8', '#e2e8f0', '#fef3c7', '#d1fae5',
  '#cffafe', '#dbeafe', '#e9d5ff', '#fce7f3'
]

export const gradientToCss = (gradient: GradientConfig): string => {
  const stops = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')
  if (gradient.type === 'linear') {
    return `linear-gradient(${gradient.angle}deg, ${stops})`
  }
  return `radial-gradient(circle, ${stops})`
}
