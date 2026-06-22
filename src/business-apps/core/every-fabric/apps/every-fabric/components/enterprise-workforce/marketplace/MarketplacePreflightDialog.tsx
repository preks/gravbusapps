import { Button, useTranslation } from '@newwork/nw-design-system'
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import React from 'react'
import type { MarketplacePreflightReport } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../../_i18n'

interface MarketplacePreflightDialogProps {
  open: boolean
  reports: MarketplacePreflightReport[]
  isBusy: boolean
  onClose: () => void
  onConfirmInstall: () => void
}

export const MarketplacePreflightDialog: React.FC<MarketplacePreflightDialogProps> = ({
  open,
  reports,
  isBusy,
  onClose,
  onConfirmInstall
}) => {
  const { t } = useTranslation(translations)

  if (!open || reports.length === 0) return null

  const allReady = reports.every(report => report.ready)
  const issueCount = reports.reduce((count, report) => count + report.issues.length, 0)

  let confirmLabel = t('marketplace-preflight-install-anyway')
  if (isBusy) {
    confirmLabel = t('marketplace-installing')
  } else if (allReady) {
    confirmLabel = t('marketplace-preflight-install-now')
  }

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[68] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="marketplace-preflight-dialog"
    >
      <div className="gba:flex gba:max-h-[85vh] gba:w-full gba:max-w-lg gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">
              {allReady ? t('marketplace-preflight-title-ready') : t('marketplace-preflight-title-check')}
            </h2>
            <p className="gba:text-xs gba:text-muted-foreground">
              {allReady
                ? t('marketplace-preflight-all-ready')
                : t('marketplace-preflight-issues-found', { count: issueCount })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60"
            aria-label={t('action-close')}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          <ul className="gba:flex gba:flex-col gba:gap-3">
            {reports.map(report => (
              <li
                key={report.package_id}
                className="gba:rounded-xl gba:border gba:border-border gba:p-3"
                data-testid={`marketplace-preflight-${report.package_id}`}
              >
                <div className="gba:flex gba:items-start gba:gap-2">
                  {!report.ready ? (
                    <WarningCircleIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:text-destructive" weight="fill" />
                  ) : null}
                  <div className="gba:min-w-0 gba:flex-1">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground">{report.package_name}</p>
                    {report.missing_tools.length > 0 ? (
                      <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                        {t('marketplace-preflight-missing-tools', { tools: report.missing_tools.join(', ') })}
                      </p>
                    ) : null}
                    {report.missing_functions.length > 0 ? (
                      <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                        {t('marketplace-preflight-missing-functions', {
                          functions: report.missing_functions.join(', ')
                        })}
                      </p>
                    ) : null}
                    {report.needs_configuration.length > 0 ? (
                      <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                        {t('marketplace-needs-configuration', { items: report.needs_configuration.join(', ') })}
                      </p>
                    ) : null}
                    {report.issues.length > 0 ? (
                      <ul className="gba:mt-2 gba:list-disc gba:pl-4 gba:text-xs gba:text-muted-foreground">
                        {report.issues.map(issue => (
                          <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="gba:flex gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:px-5 gba:py-3">
          <Button variant="outline" onClick={onClose} disabled={isBusy} data-testid="marketplace-preflight-cancel">
            {t('action-cancel')}
          </Button>
          <Button onClick={onConfirmInstall} disabled={isBusy} data-testid="marketplace-preflight-confirm">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
