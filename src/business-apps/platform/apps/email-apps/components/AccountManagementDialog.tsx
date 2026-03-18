/**
 * AccountManagementDialog - Manage connected email accounts.
 * View account status, reconnect, delete, and toggle calendar sync.
 */

import React, { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  Switch,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@newwork/nw-design-system'
import { Mail, RefreshCw, Trash2, Plus, Calendar, MessageSquare } from 'lucide-react'
import { MicrosoftOAuthService } from '../services/MicrosoftOAuthService'
import { GoogleOAuthService } from '../services/GoogleOAuthService'
import { OAuthConfigError } from '../services/OAuthConfigError'
import { EmailApiService } from '../services/EmailApiService'
import { EmailProviderSettingsApi } from '../services/EmailProviderSettingsApi'
import { SignatureEditor } from './SignatureEditor'
import { AccountStatusBadge } from './AccountStatusBadge'
import { formatRelativeTimeWithT } from '../utils/emailDisplayUtils'
import type { EmailAccount } from '../types'

interface AccountManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: EmailAccount[]
  onAccountsChanged: () => void
  onAddAccount: () => void
  onOpenAdminSettings?: () => void
  threadViewEnabled?: boolean
  onToggleThreadView?: () => void
  assistantEnabled?: boolean
  onToggleAssistantEnabled?: () => void
  'data-testid'?: string
}

export const AccountManagementDialog: React.FC<AccountManagementDialogProps> = ({
  open,
  onOpenChange,
  accounts,
  onAccountsChanged,
  onAddAccount,
  onOpenAdminSettings,
  threadViewEnabled = false,
  onToggleThreadView,
  assistantEnabled = false,
  onToggleAssistantEnabled,
  'data-testid': testId = 'account-management'
}) => {
  const { t } = useTranslation(translations)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [reconnectingAccountId, setReconnectingAccountId] = useState<string | null>(null)

  const handleToggleThreadView = () => {
    onToggleThreadView?.()
  }

  const handleToggleAssistantEnabled = () => {
    onToggleAssistantEnabled?.()
  }

  const handleReconnect = async (account: EmailAccount) => {
    if (account.provider !== 'microsoft' && account.provider !== 'google') {
      toast.error(t('account-mgmt-toast-reconnect-oauth-only'))
      return
    }

    setReconnectingAccountId(account.id)
    try {
      const tenantSettings = await EmailProviderSettingsApi.getPublicSettings()
      const providerKey = account.provider === 'microsoft' ? 'microsoft' : 'google'
      const providerConfig = tenantSettings.find(s => s.provider === providerKey)

      if (account.provider === 'microsoft') {
        if (!providerConfig?.isEnabled) {
          toast.error(t('account-mgmt-toast-ms-not-enabled'))
          return
        }
        const config = MicrosoftOAuthService.buildConfig(providerConfig.publicConfig)
        // Redirect flow — callback page completes the code exchange.
        return await MicrosoftOAuthService.startAuth(config)
      } else {
        if (!providerConfig?.isEnabled) {
          toast.error(t('account-mgmt-toast-google-not-enabled'))
          return
        }
        const config = GoogleOAuthService.buildConfig(providerConfig.publicConfig)
        // Redirect flow — callback page completes the code exchange.
        return await GoogleOAuthService.startAuth(config)
      }
    } catch (err) {
      console.error('[AccountManagement] Reconnect error:', err)
      const msg =
        err instanceof OAuthConfigError
          ? t(err.code)
          : err instanceof Error
            ? err.message
            : t('account-mgmt-toast-reconnect-failed')
      toast.error(msg)
    } finally {
      setReconnectingAccountId(null)
    }
  }

  const handleDelete = async (accountId: string) => {
    try {
      await EmailApiService.deleteAccount(accountId)
      toast.success(t('account-mgmt-toast-deleted'))
      setDeletingAccountId(null)
      onAccountsChanged()
    } catch (err) {
      console.error('[AccountManagement] Delete error:', err)
      toast.error(err instanceof Error ? err.message : t('account-mgmt-toast-delete-failed'))
    }
  }

  const handleToggleCalendar = (account: EmailAccount) => {
    const key = `email-calendar-sync-${account.id}`
    const current = localStorage.getItem(key) !== 'false'
    localStorage.setItem(key, String(!current))
    toast.success(
      !current
        ? t('account-mgmt-toast-calendar-enabled', { name: account.displayName })
        : t('account-mgmt-toast-calendar-disabled', { name: account.displayName })
    )
    onAccountsChanged()
  }

  const isCalendarEnabled = (accountId: string): boolean => {
    return localStorage.getItem(`email-calendar-sync-${accountId}`) !== 'false'
  }

  const supportsCalendar = (provider: string) => provider === 'microsoft' || provider === 'google'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gba:max-w-2xl" data-testid={testId}>
          <DialogHeader>
            <DialogTitle>{t('account-mgmt-title')}</DialogTitle>
            <DialogDescription>{t('account-mgmt-description')}</DialogDescription>
          </DialogHeader>

          {/* Global settings */}
          <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:border gba:bg-card">
            <div className="gba:flex gba:items-center gba:gap-2">
              <MessageSquare className="gba:w-4 gba:h-4 gba:text-info" />
              <span className="gba:text-sm gba:text-foreground">{t('account-mgmt-conversation-view')}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{t('account-mgmt-conversation-view-desc')}</span>
            </div>
            <Switch
              checked={threadViewEnabled}
              onCheckedChange={handleToggleThreadView}
              data-testid={`${testId}-thread-toggle`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:border gba:bg-card">
            <div className="gba:flex gba:items-center gba:gap-2">
              <MessageSquare className="gba:w-4 gba:h-4 gba:text-info" />
              <span className="gba:text-sm gba:text-foreground">{t('account-mgmt-assistant-toggle')}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{t('account-mgmt-assistant-toggle-desc')}</span>
            </div>
            <Switch
              checked={assistantEnabled}
              onCheckedChange={handleToggleAssistantEnabled}
              data-testid={`${testId}-assistant-toggle`}
            />
          </div>

          <div className="gba:space-y-3 gba:py-4">
            {accounts.length === 0 ? (
              <div className="gba:text-center gba:py-8">
                <Mail className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground gba:mb-3" />
                <p className="gba:text-sm gba:text-muted-foreground">{t('account-mgmt-no-accounts')}</p>
              </div>
            ) : (
              accounts.map(account => (
                <div
                  key={account.id}
                  className="gba:p-4 gba:rounded-lg gba:border gba:bg-card"
                  data-testid={`${testId}-account-${account.id}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-4">
                    {/* Icon */}
                    <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <Mail className="gba:w-5 gba:h-5 gba:text-primary" />
                    </div>

                    {/* Info */}
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <p className="gba:font-medium gba:text-foreground gba:truncate">{account.displayName}</p>
                        {account.isDefault && (
                          <Badge variant="secondary" className="gba:text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mb-2">
                        {account.emailAddress}
                      </p>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <AccountStatusBadge status={account.status} />
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {formatRelativeTimeWithT(account.lastSyncAt, t)}
                        </span>
                      </div>
                      {account.lastSyncError && (
                        <p className="gba:text-xs gba:text-destructive gba:mt-2 gba:line-clamp-2">
                          {account.lastSyncError}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="gba:flex gba:gap-2 gba:flex-shrink-0">
                      {(account.status === 'disconnected' || account.status === 'error') &&
                        (account.provider === 'microsoft' || account.provider === 'google') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReconnect(account)}
                            disabled={reconnectingAccountId === account.id}
                            data-testid={`${testId}-reconnect-${account.id}`}
                          >
                            <RefreshCw
                              className={`gba:w-4 gba:h-4 gba:mr-2 ${reconnectingAccountId === account.id ? 'gba:animate-spin' : ''}`}
                            />
                            {t('account-mgmt-reconnect')}
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingAccountId(account.id)}
                        data-testid={`${testId}-delete-${account.id}`}
                      >
                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('account-mgmt-delete')}
                      </Button>
                    </div>
                  </div>

                  {/* Calendar sync toggle for Microsoft/Google */}
                  {supportsCalendar(account.provider) && account.status === 'active' && (
                    <div className="gba:flex gba:items-center gba:justify-between gba:mt-3 gba:pt-3 gba:border-t">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-info" />
                        <span className="gba:text-sm gba:text-foreground">{t('account-mgmt-calendar-sync')}</span>
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {t('account-mgmt-calendar-sync-desc')}
                        </span>
                      </div>
                      <Switch
                        checked={isCalendarEnabled(account.id)}
                        onCheckedChange={() => handleToggleCalendar(account)}
                        data-testid={`${testId}-calendar-${account.id}`}
                      />
                    </div>
                  )}

                  {/* Signature editor */}
                  <div className="gba:mt-3 gba:pt-3 gba:border-t">
                    <SignatureEditor
                      accountId={account.id}
                      currentSignature={account.signature || ''}
                      onSaved={() => onAccountsChanged()}
                      data-testid={`${testId}-signature-${account.id}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom actions */}
          <div className="gba:border-t gba:pt-4 gba:flex gba:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onAddAccount()
              }}
              className="gba:flex-1"
              data-testid={`${testId}-add-account`}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('account-mgmt-add-account')}
            </Button>
            {onOpenAdminSettings && (
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false)
                  onOpenAdminSettings()
                }}
                data-testid={`${testId}-admin-settings`}
              >
                {t('account-mgmt-admin-settings')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAccountId} onOpenChange={() => setDeletingAccountId(null)}>
        <AlertDialogContent data-testid={`${testId}-delete-confirm`}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account-mgmt-delete-title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('account-mgmt-delete-description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`${testId}-delete-cancel`}>
              {t('account-mgmt-delete-cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAccountId && handleDelete(deletingAccountId)}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
              data-testid={`${testId}-delete-confirm-button`}
            >
              {t('account-mgmt-delete-confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
