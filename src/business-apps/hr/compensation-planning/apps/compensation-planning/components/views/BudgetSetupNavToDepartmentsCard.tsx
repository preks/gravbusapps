import React from 'react'
import { Button, Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { CaretRightIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'

export interface BudgetSetupNavToDepartmentsCardProps {
  onOpen: () => void
}

export function BudgetSetupNavToDepartmentsCard({ onOpen }: Readonly<BudgetSetupNavToDepartmentsCardProps>) {
  const { t } = useTranslation(translations)

  return (
    <Card className="gba:w-full" data-testid="budget-setup-departments-nav-card">
      <CardContent className="gba:p-4">
        <Button
          type="button"
          variant="outline"
          className="gba:h-auto gba:w-full gba:justify-between gba:gap-3 gba:py-3 gba:text-left"
          onClick={onOpen}
          data-testid="budget-setup-open-departments"
        >
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-semibold gba:text-foreground">{t('budget-setup-departments-nav-title')}</div>
            <div className="gba:mt-1 gba:text-sm gba:font-normal gba:text-muted-foreground">
              {t('budget-setup-departments-nav-description')}
            </div>
          </div>
          <CaretRightIcon className="gba:size-5 gba:flex-shrink-0 gba:text-muted-foreground" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  )
}
