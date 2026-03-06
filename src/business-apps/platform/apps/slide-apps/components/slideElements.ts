/**
 * Slide Element Types - Define all element types for the slide editor
 */

export type ElementType = 'text' | 'image' | 'shape' | 'code' | 'video' | 'table' | 'chart'

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

export interface TextLink {
  id: string
  start: number
  end: number
  url: string
  isAutoDetected?: boolean
}

export interface TextElement extends SlideElement {
  type: 'text'
  content: string
  links?: TextLink[]
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

export interface TableElement extends SlideElement {
  type: 'table'
  headers: string[]
  rows: string[][]
  headerBackground: string
  headerTextColor: string
  rowBackground: string
  rowAlternateBackground?: string
  rowTextColor: string
  borderColor: string
  borderWidth: number
  fontSize: number
  headerFontSize: number
  cellPadding: number
  borderRadius: number
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'radar' | 'radial'

export interface ChartDataPoint {
  label: string
  [key: string]: string | number
}

export interface ChartSeries {
  key: string
  label: string
  color?: string
}

export interface ChartElement extends SlideElement {
  type: 'chart'
  chartType: ChartType
  title: string
  data: ChartDataPoint[]
  series: ChartSeries[]
  showLegend: boolean
  showGrid: boolean
  showTooltip: boolean
  backgroundColor: string
  borderRadius: number
}

export type AnySlideElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | CodeElement
  | VideoElement
  | TableElement
  | ChartElement

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

export const createTableElement = (
  headers: string[],
  rows: string[][],
  partial?: Partial<TableElement>
): TableElement => ({
  id: `table-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'table',
  position: { x: 80, y: 150 },
  size: { width: 600, height: 300 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  headers,
  rows,
  headerBackground: '#1e3a5f',
  headerTextColor: '#ffffff',
  rowBackground: '#ffffff',
  rowAlternateBackground: '#f8fafc',
  rowTextColor: '#334155',
  borderColor: '#e2e8f0',
  borderWidth: 1,
  fontSize: 14,
  headerFontSize: 14,
  cellPadding: 12,
  borderRadius: 8,
  ...partial
})

export const createChartElement = (chartType: ChartType, partial?: Partial<ChartElement>): ChartElement => ({
  id: `chart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'chart',
  position: { x: 100, y: 100 },
  size: { width: 500, height: 300 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  chartType,
  title: 'Chart Title',
  data: [
    { label: 'Jan', value1: 186, value2: 80 },
    { label: 'Feb', value1: 305, value2: 200 },
    { label: 'Mar', value1: 237, value2: 120 },
    { label: 'Apr', value1: 73, value2: 190 },
    { label: 'May', value1: 209, value2: 130 },
    { label: 'Jun', value1: 214, value2: 140 }
  ],
  series: [
    { key: 'value1', label: 'Series 1' },
    { key: 'value2', label: 'Series 2' }
  ],
  showLegend: true,
  showGrid: true,
  showTooltip: true,
  backgroundColor: 'transparent',
  borderRadius: 8,
  ...partial
})

export const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'area', label: 'Area Chart', icon: '📉' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'radar', label: 'Radar Chart', icon: '🕸️' },
  { value: 'radial', label: 'Radial Chart', icon: '⭕' }
]

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
  rectangle: { name: 'Rectangle', icon: '▬' },
  'rounded-rectangle': { name: 'Rounded Rectangle', icon: '▢' },
  circle: { name: 'Circle', icon: '●' },
  ellipse: { name: 'Ellipse', icon: '⬭' },
  triangle: { name: 'Triangle', icon: '▲' },
  diamond: { name: 'Diamond', icon: '◆' },
  'arrow-right': { name: 'Arrow Right', icon: '➡' },
  'arrow-left': { name: 'Arrow Left', icon: '⬅' },
  'arrow-up': { name: 'Arrow Up', icon: '⬆' },
  'arrow-down': { name: 'Arrow Down', icon: '⬇' },
  star: { name: 'Star', icon: '★' },
  hexagon: { name: 'Hexagon', icon: '⬡' },
  line: { name: 'Line', icon: '─' },
  callout: { name: 'Callout', icon: '💬' }
}

// Preset gradients
export const PRESET_GRADIENTS: { name: string; gradient: GradientConfig }[] = [
  {
    name: 'Sunset',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#f97316', position: 0 },
        { color: '#ec4899', position: 100 }
      ]
    }
  },
  {
    name: 'Ocean',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#06b6d4', position: 0 },
        { color: '#3b82f6', position: 100 }
      ]
    }
  },
  {
    name: 'Forest',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#22c55e', position: 0 },
        { color: '#14b8a6', position: 100 }
      ]
    }
  },
  {
    name: 'Purple Haze',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#8b5cf6', position: 0 },
        { color: '#ec4899', position: 100 }
      ]
    }
  },
  {
    name: 'Fire',
    gradient: {
      type: 'linear',
      angle: 180,
      stops: [
        { color: '#ef4444', position: 0 },
        { color: '#f97316', position: 50 },
        { color: '#fbbf24', position: 100 }
      ]
    }
  },
  {
    name: 'Night Sky',
    gradient: {
      type: 'linear',
      angle: 180,
      stops: [
        { color: '#0f172a', position: 0 },
        { color: '#1e3a5f', position: 50 },
        { color: '#3b82f6', position: 100 }
      ]
    }
  },
  {
    name: 'Rainbow',
    gradient: {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#ef4444', position: 0 },
        { color: '#f97316', position: 20 },
        { color: '#fbbf24', position: 40 },
        { color: '#22c55e', position: 60 },
        { color: '#3b82f6', position: 80 },
        { color: '#8b5cf6', position: 100 }
      ]
    }
  }
]

// Color presets
export const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#fbbf24',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#1e293b',
  '#475569',
  '#94a3b8',
  '#e2e8f0',
  '#fef3c7',
  '#d1fae5',
  '#cffafe',
  '#dbeafe',
  '#e9d5ff',
  '#fce7f3'
]

export const gradientToCss = (gradient: GradientConfig): string => {
  const stops = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')
  if (gradient.type === 'linear') {
    return `linear-gradient(${gradient.angle}deg, ${stops})`
  }
  return `radial-gradient(circle, ${stops})`
}

// AI Presentation Assist - Effect Types
export type EffectType =
  | 'highlight' // Yellow background pulse - for key terms
  | 'underline' // Animated underline - for emphasis
  | 'magnify' // Scale up 115% - for focus
  | 'pulse' // Opacity pulse - for subtle attention
  | 'glow' // Box shadow glow - for important items
  | 'bounce' // Subtle Y-axis bounce - for lists/bullets
  | 'spotlight' // Dim others to 30% opacity - for isolation

export type EffectIntensity = 'subtle' | 'normal' | 'strong'

export interface ElementEffect {
  id: string // Unique effect instance ID
  elementId: string // Target slide element ID
  effect: EffectType
  duration: number // ms (default: 1500, range: 500-3000)
  intensity: EffectIntensity
  timestamp: number // When effect was triggered
  source: 'speech' | 'manual' // How effect was triggered
}

export interface EffectClearCommand {
  type: 'clear-single' | 'clear-all' | 'clear-element'
  effectId?: string // For clear-single
  elementId?: string // For clear-element
}

export interface AIAssistConfig {
  enabled: boolean
  language: string // Speech recognition language (default: 'en-US')
  sensitivity: 'low' | 'medium' | 'high' // Match threshold
  effectStyle: EffectIntensity
  enabledEffects: EffectType[] // Which effects to use
  videoAutoplay: boolean // Auto-play videos on trigger phrases
  showTranscript: boolean // Show live transcript panel
  showMatchFeedback: boolean // Visual feedback on matches
  cooldownMs: number // Per-element cooldown (default: 5000)
  duplicateDetectionMs: number // Block duplicate transcripts for this duration (default: 2000)
  maxConcurrentEffects: number // Limit simultaneous animations (default: 3)
  transcriptBufferSize: number // Max words to keep (default: 500)
}

export const DEFAULT_AI_ASSIST_CONFIG: AIAssistConfig = {
  enabled: false,
  language: 'en-US',
  sensitivity: 'medium',
  effectStyle: 'normal',
  enabledEffects: ['highlight', 'magnify', 'spotlight'],
  videoAutoplay: true,
  showTranscript: false,
  showMatchFeedback: true,
  cooldownMs: 5000,
  duplicateDetectionMs: 2000,
  maxConcurrentEffects: 3,
  transcriptBufferSize: 500
}

export const EFFECT_TYPE_OPTIONS: { value: EffectType; label: string; description: string }[] = [
  { value: 'highlight', label: 'Highlight', description: 'Yellow background pulse' },
  { value: 'underline', label: 'Underline', description: 'Animated underline' },
  { value: 'magnify', label: 'Magnify', description: 'Scale up for focus' },
  { value: 'pulse', label: 'Pulse', description: 'Opacity pulse' },
  { value: 'glow', label: 'Glow', description: 'Box shadow glow' },
  { value: 'bounce', label: 'Bounce', description: 'Subtle bounce' },
  { value: 'spotlight', label: 'Spotlight', description: 'Dim other elements' }
]

export function createEffect(
  elementId: string,
  effect: EffectType,
  options?: Partial<Pick<ElementEffect, 'duration' | 'intensity' | 'source'>>
): ElementEffect {
  return {
    id: `effect-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    elementId,
    effect,
    duration: options?.duration ?? 1500,
    intensity: options?.intensity ?? 'normal',
    timestamp: Date.now(),
    source: options?.source ?? 'speech'
  }
}

export function isEffectExpired(effect: ElementEffect): boolean {
  return Date.now() - effect.timestamp > effect.duration
}
