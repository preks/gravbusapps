// PPTX Editable Parity Matrix.
//
// Machine-readable capability map used by importer and regression suite to
// reason about which OOXML features reach the editor and with what fidelity.
//
// Support levels:
//   exact        - Feature is preserved losslessly into the editor model.
//   approximated - Feature is imported but mapped to a simpler editor primitive.
//   unsupported  - Feature is dropped or skipped; parser emits a warning/info.

export type ParitySupport = 'exact' | 'approximated' | 'unsupported'

export interface ParityCapability {
  id: string
  feature: string
  category:
    | 'text'
    | 'paragraph'
    | 'shape'
    | 'image'
    | 'group'
    | 'connector'
    | 'table'
    | 'chart'
    | 'media'
    | 'layout'
    | 'master'
    | 'theme'
    | 'notes'
    | 'transition'
    | 'animation'
    | 'background'
    | 'comments'
    | 'deck'
    | 'authoring'
    | 'effects'
  support: ParitySupport
  notes?: string
  parserMessageKey?: string
  /**
   * Product-facing marker: does the current Shape Parity Roadmap explicitly
   * commit to driving this capability, or is it tracked as out-of-scope
   * backlog? Keeps planning discussions honest and lets the regression
   * suite distinguish "known gap, covered by roadmap" from "known gap,
   * intentionally deferred".
   */
  coveredByRoadmap?: boolean
}

/**
 * Source-of-truth capability matrix for the PPTX pipeline.
 * Keep this file small and focused: tests and tooling should read it,
 * importer implementations must stay consistent with the declared support.
 */
export const PPTX_PARITY_MATRIX: ParityCapability[] = [
  { id: 'text-plain', feature: 'Plain text in shapes and placeholders', category: 'text', support: 'exact' },
  {
    id: 'text-rich-runs',
    feature: 'Rich text runs (per-run bold/italic/color/size)',
    category: 'text',
    support: 'approximated',
    notes: 'Imported as paragraphs when available, still limited per-box in legacy editor path.'
  },
  { id: 'text-hyperlinks', feature: 'Hyperlinks on text runs', category: 'text', support: 'exact' },
  {
    id: 'text-vertical-align',
    feature: 'Vertical alignment in text box',
    category: 'text',
    support: 'approximated',
    notes: 'Mapped to box-level vertical alignment.'
  },
  {
    id: 'text-caps',
    feature: 'Run case transformation via <a:rPr cap="all|small"> (uppercase / small-caps)',
    category: 'text',
    support: 'exact',
    notes:
      'Preserved as RichTextRun.textTransform and TextElement.textTransform; rendered via CSS text-transform/font-variant so content keeps original casing.'
  },
  {
    id: 'text-autofit',
    feature: 'Text-body autofit <a:normAutofit fontScale/lnSpcReduction>',
    category: 'text',
    support: 'approximated',
    notes:
      'Font-scale is applied to imported run sizes so placeholders match the size PowerPoint rendered; line-space reduction is not yet re-applied.'
  },
  {
    id: 'text-gradient-fill',
    feature: 'Gradient fill on text runs (`<a:gradFill>` in `<a:rPr>` / `defRPr`)',
    category: 'text',
    support: 'approximated',
    coveredByRoadmap: true,
    notes:
      "The editor paints text with a single color, so we collapse the gradient to its most opaque stop (preferring the one nearest 50 % position). This matches the 'bg1@67% → bg1 → bg1@67%' fade-in/out pattern used by slide 1 of the Enterprise AI deck; true multi-color gradient text would need background-clip:text plumbing in the renderer."
  },
  {
    id: 'text-inherited-defaults',
    feature: 'Placeholder text defaults inherited from master <p:txStyles> and layout/master <a:lstStyle>',
    category: 'text',
    support: 'exact',
    notes:
      'Slide runs with no explicit sz/typeface/color/cap/bold/italic fall back through layout placeholder → master placeholder → master titleStyle/bodyStyle/otherStyle by level. Fixes titles that appear tiny because their size is only declared on the master.'
  },
  { id: 'paragraph-alignment', feature: 'Paragraph horizontal alignment', category: 'paragraph', support: 'exact' },
  {
    id: 'paragraph-bullets',
    feature: 'Bulleted lists with indentation level',
    category: 'paragraph',
    support: 'approximated',
    notes: 'Preserved in paragraphs metadata; rendering depends on editor upgrade.'
  },
  { id: 'paragraph-numbering', feature: 'Auto-numbered lists', category: 'paragraph', support: 'approximated' },
  {
    id: 'paragraph-line-spacing',
    feature: 'Line spacing per paragraph',
    category: 'paragraph',
    support: 'approximated',
    notes: 'Only box-level line height is currently applied.'
  },
  {
    id: 'shape-preset-core',
    feature: 'Core preset geometries (rect, ellipse, triangle, arrows, star, diamond)',
    category: 'shape',
    support: 'exact'
  },
  {
    id: 'shape-preset-extended',
    feature:
      'Extended preset geometries (parallelogram, trapezoid, chevron, callouts, flowchart shapes, can, bevel, plus/cross, pentagon, octagon)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true,
    notes:
      'Imported with OOXML preset id + adjustment values in ShapeElement.importMeta; rendered via preset-aware SVG paths on canvas/export/thumbnails. Falls back to the nearest editor shape when a preset has no dedicated renderer.',
    parserMessageKey: 'parser-shape-unsupported'
  },
  {
    id: 'shape-preset-block-arrows',
    feature: 'Block arrows library (bent/curved/u-turn/circular/quad/left-right, striped, swoosh, arrow callouts)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true,
    notes:
      'Dedicated PresetRenderer for every block-arrow preset. Adjustments drive body thickness and arrow-head depth.'
  },
  {
    id: 'shape-preset-equation',
    feature: 'Equation shapes (mathPlus / mathMinus / mathMultiply / mathDivide / mathEqual / mathNotEqual)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'shape-preset-flowchart-extended',
    feature:
      'Extended flowchart family (input/output, document, multidocument, connector, punched card/tape, preparation, manual input/op, internal/stored data, delay, display, predefined process, magnetic disk, offpage, summing junction, or)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'shape-preset-stars-banners',
    feature:
      'Stars and banners (star4/6/7/8/10/12/16/24/32, ribbon, ribbon2, verticalScroll, horizontalScroll, wave, doubleWave)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'shape-preset-basic-curved',
    feature:
      'Basic shapes with curved geometry (heart, sun, moon, cloud, lightningBolt, smileyFace, teardrop, pie, chord, donut, arc, noSmoking, frame, halfFrame, corner, diagStripe, brackets, braces, heptagon, decagon, dodecagon)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'shape-preset-callouts-extended',
    feature: 'Extended callouts (cloudCallout, lineCallout1/2/3, accentCallout1/2/3)',
    category: 'shape',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'shape-custom-geometry',
    feature: 'Custom geometry (a:custGeom)',
    category: 'shape',
    support: 'approximated',
    notes:
      'Paths normalised into a [0..1] SVG d string on ShapeElement.importMeta.custGeomPath and rendered with preserveAspectRatio=none. Exotic commands (arcTo) are simplified.'
  },
  {
    id: 'shape-geometry-adjustments',
    feature: 'Preset geometry adjustment values (<a:avLst>) and flip flags',
    category: 'shape',
    support: 'approximated',
    notes:
      'Per-preset adjustments (corner radius, arrow head ratio, chevron notch, ...) are kept on ShapeElement.importMeta.adjustments and consumed by preset-aware renderers. flipH/flipV are honoured by both rendering and PPTX export.'
  },
  { id: 'shape-fill-solid', feature: 'Solid fill on shapes', category: 'shape', support: 'exact' },
  { id: 'shape-fill-gradient', feature: 'Gradient fill on shapes', category: 'shape', support: 'exact' },
  {
    id: 'shape-fill-picture',
    feature: 'Picture fill on shapes',
    category: 'shape',
    support: 'approximated',
    notes:
      'Rasterised picture fills fall back to the theme accent color with a parser warning; the shape stays visible and keeps its other styling.',
    parserMessageKey: 'parser-shape-picture-fill-unsupported'
  },
  {
    id: 'shape-fill-inheritance',
    feature: 'Fill/line inheritance via <a:fillRef>/<a:lnRef> and placeholder layout/master fallback',
    category: 'shape',
    support: 'approximated',
    notes:
      'Shared shapeStyleResolver consumes theme/preset/system/scheme colors with full OOXML color transforms (tint/shade/alpha/lumMod/lumOff/satMod/hueMod/red/green/blue/gray/comp/inv/gamma). Placeholder slides inherit missing spPr fill/line/geometry/style from the matching layout/master entry.'
  },
  { id: 'shape-stroke', feature: 'Stroke color/width/dash', category: 'shape', support: 'exact' },
  {
    id: 'shape-in-shape-text',
    feature: 'Autoshave (preset/custom geom) with in-shape <p:txBody> text',
    category: 'shape',
    support: 'exact',
    notes:
      'Single ShapeElement with shapeText (rich when available). Plain text boxes without prst/cust still import as TextElement.'
  },
  { id: 'image-embedded', feature: 'Embedded raster images', category: 'image', support: 'exact' },
  { id: 'image-linked', feature: 'Linked (external) images', category: 'image', support: 'unsupported' },
  {
    id: 'image-clip-shape',
    feature: 'Image cropped to shape mask',
    category: 'image',
    support: 'approximated',
    notes: 'Rendered as image rectangle.'
  },
  {
    id: 'image-srcRect-crop',
    feature: 'Image crop via <a:srcRect> (left/top/right/bottom)',
    category: 'image',
    support: 'approximated',
    notes: 'Crop preserved on ImageElement.cropRect and applied via CSS inset clip.'
  },
  {
    id: 'image-metafile-decode',
    feature: 'EMF/WMF metafile images',
    category: 'image',
    support: 'approximated',
    notes:
      'Browsers cannot render metafiles natively. Resolution order: (1) prefer the <asvg:svgBlip> SVG sibling that PowerPoint 2016+ authors alongside the raster fallback, (2) extract an embedded PNG/JPEG/BMP/DIB bitmap from the metafile if present, (3) render the GDI records to SVG via WMFJS/EMFJS (rtf.js, lazy-loaded) for older WMFs and third-party vector content, (4) fall back to a neutral placeholder that preserves the bounding box. Rendered SVGs are displayed but not yet editable as vectors. The import flow does not emit a user-visible warning for the placeholder case.'
  },
  {
    id: 'group-flatten',
    feature: 'Grouped shapes flattened into children',
    category: 'group',
    support: 'approximated',
    parserMessageKey: 'parser-group-flattened'
  },
  {
    id: 'group-transform-composition',
    feature: 'Nested group scale/rotation/flip composition',
    category: 'group',
    support: 'approximated',
    notes:
      'Group xfrm scale, rot (OOXML 60000ths), flipH, flipV are composed onto child elements during flattening. Rotations are applied around the group center and composed with any existing child rotation.'
  },
  {
    id: 'group-preserve-hierarchy',
    feature: 'Preserved group hierarchy with nested transform',
    category: 'group',
    support: 'approximated',
    coveredByRoadmap: true,
    notes:
      'Editor supports persistent group/ungroup via Ctrl+G / Ctrl+Shift+G and shapeOperations.groupElements. Imports still flatten to children by default; lossless group round-trip through PPTX is a future milestone.'
  },
  {
    id: 'connector-straight',
    feature: 'Straight connectors (p:cxnSp)',
    category: 'connector',
    support: 'approximated',
    notes: 'Imported as connector with endpoints, no endpoint binding.'
  },
  { id: 'connector-elbow', feature: 'Elbow/bent connectors', category: 'connector', support: 'approximated' },
  {
    id: 'connector-binding',
    feature: 'Endpoint-to-shape binding',
    category: 'connector',
    support: 'approximated',
    coveredByRoadmap: true,
    notes:
      'ConnectorElement carries startBinding/endBinding and SlideEditor re-snaps endpoints via refreshConnectorFromBindings when bound shapes move/resize. PPTX import still emits unbound connectors; interactive binding authoring UX is delivered via the property panel today.'
  },
  {
    id: 'table-basic',
    feature: 'Tables with rows/cols',
    category: 'table',
    support: 'approximated',
    notes: 'Imported as string grid with global styling.'
  },
  { id: 'table-merged-cells', feature: 'Merged (span) cells', category: 'table', support: 'unsupported' },
  {
    id: 'table-per-cell-style',
    feature: 'Per-cell fill/borders/text styling',
    category: 'table',
    support: 'unsupported'
  },
  {
    id: 'chart-core',
    feature: 'Core charts (bar, line, pie, area, radar, doughnut)',
    category: 'chart',
    support: 'approximated'
  },
  {
    id: 'chart-unsupported',
    feature: 'Scatter, bubble, stock, surface, ofPie charts',
    category: 'chart',
    support: 'unsupported',
    parserMessageKey: 'parser-chart-unsupported'
  },
  {
    id: 'chart-data-labels',
    feature: 'Data labels and custom number formats',
    category: 'chart',
    support: 'unsupported'
  },
  { id: 'media-video', feature: 'Embedded video', category: 'media', support: 'unsupported' },
  { id: 'media-audio', feature: 'Embedded audio', category: 'media', support: 'unsupported' },
  {
    id: 'layout-inheritance',
    feature: 'Slide layout inheritance of non-placeholder shapes',
    category: 'layout',
    support: 'approximated'
  },
  {
    id: 'master-inheritance',
    feature: 'Slide master inheritance of non-placeholder shapes',
    category: 'master',
    support: 'approximated'
  },
  {
    id: 'placeholder-resolution',
    feature: 'Placeholder fallback text/position from layout/master',
    category: 'layout',
    support: 'approximated',
    notes:
      'Slide placeholders inherit content, position, size, and font color from matching layout/master placeholders when missing.'
  },
  { id: 'theme-colors', feature: 'Theme color scheme resolution', category: 'theme', support: 'exact' },
  { id: 'theme-fonts', feature: 'Theme major/minor font resolution', category: 'theme', support: 'exact' },
  {
    id: 'deck-slide-size',
    feature: 'Deck canvas size (<p:sldSz> widescreen / 4:3 / A4 / custom)',
    category: 'deck',
    support: 'exact',
    notes:
      'EMU dimensions converted to pixels and threaded through every renderer (editor, presenter, thumbnail, export).',
    parserMessageKey: 'parser-slide-size-detected'
  },
  {
    id: 'notes-text',
    feature: 'Speaker notes text',
    category: 'notes',
    support: 'approximated',
    notes: 'Rich formatting in notes is flattened to plain text.'
  },
  {
    id: 'transition-core',
    feature: 'Core transitions (fade, push, zoom, cube, dissolve)',
    category: 'transition',
    support: 'approximated',
    parserMessageKey: 'parser-transition-unsupported'
  },
  {
    id: 'animation',
    feature: 'Element entrance/emphasis/exit animations',
    category: 'animation',
    support: 'unsupported'
  },
  { id: 'background-solid', feature: 'Solid-color slide background', category: 'background', support: 'exact' },
  { id: 'background-gradient', feature: 'Gradient slide background', category: 'background', support: 'exact' },
  { id: 'background-image', feature: 'Image slide background', category: 'background', support: 'exact' },
  { id: 'background-pattern', feature: 'Pattern slide background', category: 'background', support: 'unsupported' },
  { id: 'comments', feature: 'Slide comments', category: 'comments', support: 'unsupported' },

  // --- Authoring capabilities tracked by the Shape Parity Roadmap ---
  {
    id: 'authoring-shape-palette',
    feature: 'Native insert palette with parallelogram/trapezoid/flowchart/callout families',
    category: 'authoring',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'authoring-connector-insert',
    feature: 'Native connector authoring (straight/elbow/curved)',
    category: 'authoring',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'authoring-shape-text-inline',
    feature: 'First-class inline editing for shape labels (double-click, shared text stack)',
    category: 'authoring',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'authoring-arrange',
    feature: 'Align / distribute / flip / group commands for multi-selection',
    category: 'authoring',
    support: 'exact',
    coveredByRoadmap: true
  },
  {
    id: 'authoring-shape-adjustments',
    feature: 'User-editable preset adjustment sliders',
    category: 'authoring',
    support: 'exact',
    coveredByRoadmap: true
  },

  // --- Visual effects tracked separately from import fidelity ---
  {
    id: 'effects-outer-shadow',
    feature: 'Outer drop shadow on shapes',
    category: 'effects',
    support: 'approximated',
    coveredByRoadmap: true,
    notes:
      'Rendered via CSS drop-shadow on canvas using the `a:outerShdw` `blurRad`/`dist`/`dir`/color, which is enough to recover card elevation for decks that rely on subtle shadows (e.g. `roundRect noFill + outerShdw blur=32 dist=16 alpha=10%`).'
  },
  {
    id: 'effects-inner-shadow',
    feature: 'Inner drop shadow on shapes',
    category: 'effects',
    support: 'approximated',
    coveredByRoadmap: true,
    notes:
      'Approximated with a second CSS drop-shadow layer — CSS has no native inner shadow filter, so deep/strong inner shadows may read softer than PowerPoint.'
  },
  {
    id: 'effects-glow',
    feature: 'Outer glow on shapes',
    category: 'effects',
    support: 'approximated',
    coveredByRoadmap: true,
    notes: 'Rendered via CSS drop-shadow on canvas; not yet serialised to PPTX.'
  },
  {
    id: 'effects-reflection',
    feature: 'Shape reflection',
    category: 'effects',
    support: 'approximated',
    coveredByRoadmap: true,
    notes: 'Rendered as mirrored overlay on canvas; not yet serialised to PPTX.'
  },
  {
    id: 'effects-soft-edges',
    feature: 'Soft-edge blur on shape silhouette',
    category: 'effects',
    support: 'approximated',
    coveredByRoadmap: true,
    notes: 'Rendered via CSS blur filter on canvas; not yet serialised to PPTX.'
  },
  {
    id: 'effects-bevel-3d',
    feature: 'Bevel / 3D shape effects',
    category: 'effects',
    support: 'unsupported',
    coveredByRoadmap: false,
    notes: 'Explicitly deferred by the Shape Parity Roadmap.'
  },
  {
    id: 'shape-merge-operations',
    feature: 'Merge Shapes (union / subtract / intersect / fragment)',
    category: 'shape',
    support: 'unsupported',
    coveredByRoadmap: false,
    notes: 'Explicitly deferred — requires a different geometry pipeline.'
  },
  {
    id: 'shape-freeform-edit-points',
    feature: 'Freeform pen drawing and vector edit-points',
    category: 'shape',
    support: 'unsupported',
    coveredByRoadmap: false,
    notes: 'Explicitly deferred by the Shape Parity Roadmap.'
  },
  {
    id: 'text-warp-on-path',
    feature: 'WordArt text warp and text-on-path',
    category: 'text',
    support: 'unsupported',
    coveredByRoadmap: false,
    notes: 'Explicitly deferred by the Shape Parity Roadmap.'
  }
]

/**
 * Acceptance thresholds used by the regression suite to gate releases.
 * Each threshold is a minimum expected ratio of exact-or-approximated
 * capabilities for the relevant deck archetype.
 */
export interface DeckArchetypeThreshold {
  id: string
  description: string
  fixtureHint: string
  minExactRatio: number
  minSupportedRatio: number
  requiredCapabilities: string[]
}

export const DECK_ARCHETYPES: DeckArchetypeThreshold[] = [
  {
    id: 'simple-title-deck',
    description: 'Title + bullet list decks with theme colors and fonts.',
    fixtureHint: 'simple-title.pptx',
    minExactRatio: 0.7,
    minSupportedRatio: 0.95,
    requiredCapabilities: ['text-plain', 'paragraph-alignment', 'theme-colors', 'background-solid']
  },
  {
    id: 'branded-master-deck',
    description: 'Branded decks relying on custom slide masters and layouts.',
    fixtureHint: 'branded-master.pptx',
    minExactRatio: 0.55,
    minSupportedRatio: 0.85,
    requiredCapabilities: ['layout-inheritance', 'master-inheritance', 'theme-colors', 'image-embedded']
  },
  {
    id: 'chart-heavy-deck',
    description: 'Decks dominated by bar/line/pie charts with legends and series.',
    fixtureHint: 'chart-heavy.pptx',
    minExactRatio: 0.4,
    minSupportedRatio: 0.8,
    requiredCapabilities: ['chart-core', 'text-plain']
  },
  {
    id: 'diagram-deck',
    description: 'Diagram-style decks with grouped shapes and connectors.',
    fixtureHint: 'diagram.pptx',
    minExactRatio: 0.35,
    minSupportedRatio: 0.7,
    requiredCapabilities: ['shape-preset-core', 'connector-straight']
  },
  {
    id: 'table-heavy-deck',
    description: 'Decks with dense tables and merged cells.',
    fixtureHint: 'table-heavy.pptx',
    minExactRatio: 0.3,
    minSupportedRatio: 0.65,
    requiredCapabilities: ['table-basic']
  },
  {
    id: 'media-rich-deck',
    description: 'Decks with many images, optional video/audio placeholders.',
    fixtureHint: 'media-rich.pptx',
    minExactRatio: 0.45,
    minSupportedRatio: 0.75,
    requiredCapabilities: ['image-embedded', 'background-image']
  }
]

export function getCapability(id: string): ParityCapability | undefined {
  return PPTX_PARITY_MATRIX.find(cap => cap.id === id)
}

export function getCapabilitiesByCategory(category: ParityCapability['category']): ParityCapability[] {
  return PPTX_PARITY_MATRIX.filter(cap => cap.category === category)
}

export function summarizeParity(): {
  total: number
  exact: number
  approximated: number
  unsupported: number
} {
  const total = PPTX_PARITY_MATRIX.length
  const exact = PPTX_PARITY_MATRIX.filter(c => c.support === 'exact').length
  const approximated = PPTX_PARITY_MATRIX.filter(c => c.support === 'approximated').length
  const unsupported = PPTX_PARITY_MATRIX.filter(c => c.support === 'unsupported').length
  return { total, exact, approximated, unsupported }
}
