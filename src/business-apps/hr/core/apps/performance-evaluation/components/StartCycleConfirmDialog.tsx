import React, { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Label,
  Combobox,
  RadioGroup,
  RadioGroupItem,
  useTranslation
} from '@newwork/nw-design-system'
import type { PerformanceCycle } from '../types'
import {
  useOrganizationalUnits,
  type OrganizationalUnit
} from '@/business-apps/hr/core/apps/performance-evaluation/hooks/useOrganizationalUnits'
import translations from '../_i18n'

export type RunForOption = 'self' | 'team'

export interface StartCycleConfirmOptions {
  runFor: RunForOption
  teamIds: string[]
}

interface StartCycleConfirmDialogProps {
  open: boolean
  cycle: PerformanceCycle | null
  accessToken: string
  onConfirm: (options: StartCycleConfirmOptions) => void
  onCancel: () => void
}

export const StartCycleConfirmDialog: React.FC<StartCycleConfirmDialogProps> = ({
  open,
  cycle,
  accessToken,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation(translations)
  const [runFor, setRunFor] = useState<RunForOption>('self')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const { organizationalUnits, loading, error } = useOrganizationalUnits(accessToken, open && runFor === 'team')

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setRunFor('self')
      setSelectedTeamIds([])
    }
  }, [open])

  const handleConfirm = () => {
    onConfirm({ runFor, teamIds: runFor === 'team' ? selectedTeamIds : [] })
  }

  const isConfirmDisabled = runFor === 'team' ? selectedTeamIds.length === 0 || loading : false

  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent data-testid="performance-evaluation-start-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('start-confirm-title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {cycle
              ? t('start-confirm-description-with-cycle', { name: cycle.name })
              : t('start-confirm-description-generic')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-3">
            <Label>{t('start-confirm-run-for-label')}</Label>
            <RadioGroup
              value={runFor}
              onValueChange={(v: string) => setRunFor(v as RunForOption)}
              className="gba:flex gba:flex-col gba:gap-2"
              data-testid="performance-evaluation-run-for"
            >
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <RadioGroupItem value="self" id="run-for-self" />
                <span>{t('start-confirm-run-for-self')}</span>
              </label>
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <RadioGroupItem value="team" id="run-for-team" />
                <span>{t('start-confirm-run-for-team')}</span>
              </label>
            </RadioGroup>
          </div>

          {runFor === 'team' && (
            <div className="gba:space-y-2">
              <Label>{t('start-confirm-select-teams')}</Label>
              <div className="gba:w-full gba:max-w-full">
                <Combobox
                  mode="multiple"
                  value={selectedTeamIds}
                  onValueChange={(ids: string[] | string) => {
                    const next = Array.isArray(ids) ? ids : ids ? [ids] : []
                    setSelectedTeamIds(next)
                  }}
                  options={organizationalUnits.map((unit: OrganizationalUnit) => ({
                    label: unit.name,
                    value: unit.id
                  }))}
                  placeholder={
                    loading
                      ? t('start-confirm-placeholder-loading')
                      : error
                        ? error.message
                        : t('start-confirm-placeholder-teams')
                  }
                  searchPlaceholder={t('start-confirm-search-teams')}
                  emptyText={t('start-confirm-empty-teams')}
                  disabled={loading || Boolean(error)}
                  className="gba:w-full gba:max-w-full gba:h-auto gba:[&_button]:gba:max-w-full gba:[&_button]:gba:min-w-0 gba:[&_button]:gba:overflow-hidden gba:[&_button_span]:gba:truncate gba:[&_button]:gba:h-auto gba:[&_button>div]:gba:flex-wrap gba:[&_button>div]:gba:gap-2"
                />
              </div>
              {error && (
                <p className="gba:text-sm gba:text-destructive" data-testid="performance-evaluation-teams-error">
                  {error.message}
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="performance-evaluation-start-cancel">{t('button-cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            data-testid="performance-evaluation-start-confirm-button"
            disabled={isConfirmDisabled}
          >
            {t('start-confirm-button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
