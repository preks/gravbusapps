// Intermediate OOXML types decoupling raw XML extraction from SlideData model.

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
}

export interface OoxmlParagraph {
  runs: OoxmlTextRun[]
  alignment?: 'l' | 'ctr' | 'r' | 'just'
  level?: number
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
}

export interface SlideRelationships {
  images: Map<string, string>
  hyperlinks: Map<string, string>
  notesSlidePath?: string
  chartPaths: Map<string, string>
  layoutPath?: string
}
