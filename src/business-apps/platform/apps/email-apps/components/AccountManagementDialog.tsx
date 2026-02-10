/**
 * AccountManagementDialog - Manage connected email accounts.
 * View account status, reconnect, or delete accounts.
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@newwork/nw-design-system'
import { Mail, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react'
import { MicrosoftOAuthService } from '../services/MicrosoftOAuthService'
import { GoogleOAuthService } from '../services/GoogleOAuthService'
import { EmailApiService } from '../services/EmailApiService'
import { EmailProviderSettingsApi } from '../services/EmailProviderSettingsApi'
import type { EmailAccount } from '../types'

interface AccountManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: EmailAccount[]
  onAccountsChanged: () => void
  onAddAccount: () => void
  'data-testid'?: string
}

export const AccountManagementDialog: React.FC<AccountManagementDialogProps> = ({
  open,
  onOpenChange,
  accounts,
  onAccountsChanged,
  onAddAccount,
  'data-testid': testId = 'account-management'
}) => {
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [reconnectingAccountId, setReconnectingAccountId] = useState<string | null>(null)

  const handleReconnect = async (account: EmailAccount) => {
    if (account.provider !== 'microsoft' && account.provider !== 'google') {
      toast.error('Only Microsoft and Google OAuth accounts support reconnection')
      return
    }

    setReconnectingAccountId(account.id)
    try {
      // Fetch tenant settings for OAuth config
      const tenantSettings = await EmailProviderSettingsApi.getPublicSettings()
      const providerKey = account.provider === 'microsoft' ? 'microsoft' : 'google'
      const providerConfig = tenantSettings.find(s => s.provider === providerKey)

      if (account.provider === 'microsoft') {
        const config = MicrosoftOAuthService.buildConfig(providerConfig?.publicConfig)
        const authResult = await MicrosoftOAuthService.startAuth(config)
        await EmailProviderSettingsApi.exchangeMicrosoftCode({
          code: authResult.code,
          codeVerifier: authResult.codeVerifier,
          redirectUri: authResult.redirectUri
        })
      } else {
        const config = GoogleOAuthService.buildConfig(providerConfig?.publicConfig)
        const authResult = await GoogleOAuthService.startAuth(config)
        await EmailProviderSettingsApi.exchangeGoogleCode({
          code: authResult.code,
          codeVerifier: authResult.codeVerifier,
          redirectUri: authResult.redirectUri
        })
      }

      toast.success('Account reconnected successfully!')
      onAccountsChanged()
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

  const getStatusBadge = (status: EmailAccount['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" className="gba:gap-1">
            <CheckCircle className="gba:w-3 gba:h-3" />
            Active
          </Badge>
        )
      case 'disconnected':
        return (
          <Badge variant="destructive" className="gba:gap-1">
            <XCircle className="gba:w-3 gba:h-3" />
            Disconnected
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="warning" className="gba:gap-1">
            <AlertCircle className="gba:w-3 gba:h-3" />
            Error
          </Badge>
        )
      case 'syncing':
        return (
          <Badge variant="info" className="gba:gap-1">
            <RefreshCw className="gba:w-3 gba:h-3 gba:animate-spin" />
            Syncing
          </Badge>
        )
      default:
        return null
    }
  }

  const formatLastSync = (lastSyncAt?: Date | null) => {
    if (!lastSyncAt) return 'Never synced'
    const date = new Date(lastSyncAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

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
                  className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:bg-card"
                  data-testid={`${testId}-account-${account.id}`}
                >
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
                      {getStatusBadge(account.status)}
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {formatLastSync(account.lastSyncAt)}
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
              ))
            )}
          </div>

          {/* Add Account Button */}
          <div className="gba:border-t gba:pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onAddAccount()
              }}
              className="gba:w-full"
              data-testid={`${testId}-add-account`}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add another account
            </Button>
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
              className="gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90"
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
