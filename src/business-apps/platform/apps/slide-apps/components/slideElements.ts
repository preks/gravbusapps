/**
 * Slide Element Types - Define all element types for the slide editor
 */

export type ElementType =
  | 'text'
  | 'image'
  | 'shape'
  | 'code'
  | 'video'
  | 'table'
  | 'chart'
  | 'icon'
  | 'logo'
  | 'footer'
  | 'badge'
  | 'connector'
  | 'layer'
  | 'metric-card'

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
  | 'container'

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

export interface IconElement extends SlideElement {
  type: 'icon'
  iconName: string
  color: string
  strokeWidth: number
  filled: boolean
}

export type LogoPreset = 'newwork-dark' | 'newwork-light' | 'newwork-color'

export interface LogoElement extends SlideElement {
  type: 'logo'
  preset: LogoPreset
  showText: boolean
}

export interface FooterElement extends SlideElement {
  type: 'footer'
  pageNumber?: number
  totalPages?: number
  showPageNumber: boolean
  confidentialityText?: string
  dateText?: string
  color: string
  fontSize: number
}

export type BadgeVariant = 'filled' | 'outlined' | 'subtle'

export interface BadgeElement extends SlideElement {
  type: 'badge'
  label: string
  iconName?: string
  backgroundColor: string
  textColor: string
  borderColor?: string
  borderRadius: number
  fontSize: number
  iconSize: number
  variant: BadgeVariant
}

export type ConnectorLineType = 'straight' | 'curved' | 'elbow'
export type ConnectorLabelPosition = 'start' | 'middle' | 'end'

export interface ConnectorElement extends SlideElement {
  type: 'connector'
  startPoint: Position
  endPoint: Position
  controlPoints?: Position[]
  lineType: ConnectorLineType
  strokeColor: string
  strokeWidth: number
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  startArrow: boolean
  endArrow: boolean
  arrowSize: number
  label?: string
  labelPosition: ConnectorLabelPosition
  labelColor?: string
  labelFontSize?: number
}

export interface LayerElement extends SlideElement {
  type: 'layer'
  label: string
  description?: string
  backgroundColor: string
  textColor: string
  borderColor: string
  borderRadius: number
  depth: number
  iconName?: string
  labelFontSize: number
  descriptionFontSize: number
}

export type MetricTrend = 'up' | 'down' | 'neutral'

export interface MetricCardElement extends SlideElement {
  type: 'metric-card'
  value: string
  label: string
  description?: string
  iconName?: string
  backgroundColor: string
  valueColor: string
  labelColor: string
  descriptionColor?: string
  borderRadius: number
  borderColor?: string
  borderWidth?: number
  trend?: MetricTrend
  trendValue?: string
  valueFontSize: number
  labelFontSize: number
  descriptionFontSize: number
}

export type AnySlideElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | CodeElement
  | VideoElement
  | TableElement
  | ChartElement
  | IconElement
  | LogoElement
  | FooterElement
  | BadgeElement
  | ConnectorElement
  | LayerElement
  | MetricCardElement

export type SlideTransitionType =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'push-left'
  | 'push-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'flip'
  | 'cube'
  | 'dissolve'

export type TransitionTrigger = 'on-click' | 'auto'

export interface SlideTransition {
  type: SlideTransitionType
  duration: number
  trigger: TransitionTrigger
  delay: number
}

export const DEFAULT_TRANSITION: SlideTransition = {
  type: 'none',
  duration: 500,
  trigger: 'on-click',
  delay: 0
}

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'branded'
  color?: string
  gradient?: GradientConfig
  overlay?: GradientConfig
  imageUrl?: string
  videoUrl?: string
  videoMuted?: boolean
  videoLoop?: boolean
  brandPreset?: 'newwork-dark' | 'newwork-light' | string
}

export interface SlideData {
  id: string
  elements: AnySlideElement[]
  background: SlideBackground
  notes?: string
  transition?: SlideTransition
  layoutId?: string
  masterId?: string
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

export const createIconElement = (iconName: string, partial?: Partial<IconElement>): IconElement => ({
  id: `icon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'icon',
  position: { x: 100, y: 100 },
  size: { width: 48, height: 48 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  iconName,
  color: '#3b82f6',
  strokeWidth: 2,
  filled: false,
  ...partial
})

export const createLogoElement = (
  preset: LogoPreset = 'newwork-dark',
  partial?: Partial<LogoElement>
): LogoElement => ({
  id: `logo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'logo',
  position: { x: 1120, y: 30 },
  size: { width: 120, height: 40 },
  rotation: 0,
  opacity: 1,
  locked: true,
  zIndex: 100,
  preset,
  showText: true,
  ...partial
})

export const createFooterElement = (partial?: Partial<FooterElement>): FooterElement => ({
  id: `footer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'footer',
  position: { x: 0, y: 680 },
  size: { width: 1280, height: 40 },
  rotation: 0,
  opacity: 1,
  locked: true,
  zIndex: 100,
  showPageNumber: true,
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: 12,
  ...partial
})

export const createBadgeElement = (label: string, partial?: Partial<BadgeElement>): BadgeElement => ({
  id: `badge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'badge',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 40 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  label,
  backgroundColor: '#e91e8c',
  textColor: '#ffffff',
  borderRadius: 8,
  fontSize: 14,
  iconSize: 16,
  variant: 'filled',
  ...partial
})

export const createConnectorElement = (
  startPoint: Position,
  endPoint: Position,
  partial?: Partial<ConnectorElement>
): ConnectorElement => ({
  id: `connector-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'connector',
  position: { x: Math.min(startPoint.x, endPoint.x), y: Math.min(startPoint.y, endPoint.y) },
  size: {
    width: Math.abs(endPoint.x - startPoint.x) || 100,
    height: Math.abs(endPoint.y - startPoint.y) || 100
  },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  startPoint,
  endPoint,
  lineType: 'straight',
  strokeColor: '#64748b',
  strokeWidth: 2,
  strokeStyle: 'solid',
  startArrow: false,
  endArrow: true,
  arrowSize: 8,
  labelPosition: 'middle',
  ...partial
})

export const createLayerElement = (label: string, partial?: Partial<LayerElement>): LayerElement => ({
  id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'layer',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 70 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  label,
  backgroundColor: '#3b82f6',
  textColor: '#ffffff',
  borderColor: 'transparent',
  borderRadius: 8,
  depth: 4,
  labelFontSize: 16,
  descriptionFontSize: 12,
  ...partial
})

export const createMetricCardElement = (
  value: string,
  label: string,
  partial?: Partial<MetricCardElement>
): MetricCardElement => ({
  id: `metric-card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'metric-card',
  position: { x: 100, y: 100 },
  size: { width: 220, height: 160 },
  rotation: 0,
  opacity: 1,
  locked: false,
  zIndex: 1,
  value,
  label,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  valueColor: '#e91e8c',
  labelColor: '#ffffff',
  descriptionColor: 'rgba(255, 255, 255, 0.7)',
  borderRadius: 12,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderWidth: 1,
  valueFontSize: 36,
  labelFontSize: 16,
  descriptionFontSize: 12,
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
  callout: { name: 'Callout', icon: '💬' },
  container: { name: 'Container', icon: '▢' }
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

// Branded background presets
export interface BrandedBackgroundPreset {
  id: string
  name: string
  background: SlideBackground
}

export const BRANDED_BACKGROUNDS: BrandedBackgroundPreset[] = [
  {
    id: 'newwork-dark',
    name: 'NEWWORK Dark',
    background: {
      type: 'branded',
      brandPreset: 'newwork-dark',
      color: '#0a0a0a',
      gradient: {
        type: 'radial',
        angle: 225,
        stops: [
          { color: 'rgba(180, 50, 120, 0.4)', position: 0 },
          { color: 'rgba(140, 40, 180, 0.25)', position: 35 },
          { color: 'transparent', position: 70 }
        ]
      },
      overlay: {
        type: 'radial',
        angle: 315,
        stops: [
          { color: 'rgba(30, 100, 220, 0.35)', position: 0 },
          { color: 'rgba(20, 180, 220, 0.2)', position: 35 },
          { color: 'transparent', position: 70 }
        ]
      }
    }
  },
  {
    id: 'newwork-light',
    name: 'NEWWORK Light',
    background: {
      type: 'branded',
      brandPreset: 'newwork-light',
      color: '#ffffff',
      overlay: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#1e3a5f', position: 0 },
          { color: '#1e3a5f', position: 20 },
          { color: 'transparent', position: 20 }
        ]
      }
    }
  },
  {
    id: 'corporate-dark',
    name: 'Corporate Dark',
    background: {
      type: 'branded',
      brandPreset: 'corporate-dark',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { color: '#0f172a', position: 0 },
          { color: '#1e293b', position: 100 }
        ]
      },
      overlay: {
        type: 'radial',
        angle: 0,
        stops: [
          { color: 'rgba(99, 102, 241, 0.1)', position: 0 },
          { color: 'transparent', position: 60 }
        ]
      }
    }
  }
]

export const getBrandedBackground = (presetId: string): SlideBackground | null => {
  const preset = BRANDED_BACKGROUNDS.find(b => b.id === presetId)
  return preset?.background || null
}

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

  // For radial gradients, use angle to determine position
  // 225 = bottom-left, 315 = bottom-right, 45 = top-right, 135 = top-left
  const angleToPosition: Record<number, string> = {
    225: '0% 100%',
    315: '100% 100%',
    45: '100% 0%',
    135: '0% 0%',
    0: '50% 0%',
    90: '100% 50%',
    180: '50% 100%',
    270: '0% 50%'
  }

  const position = angleToPosition[gradient.angle] || '50% 50%'
  return `radial-gradient(ellipse at ${position}, ${stops})`
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
