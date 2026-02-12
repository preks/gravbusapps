import { Button, Badge } from '@newwork/nw-design-system'
import { Save, Copy, FileText, BarChart3, Presentation, Loader2 } from 'lucide-react'
import type { NexusArtifact, ArtifactType } from '../../types/nexus.types'

interface ArtifactToolbarProps {
  artifact: NexusArtifact
  onSave: (targetType: 'document' | 'slides') => void
  onCopy: () => void
  isSaving?: boolean
  testId?: string
}

const typeIcons: Record<ArtifactType, typeof FileText> = {
  document: FileText,
  analysis: BarChart3,
  slides: Presentation
}

const typeLabels: Record<ArtifactType, string> = {
  document: 'Document',
  analysis: 'Analysis',
  slides: 'Presentation'
}

export const ArtifactToolbar = ({
  artifact,
  onSave,
  onCopy,
  isSaving = false,
  testId = 'nexus-artifact-toolbar'
}: ArtifactToolbarProps) => {
  const Icon = typeIcons[artifact.type]

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-6 gba:py-3 gba:border-b gba:border-border gba:bg-card"
      data-testid={testId}
    >
      {/* Artifact info */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
        <Icon className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0" />
        <span className="gba:text-sm gba:font-medium gba:truncate">{artifact.title}</span>
        <Badge
          variant={artifact.status === 'complete' ? 'secondary' : 'outline'}
          className="gba:text-[10px] gba:flex-shrink-0"
        >
          {artifact.status === 'generating' ? (
            <span className="gba:flex gba:items-center gba:gap-1">
              <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin" />
              Generating
            </span>
          ) : (
            typeLabels[artifact.type]
          )}
        </Badge>
      </div>

      {/* Actions */}
      {artifact.status === 'complete' && (
        <div className="gba:flex gba:items-center gba:gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-8 gba:gap-1.5"
            onClick={onCopy}
            data-testid={`${testId}-copy`}
          >
            <Copy className="gba:h-3.5 gba:w-3.5" />
            <span className="gba:text-xs">Copy</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gba:h-8 gba:gap-1.5"
            onClick={() => onSave(artifact.type === 'slides' ? 'slides' : 'document')}
            disabled={isSaving}
            data-testid={`${testId}-save`}
          >
            {isSaving ? (
              <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
            ) : (
              <Save className="gba:h-3.5 gba:w-3.5" />
            )}
            <span className="gba:text-xs">Save to {artifact.type === 'slides' ? 'Slides' : 'Documents'}</span>
          </Button>
        </div>
      )}
    </div>
  )
}
