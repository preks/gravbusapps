/**
 * Slide Element Types - Define all element types for the slide editor
 */

import type { CSSProperties } from 'react'

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
  | 'group'

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
  | 'parallelogram'
  | 'trapezoid'
  | 'pentagon'
  | 'octagon'
  | 'plus'
  | 'cross'
  | 'chevron'
  | 'can'
  | 'bevel'
  | 'flowchart-process'
  | 'flowchart-decision'
  | 'flowchart-terminator'
  | 'flowchart-alternate'

/**
 * High-level shape family classification. Used to group shapes in the insert
 * palette and to decide which preset-specific property controls to surface.
 */
export type ShapeFamily = 'basic' | 'arrow' | 'callout' | 'flowchart' | 'star-banner' | 'line'

/** Map every {@link ShapeType} to its family for UI grouping. */
export const SHAPE_FAMILY: Record<ShapeType, ShapeFamily> = {
  rectangle: 'basic',
  'rounded-rectangle': 'basic',
  circle: 'basic',
  ellipse: 'basic',
  triangle: 'basic',
  diamond: 'basic',
  hexagon: 'basic',
  pentagon: 'basic',
  octagon: 'basic',
  parallelogram: 'basic',
  trapezoid: 'basic',
  plus: 'basic',
  cross: 'basic',
  can: 'basic',
  bevel: 'basic',
  container: 'basic',
  'arrow-right': 'arrow',
  'arrow-left': 'arrow',
  'arrow-up': 'arrow',
  'arrow-down': 'arrow',
  chevron: 'arrow',
  star: 'star-banner',
  callout: 'callout',
  line: 'line',
  'flowchart-process': 'flowchart',
  'flowchart-decision': 'flowchart',
  'flowchart-terminator': 'flowchart',
  'flowchart-alternate': 'flowchart'
}

/**
 * Native editor → OOXML preset id mapping. When an editor-native shape is
 * exported, we prefer the OOXML preset that best matches so round-trip to
 * PowerPoint looks correct. Extend this in lock-step with {@link ShapeType}.
 */
export const SHAPE_TYPE_TO_OOXML_PRESET: Record<ShapeType, string | undefined> = {
  rectangle: 'rect',
  'rounded-rectangle': 'roundRect',
  circle: 'ellipse',
  ellipse: 'ellipse',
  triangle: 'triangle',
  diamond: 'diamond',
  hexagon: 'hexagon',
  pentagon: 'pentagon',
  octagon: 'octagon',
  parallelogram: 'parallelogram',
  trapezoid: 'trapezoid',
  plus: 'plus',
  cross: 'plus',
  can: 'can',
  bevel: 'bevel',
  container: 'rect',
  'arrow-right': 'rightArrow',
  'arrow-left': 'leftArrow',
  'arrow-up': 'upArrow',
  'arrow-down': 'downArrow',
  chevron: 'chevron',
  star: 'star5',
  callout: 'wedgeRectCallout',
  line: 'line',
  'flowchart-process': 'flowChartProcess',
  'flowchart-decision': 'flowChartDecision',
  'flowchart-terminator': 'flowChartTerminator',
  'flowchart-alternate': 'flowChartAlternateProcess'
}

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

/**
 * A styled text run inside a paragraph. Only `text` is required; unset
 * properties inherit from paragraph defaults and then from the TextElement
 * box-level style. Keeping the style sparse keeps payloads small.
 */
/**
 * Run-level text case transformation. Mirrors OOXML's `cap` attribute
 * (`cap="all"` / `cap="small"`) which renders-as-uppercase without mutating
 * the stored text. CSS `text-transform` handles this cleanly so the underlying
 * content keeps its original casing for editing / export fidelity.
 */
export type RichTextTransform = 'none' | 'uppercase' | 'lowercase' | 'small-caps'

/**
 * Translate a {@link RichTextTransform} into a CSS style fragment. Kept in
 * this module so every renderer (canvas, export, thumbnail, rich text)
 * produces identical markup. `small-caps` is modelled via `font-variant`
 * because real CSS `text-transform: small-caps` is not a standard value.
 */
export function textTransformToCss(transform: RichTextTransform | undefined): CSSProperties {
  if (!transform || transform === 'none') return {}
  if (transform === 'small-caps') return { fontVariant: 'small-caps', textTransform: 'lowercase' }
  return { textTransform: transform }
}

/** Shared font weight values used across text, shape labels and run-level styling. */
export type FontWeight = 'normal' | 'bold' | 'light'
/** Shared italic/regular styles used across text and shape labels. */
export type FontStyle = 'normal' | 'italic'
/** Shared text decoration values used across text and shape labels. */
export type TextDecoration = 'none' | 'underline' | 'line-through'
/** Horizontal text alignment options honored by all text renderers. */
export type TextAlign = 'left' | 'center' | 'right'
/** Justified alignment adds the `justify` value beyond the box-level options. */
export type ParagraphAlignment = 'left' | 'center' | 'right' | 'justify'
/** Vertical alignment options for text boxes and shape labels. */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

export interface RichTextRun {
  text: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: FontWeight
  fontStyle?: FontStyle
  textDecoration?: TextDecoration
  color?: string
  backgroundColor?: string
  hyperlink?: string
  textTransform?: RichTextTransform
}

export type RichParagraphBulletType = 'none' | 'bullet' | 'number'

export interface RichTextParagraph {
  runs: RichTextRun[]
  alignment?: ParagraphAlignment
  indentLevel?: number
  bulletType?: RichParagraphBulletType
  bulletChar?: string
  lineHeight?: number
  spaceBefore?: number
  spaceAfter?: number
}

export interface TextElement extends SlideElement {
  type: 'text'
  content: string
  /**
   * Rich paragraph/run model populated by the PPTX importer and by the
   * editor when users apply per-run styling. Optional for backwards
   * compatibility; when absent, renderers fall back to `content` plus the
   * box-level style fields below.
   */
  paragraphs?: RichTextParagraph[]
  links?: TextLink[]
  fontFamily: string
  fontSize: number
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
  textAlign: TextAlign
  verticalAlign: VerticalAlign
  color: string
  backgroundColor: string
  gradient?: GradientConfig
  lineHeight: number
  letterSpacing: number
  padding: number
  /**
   * Box-level text case override. Honored when the element has no
   * per-run `textTransform` entries. Mirrors the same OOXML `cap`
   * attribute applied at the text-body or placeholder level.
   */
  textTransform?: RichTextTransform
}

/**
 * Normalized crop rectangle. Values are fractions 0..1 of the original image
 * dimensions, matching OOXML's <a:srcRect l/t/r/b> semantics (which store
 * crops as percentages from each edge in 1000ths).
 */
export interface ImageCropRect {
  left: number
  top: number
  right: number
  bottom: number
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
  /**
   * Optional crop rectangle imported from PPTX <a:srcRect>. When present, the
   * renderer should apply it via CSS clip-path + object-position so the visible
   * region matches the PPTX source. Absent means no crop.
   */
  cropRect?: ImageCropRect
}

/**
 * In-shape text on a {@link ShapeElement} (PPTX autoshave label or user-edited label).
 * Mirrors the subset of {@link TextElement} needed to render with {@link RichTextContent}.
 */
export interface ShapeInText {
  content: string
  paragraphs?: RichTextParagraph[]
  links?: TextLink[]
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold' | 'light'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  color: string
  lineHeight: number
  letterSpacing: number
  textTransform?: RichTextTransform
  padding: number
  /**
   * PowerPoint can let shape text paint outside the geometry when shrink-to-fit
   * is not active. Imported shapes carry this so renderers can avoid clipping
   * descenders that PowerPoint visibly shows.
   */
  allowOverflow?: boolean
}

/**
 * Shape geometry metadata shared by editor-native shapes and shapes imported
 * from PPTX.
 *
 * PowerPoint's shape library contains ~180 "preset" geometries plus a
 * `custGeom` path language. Collapsing everything to our small {@link ShapeType}
 * vocabulary makes editing easy but loses fidelity — a block arrow turns
 * into a rectangle, a cylinder into a rounded rectangle, etc. Keeping this
 * metadata on every shape lets preset-aware renderers reproduce the Office
 * look, lets native shapes opt into the same fidelity pipeline, and keeps
 * round-trip behavior symmetric regardless of how the shape was created.
 *
 * When {@link sourceFormat} is `'pptx'` the values were parsed from a source
 * document; when it is `'native'` the editor produced them locally. Renderers
 * should treat both the same way.
 */
export interface ShapeGeometryMetadata {
  /**
   * Where this geometry originated. `'pptx'` means it came from an imported
   * document; `'native'` means the editor stamped it on at creation time so
   * the shape can use the same preset pipeline as imported content.
   */
  sourceFormat: 'pptx' | 'native'
  /** ECMA-376 preset id (e.g. `can`, `chevron`, `notchedRightArrow`). */
  prst?: string
  /**
   * Adjustment values from `<a:avLst>` (or set by the editor through the
   * adjustment UI). Keys follow OOXML naming (`adj`, `adj1`, `adj2` ...) and
   * values are per-mille ints normalised to the shape bounding box.
   */
  adjustments?: Record<string, number>
  /** Horizontal flip from `<a:xfrm flipH="1">`. */
  flipH?: boolean
  /** Vertical flip from `<a:xfrm flipV="1">`. */
  flipV?: boolean
  /**
   * Normalised SVG `d` path for `<a:custGeom>` geometries, expressed inside
   * the unit box `[0..1, 0..1]`. Preset-aware renderers can scale it to the
   * shape's current size.
   */
  custGeomPath?: string
}

/**
 * Legacy name kept as an alias for `ShapeGeometryMetadata` so existing
 * importer / renderer / export code keeps compiling. New code should prefer
 * {@link ShapeGeometryMetadata}.
 */
export type ShapeImportMetadata = ShapeGeometryMetadata

/**
 * Optional richer visual effects that can decorate a shape. None of these
 * are required; renderers that do not understand an effect should ignore it
 * and fall through to the base fill/stroke pipeline. Effects mirror the
 * subset of PowerPoint's `a:effectLst` entries that are safe to approximate
 * with CSS filters.
 */
export interface ShapeEffects {
  /**
   * Outer glow. `color` is rendered around the shape; `size` is the CSS
   * blur radius in pixels.
   */
  glow?: { color: string; size: number }
  /** Mirror-style reflection below the shape. `opacity` is 0..1. */
  reflection?: { opacity: number; distance: number }
  /** Feathered soft edges. `size` is the CSS blur radius in pixels. */
  softEdges?: { size: number }
  /**
   * Inner shadow approximation. Distinct from the legacy `shadow` boolean
   * so presets can opt into a richer drop-shadow offset without rewriting
   * the renderer contract.
   */
  innerShadow?: { color: string; size: number; offsetX: number; offsetY: number }
  /**
   * Outer drop shadow. Models `a:outerShdw` with the full offset + blur
   * vocabulary PowerPoint exposes so round-trips do not have to collapse
   * to the legacy boolean `shadow`.
   */
  outerShadow?: { color: string; blur: number; offsetX: number; offsetY: number }
  /**
   * Raw `a:blur` effect — applies a Gaussian blur to the entire shape.
   * Ignored when 0.
   */
  blur?: { radius: number }
}

/**
 * Picture fill (`a:blipFill`). Points to a data URL (or `blob:` URL) for the
 * image the shape should be painted with. `stretch` is the default PowerPoint
 * behavior; set `tile` for `<a:tile/>` fills.
 */
export interface PictureFill {
  kind: 'picture'
  /** Data URL or object URL resolved from the PPTX rel. */
  src: string
  /** `a:stretch` — fill the shape with one copy of the image (default). */
  stretch?: boolean
  /** `a:tile` — repeat the image across the shape. */
  tile?: boolean
}

/**
 * Pattern fill (`a:pattFill`). `preset` is the OOXML pattern name (e.g.
 * `dkHorz`, `lgGrid`, `pct50`) and `fgColor`/`bgColor` are resolved CSS
 * colors from the theme.
 */
export interface PatternFill {
  kind: 'pattern'
  /** OOXML pattern preset id. */
  preset: string
  fgColor: string
  bgColor: string
}

/** Arrowhead size buckets used by both `headEnd` and `tailEnd`. */
export type ArrowheadSize = 'sm' | 'med' | 'lg'
/** Arrowhead geometry variants shared by both line ends. */
export type ArrowheadType = 'none' | 'triangle' | 'stealth' | 'diamond' | 'oval' | 'arrow'

/** Arrowhead spec reused for both ends of a shape's outline. */
export interface ArrowheadSpec {
  type: ArrowheadType
  width?: ArrowheadSize
  length?: ArrowheadSize
}

export interface ShapeElement extends SlideElement {
  type: 'shape'
  shapeType: ShapeType
  fill: string
  gradient?: GradientConfig
  /** Picture fill from `a:blipFill`. When present, renderers should paint the bitmap instead of the solid fill. */
  pictureFill?: PictureFill
  /** Pattern fill from `a:pattFill`. When present, renderers should paint the pattern instead of the solid fill. */
  patternFill?: PatternFill
  strokeColor: string
  strokeWidth: number
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  /**
   * Compound outline (`a:ln cmpd`). Single is the default; `dbl` /
   * `thickThin` / `thinThick` / `tri` are rendered via a layered parallel
   * stroke approximation.
   */
  lineCompound?: 'sng' | 'dbl' | 'thickThin' | 'thinThick' | 'tri'
  /** `a:ln cap` — `rnd`/`sq`/`flat`. Maps onto SVG/CSS `stroke-linecap`. */
  lineCap?: 'rnd' | 'sq' | 'flat'
  /** `a:miter`/`a:round`/`a:bevel` — maps onto SVG `stroke-linejoin`. */
  lineJoin?: 'miter' | 'round' | 'bevel'
  /** Arrowhead at the start of the shape's outline (`a:headEnd`). */
  lineHeadEnd?: ArrowheadSpec
  /** Arrowhead at the end of the shape's outline (`a:tailEnd`). */
  lineTailEnd?: ArrowheadSpec
  cornerRadius: number
  shadow: boolean
  /**
   * Text drawn inside the shape (PPTX autoshave, or set in the editor).
   * The shape's own fill is separate; this is the label only.
   */
  shapeText?: ShapeInText
  /**
   * Shape geometry metadata shared with imported shapes. Populated for both
   * PPTX-imported and editor-native shapes so the same preset/adjustment/flip
   * pipeline runs regardless of origin. `importMeta` is the legacy alias;
   * new code should prefer {@link geometry}.
   */
  geometry?: ShapeGeometryMetadata
  /**
   * Legacy alias for {@link geometry}. Retained for backwards-compat
   * serialization so shape state persisted before the {@link geometry} slot
   * existed continues to render. New code should write to {@link geometry}
   * and only touch this field when round-tripping through legacy storage.
   */
  importMeta?: ShapeImportMetadata
  /** Optional visual effects layer (glow / reflection / soft edges). */
  effects?: ShapeEffects
  /**
   * Alt text metadata from `<p:cNvPr descr=… title=…>`. Surfaced in the
   * property panel and round-tripped on export so accessibility annotations
   * survive edits.
   */
  altText?: { title?: string; description?: string }
  /**
   * Shape-level hyperlink (`<a:hlinkClick>` on `<p:cNvPr>`). Stored as a
   * resolved URL; PPTX round-trip re-registers a relationship on export.
   */
  hyperlink?: string
  /**
   * Per-capability lock flags from `<a:spLocks …/>`. Maps directly to the
   * OOXML attributes so we do not lose fidelity — the editor consumes
   * whichever flags it implements and ignores the rest.
   */
  spLocks?: {
    noGrp?: boolean
    noSelect?: boolean
    noRot?: boolean
    noChangeAspect?: boolean
    noMove?: boolean
    noResize?: boolean
    noEditPoints?: boolean
    noAdjustHandles?: boolean
    noChangeArrowheads?: boolean
    noChangeShapeType?: boolean
    noTextEdit?: boolean
  }
}

/**
 * Read the active geometry metadata of a shape, preferring the new
 * {@link ShapeElement.geometry} slot and falling back to the legacy
 * `importMeta` alias so in-flight documents keep rendering.
 */
export function getShapeGeometry(shape: ShapeElement): ShapeGeometryMetadata | undefined {
  return shape.geometry ?? shape.importMeta
}

/**
 * Build a {@link TextElement} stub for rich-text renderers (canvas, export, thumbnail) from
 * a shape with {@link ShapeInText}.
 */
export function textElementStubForShapeInText(element: ShapeElement, text: ShapeInText): TextElement {
  return {
    type: 'text',
    id: `${element.id}-label`,
    position: element.position,
    size: element.size,
    rotation: 0,
    opacity: 1,
    locked: true,
    zIndex: 0,
    content: text.content,
    paragraphs: text.paragraphs,
    links: text.links,
    fontFamily: text.fontFamily,
    fontSize: text.fontSize,
    fontWeight: text.fontWeight,
    fontStyle: text.fontStyle,
    textDecoration: text.textDecoration,
    textAlign: text.textAlign,
    verticalAlign: text.verticalAlign,
    color: text.color,
    backgroundColor: 'transparent',
    lineHeight: text.lineHeight,
    letterSpacing: text.letterSpacing,
    textTransform: text.textTransform,
    padding: text.padding
  }
}

export interface CodeElement extends SlideElement {
  type: 'code'
  code: string
  language: string
  theme: 'dark' | 'light'
  showLineNumbers: boolean
  fontSize: number
  textColor?: string
  backgroundColor?: string
  borderRadius: number
  borderWidth: number
  borderColor: string
  shadow: boolean
  padding: number
}

export interface VideoElement extends SlideElement {
  type: 'video'
  src: string
  sourceUrl?: string
  embedUrl?: string
  previewImageUrl?: string
  videoKind?: 'file' | 'embed'
  provider?: 'youtube'
  autoplay: boolean
  loop: boolean
  muted: boolean
  objectFit: 'cover' | 'contain' | 'fill'
  borderRadius: number
  shadow: boolean
}

/**
 * Richer table cell model used by the importer when per-cell formatting is
 * available. When the legacy `rows`/`headers` string arrays are populated,
 * the editor falls back to the coarse grid.
 */
export interface TableCell {
  content: string
  paragraphs?: RichTextParagraph[]
  rowSpan?: number
  colSpan?: number
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  horizontalAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  borderColor?: string
  borderWidth?: number
}

export interface TableElement extends SlideElement {
  type: 'table'
  headers: string[]
  rows: string[][]
  /**
   * Optional richer grid (rows x cols) that carries per-cell formatting and
   * spans. Populated by the PPTX importer; legacy `headers`/`rows` arrays
   * remain the source of truth until the table editor consumes this.
   */
  cells?: TableCell[][]
  columnWidths?: number[]
  rowHeights?: number[]
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

/**
 * Canonical bind points on a shape that a connector endpoint can glue to.
 * Mirrors PowerPoint's fixed connection-site model: top/right/bottom/left
 * midpoints plus the center. Free-floating endpoints set no binding and use
 * absolute `startPoint`/`endPoint` coordinates.
 */
export type ConnectorBindSite = 'top' | 'right' | 'bottom' | 'left' | 'center'

/**
 * Connector binding descriptor. When set on a connector endpoint, the
 * absolute `startPoint` / `endPoint` becomes an advisory cached value — the
 * renderer recomputes the actual location from the target element's current
 * bounds so the connector tracks moves/resizes.
 */
export interface ConnectorBinding {
  elementId: string
  site: ConnectorBindSite
}

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
  /** Optional binding for the start endpoint. Empty = floating endpoint. */
  startBinding?: ConnectorBinding
  /** Optional binding for the end endpoint. Empty = floating endpoint. */
  endBinding?: ConnectorBinding
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

/**
 * Container for grouped elements. The group's position/size defines the
 * group's bounding box on the slide; child elements use coordinates relative
 * to the group origin. Importer currently flattens groups, but this model
 * enables preservation as the editor gains group support.
 */
export interface GroupElement extends SlideElement {
  type: 'group'
  children: AnySlideElement[]
  label?: string
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
  | GroupElement

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
  videoPreviewImageUrl?: string
  videoMuted?: boolean
  videoLoop?: boolean
  brandPreset?: 'newwork-dark' | 'newwork-light' | string
}

/**
 * Metadata captured from the source PPTX layout/master so the editor can
 * reason about placeholder fallback, branding, and export round-trip.
 */
export interface SlideSourceMetadata {
  sourceFormat?: 'pptx'
  placeholderType?: string
  layoutName?: string
  masterName?: string
}

export interface SlideCanvasSize {
  width: number
  height: number
}

/**
 * Default slide canvas dimensions (16:9 at 96 DPI). Matches PowerPoint's
 * "Widescreen (16:9)" preset in pixels after EMU → px conversion, which is
 * also what most of our templates were originally designed against.
 */
export const DEFAULT_SLIDE_CANVAS_SIZE: SlideCanvasSize = { width: 1280, height: 720 }

export interface SlideData {
  id: string
  elements: AnySlideElement[]
  background: SlideBackground
  notes?: string
  transition?: SlideTransition
  layoutId?: string
  masterId?: string
  /**
   * Optional source metadata captured at import time; ignored by the editor
   * but used by export to preserve PPTX fidelity on round-trip.
   */
  source?: SlideSourceMetadata
  /**
   * Original canvas dimensions in pixels. When absent the renderer falls
   * back to {@link DEFAULT_SLIDE_CANVAS_SIZE}. Imported PPTX decks populate
   * this from <p:sldSz> so 4:3 / 16:10 / A4 decks render with correct aspect
   * ratio instead of getting letterboxed into 16:9.
   */
  canvasSize?: SlideCanvasSize
}

/** Convenience: read a slide's canvas size, falling back to the default. */
export function getSlideCanvasSize(slide: Pick<SlideData, 'canvasSize'>): SlideCanvasSize {
  return slide.canvasSize ?? DEFAULT_SLIDE_CANVAS_SIZE
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

/**
 * Compute inline styles to render a cropped image to look like PowerPoint
 * does: the visible region defined by <a:srcRect> fills the entire frame.
 *
 * Implementation: the image is scaled up so the kept region equals the frame,
 * then translated so the kept region's top-left corner is at (0,0). Callers
 * must place the result inside an overflow-hidden, relatively-positioned
 * container matching the element's bounding box.
 */
export function getImageCropStyles(cropRect: ImageCropRect | undefined): {
  wrapperNeeded: boolean
  imgStyle: CSSProperties
} {
  if (!cropRect) {
    return { wrapperNeeded: false, imgStyle: {} }
  }

  const keepW = Math.max(0.001, 1 - cropRect.left - cropRect.right)
  const keepH = Math.max(0.001, 1 - cropRect.top - cropRect.bottom)

  const widthPct = (1 / keepW) * 100
  const heightPct = (1 / keepH) * 100
  const leftPct = -(cropRect.left / keepW) * 100
  const topPct = -(cropRect.top / keepH) * 100

  return {
    wrapperNeeded: true,
    imgStyle: {
      position: 'absolute',
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
      maxWidth: 'none',
      maxHeight: 'none'
    }
  }
}

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

/**
 * Default adjustment values for editor-native shapes, expressed in the same
 * per-mille scale PowerPoint uses. Shapes not listed here have no
 * user-adjustable parameters and fall back to the renderer's hard-coded
 * defaults.
 */
const DEFAULT_SHAPE_ADJUSTMENTS: Partial<Record<ShapeType, Record<string, number>>> = {
  'rounded-rectangle': { adj: 16667 },
  chevron: { adj: 50000 },
  'arrow-right': { adj1: 50000, adj2: 50000 },
  'arrow-left': { adj1: 50000, adj2: 50000 },
  'arrow-up': { adj1: 50000, adj2: 50000 },
  'arrow-down': { adj1: 50000, adj2: 50000 },
  parallelogram: { adj: 25000 },
  trapezoid: { adj: 25000 },
  pentagon: { adj: 50000 },
  octagon: { adj: 29289 },
  plus: { adj: 25000 },
  cross: { adj: 25000 },
  bevel: { adj: 12500 },
  can: { adj: 25000 }
}

/**
 * Build the default {@link ShapeGeometryMetadata} for a native shape so it
 * participates in the same preset/adjustment pipeline as imported shapes.
 */
export function defaultGeometryForShape(shapeType: ShapeType): ShapeGeometryMetadata {
  const prst = SHAPE_TYPE_TO_OOXML_PRESET[shapeType]
  const adjustments = DEFAULT_SHAPE_ADJUSTMENTS[shapeType]
  return {
    sourceFormat: 'native',
    ...(prst ? { prst } : {}),
    ...(adjustments ? { adjustments: { ...adjustments } } : {})
  }
}

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
  geometry: defaultGeometryForShape(shapeType),
  ...partial
})

/**
 * Reverse lookup of {@link SHAPE_TYPE_TO_OOXML_PRESET}. Lets us map an OOXML
 * preset id back to our canonical native `ShapeType` when one exists, so a
 * preset-only insert (e.g. "star8") still carries a stable shapeType for
 * legacy code paths that branch on it (selection, property panel, etc.).
 */
const OOXML_PRESET_TO_SHAPE_TYPE: Record<string, ShapeType> = (() => {
  const out: Record<string, ShapeType> = {}
  for (const key of Object.keys(SHAPE_TYPE_TO_OOXML_PRESET) as ShapeType[]) {
    const preset = SHAPE_TYPE_TO_OOXML_PRESET[key]
    if (preset && !out[preset]) out[preset] = key
  }
  return out
})()

/**
 * Insert a shape by its OOXML preset id even when we do not have a matching
 * native {@link ShapeType}. The OfficeShapeRenderer will pick up the preset
 * via `geometry.prst` and draw the real silhouette; the nominal `shapeType`
 * is set to the closest native fallback (or "rectangle") so the rest of the
 * editor, which occasionally branches on `shapeType`, stays well-typed.
 *
 * This is how the Insert palette surfaces presets like `star8`, `heart`,
 * `flowChartDocument`, `cloudCallout`, etc. without bloating `ShapeType`.
 */
export const createShapeFromPreset = (prst: string, partial?: Partial<ShapeElement>): ShapeElement => {
  const fallbackType = OOXML_PRESET_TO_SHAPE_TYPE[prst] ?? 'rectangle'
  const baseGeometry: ShapeGeometryMetadata = {
    sourceFormat: 'native',
    prst
  }
  return createShapeElement(fallbackType, {
    ...partial,
    geometry: {
      ...baseGeometry,
      ...(partial?.geometry ?? {}),
      prst
    }
  })
}

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
  borderRadius: 8,
  borderWidth: 0,
  borderColor: '#333333',
  shadow: false,
  padding: 16,
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
  videoKind: 'file',
  autoplay: false,
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

export const createGroupElement = (children: AnySlideElement[], partial?: Partial<GroupElement>): GroupElement => {
  const { minX, minY, maxX, maxY } = children.reduce(
    (acc, child) => ({
      minX: Math.min(acc.minX, child.position.x),
      minY: Math.min(acc.minY, child.position.y),
      maxX: Math.max(acc.maxX, child.position.x + child.size.width),
      maxY: Math.max(acc.maxY, child.position.y + child.size.height)
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )
  const hasChildren = Number.isFinite(minX) && Number.isFinite(minY)
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'group',
    position: hasChildren ? { x: minX, y: minY } : { x: 0, y: 0 },
    size: hasChildren
      ? { width: Math.max(10, maxX - minX), height: Math.max(10, maxY - minY) }
      : { width: 200, height: 200 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    children,
    ...partial
  }
}

/**
 * Build a single-run paragraph array from plain text, applying box-level
 * styling as defaults. Used by migration/export code paths that need rich
 * paragraphs even when the element only has a legacy `content` string.
 */
export const paragraphsFromPlainText = (element: TextElement): RichTextParagraph[] => {
  if (element.paragraphs && element.paragraphs.length > 0) return element.paragraphs
  const lines = (element.content || '').split('\n')
  const alignmentMap: Record<TextElement['textAlign'], RichTextParagraph['alignment']> = {
    left: 'left',
    center: 'center',
    right: 'right'
  }
  return lines.map(line => ({
    runs: [
      {
        text: line,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        textDecoration: element.textDecoration,
        color: element.color
      }
    ],
    alignment: alignmentMap[element.textAlign]
  }))
}

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

type StringSelectOption = {
  value: string
  label: string
}

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128]

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' }
]

export const CODE_FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24]

export function getStringSelectOptions(
  options: readonly StringSelectOption[],
  activeValue?: string
): StringSelectOption[] {
  const trimmedValue = activeValue?.trim()
  if (!trimmedValue) return [...options]

  const alreadyExists = options.some(option => option.value.toLowerCase() === trimmedValue.toLowerCase())
  if (alreadyExists) return [...options]

  return [{ value: trimmedValue, label: trimmedValue }, ...options]
}

export function getNumericSelectOptions(options: readonly number[], activeValue?: number): number[] {
  if (activeValue === undefined || activeValue === null || Number.isNaN(activeValue)) {
    return [...options]
  }

  if (options.includes(activeValue)) return [...options]

  return [activeValue, ...options]
}

export function getFontFamilyOptions(activeFontFamily?: string): StringSelectOption[] {
  return getStringSelectOptions(FONT_FAMILIES, activeFontFamily)
}

export function getFontSizeOptions(activeFontSize?: number): number[] {
  return getNumericSelectOptions(FONT_SIZES, activeFontSize)
}

export function getCodeLanguageOptions(activeLanguage?: string): StringSelectOption[] {
  return getStringSelectOptions(CODE_LANGUAGES, activeLanguage)
}

export function getCodeFontSizeOptions(activeFontSize?: number): number[] {
  return getNumericSelectOptions(CODE_FONT_SIZES, activeFontSize)
}

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
  container: { name: 'Container', icon: '▢' },
  parallelogram: { name: 'Parallelogram', icon: '▰' },
  trapezoid: { name: 'Trapezoid', icon: '◿' },
  pentagon: { name: 'Pentagon', icon: '⬠' },
  octagon: { name: 'Octagon', icon: '⯃' },
  plus: { name: 'Plus', icon: '✚' },
  cross: { name: 'Cross', icon: '✖' },
  chevron: { name: 'Chevron', icon: '❯' },
  can: { name: 'Cylinder', icon: '⌶' },
  bevel: { name: 'Bevel', icon: '◳' },
  'flowchart-process': { name: 'Process', icon: '▭' },
  'flowchart-decision': { name: 'Decision', icon: '◇' },
  'flowchart-terminator': { name: 'Terminator', icon: '⬭' },
  'flowchart-alternate': { name: 'Alternate Process', icon: '▢' }
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

/**
 * Convert GradientConfig to SVG gradient attributes.
 * CSS gradients don't work in SVG fill — this produces data for
 * SVG <linearGradient>/<radialGradient> definitions.
 */
export function gradientToSvgAttrs(gradient: GradientConfig, viewBox = 100) {
  const stops = gradient.stops.map(s => ({ offset: `${s.position}%`, stopColor: s.color }))

  if (gradient.type === 'radial') {
    const angleToPos: Record<number, { cx: string; cy: string }> = {
      0: { cx: '50%', cy: '0%' },
      45: { cx: '100%', cy: '0%' },
      90: { cx: '100%', cy: '50%' },
      135: { cx: '0%', cy: '0%' },
      180: { cx: '50%', cy: '100%' },
      225: { cx: '0%', cy: '100%' },
      270: { cx: '0%', cy: '50%' },
      315: { cx: '100%', cy: '100%' }
    }
    const pos = angleToPos[gradient.angle] || { cx: '50%', cy: '50%' }
    return { type: 'radial' as const, stops, cx: pos.cx, cy: pos.cy, r: '70%' }
  }

  const rad = ((gradient.angle - 90) * Math.PI) / 180
  const h = viewBox / 2
  return {
    type: 'linear' as const,
    stops,
    x1: h - Math.cos(rad) * h,
    y1: h - Math.sin(rad) * h,
    x2: h + Math.cos(rad) * h,
    y2: h + Math.sin(rad) * h
  }
}

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
