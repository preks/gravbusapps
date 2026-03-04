/**
 * EmailAppsHub - Main entry point for the Email client.
 * Outlook-inspired 3-panel layout: sidebar | email list | email reader.
 * Supports composing with auto-suggest, reading, folder navigation,
 * account management, calendar sync, and admin provider settings.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useEmailAccounts, useEmailFolders, useEmails, useEmailDirectory } from './hooks'
import { EmailApiService } from './services/EmailApiService'
import {
  EmailSidebar,
  EmailList,
  EmailReader,
  EmailComposer,
  AccountSetupDialog,
  AccountManagementDialog,
  EmailEmptyState,
  MicrosoftOAuthCallback
} from './components'
import type { EmailMessage, ComposeMode } from './types'
import translations from './_i18n'

// Capture OAuth params at module load time (before platform can strip them)
;(() => {
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : null

    const code = searchParams.get('code') || hashParams?.get('code')
    const state = searchParams.get('state') || hashParams?.get('state')
    const error = searchParams.get('error') || hashParams?.get('error')
    const errorDescription = searchParams.get('error_description') || hashParams?.get('error_description')
    const errorCodes = searchParams.get('error_codes') || hashParams?.get('error_codes')
    const correlationId = searchParams.get('correlation_id') || hashParams?.get('correlation_id')
    const traceId = searchParams.get('trace_id') || hashParams?.get('trace_id')
    const timestamp = searchParams.get('timestamp') || hashParams?.get('timestamp')

    if (code && state) {
      sessionStorage.setItem('ms_oauth_code', code)
      sessionStorage.setItem('ms_oauth_callback_state', state)
    }

    if (error) {
      sessionStorage.setItem('ms_oauth_error', error)
      if (errorDescription) sessionStorage.setItem('ms_oauth_error_description', errorDescription)
      if (errorCodes) sessionStorage.setItem('ms_oauth_error_codes', errorCodes)
      if (correlationId) sessionStorage.setItem('ms_oauth_correlation_id', correlationId)
      if (traceId) sessionStorage.setItem('ms_oauth_trace_id', traceId)
      if (timestamp) sessionStorage.setItem('ms_oauth_timestamp', timestamp)
    }
  } catch {
    // Silently ignore
  }
})()

export interface EmailAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const EmailAppsHub: React.FC<EmailAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'email-apps-hub'
}) => {
  const { t } = useTranslation(translations)

  // Check if this is an OAuth callback redirect
  const [isOAuthCallback, setIsOAuthCallback] = useState(() => {
    const hasVerifier = !!(
      sessionStorage.getItem('ms_oauth_verifier') || sessionStorage.getItem('google_oauth_verifier')
    )
    if (!hasVerifier) return false

    const queryParams = new URLSearchParams(window.location.search)
    let hasCode = queryParams.has('code') && queryParams.has('state')
    let hasError = queryParams.has('error')

    if (!hasCode && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      hasCode = hashParams.has('code') && hashParams.has('state')
      hasError = hasError || hashParams.has('error')
    }

    if (!hasCode) {
      const savedCode = sessionStorage.getItem('ms_oauth_code')
      hasCode = !!savedCode
    }

    if (!hasError) {
      const savedError = sessionStorage.getItem('ms_oauth_error')
      hasError = !!savedError
    }

    return hasCode || hasError
  })

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('email-hub-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [starredOnly, setStarredOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [threadViewEnabled, setThreadViewEnabled] = useState(() => {
    try {
      return localStorage.getItem('email-thread-view-enabled') === 'true'
    } catch {
      return false
    }
  })

  // Compose state
  const [isComposing, setIsComposing] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('new')
  const [replyToMessage, setReplyToMessage] = useState<EmailMessage | null>(null)

  // Data hooks
  const {
    accounts,
    defaultAccount,
    isLoading: isLoadingAccounts,
    syncAccount,
    refreshAccounts
  } = useEmailAccounts(accessToken, { t })

  const { folders, inboxFolder } = useEmailFolders(accessToken, defaultAccount?.id)

  const {
    messages,
    selectedMessage,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    total,
    selectMessage,
    clearSelection,
    toggleStar,
    deleteMessage,
    moveToFolder,
    loadMore,
    refreshMessages
  } = useEmails({
    accessToken,
    folderId: selectedFolderId || undefined,
    accountId: defaultAccount?.id,
    search: searchQuery || undefined,
    labels: selectedLabels.length ? selectedLabels : undefined,
    starredOnly,
    threadView: threadViewEnabled
  })

  // Directory hook for auto-suggest (org directory + provider contacts)
  const { searchContacts, addRecentRecipients } = useEmailDirectory(accessToken, accounts)

  // Set access token on API service
  useEffect(() => {
    if (accessToken) {
      EmailApiService.setAccessToken(accessToken)
    }
  }, [accessToken])

  // Handle OAuth callback completion
  const handleOAuthSuccess = useCallback(() => {
    window.history.replaceState({}, '', '/platform/mail')
    setIsOAuthCallback(false)
    refreshAccounts()
  }, [refreshAccounts])

  const handleOAuthError = useCallback(
    (error: string) => {
      toast.error(t('toast-signin-failed', { error }))
      // Keep the OAuth callback view visible so users can copy diagnostics.
    },
    [t]
  )

  // Handlers
  const handleCompose = useCallback((mode: ComposeMode = 'new', replyTo?: EmailMessage) => {
    setComposeMode(mode)
    setReplyToMessage(replyTo || null)
    setIsComposing(true)
  }, [])

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      setSelectedFolderId(folderId)
      setStarredOnly(false)
      clearSelection()
      setSearchQuery('')
    },
    [clearSelection]
  )

  const handleSelectStarred = useCallback(() => {
    setStarredOnly(true)
    setSelectedFolderId(null)
    clearSelection()
    setSearchQuery('')
  }, [clearSelection])

  const handleSync = useCallback(async () => {
    if (!defaultAccount) return
    try {
      toast.info(t('toast-syncing'))
      await syncAccount(defaultAccount.id)
      await refreshMessages()
      toast.success(t('toast-synced'))
    } catch {
      toast.error(t('toast-sync-failed'))
    }
  }, [defaultAccount, syncAccount, refreshMessages, t])

  const handleArchive = useCallback(
    async (id: string) => {
      const archiveFolder = folders.find(f => f.type === 'archive')
      if (archiveFolder) {
        await moveToFolder(id, archiveFolder.id)
        toast.success(t('toast-archived'))
      }
    },
    [folders, moveToFolder, t]
  )

  const handleBack = useCallback(() => {
    navigateTo('/platform/every-office')
  }, [])

  const handleRecipientsUsed = useCallback(
    (recipients: Array<{ name?: string; email: string }>) => {
      addRecentRecipients(recipients)
    },
    [addRecentRecipients]
  )

  const handleReplyFromList = useCallback(
    async (messageId: string) => {
      try {
        const message = await EmailApiService.getMessage(messageId)
        handleCompose('reply', message)
      } catch {
        toast.error(t('list-context-action-failed'))
      }
    },
    [handleCompose, t]
  )

  const handleReplyAllFromList = useCallback(
    async (messageId: string) => {
      try {
        const message = await EmailApiService.getMessage(messageId)
        handleCompose('reply-all', message)
      } catch {
        toast.error(t('list-context-action-failed'))
      }
    },
    [handleCompose, t]
  )

  const handleForwardFromList = useCallback(
    async (messageId: string) => {
      try {
        const message = await EmailApiService.getMessage(messageId)
        handleCompose('forward', message)
      } catch {
        toast.error(t('list-context-action-failed'))
      }
    },
    [handleCompose, t]
  )

  const handleToggleReadFromList = useCallback(
    async (messageId: string, isRead: boolean) => {
      try {
        await EmailApiService.markRead(messageId, isRead)
        await refreshMessages()
      } catch {
        toast.error(t('list-context-action-failed'))
      }
    },
    [refreshMessages, t]
  )

  // Auto-select inbox when folders load
  useEffect(() => {
    if (inboxFolder && !selectedFolderId) {
      setSelectedFolderId(inboxFolder.id)
    }
  }, [inboxFolder, selectedFolderId])

  // Deep-link: auto-open message from ?messageId=<uuid> parameter
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const deepLinkMessageId = params.get('messageId')
      if (deepLinkMessageId && accessToken) {
        selectMessage(deepLinkMessageId)
        // Clean up URL param after opening
        params.delete('messageId')
        const cleanUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
    } catch {
      // Silently ignore URL parsing errors
    }
  }, [accessToken, selectMessage])

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem('email-hub-sidebar-collapsed', String(isSidebarCollapsed))
    } catch {
      // Ignore
    }
  }, [isSidebarCollapsed])

  // OAuth callback view
  if (isOAuthCallback) {
    return (
      <div className="gba:flex gba:h-full gba:bg-background gba:items-center gba:justify-center" data-testid={testId}>
        <MicrosoftOAuthCallback accessToken={accessToken} onSuccess={handleOAuthSuccess} onError={handleOAuthError} />
      </div>
    )
  }

  const currentFolderName = starredOnly
    ? t('folder-starred')
    : folders.find(f => f.id === selectedFolderId)?.name || t('folder-inbox')

  // Empty state: no accounts
  if (!isLoadingAccounts && accounts.length === 0) {
    return (
      <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
        <EmailEmptyState onAddAccount={() => setIsAccountDialogOpen(true)} />
        <AccountSetupDialog
          open={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onAccountCreated={refreshAccounts}
          accessToken={accessToken}
        />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <EmailSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        isStarredView={starredOnly}
        onSelectStarred={handleSelectStarred}
        onCompose={() => handleCompose('new')}
        onSync={handleSync}
        onSettings={() => setIsManageDialogOpen(true)}
        onBack={handleBack}
        accounts={accounts}
        activeAccount={defaultAccount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Email List */}
      <EmailList
        messages={messages}
        selectedMessageId={selectedMessage?.id || null}
        isLoading={isLoadingMessages}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        total={total}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedLabels={selectedLabels}
        onLabelsChange={setSelectedLabels}
        onSelectMessage={selectMessage}
        onToggleStar={toggleStar}
        onReply={handleReplyFromList}
        onReplyAll={handleReplyAllFromList}
        onForward={handleForwardFromList}
        onToggleRead={handleToggleReadFromList}
        onArchive={handleArchive}
        onDelete={deleteMessage}
        onRefresh={refreshMessages}
        onLoadMore={loadMore}
        folderName={currentFolderName}
      />

      {/* Email Reader */}
      <EmailReader
        message={selectedMessage}
        onCompose={handleCompose}
        onDelete={deleteMessage}
        onToggleStar={toggleStar}
        onArchive={handleArchive}
        onRefreshMessages={refreshMessages}
        accessToken={accessToken}
        activeAccount={defaultAccount}
        employeeId={userInfo?.employeeDetails?.employeeId}
        threadEnabled={threadViewEnabled}
        onToggleThreadView={() => {
          setThreadViewEnabled(prev => {
            const next = !prev
            try {
              localStorage.setItem('email-thread-view-enabled', String(next))
            } catch {}
            return next
          })
        }}
      />

      {/* Composer with auto-suggest */}
      <EmailComposer
        isOpen={isComposing}
        onClose={() => setIsComposing(false)}
        mode={composeMode}
        replyToMessage={replyToMessage}
        accounts={accounts}
        defaultAccountId={defaultAccount?.id}
        onSent={refreshMessages}
        searchContacts={searchContacts}
        onRecipientsUsed={handleRecipientsUsed}
      />

      {/* Account management dialog */}
      <AccountManagementDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        accounts={accounts}
        onAccountsChanged={refreshAccounts}
        threadViewEnabled={threadViewEnabled}
        onToggleThreadView={() => {
          setThreadViewEnabled(prev => {
            const next = !prev
            try {
              localStorage.setItem('email-thread-view-enabled', String(next))
            } catch {}
            return next
          })
        }}
        onAddAccount={() => {
          setIsManageDialogOpen(false)
          setIsAccountDialogOpen(true)
        }}
        onOpenAdminSettings={() => navigateTo('/platform/mail/settings')}
      />

      {/* Account setup dialog */}
      <AccountSetupDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        onAccountCreated={refreshAccounts}
        accessToken={accessToken}
      />
    </div>
  )
}

export default EmailAppsHub
