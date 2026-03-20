import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type {
  ConnectorProviderODM,
  ExternalConnectionLane
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getProviderDescription, getProviderId, getProviderTitle } from './connectCatalog'
import { ConnectorLogo } from './ConnectorLogo'

interface ProviderPickerDialogProps {
  open: boolean
  lane: ExternalConnectionLane | null
  providers: ConnectorProviderODM[]
  onClose: () => void
  onSelectProvider: (provider: ConnectorProviderODM) => void
  t: (key: string, args?: Record<string, unknown>) => string
}

export const ProviderPickerDialog: React.FC<ProviderPickerDialogProps> = ({
  open,
  lane,
  providers,
  onClose,
  onSelectProvider,
  t
}) => {
  const scopedProviders = providers.filter(provider => provider.lane === lane)

  return (
    <Dialog open={open} onOpenChange={value => (!value ? onClose() : undefined)}>
      <DialogContent className="gba:max-w-md gba:overflow-hidden" data-testid="newwork-connect-provider-picker">
        <DialogHeader>
          <DialogTitle>{t('connect-provider-picker-title')}</DialogTitle>
        </DialogHeader>
        <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">{t('connect-provider-picker-description')}</div>
        <div className="gba:space-y-1 gba:overflow-y-auto" data-testid="newwork-connect-provider-list">
          {scopedProviders.map(provider => {
            const providerId = getProviderId(provider)
            return (
              <button
                key={providerId}
                type="button"
                className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-xl gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
                onClick={() => onSelectProvider(provider)}
                data-testid={`newwork-connect-provider-select-${providerId}`}
              >
                <ConnectorLogo providerId={providerId} size="md" />
                <div className="gba:min-w-0 gba:flex-1 gba:overflow-hidden">
                  <div className="gba:text-sm gba:font-medium gba:text-card-foreground gba:truncate">
                    {getProviderTitle(t, provider)}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                    {getProviderDescription(t, provider)}
                  </div>
                </div>
                <Plus className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
