import { lazy } from 'react'
import type { ArtifactRendererType } from '../../../types/fabric'

export interface RendererProps {
  file: import('../../../types/fabric').ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

// Lazy-loaded to keep initial bundle lean
export const renderers: Record<ArtifactRendererType, React.LazyExoticComponent<React.ComponentType<RendererProps>>> = {
  html: lazy(() => import('./HtmlArtifact')),
  code: lazy(() => import('./CodeArtifact')),
  markdown: lazy(() => import('./DocumentArtifact')),
  document: lazy(() => import('./DocumentArtifact')),
  slide: lazy(() => import('./SlideArtifact')),
  diagram: lazy(() => import('./DiagramArtifact')),
  unknown: lazy(() => import('./DocumentArtifact'))
}
