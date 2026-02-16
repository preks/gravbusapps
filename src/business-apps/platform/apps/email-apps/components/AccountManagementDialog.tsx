/**
 * AccountManagementDialog - Manage connected email accounts.
 * View account status, reconnect, delete, and toggle calendar sync.
 */

import React, { useState } from 'react'
import { toast } from 'sonner'
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
import { EmailApiService } from '../services/EmailApiService'
import { EmailProviderSettingsApi } from '../services/EmailProviderSettingsApi'
import { SignatureEditor } from './SignatureEditor'
import { AccountStatusBadge } from './AccountStatusBadge'
import { formatRelativeTime } from '../utils/emailDisplayUtils'
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
  'data-testid': testId = 'account-management'
}) => {
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [reconnectingAccountId, setReconnectingAccountId] = useState<string | null>(null)

  const handleToggleThreadView = () => {
    onToggleThreadView?.()
  }

  const handleReconnect = async (account: EmailAccount) => {
    if (account.provider !== 'microsoft' && account.provider !== 'google') {
      toast.error('Only Microsoft and Google OAuth accounts support reconnection')
      return
    }

    setReconnectingAccountId(account.id)
    try {
      const tenantSettings = await EmailProviderSettingsApi.getPublicSettings()
      const providerKey = account.provider === 'microsoft' ? 'microsoft' : 'google'
      const providerConfig = tenantSettings.find(s => s.provider === providerKey)

      if (account.provider === 'microsoft') {
        if (!providerConfig?.isEnabled) {
          toast.error('Microsoft provider is not enabled. Please ask your admin to enable it in provider settings.')
          return
        }
        const config = MicrosoftOAuthService.buildConfig(providerConfig.publicConfig)
        // Redirect flow — callback page completes the code exchange.
        return await MicrosoftOAuthService.startAuth(config)
      } else {
        if (!providerConfig?.isEnabled) {
          toast.error('Google provider is not enabled. Please ask your admin to enable it in provider settings.')
          return
        }
        const config = GoogleOAuthService.buildConfig(providerConfig.publicConfig)
        // Redirect flow — callback page completes the code exchange.
        return await GoogleOAuthService.startAuth(config)
      }
    } catch (err) {
      console.error('[AccountManagement] Reconnect error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to reconnect account')
    } finally {
      setReconnectingAccountId(null)
    }
  }

  const handleDelete = async (accountId: string) => {
    try {
      await EmailApiService.deleteAccount(accountId)
      toast.success('Account deleted successfully')
      setDeletingAccountId(null)
      onAccountsChanged()
    } catch (err) {
      console.error('[AccountManagement] Delete error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
    }
  }

  const handleToggleCalendar = (account: EmailAccount) => {
    const key = `email-calendar-sync-${account.id}`
    const current = localStorage.getItem(key) !== 'false'
    localStorage.setItem(key, String(!current))
    toast.success(`Calendar sync ${!current ? 'enabled' : 'disabled'} for ${account.displayName}`)
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
            <DialogTitle>Email accounts</DialogTitle>
            <DialogDescription>
              Manage your connected email accounts. Reconnect disconnected accounts or remove ones you no longer need.
            </DialogDescription>
          </DialogHeader>

          {/* Global settings */}
          <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:px-4 gba:rounded-lg gba:border gba:bg-card">
            <div className="gba:flex gba:items-center gba:gap-2">
              <MessageSquare className="gba:w-4 gba:h-4 gba:text-info" />
              <span className="gba:text-sm gba:text-foreground">Conversation view</span>
              <span className="gba:text-xs gba:text-muted-foreground">Group email replies into threads</span>
            </div>
            <Switch
              checked={threadViewEnabled}
              onCheckedChange={handleToggleThreadView}
              data-testid={`${testId}-thread-toggle`}
            />
          </div>

          <div className="gba:space-y-3 gba:py-4">
            {accounts.length === 0 ? (
              <div className="gba:text-center gba:py-8">
                <Mail className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground gba:mb-3" />
                <p className="gba:text-sm gba:text-muted-foreground">No email accounts connected</p>
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
                          {formatRelativeTime(account.lastSyncAt)}
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
                            Reconnect
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingAccountId(account.id)}
                        data-testid={`${testId}-delete-${account.id}`}
                      >
                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Calendar sync toggle for Microsoft/Google */}
                  {supportsCalendar(account.provider) && account.status === 'active' && (
                    <div className="gba:flex gba:items-center gba:justify-between gba:mt-3 gba:pt-3 gba:border-t">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-info" />
                        <span className="gba:text-sm gba:text-foreground">Calendar sync</span>
                        <span className="gba:text-xs gba:text-muted-foreground">
                          Show calendar events in everyone calendar
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
              Add another account
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
                Admin settings
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAccountId} onOpenChange={() => setDeletingAccountId(null)}>
        <AlertDialogContent data-testid={`${testId}-delete-confirm`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account and all associated emails from NEWWORK. This action cannot be
              undone. Your emails on the email provider (Microsoft, Gmail, etc.) will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`${testId}-delete-cancel`}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAccountId && handleDelete(deletingAccountId)}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
              data-testid={`${testId}-delete-confirm-button`}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
