// Common layout for each config section.
//
// Every section in WorkforceAgentConfigView shares the same visual frame:
// title + description on top, body in the middle, and a footer with a
// dirty indicator + Save / Reset actions. Encapsulating the shell here
// keeps each section focused on its fields and behaviour.

import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckCircleIcon, SpinnerGapIcon, type Icon } from '@phosphor-icons/react'
import React from 'react'
import translations from '../../../_i18n'

interface SectionShellProps {
  id: string
  title: string
  description: string
  /** Optional leading icon in the section header, for scannability. */
  icon?: Icon
  isDirty: boolean
  isSaving: boolean
  isDisabled?: boolean
  onSave: () => void
  onReset: () => void
  children: React.ReactNode
}

export const SectionShell: React.FC<SectionShellProps> = ({
  id,
  title,
  description,
  icon: HeaderIcon,
  isDirty,
  isSaving,
  isDisabled,
  onSave,
  onReset,
  children
}) => {
  const { t } = useTranslation(translations)
  return (
    <section
      data-testid={`workforce-config-section-${id}`}
      className="gba:rounded-2xl gba:border gba:border-border gba:bg-card"
    >
      <header className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:border-b gba:border-border/60 gba:px-5 gba:py-3">
        <div className="gba:flex gba:items-start gba:gap-2.5">
          {HeaderIcon && (
            <HeaderIcon
              className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground"
              weight="duotone"
            />
          )}
          <div>
            <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{title}</h3>
            <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{description}</p>
          </div>
        </div>
        <span
          className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${
            isDirty ? 'gba:bg-amber-50 gba:text-amber-700' : 'gba:bg-emerald-50 gba:text-emerald-700'
          }`}
          data-testid={`workforce-config-section-status-${id}`}
        >
          {isDirty ? (
            t('section-unsaved')
          ) : (
            <>
              <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" /> {t('section-saved')}
            </>
          )}
        </span>
      </header>

      <div className="gba:px-5 gba:py-4">{children}</div>

      <footer className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={!isDirty || isSaving}
          onClick={onReset}
          data-testid={`workforce-config-section-reset-${id}`}
        >
          {t('action-reset')}
        </Button>
        <button
          type="button"
          disabled={!isDirty || isSaving || isDisabled}
          onClick={onSave}
          className="gba:inline-flex gba:h-8 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-3 gba:text-xs gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
          data-testid={`workforce-config-section-save-${id}`}
        >
          {isSaving && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
          {isSaving ? t('section-saving') : t('action-save')}
        </button>
      </footer>
    </section>
  )
}
