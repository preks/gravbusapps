import CodeArtifactComponent from './CodeArtifact'
import type { RendererProps } from './index'

const AppPreviewArtifact: React.FC<RendererProps> = props => (
  <div className="gba:h-full gba:flex gba:flex-col">
    <div className="gba:border-b gba:border-border gba:bg-muted/30 gba:px-4 gba:py-2">
      <p className="gba:text-xs gba:text-muted-foreground">
        Generated app preview source. Interactive execution is disabled in the artifact viewer; review or download the
        source.
      </p>
    </div>
    <div className="gba:flex-1 gba:min-h-0">
      <CodeArtifactComponent {...props} viewMode="code" />
    </div>
  </div>
)

export default AppPreviewArtifact
