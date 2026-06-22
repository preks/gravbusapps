import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'

interface WorkforceTabEmptyStateProps {
  icon: PhosphorIcon
  title: string
  description: string
  'data-testid': string
  gotoTestId: string
  onGoToDeployment: () => void
}

export const WorkforceTabEmptyState: React.FC<WorkforceTabEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  'data-testid': dataTestId,
  gotoTestId,
  onGoToDeployment
}) => {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:py-12 gba:px-6 gba:text-center"
      data-testid={dataTestId}
    >
      <Icon className="gba:h-8 gba:w-8 gba:text-muted-foreground gba:mb-3" />
      <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{title}</h3>
      <p className="gba:mt-1 gba:max-w-sm gba:text-sm gba:text-muted-foreground">{description}</p>
      <Button size="sm" className="gba:mt-4" onClick={onGoToDeployment} data-testid={gotoTestId}>
        {t('agents-workforce-empty-goto')}
      </Button>
    </div>
  )
}
