import type { ArtifactFile } from '../../../types/fabric'
import CodeArtifact from './CodeArtifact'

export interface DiagramArtifactProps {
  file: ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

/** Diagram source only (no graph renderer); uses the same highlighter as code artifacts. */
function DiagramArtifact({ file, content, viewMode }: Readonly<DiagramArtifactProps>) {
  if (content === null) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-sm gba:text-muted-foreground">
        Loading diagram…
      </div>
    )
  }

  return (
    <div
      className="gba:h-full gba:min-h-0 gba:flex gba:flex-col"
      data-testid="fabric-diagram-artifact"
      data-view-mode={viewMode}
    >
      <CodeArtifact file={file} content={content} viewMode={viewMode} language="mermaid" />
    </div>
  )
}

export default DiagramArtifact
