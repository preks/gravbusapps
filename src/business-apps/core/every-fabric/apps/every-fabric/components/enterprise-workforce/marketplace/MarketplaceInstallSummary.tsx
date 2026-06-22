import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckCircleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import React from 'react'
import type { MarketplaceBatchInstallReport } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../../_i18n'

interface MarketplaceInstallSummaryProps {
  open: boolean
  report: MarketplaceBatchInstallReport | null
  onClose: () => void
}

export const MarketplaceInstallSummary: React.FC<MarketplaceInstallSummaryProps> = ({ open, report, onClose }) => {
  const { t } = useTranslation(translations)

  if (!open || !report) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[70] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="marketplace-install-summary"
    >
      <div className="gba:flex gba:max-h-[85vh] gba:w-full gba:max-w-lg gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">
              {t('marketplace-install-summary-title')}
            </h2>
            <p className="gba:text-xs gba:text-muted-foreground">
              {t('marketplace-install-summary-stats', {
                succeeded: report.succeeded,
                failed: report.failed,
                total: report.total
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60"
            aria-label={t('action-close')}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          <ul className="gba:flex gba:flex-col gba:gap-3">
            {report.reports.map(entry => (
              <li
                key={entry.package_id}
                className="gba:rounded-xl gba:border gba:border-border gba:p-3"
                data-testid={`marketplace-install-report-${entry.package_id}`}
              >
                <div className="gba:flex gba:items-start gba:gap-2">
                  {entry.success ? (
                    <CheckCircleIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:text-emerald-600" weight="fill" />
                  ) : (
                    <WarningCircleIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:text-destructive" weight="fill" />
                  )}
                  <div className="gba:min-w-0 gba:flex-1">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground">{entry.package_name}</p>
                    {entry.agent_id ? (
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {t('marketplace-install-summary-agent-id', { agentId: entry.agent_id })}
                      </p>
                    ) : null}
                    {entry.errors.length > 0 ? (
                      <p className="gba:mt-1 gba:text-xs gba:text-destructive">{entry.errors.join('; ')}</p>
                    ) : null}
                    {entry.needs_configuration.length > 0 ? (
                      <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                        {t('marketplace-needs-configuration', { items: entry.needs_configuration.join(', ') })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="gba:flex gba:justify-end gba:border-t gba:border-border/60 gba:px-5 gba:py-3">
          <Button onClick={onClose} data-testid="marketplace-install-summary-close">
            {t('marketplace-done')}
          </Button>
        </div>
      </div>
    </div>
  )
}
