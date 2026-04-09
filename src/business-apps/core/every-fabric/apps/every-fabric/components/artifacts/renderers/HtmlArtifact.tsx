import type { ArtifactFile } from '../../../types/fabric'
import CodeArtifact from './CodeArtifact'

export interface HtmlArtifactProps {
  file: ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

const HtmlArtifact: React.FC<HtmlArtifactProps> = ({ file, content, viewMode }) => {
  if (viewMode === 'code' && content !== null) {
    return <CodeArtifact file={file} content={content} viewMode={viewMode} language="html" />
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-muted/25" data-testid="fabric-html-artifact">
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/70 gba:bg-background/95 gba:backdrop-blur-md gba:shrink-0">
        <div className="gba:min-w-0">
          <p className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">
            {file.name.replace(/\.html?$/i, '')}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground">Rendered HTML preview</p>
        </div>
      </div>
      <iframe
        src={file.downloadUrl}
        title={file.name}
        sandbox="allow-scripts allow-same-origin"
        className="gba:flex-1 gba:w-full gba:border-0 gba:bg-white"
        data-testid="fabric-html-iframe"
      />
    </div>
  )
}

export default HtmlArtifact
