import React from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ProcessingStateProps {
  readonly testIdPrefix: string
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ testIdPrefix }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:gap-2" data-testid={`${testIdPrefix}-processing`}>
    <Spinner size="lg" />
    <div className="gba:text-sm gba:font-medium">
      {getTranslationFromI18nKeyAndLabel('folderUpload.popup.processing.primary', 'Reading folder…')}
    </div>
    <div className="gba:text-xs gba:text-muted-foreground">
      {getTranslationFromI18nKeyAndLabel(
        'folderUpload.popup.processing.secondary',
        'This can take a moment for large folders.'
      )}
    </div>
  </div>
)
