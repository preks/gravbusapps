import { Button, Input, Label, useTranslation } from '@newwork/nw-design-system'
import { CheckCircleIcon, StorefrontIcon, XIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'
import type { MarketplacePackageSummary } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../../_i18n'
import type { PublishAgentOptions } from './useAgentMarketplace'

interface PublishAgentDialogProps {
  open: boolean
  agentId: string
  agentName: string
  isBusy: boolean
  errorMessage?: string | null
  onClose: () => void
  onPublish: (options: PublishAgentOptions) => Promise<MarketplacePackageSummary | null>
}

export const PublishAgentDialog: React.FC<PublishAgentDialogProps> = ({
  open,
  agentId,
  agentName,
  isBusy,
  errorMessage,
  onClose,
  onPublish
}) => {
  const { t } = useTranslation(translations)
  const [targetBaseUrl, setTargetBaseUrl] = useState('')
  const [targetToken, setTargetToken] = useState('')
  const [packageId, setPackageId] = useState('')
  const [category, setCategory] = useState('general')
  const [publisher, setPublisher] = useState('newwork')
  const [successPackage, setSuccessPackage] = useState<MarketplacePackageSummary | null>(null)
  const [targetLabel, setTargetLabel] = useState('')

  if (!open) return null

  const handlePublish = async () => {
    const trimmedBaseUrl = targetBaseUrl.trim()
    const trimmedToken = targetToken.trim()
    if (!trimmedBaseUrl || !trimmedToken) return

    const published = await onPublish({
      targetBaseUrl: trimmedBaseUrl,
      targetToken: trimmedToken,
      packageId: packageId.trim() || undefined,
      category: category.trim() || 'general',
      publisher: publisher.trim() || 'newwork'
    })
    if (published) {
      setTargetLabel(trimmedBaseUrl)
      setSuccessPackage(published)
    }
  }

  const handleClose = () => {
    setSuccessPackage(null)
    setTargetLabel('')
    onClose()
  }

  const canSubmit = !isBusy && targetBaseUrl.trim().length > 0 && targetToken.trim().length > 0

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[65] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="publish-agent-dialog"
    >
      <div className="gba:w-full gba:max-w-lg gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:mt-0.5 gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
              <StorefrontIcon className="gba:h-5 gba:w-5" weight="duotone" />
            </div>
            <div>
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{t('detail-publish-marketplace')}</h2>
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('marketplace-publish-agent-description', { agentName })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60"
            aria-label={t('action-close')}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        {successPackage ? (
          <div className="gba:flex gba:flex-col gba:gap-3 gba:px-5 gba:py-5">
            <div className="gba:flex gba:items-start gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:p-3">
              <CheckCircleIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:text-emerald-600" weight="fill" />
              <div>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {t('marketplace-publish-agent-success', { name: successPackage.name })}
                </p>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('marketplace-publish-agent-success-meta', {
                    target: targetLabel,
                    packageId: successPackage.package_id,
                    skillCount: successPackage.skill_count,
                    toolCount: successPackage.tool_count
                  })}
                </p>
              </div>
            </div>
            <div className="gba:flex gba:justify-end">
              <Button onClick={handleClose} data-testid="publish-agent-done">
                {t('marketplace-done')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:py-4">
              <input type="hidden" value={agentId} data-testid="publish-agent-id" readOnly />
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="publish-target-base-url">{t('marketplace-target-tenant-url')}</Label>
                <Input
                  id="publish-target-base-url"
                  value={targetBaseUrl}
                  onChange={event => setTargetBaseUrl(event.target.value)}
                  placeholder={t('marketplace-target-url-placeholder')}
                  data-testid="publish-agent-target-url"
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="publish-target-token">{t('marketplace-target-bearer-token')}</Label>
                <Input
                  id="publish-target-token"
                  type="password"
                  value={targetToken}
                  onChange={event => setTargetToken(event.target.value)}
                  placeholder={t('marketplace-target-token-placeholder')}
                  data-testid="publish-agent-target-token"
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="publish-package-id">{t('marketplace-package-id-optional')}</Label>
                <Input
                  id="publish-package-id"
                  value={packageId}
                  onChange={event => setPackageId(event.target.value)}
                  placeholder={t('marketplace-package-id-placeholder')}
                  data-testid="publish-agent-package-id"
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="publish-category">{t('marketplace-category-label')}</Label>
                <Input
                  id="publish-category"
                  value={category}
                  onChange={event => setCategory(event.target.value)}
                  placeholder={t('marketplace-category-placeholder')}
                  data-testid="publish-agent-category"
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="publish-publisher">{t('marketplace-publisher-label')}</Label>
                <Input
                  id="publish-publisher"
                  value={publisher}
                  onChange={event => setPublisher(event.target.value)}
                  placeholder={t('marketplace-publisher-placeholder')}
                  data-testid="publish-agent-publisher"
                />
              </div>
              {errorMessage ? <p className="gba:text-xs gba:text-destructive">{errorMessage}</p> : null}
            </div>

            <div className="gba:flex gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:px-5 gba:py-3">
              <Button variant="outline" onClick={handleClose} disabled={isBusy} data-testid="publish-agent-cancel">
                {t('action-cancel')}
              </Button>
              <Button onClick={() => void handlePublish()} disabled={!canSubmit} data-testid="publish-agent-submit">
                {isBusy ? t('marketplace-publishing') : t('detail-publish-marketplace')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
