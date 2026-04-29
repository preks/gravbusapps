// Intermediate OOXML types decoupling raw XML extraction from SlideData model.

export type OoxmlCap = 'all' | 'small' | 'none'

export interface OoxmlTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontSize?: number
  fontFamily?: string
  color?: string
  hyperlinkRelId?: string
  /**
   * OOXML `cap` attribute on rPr/defRPr/endParaRPr. Renders-as-uppercase
   * (or small-caps) without mutating the stored text.
   */
  cap?: OoxmlCap
}

export interface OoxmlParagraph {
  runs: OoxmlTextRun[]
  alignment?: 'l' | 'ctr' | 'r' | 'just'
  level?: number
  bulletType?: 'none' | 'bullet' | 'number'
  bulletChar?: string
  lineHeight?: number
  spaceBefore?: number
  spaceAfter?: number
  defaultFontSize?: number
  defaultColor?: string
}

export interface OoxmlTransform {
  x: number
  y: number
  cx: number
  cy: number
  rotation?: number
}

export interface OoxmlTheme {
  colors: Map<string, string>
  majorFont: string
  minorFont: string
  /**
   * Raw `a:fillStyleLst` child elements from the theme's `a:fmtScheme`, in
   * OOXML order. `fmtFillStyles[0]` = subtle (idx=1), `[1]` = moderate
   * (idx=2), `[2]` = intense (idx=3). Stored as DOM nodes so we can do
   * per-shape phClr substitution without re-parsing the theme XML.
   */
  fmtFillStyles?: Element[]
  /** Same structure as {@link fmtFillStyles} but for `a:lnStyleLst` line references. */
  fmtLineStyles?: Element[]
  /**
   * Raw `a:bgFillStyleLst` entries for completeness; background fills are
   * rarely referenced from shapes but are kept for future parity.
   */
  fmtBgFillStyles?: Element[]
}

export interface SlideRelationships {
  images: Map<string, string>
  videos?: Map<string, string>
  hyperlinks: Map<string, string>
  notesSlidePath?: string
  chartPaths: Map<string, string>
  layoutPath?: string
}
