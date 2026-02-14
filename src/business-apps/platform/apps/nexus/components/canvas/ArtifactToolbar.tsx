import { Button, Badge } from '@newwork/nw-design-system'
import { Save, Copy, FileText, BarChart3, Presentation, Loader2, Check, CloudUpload } from 'lucide-react'
import type { NexusArtifact, ArtifactType } from '../../types/nexus.types'

interface ArtifactToolbarProps {
  artifact: NexusArtifact
  onSave: (targetType: 'document' | 'slides') => void
  onCopy: () => void
  isSaving?: boolean
  saveSuccess?: boolean
  isAutoSaving?: boolean
  hasSavedDocument?: boolean
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
  saveSuccess = false,
  isAutoSaving = false,
  hasSavedDocument = false,
  testId = 'nexus-artifact-toolbar'
}: ArtifactToolbarProps) => {
  const Icon = typeIcons[artifact.type]
  const isComplete = artifact.status === 'complete'

  // Determine save button label and icon
  const getSaveButtonContent = () => {
    if (isSaving) {
      return (
        <>
          <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
          <span className="gba:text-xs gba:font-medium">Saving...</span>
        </>
      )
    }
    if (saveSuccess) {
      return (
        <>
          <Check className="gba:h-3.5 gba:w-3.5" />
          <span className="gba:text-xs gba:font-medium">Saved</span>
        </>
      )
    }
    return (
      <>
        <Save className="gba:h-3.5 gba:w-3.5" />
        <span className="gba:text-xs gba:font-medium">
          {hasSavedDocument ? 'Update' : 'Save to'} {artifact.type === 'slides' ? 'Slides' : 'Documents'}
        </span>
      </>
    )
  }

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-6 gba:py-2.5 gba:border-b gba:border-border gba:bg-card/80"
      data-testid={testId}
    >
      {/* Artifact info */}
      <div className="gba:flex gba:items-center gba:gap-2.5 gba:flex-1 gba:min-w-0">
        <div className="gba:h-7 gba:w-7 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
          <Icon className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
        </div>
        <span className="gba:text-sm gba:font-semibold gba:truncate gba:text-foreground">{artifact.title}</span>
        <Badge variant={isComplete ? 'secondary' : 'outline'} className="gba:text-[10px] gba:flex-shrink-0">
          {artifact.status === 'generating' ? (
            <span className="gba:flex gba:items-center gba:gap-1">
              <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin" />
              Generating
            </span>
          ) : (
            typeLabels[artifact.type]
          )}
        </Badge>

        {/* Persistent "Saved" badge when a document has been created */}
        {hasSavedDocument && isComplete && (
          <Badge variant="success" className="gba:text-[10px] gba:flex-shrink-0" data-testid={`${testId}-saved-badge`}>
            <Check className="gba:h-2.5 gba:w-2.5 gba:mr-0.5" />
            Saved
          </Badge>
        )}

        {/* Autosave indicator */}
        {isAutoSaving && (
          <span
            className="gba:flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground gba:flex-shrink-0"
            data-testid={`${testId}-autosave`}
          >
            <CloudUpload className="gba:h-3 gba:w-3 gba:animate-pulse" />
            Saving...
          </span>
        )}
      </div>

      {/* Actions */}
      {isComplete && (
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-8 gba:gap-1.5 gba:rounded-lg"
            onClick={onCopy}
            data-testid={`${testId}-copy`}
          >
            <Copy className="gba:h-3.5 gba:w-3.5" />
            <span className="gba:text-xs gba:font-medium">Copy</span>
          </Button>

          <Button
            size="sm"
            className={`gba:h-8 gba:gap-1.5 gba:rounded-lg gba:transition-all gba:duration-300 ${
              saveSuccess ? 'gba:bg-success gba:text-success-foreground gba:hover:bg-success' : ''
            }`}
            onClick={() => onSave(artifact.type === 'slides' ? 'slides' : 'document')}
            disabled={isSaving}
            data-testid={`${testId}-save`}
          >
            {getSaveButtonContent()}
          </Button>
        </div>
      )}
    </div>
  )
}
