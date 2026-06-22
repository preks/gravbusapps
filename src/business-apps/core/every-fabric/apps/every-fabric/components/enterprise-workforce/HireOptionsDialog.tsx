// Chooser shown when the operator clicks "Hire".
//
// Two paths: browse the marketplace of ready-made agents, or create a new
// agent from scratch using the existing dialog.

import { CaretRightIcon, PlusCircleIcon, StorefrontIcon, XIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import translations from '../../_i18n'

interface HireOptionsDialogProps {
  open: boolean
  onClose: () => void
  onChooseMarketplace: () => void
  onChooseCreate: () => void
}

interface OptionCardProps {
  icon: Icon
  title: string
  description: string
  onClick: () => void
  testId: string
}

const OptionCard: React.FC<OptionCardProps> = ({ icon: IconComponent, title, description, onClick, testId }) => (
  <button
    type="button"
    onClick={onClick}
    className="gba:group gba:flex gba:w-full gba:items-center gba:gap-4 gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:p-4 gba:text-left gba:transition-colors gba:hover:border-foreground/30 gba:hover:bg-muted/30"
    data-testid={testId}
  >
    <div className="gba:flex gba:h-12 gba:w-12 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
      <IconComponent className="gba:h-7 gba:w-7" weight="duotone" />
    </div>
    <div className="gba:min-w-0 gba:flex-1">
      <p className="gba:text-sm gba:font-semibold gba:text-foreground">{title}</p>
      <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{description}</p>
    </div>
    <CaretRightIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground gba:transition-transform gba:group-hover:translate-x-0.5" />
  </button>
)

export const HireOptionsDialog: React.FC<HireOptionsDialogProps> = ({
  open,
  onClose,
  onChooseMarketplace,
  onChooseCreate
}) => {
  const { t } = useTranslation(translations)
  if (!open) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="hire-options-dialog"
    >
      <div className="gba:flex gba:w-full gba:max-w-md gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{t('hire-options-title')}</h2>
            <p className="gba:text-xs gba:text-muted-foreground">{t('hire-options-subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            aria-label={t('action-close')}
            data-testid="hire-options-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-3 gba:px-5 gba:py-4">
          <OptionCard
            icon={StorefrontIcon}
            title={t('hire-options-marketplace-title')}
            description={t('hire-options-marketplace-description')}
            onClick={onChooseMarketplace}
            testId="hire-options-marketplace"
          />
          <OptionCard
            icon={PlusCircleIcon}
            title={t('hire-options-create-title')}
            description={t('hire-options-create-description')}
            onClick={onChooseCreate}
            testId="hire-options-create"
          />
        </div>
      </div>
    </div>
  )
}
