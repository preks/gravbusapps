import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CaretRightIcon } from '@phosphor-icons/react'
import translations from '../../../_i18n'
import { getArtifactIcon } from './artifactIcons'
import type { FinalAnswerArtifact } from './types'

export interface ArtifactsListProps {
  artifacts: FinalAnswerArtifact[]
  onViewArtifact?: (artifactName: string) => void
}

export const ArtifactsList: React.FC<ArtifactsListProps> = ({ artifacts, onViewArtifact }) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:pt-4 gba:space-y-2 gba:min-w-0 gba:max-w-full gba:overflow-hidden">
      {artifacts.map(artifact => (
        <button
          key={artifact.path || artifact.name}
          onClick={() => onViewArtifact?.(artifact.path || artifact.name)}
          className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2.5 gba:text-left gba:hover:bg-muted/40 gba:transition-colors"
          data-testid={`enterprise-agent-final-artifact-${artifact.name}`}
        >
          {getArtifactIcon(artifact.rendererType)}
          <div className="gba:min-w-0 gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{artifact.name}</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              {artifact.rendererType} · {t('renderer-artifact-size-kb', { size: (artifact.size / 1024).toFixed(1) })}
            </p>
          </div>
          <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
        </button>
      ))}
    </div>
  )
}
