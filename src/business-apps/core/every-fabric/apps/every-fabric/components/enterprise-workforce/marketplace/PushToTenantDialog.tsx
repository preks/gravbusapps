import { Button, Input, Label } from '@newwork/nw-design-system'
import { CheckCircleIcon, PaperPlaneTiltIcon, XIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'
import type { PublishToTenantResult } from './useAgentMarketplace'

interface PushToTenantDialogProps {
  open: boolean
  selectedCount: number
  isBusy: boolean
  errorMessage?: string | null
  publishResults?: PublishToTenantResult[] | null
  onClose: () => void
  onPublish: (target: { baseUrl: string; token: string }) => void
}

export const PushToTenantDialog: React.FC<PushToTenantDialogProps> = ({
  open,
  selectedCount,
  isBusy,
  errorMessage,
  publishResults,
  onClose,
  onPublish
}) => {
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')

  if (!open) return null

  const succeeded = publishResults?.filter(result => result.success) ?? []
  const failed = publishResults?.filter(result => !result.success) ?? []
  const showSuccess = publishResults !== null && publishResults !== undefined && publishResults.length > 0

  const handleClose = () => {
    onClose()
  }

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[65] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="marketplace-push-dialog"
    >
      <div className="gba:w-full gba:max-w-lg gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Publish to tenant</h2>
            <p className="gba:text-xs gba:text-muted-foreground">
              List {selectedCount} selected agent{selectedCount === 1 ? '' : 's'} in a customer marketplace.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60"
            aria-label="Close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        {showSuccess ? (
          <div className="gba:flex gba:flex-col gba:gap-3 gba:px-5 gba:py-5">
            {succeeded.length > 0 ? (
              <div className="gba:flex gba:items-start gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:p-3">
                <CheckCircleIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:text-emerald-600" weight="fill" />
                <div>
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">
                    Published {succeeded.length} package{succeeded.length === 1 ? '' : 's'}
                  </p>
                  <ul className="gba:mt-1 gba:list-inside gba:list-disc gba:text-xs gba:text-muted-foreground">
                    {succeeded.map(result => (
                      <li key={result.packageId}>{result.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
            {failed.length > 0 ? (
              <div className="gba:rounded-xl gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:p-3">
                <p className="gba:text-xs gba:font-medium gba:text-destructive">
                  {failed.length} package{failed.length === 1 ? '' : 's'} failed
                </p>
                <ul className="gba:mt-1 gba:list-inside gba:list-disc gba:text-xs gba:text-destructive">
                  {failed.map(result => (
                    <li key={result.packageId}>
                      {result.name}: {result.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="gba:flex gba:justify-end">
              <Button onClick={handleClose} data-testid="marketplace-push-done">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:py-4">
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="push-target-base-url">Target tenant URL</Label>
                <Input
                  id="push-target-base-url"
                  value={baseUrl}
                  onChange={event => setBaseUrl(event.target.value)}
                  placeholder="https://customer.example.com/prompt-manager"
                  data-testid="marketplace-push-base-url"
                />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label htmlFor="push-target-token">Target bearer token</Label>
                <Input
                  id="push-target-token"
                  type="password"
                  value={token}
                  onChange={event => setToken(event.target.value)}
                  placeholder="Paste tenant access token"
                  data-testid="marketplace-push-token"
                />
              </div>
              {errorMessage ? <p className="gba:text-xs gba:text-destructive">{errorMessage}</p> : null}
            </div>

            <div className="gba:flex gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:px-5 gba:py-3">
              <Button variant="outline" onClick={handleClose} disabled={isBusy} data-testid="marketplace-push-cancel">
                Cancel
              </Button>
              <Button
                onClick={() =>
                  onPublish({
                    baseUrl: baseUrl.trim(),
                    token: token.trim()
                  })
                }
                disabled={isBusy || !baseUrl.trim() || !token.trim()}
                data-testid="marketplace-push-submit"
              >
                <PaperPlaneTiltIcon className="gba:mr-1.5 gba:h-4 gba:w-4" />
                {isBusy ? 'Publishing…' : 'Publish to tenant'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
