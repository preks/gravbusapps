import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { WarningCircle, CheckCircle } from '@phosphor-icons/react'
import type { PerformanceCycle } from '../types'
import { useCycleEvaluationProgress } from '../hooks/useCycleEvaluationProgress'
import { Navigation, buildPlatformUrl, openInNewTab } from '@/common/utils/navigationUtils'
import translations from '../_i18n'

interface CompleteCycleConfirmDialogProps {
  open: boolean
  cycle: PerformanceCycle | null
  accessToken: string
  onConfirm: (cycleId: string) => void
  onCancel: () => void
}

export const CompleteCycleConfirmDialog: React.FC<CompleteCycleConfirmDialogProps> = ({
  open,
  cycle,
  accessToken,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation(translations)
  const { progress, loading } = useCycleEvaluationProgress(accessToken, open ? (cycle?.id ?? null) : null)

  const allDone = progress ? progress.percent === 100 : false

  return (
    <AlertDialog open={open} onOpenChange={openState => !openState && onCancel()}>
      <AlertDialogContent data-testid="complete-cycle-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('complete-confirm-title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {cycle ? t('complete-confirm-description', { name: cycle.name }) : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {loading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-4">
              <Spinner className="gba:h-6 gba:w-6" />
            </div>
          ) : progress ? (
            <>
              <div className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:p-4">
                <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
                  <p className="gba:text-sm gba:font-medium">
                    {t('complete-confirm-progress', {
                      percent: progress.percent,
                      completed: progress.completed,
                      total: progress.total
                    })}
                  </p>
                  <div className="gba:mt-2 gba:h-2 gba:w-full gba:rounded-full gba:bg-muted">
                    <div
                      className="gba:h-2 gba:rounded-full gba:bg-success gba:transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
                <Badge variant={allDone ? 'success' : 'warning'} className="gba:text-sm gba:shrink-0">
                  {progress.percent}%
                </Badge>
              </div>

              {allDone ? (
                <div className="gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:bg-success/10 gba:px-4 gba:py-3">
                  <CheckCircle size={20} className="gba:text-success gba:mt-0.5 gba:shrink-0" weight="fill" />
                  <p className="gba:text-sm gba:text-success">{t('complete-confirm-all-done')}</p>
                </div>
              ) : (
                <div className="gba:flex gba:flex-col gba:gap-1 gba:rounded-lg gba:bg-warning/10 gba:px-4 gba:py-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <WarningCircle size={20} className="gba:text-warning gba:shrink-0" weight="fill" />
                    <p className="gba:text-sm gba:text-warning">{t('complete-confirm-warning')}</p>
                  </div>
                  {cycle && (
                    <Button
                      variant="link"
                      className="gba:h-auto gba:justify-start gba:p-0 gba:pl-7 gba:text-sm gba:text-warning"
                      onClick={() => {
                        const url = buildPlatformUrl(Navigation.HR_PERFORMANCE_TRACKING, { cycleId: cycle.id })
                        openInNewTab(url)
                      }}
                      data-testid="complete-cycle-view-tracking-link"
                    >
                      {t('complete-confirm-view-tracking')}
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="complete-cycle-confirm-cancel">{t('button-cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cycle && onConfirm(cycle.id)}
            data-testid="complete-cycle-confirm-button"
            disabled={loading}
          >
            {t('complete-confirm-button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
