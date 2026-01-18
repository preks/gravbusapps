import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import translations from '@/components/_i18n'

interface SubmissionDetailsCardProps {
  formattedDate?: string
  displayStatus: string
  dataTestId: string
}

/**
 * Card displaying submission details (date and status)
 */
export const SubmissionDetailsCard: React.FC<SubmissionDetailsCardProps> = ({
  formattedDate,
  displayStatus,
  dataTestId
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3 gba:mt-4">
      {formattedDate && (
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('pending-submitted-label')}:</span>
          <span className="gba:text-sm gba:text-foreground gba:text-right" data-testid={`${dataTestId}-date`}>
            {formattedDate}
          </span>
        </div>
      )}

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('pending-status-label')}:</span>
        <Badge variant="secondary" className="gba:text-xs" data-testid={`${dataTestId}-status-badge`}>
          {displayStatus}
        </Badge>
      </div>
    </div>
  )
}
