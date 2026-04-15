import { Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { Save, Copy, FileText, BarChart3, Presentation, Loader2, Check } from 'lucide-react'
import type { NexusArtifact, ArtifactType } from '../../types/nexus.types'
import translations from '../../_i18n'

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

const typeLabelKeys: Record<ArtifactType, string> = {
  document: 'artifact-type-document',
  analysis: 'artifact-type-analysis',
  slides: 'artifact-type-slides'
}

export const ArtifactToolbar = ({
  artifact,
  onSave,
  onCopy,
  isSaving = false,
  saveSuccess = false,
  hasSavedDocument = false,
  testId = 'nexus-artifact-toolbar'
}: ArtifactToolbarProps) => {
  const { t } = useTranslation(translations)
  const Icon = typeIcons[artifact.type]
  const isComplete = artifact.status === 'complete'
  const savedInLabel = artifact.type === 'slides' ? t('artifact-saved-in-slides') : t('artifact-saved-in-documents')

  // Determine save button label and icon
  const getSaveButtonContent = () => {
    if (isSaving) {
      return (
        <>
          <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
          <span className="gba:text-xs gba:font-medium">{t('artifact-action-saving')}</span>
        </>
      )
    }
    if (saveSuccess) {
      return (
        <>
          <Check className="gba:h-3.5 gba:w-3.5" />
          <span className="gba:text-xs gba:font-medium">
            {hasSavedDocument ? t('artifact-action-updated') : t('artifact-action-saved')}
          </span>
        </>
      )
    }
    let actionLabel = t('artifact-save-document')

    if (artifact.type === 'slides') {
      actionLabel = hasSavedDocument ? t('artifact-update-slides') : t('artifact-save-slides')
    } else if (hasSavedDocument) {
      actionLabel = t('artifact-update-document')
    }

    return (
      <>
        <Save className="gba:h-3.5 gba:w-3.5" />
        <span className="gba:text-xs gba:font-medium">{actionLabel}</span>
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
              {t('artifact-status-generating')}
            </span>
          ) : (
            t(typeLabelKeys[artifact.type])
          )}
        </Badge>

        {/* Indicates the artifact has been saved to Hub at least once (not the same as autosave) */}
        {hasSavedDocument && isComplete && (
          <Badge
            variant="secondary"
            className="gba:text-[10px] gba:flex-shrink-0"
            data-testid={`${testId}-saved-badge`}
          >
            <FileText className="gba:h-2.5 gba:w-2.5 gba:mr-0.5" />
            {savedInLabel}
          </Badge>
        )}

        {/* Autosave is intentionally silent to avoid implying Hub save */}
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
            <span className="gba:text-xs gba:font-medium">{t('artifact-action-copy')}</span>
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
