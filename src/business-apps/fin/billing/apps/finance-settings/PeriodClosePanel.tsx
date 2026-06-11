import React, { useCallback, useEffect, useState } from 'react'
import { Card, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../../common/_i18n'
import {
  closeReportingPeriod,
  financeAdminEnabled,
  listReportingPeriods,
  reopenReportingPeriod,
  type ReportingPeriod
} from '../../common/network/financeAdminClient'

interface PeriodClosePanelProps {
  context: BusinessAppContextProps
  canManage: boolean
}

const PERIOD_PATTERN = /^\d{4}-\d{2}$/

export const PeriodClosePanel: React.FC<PeriodClosePanelProps> = ({ context, canManage }) => {
  const { t } = useTranslation(billingTranslations)
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [periodKey, setPeriodKey] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!context.accessToken || !financeAdminEnabled()) return
    try {
      setPeriods(await listReportingPeriods(context.accessToken))
    } catch {
      // Keep the panel usable even if the list cannot be loaded.
    }
  }, [context.accessToken])

  useEffect(() => {
    load()
  }, [load])

  const handleClose = async () => {
    if (!context.accessToken || !PERIOD_PATTERN.test(periodKey)) {
      toast.error(t('billing-period-close-key-label'))
      return
    }
    setBusy(true)
    try {
      await closeReportingPeriod(context.accessToken, periodKey)
      toast.success(t('billing-period-close-success'))
      setPeriodKey('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close period')
    } finally {
      setBusy(false)
    }
  }

  const handleReopen = async (key: string) => {
    if (!context.accessToken) return
    setBusy(true)
    try {
      await reopenReportingPeriod(context.accessToken, key)
      toast.success(t('billing-period-reopen-success'))
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reopen period')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="gba:p-6 gba:flex gba:flex-col gba:gap-4" data-testid="settings-period-close">
      <div>
        <h2 className="gba:text-base gba:font-semibold">{t('billing-period-close-title')}</h2>
        <p className="gba:text-sm gba:text-muted-foreground">{t('billing-period-close-description')}</p>
      </div>

      {canManage && (
        <div className="gba:flex gba:items-end gba:gap-2 gba:flex-wrap">
          <label className="gba:flex gba:flex-col gba:gap-1 gba:text-sm">
            <span className="gba:text-muted-foreground">{t('billing-period-close-key-label')}</span>
            <input
              type="text"
              value={periodKey}
              placeholder="2026-05"
              onChange={event => setPeriodKey(event.target.value)}
              className="gba:border gba:border-input gba:rounded-md gba:px-3 gba:py-2 gba:text-sm gba:bg-background"
              data-testid="period-close-input"
            />
          </label>
          <Button size="sm" onClick={handleClose} disabled={busy} data-testid="period-close-button">
            {t('billing-period-close-action')}
          </Button>
        </div>
      )}

      {periods.length === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground">{t('billing-period-close-empty')}</p>
      ) : (
        <ul className="gba:flex gba:flex-col gba:gap-2">
          {periods.map(period => (
            <li
              key={`${period.legalEntityId}-${period.periodKey}`}
              className="gba:flex gba:items-center gba:justify-between gba:border-b gba:py-2 gba:text-sm"
            >
              <span className="gba:font-medium">{period.periodKey}</span>
              <Badge variant={period.status === 'CLOSED' ? 'warning' : 'success'}>
                {period.status === 'CLOSED' ? t('billing-period-status-closed') : t('billing-period-status-open')}
              </Badge>
              {canManage && period.status === 'CLOSED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReopen(period.periodKey)}
                  disabled={busy}
                  data-testid={`period-reopen-${period.periodKey}`}
                >
                  {t('billing-period-reopen-action')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
