import type { ArtifactRendererType } from '../../../types/fabric'
import HtmlArtifactComponent from './HtmlArtifact'
import CodeArtifactComponent from './CodeArtifact'
import DocumentArtifactComponent from './DocumentArtifact'
import SlideArtifactComponent from './SlideArtifact'
import DiagramArtifactComponent from './DiagramArtifact'
import ChartArtifactComponent from './ChartArtifact'
import TableArtifactComponent from './TableArtifact'
import AppPreviewArtifactComponent from './AppPreviewArtifact'

export interface RendererProps {
  file: import('../../../types/fabric').ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

/**
 * Artifact renderers - uses regular imports instead of lazy loading.
 *
 * Note: We use direct imports (not React.lazy) to avoid code splitting into chunks.
 * The remote component loader doesn't support chunk resolution for dynamically loaded screens,
 * so all code must be inlined into the main bundle.
 */
export const renderers: Record<ArtifactRendererType, React.ComponentType<RendererProps>> = {
  html: HtmlArtifactComponent,
  code: CodeArtifactComponent,
  markdown: DocumentArtifactComponent,
  document: DocumentArtifactComponent,
  slide: SlideArtifactComponent,
  chart: ChartArtifactComponent,
  table: TableArtifactComponent,
  diagram: DiagramArtifactComponent,
  'app-preview': AppPreviewArtifactComponent,
  unknown: DocumentArtifactComponent
}
