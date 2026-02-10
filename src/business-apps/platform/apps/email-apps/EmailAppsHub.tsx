/**
 * EmailAppsHub - Main entry point for the Email client.
 * Outlook-inspired 3-panel layout: sidebar | email list | email reader.
 * Supports composing with auto-suggest, reading, folder navigation,
 * account management, calendar sync, and admin provider settings.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
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
  MicrosoftOAuthCallback,
  EmailProviderSettingsAdmin
} from './components'
import type { EmailMessage, ComposeMode } from './types'

// Capture OAuth params at module load time (before platform can strip them)
;(() => {
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : null

    const code = searchParams.get('code') || hashParams?.get('code')
    const state = searchParams.get('state') || hashParams?.get('state')

    if (code && state) {
      sessionStorage.setItem('ms_oauth_code', code)
      sessionStorage.setItem('ms_oauth_callback_state', state)
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
  'data-testid': testId = 'email-apps-hub'
}) => {
  // Check if this is an OAuth callback redirect
  const [isOAuthCallback, setIsOAuthCallback] = useState(() => {
    const hasVerifier = !!(
      sessionStorage.getItem('ms_oauth_verifier') || sessionStorage.getItem('google_oauth_verifier')
    )
    if (!hasVerifier) return false

    const queryParams = new URLSearchParams(window.location.search)
    let hasCode = queryParams.has('code') && queryParams.has('state')

    if (!hasCode && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      hasCode = hashParams.has('code') && hashParams.has('state')
    }

    if (!hasCode) {
      const savedCode = sessionStorage.getItem('ms_oauth_code')
      hasCode = !!savedCode
    }

    return hasCode
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
  const [searchQuery, setSearchQuery] = useState('')
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false)

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
  } = useEmailAccounts(accessToken)

  const { folders, inboxFolder } = useEmailFolders(accessToken, defaultAccount?.id)

  const {
    messages,
    selectedMessage,
    isLoading: isLoadingMessages,
    selectMessage,
    clearSelection,
    toggleStar,
    deleteMessage,
    moveToFolder,
    refreshMessages
  } = useEmails({
    accessToken,
    folderId: selectedFolderId || undefined,
    accountId: defaultAccount?.id,
    search: searchQuery || undefined
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

  const handleOAuthError = useCallback((error: string) => {
    toast.error(`Sign-in failed: ${error}`)
    window.history.replaceState({}, '', '/platform/mail')
    setIsOAuthCallback(false)
  }, [])

  // Handlers
  const handleCompose = useCallback((mode: ComposeMode = 'new', replyTo?: EmailMessage) => {
    setComposeMode(mode)
    setReplyToMessage(replyTo || null)
    setIsComposing(true)
  }, [])

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      setSelectedFolderId(folderId)
      clearSelection()
      setSearchQuery('')
    },
    [clearSelection]
  )

  const handleSync = useCallback(async () => {
    if (!defaultAccount) return
    try {
      toast.info('Syncing emails...')
      await syncAccount(defaultAccount.id)
      await refreshMessages()
      toast.success('Emails synced')
    } catch {
      toast.error('Sync failed')
    }
  }, [defaultAccount, syncAccount, refreshMessages])

  const handleArchive = useCallback(
    async (id: string) => {
      const archiveFolder = folders.find(f => f.type === 'archive')
      if (archiveFolder) {
        await moveToFolder(id, archiveFolder.id)
        toast.success('Email archived')
      }
    },
    [folders, moveToFolder]
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

  // Auto-select inbox when folders load
  useEffect(() => {
    if (inboxFolder && !selectedFolderId) {
      setSelectedFolderId(inboxFolder.id)
    }
  }, [inboxFolder, selectedFolderId])

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

  const currentFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Inbox'

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectMessage={selectMessage}
        onToggleStar={toggleStar}
        onRefresh={refreshMessages}
        folderName={currentFolderName}
      />

      {/* Email Reader */}
      <EmailReader
        message={selectedMessage}
        onCompose={handleCompose}
        onDelete={deleteMessage}
        onToggleStar={toggleStar}
        onArchive={handleArchive}
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
        onAddAccount={() => {
          setIsManageDialogOpen(false)
          setIsAccountDialogOpen(true)
        }}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
      />

      {/* Account setup dialog */}
      <AccountSetupDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        onAccountCreated={refreshAccounts}
        accessToken={accessToken}
      />

      {/* Admin provider settings */}
      <EmailProviderSettingsAdmin
        open={isAdminSettingsOpen}
        onOpenChange={setIsAdminSettingsOpen}
        accessToken={accessToken}
      />
    </div>
  )
}

export default EmailAppsHub
